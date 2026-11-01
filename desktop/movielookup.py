"""Movie metadata from IMDb for the desktop explorer.

IMDb blocks plain HTML scraping from desktop clients, so this module uses the
JSON endpoints the website itself calls: the public suggestion feed for search
and the GraphQL API for title details. The GraphQL response is marked for
non-commercial use, so lookups run once per user action and the UI links back
to the IMDb page.
"""

from __future__ import annotations

import json
import re
import ssl
import threading
import urllib.error
import urllib.parse
import urllib.request
from collections import OrderedDict
from datetime import datetime
from typing import Any, Dict, List, Optional, Set

BROWSER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
TIMEOUT = 15
IMAGE_LIMIT = 12 * 1024 * 1024
SUGGEST_URL = "https://v2.sg.media-imdb.com/suggestion/x/{query}.json"
GRAPHQL_URL = "https://api.graphql.imdb.com/"
TITLE_URL = "https://www.imdb.com/title/{id}/"
TITLE_ID = re.compile(r"^tt\d{5,10}$")
MOVIE_TYPES = {
    "movie", "tvMovie", "short", "tvSeries", "tvMiniSeries", "tvSpecial", "video",
}
IMAGE_HOSTS = (".media-amazon.com", ".media-imdb.com", ".imdb.com")

TITLE_QUERY = """
query Title($id: ID!) {
  title(id: $id) {
    id
    titleText { text }
    originalTitleText { text }
    releaseYear { year }
    releaseDate { day month year }
    ratingsSummary { aggregateRating voteCount }
    genres { genres { text } }
    runtime { seconds }
    plot { plotText { plainText } }
    primaryImage { url }
    countriesOfOrigin { countries { text } }
    spokenLanguages { spokenLanguages { text } }
    principalCredits {
      category { id text }
      credits {
        name { id nameText { text } primaryImage { url } }
        ... on Cast { characters { name } }
      }
    }
  }
}
"""

QUALITY_WORDS = (
    r"480p|576p|720p|1080p|1440p|2160p|4k|uhd|hdr10\+?|hdr|sdr|"
    r"x264|x265|h\.?264|h\.?265|hevc|avc|xvid|divx|"
    r"aac(\d(\.\d)?)?|ac3|eac3|dts(-hd)?|truehd|atmos|flac|mp3|"
    r"ddp?5\.1|10\s?bit|8\s?bit|"
    r"web[- ]?dl|webrip|web|bluray|blu[- ]ray|brrip|bdrip|bdremux|remux|"
    r"dvdrip|dvdscr|hdtv|hdrip|hdts|ts|camrip|"
    r"proper|repack|extended|unrated|uncut|remastered|directors? cut|"
    r"multi(\d)?|dual audio|dubbed|subbed|subtitles?|subs?"
)
JUNK = re.compile(r"\b(?:" + QUALITY_WORDS + r")\b", re.I)
YEAR = re.compile(r"(?<!\d)((?:19|20)\d{2})(?!\d)")
BRACKETS = re.compile(r"[\[\(\{][^\]\)\}]*[\]\)\}]")
SEPARATORS = re.compile(r"[\s._\-–—]+")
CACHE_LOCK = threading.Lock()
IMAGE_CACHE: "OrderedDict[str, bytes]" = OrderedDict()
IMAGE_CACHE_SIZE = 64


class LookupError(Exception):
    pass


def _text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _json(url: str) -> Any:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": BROWSER_AGENT,
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    context = ssl.create_default_context()
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT, context=context) as response:
            body = response.read(IMAGE_LIMIT)
    except urllib.error.HTTPError as exc:
        if exc.code in (403, 429):
            raise LookupError(
                "IMDb is refusing requests right now. Try again in a minute."
            ) from None
        raise LookupError("IMDb could not be reached.") from None
    except (urllib.error.URLError, TimeoutError, OSError):
        raise LookupError("Could not reach IMDb. Check the internet connection.") from None
    try:
        return json.loads(body.decode("utf-8", errors="replace"))
    except ValueError:
        raise LookupError("IMDb returned an unexpected answer.") from None


