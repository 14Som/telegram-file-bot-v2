"""Online performer details for star records.

IAFD supplies the adult-industry facts (aliases, birthday, birthplace,
nationality, height, hair/eyes, measurements, tattoos, piercings, headshot).
Wikipedia/Wikidata is used as a fallback for performers IAFD does not list.
Only portraits hosted by iafd.com or Wikipedia/Wikimedia are downloaded.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import ssl
import subprocess
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Dict, List, Optional

USER_AGENT = "TelegramFileExplorer/1.0 (personal desktop library)"
BROWSER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
TIMEOUT = 12
IMAGE_LIMIT = 8 * 1024 * 1024
IAFD_BASE = "https://www.iafd.com"
ADULT_WORDS = (
    "porn",
    "erotic",
    "adult film",
    "adult actress",
    "adult actor",
    "adult entertainer",
    "xxx",
)
PERSON_HREF = re.compile(
    r'href="(?:https?://www\.iafd\.com)?/person\.rme/id=([0-9a-zA-Z\-]+)"', re.I
)
BIO_PAIR = re.compile(
    r'<p class="bioheading">([^<]{1,160})</p>\s*<p class="biodata">(.*?)</p>',
    re.S | re.I,
)
TABLE = re.compile(
    r'<table\b[^>]*\bid="(tbl[^"]*)"[^>]*>(.*?)</table>', re.S | re.I
)
ROW = re.compile(r"<tr\b[^>]*>(.*?)</tr>", re.S | re.I)


class LookupError(Exception):
    pass


class _Text(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: List[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def _text(fragment: str) -> str:
    parser = _Text()
    try:
        parser.feed(fragment or "")
        parser.close()
    except Exception:
        return re.sub(r"<[^>]+>", " ", fragment or "").strip()
    return re.sub(r"\s+", " ", " ".join(parser.parts)).strip()


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


# --------------------------------------------------------------------- IAFD
def _curl(url: str, accept: str) -> Optional[tuple]:
    """IAFD sits behind a TLS filter that rejects Python's handshake, so its
    pages go through the curl that ships with Windows 10/11."""
    exe = Path(os.environ.get("SystemRoot", r"C:\Windows")) / "System32" / "curl.exe"
    if not exe.exists():
        found = shutil.which("curl")
        if not found:
            return None
        exe = Path(found)
    with tempfile.TemporaryDirectory(prefix="tfe-iafd-") as tmp:
        out = Path(tmp) / "body"
        cmd = [
            str(exe),
            "-sS",
            "-L",
            "--compressed",
            "--max-time",
            str(TIMEOUT),
            "-A",
            BROWSER_AGENT,
            "-H",
            f"Accept: {accept}",
            "-H",
            "Accept-Language: en-US,en;q=0.9",
            "-o",
            str(out),
            "-w",
            "%{http_code}",
            url,
        ]
        flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        try:
            done = subprocess.run(
                cmd,
                capture_output=True,
                timeout=TIMEOUT + 5,
                creationflags=flags if os.name == "nt" else 0,
            )
        except (OSError, subprocess.SubprocessError):
            return None
        code = done.stdout.decode("ascii", errors="ignore").strip()
        try:
            status = int(code[-3:])
        except ValueError:
            return None
        try:
            data = out.read_bytes() if out.exists() else b""
        except OSError:
            data = b""
        return status, data


def _iafd_fetch(url: str) -> bytes:
    got = _curl(url, "text/html,application/xhtml+xml")
    if got is not None:
        status, data = got
        if status in (403, 429):
            raise LookupError(
                "IAFD is refusing requests right now. Try again in a minute."
            )
        if status != 200 or not data:
            raise LookupError("IAFD could not be reached.")
        return data
    try:
        return _open(url, "text/html,application/xhtml+xml", BROWSER_AGENT)
    except urllib.error.HTTPError as exc:
        if exc.code in (403, 429):
            raise LookupError(
                "IAFD is refusing requests right now. Try again in a minute."
            ) from None
        raise LookupError("IAFD could not be reached.") from None
    except (urllib.error.URLError, TimeoutError, OSError):
        raise LookupError(
            "Could not reach IAFD. Check the internet connection."
        ) from None


def _iafd_html(url: str) -> str:
    return _iafd_fetch(url).decode("utf-8", errors="replace")


def _normalise(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()


def _iafd_rows(html: str) -> List[Dict[str, str]]:
    found: List[Dict[str, str]] = []
    for table_id, body in TABLE.findall(html):
        if table_id.lower() in {"titleresult", "tblreviews"}:
            continue
        for row in ROW.findall(body):
            ids = PERSON_HREF.findall(row)
            if not ids:
                continue
            name = ""
            for link in re.finditer(
                r'<a\b[^>]*href="[^"]*person\.rme[^"]*"[^>]*>(.*?)</a>',
                row,
                re.S | re.I,
            ):
                candidate = _text(link.group(1))
                if candidate:
                    name = candidate
                    break
            if not name:
                continue
            aka = ""
            cell = re.search(r"</td>\s*<td class=\"text-left\">(.*?)</td>", row, re.S | re.I)
            if cell:
                aka = _text(cell.group(1))
            head = re.search(r'<img\b[^>]*src="([^"]+)"', row, re.I)
            found.append(
                {
                    "id": ids[0],
                    "name": name,
                    "aka": aka,
                    "headshot": head.group(1) if head else "",
                }
            )
    return found


def _best_row(rows: List[Dict[str, str]], query: str) -> Optional[Dict[str, str]]:
    target = _normalise(query)
    if not target:
        return rows[0] if rows else None

    def score(row: Dict[str, str]) -> int:
        name = _normalise(row.get("name") or "")
        if name == target:
            return 0
        if name.startswith(target) or target.startswith(name):
            return 1
        if target in name or name in target:
            return 2
        return 3

    best = min(rows, key=score)
    return best if score(best) < 3 else rows[0]


def _iafd_search(name: str, candidates: List[str]) -> Optional[Dict[str, str]]:
    fallback: Optional[Dict[str, str]] = None
    seen: set = set()
    for candidate in candidates[:3]:
        if candidate.lower() in seen:
            continue
        seen.add(candidate.lower())
        url = (
            IAFD_BASE
            + "/results.asp?searchtype=comprehensive&searchstring="
            + urllib.parse.quote_plus(candidate)
        )
        rows = _iafd_rows(_iafd_html(url))
        if not rows:
            continue
        exact = [row for row in rows if _normalise(row["name"]) == _normalise(candidate)]
        if exact:
            return exact[0]
        if fallback is None:
            fallback = _best_row(rows, candidate)
    return fallback


def _aliases_from_block(block: str) -> str:
    values: List[str] = []
    for chunk in re.split(r"<br\s*/?>|\r?\n", block or "", flags=re.I):
        alias = re.sub(r"\([^)]*\)", "", _text(chunk)).strip(" ,;.-")
        if alias and alias.lower() not in {value.lower() for value in values}:
            values.append(alias)
    return ", ".join(values)[:300]


def _iso_date(text: str) -> str:
    cleaned = re.sub(r"\([^)]*\)", "", text or "").strip()
    for pattern in ("%B %d, %Y", "%b %d, %Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(cleaned, pattern).strftime("%Y-%m-%d")
        except ValueError:
            continue
    match = re.match(r"([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})", cleaned)
    if match:
        month = match.group(1)[:3].title()
        try:
            return datetime.strptime(
                f"{month} {match.group(2)} {match.group(3)}", "%b %d %Y"
            ).strftime("%Y-%m-%d")
        except ValueError:
            pass
    return cleaned[:40]


def _height_cm(text: str) -> str:
    match = re.search(r"\((\d{2,3})\s*cm\)", text or "", re.I)
    if match:
        return f"{int(match.group(1))} cm"
    feet = re.search(r"(\d+)\s*(?:ft|feet|foot|')", text or "", re.I)
    inches = re.search(r"(\d+)\s*(?:in|inches|inch|\")", text or "", re.I)
    if feet:
        total = int(feet.group(1)) * 30.48 + (int(inches.group(1)) * 2.54 if inches else 0)
        if total > 0:
            return f"{round(total)} cm"
    return (text or "").strip()[:40]


def _country(pairs: Dict[str, str]) -> str:
    birthplace = pairs.get("birthplace") or ""
    parts = [part.strip() for part in birthplace.split(",") if part.strip()]
    if len(parts) > 1:
        return parts[-1][:80]
    return (pairs.get("nationality") or "")[:80]


def _iafd_note(pairs: Dict[str, str], comment: str) -> str:
    bits: List[str] = []
    if pairs.get("birthplace"):
        bits.append(f"Born in {pairs['birthplace']}.")
    if pairs.get("ethnicity"):
        bits.append(f"Ethnicity: {pairs['ethnicity']}.")
    if pairs.get("years active"):
        bits.append(f"Active {pairs['years active']}.")
    if pairs.get("weight"):
        bits.append(f"Weight: {pairs['weight']}.")
    if comment:
        bits.append(comment)
    return " ".join(bits).strip()[:4000]


def _first_comment(html: str) -> str:
    match = re.search(
        r'<li class="cmt">(.*?)</li>', html, re.S | re.I
    )
    text = _text(match.group(1)) if match else ""
    return text.lstrip("- ").strip()[:1500]


def _iafd_image(url: str) -> Optional[bytes]:
    url = urllib.parse.urljoin(IAFD_BASE, url or "")
    host = (urllib.parse.urlparse(url).hostname or "").lower()
    if host not in {"www.iafd.com", "iafd.com"}:
        return None
    got = _curl(url, "image/avif,image/webp,image/jpeg,image/png,image/*")
    if got is not None:
        status, data = got
        if status == 200 and 0 < len(data) <= IMAGE_LIMIT:
            return data
        return None
    try:
        data = _open(
            url,
            "image/avif,image/webp,image/jpeg,image/png,image/*",
            BROWSER_AGENT,
        )
    except (urllib.error.URLError, TimeoutError, OSError):
        return None
    if not data or len(data) > IMAGE_LIMIT:
        return None
    return data


def _iafd_lookup(name: str, candidates: List[str]) -> Optional[Dict[str, Any]]:
    row = _iafd_search(name, candidates)
    if row is None:
        return None
    person_url = f"{IAFD_BASE}/person.rme/id={row['id']}"
    html = _iafd_html(person_url)
    heading = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.S | re.I)
    title = _text(heading.group(1)) if heading else row["name"]
    pairs: Dict[str, str] = {}
    for label, value in BIO_PAIR.findall(html):
        key = _text(label).lower()
        text = _text(value)
        if key and text and key not in pairs:
            pairs[key] = text
    aliases_block = re.search(
        r'<p class="bioheading">\s*Performer\s*AKA\s*</p>\s*<div class="biodata">(.*?)</div>',
        html,
        re.S | re.I,
    )
    aliases = _aliases_from_block(aliases_block.group(1) if aliases_block else row["aka"])
    if not aliases and row.get("aka"):
        aliases = _aliases_from_block(row["aka"])
    fields: Dict[str, str] = {
        "aliases": aliases,
        "note": _iafd_note(pairs, _first_comment(html)),
        "country": _country(pairs),
        "birthdate": _iso_date(pairs.get("birthday", "")),
        "height": _height_cm(pairs.get("height", "")),
        "hair": (pairs.get("hair color") or "")[:60],
        "eyes": (pairs.get("eye color") or "")[:60],
        "measurements": (pairs.get("measurements") or "")[:80],
        "tattoos": (pairs.get("tattoos") or "")[:1000],
        "piercings": (pairs.get("piercings") or "")[:600],
    }
    shot = re.search(
        r'<div id="headshot">\s*<img\b[^>]*src="([^"]+)"', html, re.S | re.I
    )
    image = _iafd_image(shot.group(1)) if shot else None
    return {
        "found": True,
        "source": "IAFD",
        "source_url": person_url,
        "title": title or row["name"],
        "description": (pairs.get("ethnicity") or "Performer")[:200],
        "fields": fields,
        "image_bytes": image,
    }


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
    """Find a performer on IAFD first, then Wikipedia, and merge the details."""
    name = str(name or "").strip()
    if not name:
        raise LookupError("Add a name before looking it up.")
    candidates = [name]
    for alias in str(aliases or "").split(","):
        alias = alias.strip()
        if alias and alias.lower() != name.lower():
            candidates.append(alias)
    candidates = candidates[:4]
    notes: List[str] = []
    try:
        found = _iafd_lookup(name, candidates)
        if found is not None:
            return found
        notes.append("IAFD has no match")
    except LookupError as exc:
        notes.append(str(exc))
    try:
        return _wiki_lookup(name, candidates)
    except LookupError as exc:
        notes.append(str(exc))
    raise LookupError(
        "; ".join(notes) + ". Try the full stage name or add an alias."
    )


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
