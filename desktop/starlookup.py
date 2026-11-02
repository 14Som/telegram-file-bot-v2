"""Online performer details for star records.

Wikipedia and Wikidata supply aliases, birthday, birthplace, nationality and
height. Only portraits hosted by Wikipedia/Wikimedia are downloaded.
"""

from __future__ import annotations

import json
import re
import ssl
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

USER_AGENT = "TelegramFileExplorer/1.0 (personal desktop library)"
TIMEOUT = 12
IMAGE_LIMIT = 8 * 1024 * 1024
ADULT_WORDS = (
    "porn",
    "erotic",
    "adult film",
    "adult actress",
    "adult actor",
    "adult entertainer",
    "xxx",
)


class LookupError(Exception):
    pass


def _open(url: str, accept: str, agent: str = USER_AGENT) -> bytes:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": agent,
            "Accept": accept,
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    context = ssl.create_default_context()
    with urllib.request.urlopen(request, timeout=TIMEOUT, context=context) as response:
        return response.read(IMAGE_LIMIT + 1)


def _json(url: str) -> Any:
    return json.loads(_open(url, "application/json").decode("utf-8"))


# ----------------------------------------------------------------- Wikipedia
def _summary(title: str) -> Optional[Dict[str, Any]]:
    slug = urllib.parse.quote(title.replace(" ", "_"), safe="")
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{slug}"
    try:
        data = _json(url)
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        raise LookupError("Wikipedia could not be reached.") from None
    except (urllib.error.URLError, TimeoutError, OSError, ValueError):
        raise LookupError(
            "Could not reach Wikipedia. Check the internet connection."
        ) from None
    if not isinstance(data, dict) or data.get("type") in {
        "disambiguation",
        "mainpage",
    }:
        return None
    return data


def _looks_adult(data: Dict[str, Any]) -> bool:
    text = " ".join(
        [str(data.get("description") or ""), str(data.get("extract") or "")]
    ).lower()
    return any(word in text for word in ADULT_WORDS)


def _entity(qid: str) -> Dict[str, Any]:
    url = (
        "https://www.wikidata.org/wiki/Special:EntityData/"
        + urllib.parse.quote(qid)
        + ".json"
    )
    try:
        payload = _json(url)
    except (urllib.error.URLError, TimeoutError, OSError, ValueError):
        return {}
    if not isinstance(payload, dict):
        return {}
    return (payload.get("entities") or {}).get(qid) or {}


def _claims(entity: Dict[str, Any], prop: str) -> List[Any]:
    values: List[Any] = []
    for claim in (entity.get("claims") or {}).get(prop, []):
        snak = claim.get("mainsnak") or {}
        if snak.get("snaktype") != "value":
            continue
        values.append((snak.get("datavalue") or {}).get("value"))
    return values


def _birth_date(value: Any) -> str:
    if not isinstance(value, dict):
        return ""
    match = re.match(r"\+?(\d{4})-(\d{2})-(\d{2})", str(value.get("time") or ""))
    if not match:
        return ""
    year, month, day = match.groups()
    try:
        precision = int(value.get("precision") or 11)
    except (TypeError, ValueError):
        precision = 11
    if precision <= 9:
        return year
    if precision == 10:
        return f"{year}-{month}"
    return f"{year}-{month}-{day}"


def _height(value: Any) -> str:
    if not isinstance(value, dict):
        return ""
    try:
        amount = float(str(value.get("amount") or "").lstrip("+"))
    except ValueError:
        return ""
    unit = str(value.get("unit") or "")
    centimetres = amount if unit.endswith("Q174728") else amount * 100
    if centimetres <= 0:
        return ""
    return f"{round(centimetres)} cm"


def _labels(qids: List[str]) -> Dict[str, str]:
    wanted = [qid for qid in dict.fromkeys(qids) if qid]
    if not wanted:
        return {}
    url = (
        "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json"
        "&props=labels&languages=en&ids="
        + urllib.parse.quote("|".join(wanted[:10]), safe="|")
    )
    try:
        payload = _json(url)
    except (urllib.error.URLError, TimeoutError, OSError, ValueError):
        return {}
    entities = payload.get("entities") if isinstance(payload, dict) else {}
    found: Dict[str, str] = {}
    for qid, entity in (entities or {}).items():
        label = ((entity.get("labels") or {}).get("en") or {}).get("value")
        if label:
            found[qid] = label
    return found