def _graphql(query: str, variables: Dict[str, Any]) -> Dict[str, Any]:
    body = json.dumps({"query": query, "variables": variables}).encode("utf-8")
    request = urllib.request.Request(
        GRAPHQL_URL,
        data=body,
        headers={
            "User-Agent": BROWSER_AGENT,
            "Accept": "application/json",
            "Content-Type": "application/json",
            "x-imdb-client-name": "imdb-web-next",
            "Origin": "https://www.imdb.com",
            "Referer": "https://www.imdb.com/",
        },
    )
    context = ssl.create_default_context()
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT, context=context) as response:
            payload = response.read(IMAGE_LIMIT)
    except urllib.error.HTTPError as exc:
        if exc.code in (403, 429):
            raise LookupError(
                "IMDb is refusing requests right now. Try again in a minute."
            ) from None
        raise LookupError("IMDb could not be reached.") from None
    except (urllib.error.URLError, TimeoutError, OSError):
        raise LookupError("Could not reach IMDb. Check the internet connection.") from None
    try:
        data = json.loads(payload.decode("utf-8", errors="replace"))
    except ValueError:
        raise LookupError("IMDb returned an unexpected answer.") from None
    if not isinstance(data, dict):
        raise LookupError("IMDb returned an unexpected answer.")
    return data


def _image_allowed(url: str) -> bool:
    parsed = urllib.parse.urlparse(url or "")
    host = (parsed.hostname or "").lower()
    return parsed.scheme == "https" and any(
        host == suffix.lstrip(".") or host.endswith(suffix) for suffix in IMAGE_HOSTS
    )


def _sized(url: str, width: int) -> str:
    """Ask Amazon's image service for a smaller rendition when possible."""
    if not url:
        return url
    for suffix in ("._V1_.jpg", "._V1_.jpeg"):
        if url.endswith(suffix):
            return url[: -len(suffix)] + (
                f"._V1_QL75_UX{width}_CR0,0,{width},{round(width * 1.48)}_.jpg"
            )
    return url


def image(url: str, small: bool = False) -> Optional[bytes]:
    url = str(url or "").strip()
    if not _image_allowed(url):
        return None
    target = _sized(url, 190) if small else url
    cache_key = ("s:" if small else "f:") + target
    with CACHE_LOCK:
        cached = IMAGE_CACHE.get(cache_key)
        if cached is not None:
            IMAGE_CACHE.move_to_end(cache_key)
            return cached
    request = urllib.request.Request(
        target,
        headers={"User-Agent": BROWSER_AGENT, "Accept": "image/*"},
    )
    context = ssl.create_default_context()
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT, context=context) as response:
            data = response.read(IMAGE_LIMIT + 1)
    except (urllib.error.URLError, TimeoutError, OSError, ValueError):
        return None
    if not data or len(data) > IMAGE_LIMIT:
        return None
    if small:
        with CACHE_LOCK:
            IMAGE_CACHE[cache_key] = data
            IMAGE_CACHE.move_to_end(cache_key)
            while len(IMAGE_CACHE) > IMAGE_CACHE_SIZE:
                IMAGE_CACHE.popitem(last=False)
    return data


def search(query: str) -> List[Dict[str, Any]]:
    text = _text(query)
    if not text:
        return []
    url = SUGGEST_URL.format(query=urllib.parse.quote(text))
    payload = _json(url)
    entries = payload.get("d") if isinstance(payload, dict) else None
    results: List[Dict[str, Any]] = []
    seen: Set[str] = set()
    for entry in entries or []:
        if not isinstance(entry, dict):
            continue
        title_id = str(entry.get("id") or "")
        if not TITLE_ID.match(title_id) or title_id in seen:
            continue
        kind = str(entry.get("qid") or "")
        if kind and kind not in MOVIE_TYPES:
            continue
        seen.add(title_id)
        image_info = entry.get("i") or {}
        results.append(
            {
                "id": title_id,
                "title": _text(entry.get("l")),
                "year": int(entry["y"]) if str(entry.get("y") or "").isdigit() else None,
                "type": _text(entry.get("q")),
                "stars": _text(entry.get("s")),
                "poster": str(image_info.get("imageUrl") or ""),
            }
        )
        if len(results) >= 20:
            break
    return results


def _people(groups: Any, wanted: str) -> List[Dict[str, str]]:
    for group in groups or []:
        if not isinstance(group, dict):
            continue
        if str((group.get("category") or {}).get("id") or "") != wanted:
            continue
        people: List[Dict[str, str]] = []
        for credit in group.get("credits") or []:
            if not isinstance(credit, dict):
                continue
            info = credit.get("name") or {}
            name = _text((info.get("nameText") or {}).get("text"))
            if not name:
                continue
            person = {
                "id": str(info.get("id") or ""),
                "name": name,
                "image": str((info.get("primaryImage") or {}).get("url") or ""),
            }
            parts = [
                _text((character or {}).get("name"))
                for character in credit.get("characters") or []
                if isinstance(character, dict)
            ]
            parts = [part for part in parts if part]
            if parts:
                person["character"] = ", ".join(parts)
            people.append(person)
        return people
    return []


def lookup(title_id: str) -> Dict[str, Any]:
    title_id = _text(title_id).lower()
    if not TITLE_ID.match(title_id):
        raise LookupError("That does not look like an IMDb title.")
    payload = _graphql(TITLE_QUERY, {"id": title_id})
    if payload.get("errors"):
        raise LookupError("IMDb could not load that title.")
    data = (payload.get("data") or {}).get("title")
    if not isinstance(data, dict):
        raise LookupError("IMDb has no title with that id.")
    title = _text((data.get("titleText") or {}).get("text"))
    original = _text((data.get("originalTitleText") or {}).get("text"))
    if not title:
        raise LookupError("IMDb has no title with that id.")
    release = data.get("releaseDate") or {}
    release_date = ""
    if release.get("year") and release.get("month") and release.get("day"):
        release_date = (
            f"{int(release['year']):04d}-{int(release['month']):02d}"
            f"-{int(release['day']):02d}"
        )
    ratings = data.get("ratingsSummary") or {}
    rating = ratings.get("aggregateRating")
    movie: Dict[str, Any] = {
        "id": title_id,
        "title": title,
        "original_title": original if original and original != title else "",
        "year": data.get("releaseYear", {}).get("year") or release.get("year"),
        "release_date": release_date,
        "rating": round(float(rating), 1) if rating else None,
        "votes": int(ratings.get("voteCount") or 0),
        "genres": [
            _text((item or {}).get("text"))
            for item in (data.get("genres") or {}).get("genres") or []
            if _text((item or {}).get("text"))
        ],
        "runtime": int((data.get("runtime") or {}).get("seconds") or 0),
        "plot": _text(((data.get("plot") or {}).get("plotText") or {}).get("plainText")),
        "poster": str((data.get("primaryImage") or {}).get("url") or ""),
        "countries": [
            _text((item or {}).get("text"))
            for item in (data.get("countriesOfOrigin") or {}).get("countries") or []
            if _text((item or {}).get("text"))
        ],
        "languages": [
            _text((item or {}).get("text"))
            for item in (data.get("spokenLanguages") or {}).get("spokenLanguages") or []
            if _text((item or {}).get("text"))
        ],
        "directors": _people(data.get("principalCredits"), "director"),
        "writers": _people(data.get("principalCredits"), "writer"),
        "cast": _people(data.get("principalCredits"), "cast"),
        "url": TITLE_URL.format(id=title_id),
        "source": "IMDb",
        "retrieved_at": datetime.now().isoformat(timespec="seconds"),
    }
    poster_bytes = image(movie["poster"]) if movie["poster"] else None
    return {"movie": movie, "image_bytes": poster_bytes}


def guess_title(name: str) -> Dict[str, Any]:
    """Clean an uploaded file name into something IMDb can search."""
    base = str(name or "")
    base = re.sub(r"\.[A-Za-z0-9]{1,5}$", "", base)
    years = YEAR.findall(base)
    year = int(years[-1]) if years else None
    base = BRACKETS.sub(" ", base)
    base = JUNK.split(base, 1)[0]
    base = base.replace(".", " ").replace("_", " ")
    base = YEAR.sub(" ", base)
    base = re.sub(r"\b(?:dvd|xvid|divx|rip|hd)\b", " ", base, flags=re.I)
    text = _text(SEPARATORS.sub(" ", base)).strip(" -–—:;,.")
    text = re.sub(r"^[A-Za-z0-9]{1,3}\s+-\s+", "", text)
    return {"query": text, "year": year}