def _thumbnail(url: str) -> Optional[bytes]:
    host = (urllib.parse.urlparse(url).hostname or "").lower()
    if not host.endswith(("wikipedia.org", "wikimedia.org")):
        return None
    try:
        data = _open(url, "image/*")
    except (urllib.error.URLError, TimeoutError, OSError):
        return None
    return (data or None) if len(data) <= IMAGE_LIMIT else None


def _build(data: Dict[str, Any], star_name: str) -> Dict[str, Any]:
    title = str(data.get("title") or star_name)
    fields: Dict[str, str] = {
        "aliases": "",
        "note": str(data.get("extract") or "").strip()[:4000],
        "country": "",
        "birthdate": "",
        "height": "",
    }
    qid = str(data.get("wikibase_item") or "")
    if qid:
        entity = _entity(qid)
        aliases = [
            str(entry.get("value") or "")
            for entry in ((entity.get("aliases") or {}).get("en") or [])
        ]
        fields["aliases"] = ", ".join(
            alias
            for alias in dict.fromkeys(aliases)
            if alias and alias.lower() != star_name.lower()
        )[:300]
        births = _claims(entity, "P569")
        fields["birthdate"] = _birth_date(births[0]) if births else ""
        heights = _claims(entity, "P2048")
        fields["height"] = _height(heights[0]) if heights else ""
        countries = [
            str(value.get("id") or "")
            for value in _claims(entity, "P27")
            if isinstance(value, dict)
        ]
        labels = _labels(countries)
        fields["country"] = next(
            (labels[qid] for qid in countries if qid in labels), ""
        )
    thumb = (data.get("thumbnail") or {}).get("source") or (
        data.get("originalimage") or {}
    ).get("source")
    image = _thumbnail(str(thumb)) if thumb else None
    source_url = (
        ((data.get("content_urls") or {}).get("desktop") or {}).get("page")
        or f"https://en.wikipedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}"
    )
    return {
        "found": True,
        "source": "Wikipedia",
        "source_url": source_url,
        "title": title,
        "description": str(data.get("description") or ""),
        "fields": fields,
        "image_bytes": image,
    }


def _wiki_lookup(name: str, candidates: List[str]) -> Dict[str, Any]:
    for candidate in candidates[:4]:
        data = _summary(candidate)
        if data and _looks_adult(data):
            return _build(data, name)
    url = (
        "https://en.wikipedia.org/w/api.php?action=query&format=json"
        "&list=search&srlimit=8&srsearch="
        + urllib.parse.quote(f"{name} pornographic")
    )
    try:
        payload = _json(url)
    except urllib.error.HTTPError as exc:
        raise LookupError("Wikipedia search is not available right now.") from exc
    except (urllib.error.URLError, TimeoutError, OSError, ValueError):
        raise LookupError(
            "Could not reach Wikipedia. Check the internet connection."
        ) from None
    results = (
        ((payload.get("query") or {}).get("search") or [])
        if isinstance(payload, dict)
        else []
    )
    for result in results[:8]:
        title = str(result.get("title") or "")
        if not title:
            continue
        data = _summary(title)
        if data and _looks_adult(data):
            return _build(data, name)
    raise LookupError(f"No page found for “{name}”.")


def lookup(name: str, aliases: str = "") -> Dict[str, Any]:
    """Find performer facts and a portrait on Wikipedia."""
    name = str(name or "").strip()
    if not name:
        raise LookupError("Add a name before looking it up.")
    candidates = [name]
    for alias in str(aliases or "").split(","):
        alias = alias.strip()
        if alias and alias.lower() != name.lower():
            candidates.append(alias)
    return _wiki_lookup(name, candidates[:4])


def apply_fields(
    star: Dict[str, Any], fields: Dict[str, str], overwrite: bool
) -> Dict[str, str]:
    """Values worth saving: empty fields always, all fields when overwriting."""
    updates: Dict[str, str] = {}
    for key, value in fields.items():
        text = str(value or "").strip()
        if not text:
            continue
        current = str(star.get(key) or "").strip()
        if overwrite or not current:
            updates[key] = text
    incoming = str(fields.get("aliases") or "").strip()
    if incoming and "aliases" not in updates:
        merged = [
            alias.strip()
            for alias in str(star.get("aliases") or "").split(",")
            if alias.strip()
        ]
        for alias in incoming.split(","):
            alias = alias.strip()
            if alias and alias.lower() not in {item.lower() for item in merged}:
                merged.append(alias)
        text = ", ".join(merged)[:300]
        if text != str(star.get("aliases") or "").strip():
            updates["aliases"] = text
    return updates
