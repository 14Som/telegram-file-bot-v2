"""In-app movie playback: remuxing, subtitle tracks and subtitle search.

The desktop app plays MP4/WebM straight from Telegram. Other containers are
downloaded once, remuxed to MP4 with ffmpeg and cached under the app cache
folder. Embedded subtitle tracks are converted to WebVTT there; subtitle files
that live next to the movie are converted on demand. The Android build uses
libVLC, which reads the original file, so this module only provides the
subtitle list/conversion and the online subtitle search there.
"""

from __future__ import annotations

import asyncio
import gzip
import hashlib
import io
import json
import logging
import os
import re
import secrets
import shutil
import subprocess
import threading
import time
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional

from . import appconfig, filetypes, mediatools

log = logging.getLogger("tfe.playback")

PLAY_DIR = appconfig.CACHE_DIR / "play"
SIDE_DIR = PLAY_DIR / "side"
ONLINE_DIR = PLAY_DIR / "online"
CACHE_LIMIT = 8 * 1024 * 1024 * 1024
ONLINE_LIMIT = 12 * 1024 * 1024
SUBTITLE_EXT = {".srt", ".vtt", ".ass", ".ssa", ".sub", ".sbv", ".smi", ".ttml", ".dfxp"}
SUBTITLE_FOLDERS = {"subs", "subtitles", "sub", "subtitle", "subs.", "subtitles."}
DIRECT_EXT = {".mp4", ".m4v", ".webm", ".3gp"}
TEXT_SUB_CODECS = {
    "subrip", "srt", "ass", "ssa", "webvtt", "mov_text", "text",
    "microdvd", "subviewer", "sami", "realtext", "subviewer1",
}
GRAPHIC_SUB_CODECS = {"hdmv_pgs_subtitle", "dvd_subtitle", "dvb_subtitle", "xsub"}
COPY_VIDEO = {"h264", "hevc", "vp9", "av1"}
COPY_AUDIO = {"aac", "mp3"}

LANGUAGES = {
    "en": "English", "eng": "English",
    "hi": "Hindi", "hin": "Hindi",
    "es": "Spanish", "spa": "Spanish",
    "fr": "French", "fre": "French", "fra": "French",
    "de": "German", "ger": "German", "deu": "German",
    "it": "Italian", "ita": "Italian",
    "pt": "Portuguese", "por": "Portuguese",
    "ru": "Russian", "rus": "Russian",
    "ar": "Arabic", "ara": "Arabic",
    "zh": "Chinese", "chi": "Chinese", "zho": "Chinese",
    "ja": "Japanese", "jpn": "Japanese",
    "ko": "Korean", "kor": "Korean",
    "tr": "Turkish", "tur": "Turkish",
    "nl": "Dutch", "dut": "Dutch", "nld": "Dutch",
    "pl": "Polish", "pol": "Polish",
    "sv": "Swedish", "swe": "Swedish",
    "no": "Norwegian", "nor": "Norwegian",
    "da": "Danish", "dan": "Danish",
    "fi": "Finnish", "fin": "Finnish",
    "cs": "Czech", "cze": "Czech", "ces": "Czech",
    "sk": "Slovak", "slo": "Slovak", "slk": "Slovak",
    "hu": "Hungarian", "hun": "Hungarian",
    "ro": "Romanian", "rum": "Romanian", "ron": "Romanian",
    "bg": "Bulgarian", "bul": "Bulgarian",
    "el": "Greek", "gre": "Greek", "ell": "Greek",
    "he": "Hebrew", "heb": "Hebrew",
    "uk": "Ukrainian", "ukr": "Ukrainian",
    "vi": "Vietnamese", "vie": "Vietnamese",
    "th": "Thai", "tha": "Thai",
    "id": "Indonesian", "ind": "Indonesian",
    "ms": "Malay", "may": "Malay", "msa": "Malay",
    "tl": "Filipino", "fil": "Filipino",
    "et": "Estonian", "est": "Estonian",
    "lv": "Latvian", "lav": "Latvian",
    "lt": "Lithuanian", "lit": "Lithuanian",
    "sl": "Slovenian", "slv": "Slovenian",
    "hr": "Croatian", "hrv": "Croatian",
    "sr": "Serbian", "srp": "Serbian",
    "fa": "Persian", "per": "Persian", "fas": "Persian",
    "bn": "Bengali", "ben": "Bengali",
    "ta": "Tamil", "tam": "Tamil",
    "te": "Telugu", "tel": "Telugu",
    "ml": "Malayalam", "mal": "Malayalam",
    "ur": "Urdu", "urd": "Urdu",
}

_NO_WINDOW = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
_STREAM_RE = re.compile(
    r"Stream #0:(\d+)(?:\[0x[0-9a-fA-F]+\])?(?:\(([^)]+)\))?: "
    r"(Video|Audio|Subtitle|Data|Attachment): (.*)"
)
_TIME_RE = re.compile(r"time=(\d+):(\d+):(\d+(?:\.\d+)?)")
_DURATION_RE = re.compile(r"Duration: (\d+):(\d+):(\d+(?:\.\d+)?)")
_SIZE_RE = re.compile(r"(\d{2,5})x(\d{2,5})")
_HZ_RE = re.compile(r"(\d+) Hz")
_LANG_TOKEN_RE = re.compile(r"\.([a-zA-Z]{2,3})(?:\.(?:forced|sdh|cc|hi))?$")


class PlaybackError(RuntimeError):
    pass


# ----------------------------------------------------------------- helpers
def ffmpeg_path() -> Optional[Path]:
    return mediatools.tool_path("ffmpeg")


def item_ext(item: Dict[str, Any]) -> str:
    return filetypes.extension(str(item.get("name") or ""))


def item_key(item: Dict[str, Any]) -> str:
    size = int(item.get("size") or 0)
    return f"{int(item.get('chat_id') or 0)}-{int(item.get('message_id') or 0)}-{size}"


def is_direct(item: Dict[str, Any]) -> bool:
    return item_ext(item) in DIRECT_EXT


def _clean_title(name: str) -> str:
    stem = Path(name or "").stem
    stem = re.sub(r"[\._]+", " ", stem)
    stem = re.sub(r"\[[^\]]*\]", " ", stem)
    stem = re.sub(r"\(\s*\d{3,4}p[^)]*\)", " ", stem, flags=re.I)
    stem = re.sub(r"\b(2160p|1080p|720p|480p|4k|webrip|web-dl|webdl|bluray|brrip|hdtv|"
                  r"x264|x265|h264|h265|hevc|aac|ac3|ddp?5\.1|yts(?:\.gg|\.bz)?|yify)\b",
                  " ", stem, flags=re.I)
    stem = re.sub(r"\s+", " ", stem).strip(" -")
    return stem or Path(name or "").stem


def _lang_name(code: str) -> str:
    code = (code or "").strip().lower()
    return LANGUAGES.get(code, code.upper() if code else "")


def _subtitle_label(name: str) -> tuple[str, str]:
    stem = Path(name or "").stem
    lang = ""
    match = _LANG_TOKEN_RE.search(stem)
    if match:
        code = match.group(1).lower()
        if code in LANGUAGES:
            lang = code
            stem = stem[: match.start()]
    label = re.sub(r"[\._]+", " ", stem).strip(" -")
    label = re.sub(r"\s+", " ", label)
    if not label:
        label = Path(name or "").stem
    return label, lang


def _stream_codec(rest: str) -> str:
    token = rest.split(",", 1)[0].strip()
    token = token.split(" ", 1)[0].strip().lower()
    return token


def _audio_channels(rest: str) -> str:
    lowered = rest.lower()
    for name in ("7.1", "5.1", "stereo", "mono"):
        if name in lowered:
            return name
    match = re.search(r"(\d+) channels", lowered)
    if match:
        return f"{match.group(1)} ch"
    return ""


def probe_file(path: Any, timeout: int = 120) -> Dict[str, Any]:
    """Read the streams of a local file or an http(s) URL."""
    ffmpeg = ffmpeg_path()
    if ffmpeg is None:
        raise PlaybackError("ffmpeg is not installed.")
    process = subprocess.Popen(
        [str(ffmpeg), "-hide_banner", "-nostdin", "-i", str(path)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
        creationflags=_NO_WINDOW,
    )
    try:
        _stdout, stderr = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        process.kill()
        _stdout, stderr = process.communicate()
    duration = 0.0
    match = _DURATION_RE.search(stderr)
    if match:
        duration = int(match.group(1)) * 3600 + int(match.group(2)) * 60 + float(match.group(3))
    video: List[Dict[str, Any]] = []
    audio: List[Dict[str, Any]] = []
    subs: List[Dict[str, Any]] = []
    current: Optional[Dict[str, Any]] = None
    for line in (stderr or "").splitlines():
        stream = _STREAM_RE.search(line)
        if stream:
            absolute, lang, kind, rest = stream.groups()
            codec = _stream_codec(rest)
            lang = (lang or "").lower()
            if lang in ("und", "unk", "unknown"):
                lang = ""
            entry: Dict[str, Any] = {"stream": int(absolute), "codec": codec, "lang": lang}
            if kind == "Video":
                entry["index"] = len(video)
                size = _SIZE_RE.search(rest)
                if size:
                    entry["width"] = int(size.group(1))
                    entry["height"] = int(size.group(2))
                video.append(entry)
            elif kind == "Audio":
                entry["index"] = len(audio)
                entry["channels"] = _audio_channels(rest)
                hz = _HZ_RE.search(rest)
                if hz:
                    entry["hz"] = int(hz.group(1))
                audio.append(entry)
            elif kind == "Subtitle":
                entry["index"] = len(subs)
                entry["text"] = codec in TEXT_SUB_CODECS or (
                    codec not in GRAPHIC_SUB_CODECS and "pgs" not in codec
                )
                entry["forced"] = "(forced)" in rest.lower()
                subs.append(entry)
            current = entry
            continue
        stripped = line.strip()
        if stripped.startswith(("Metadata:", "Stream #", "Input #", "Output #")):
            continue
        if current is not None and line.startswith("    ") and ":" in stripped:
            key, value = stripped.split(":", 1)
            key = key.strip().lower()
            value = value.strip()
            if key in ("title", "handler_name") and value:
                current.setdefault("title", value)
            elif key == "language" and value and not current.get("lang"):
                current["lang"] = value.lower()
        elif line and not line.startswith(" "):
            current = None
    for stream in subs:
        stream.setdefault("title", "")
        if stream.get("forced"):
            stream["title"] = (stream.get("title") or "Forced").strip()
    if not video:
        detail = (stderr or "").strip().splitlines()
        raise PlaybackError(detail[-1][:200] if detail else "No video track was found.")
    return {"duration": round(duration, 3), "video": video, "audio": audio, "subs": subs}


# ------------------------------------------------------------- subtitle files
def _decode_subtitle(raw: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-16", "cp1252", "latin-1"):
        try:
            return raw.decode(encoding)
        except (UnicodeDecodeError, UnicodeError):
            continue
    return raw.decode("utf-8", "replace")


def _srt_to_vtt(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n").lstrip("\ufeff")
    blocks = re.split(r"\n\s*\n", text)
    cues: List[str] = []
    for block in blocks:
        lines = [line.strip("\ufeff") for line in block.split("\n") if line.strip()]
        if not lines:
            continue
        if re.match(r"^\d+$", lines[0].strip()):
            lines = lines[1:]
        if not lines:
            continue
        timing = lines[0]
        match = re.match(
            r"(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*"
            r"(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})(.*)",
            timing,
        )
        if not match:
            continue
        start, end = _vtt_time(match, 1), _vtt_time(match, 5)
        settings = (match.group(9) or "").strip()
        body = "\n".join(lines[1:]) if len(lines) > 1 else ""
        body = re.sub(r"<\s*br\s*/?\s*>", "\n", body, flags=re.I)
        body = re.sub(r"\{\\[^}]*\}", "", body)
        cues.append(f"{start} --> {end}{(' ' + settings) if settings else ''}\n{body}".strip())
    if not cues:
        raise PlaybackError("The subtitle file has no readable cues.")
    return "WEBVTT\n\n" + "\n\n".join(cues) + "\n"


def _vtt_time(match: re.Match, offset: int) -> str:
    hours = int(match.group(offset))
    minutes = int(match.group(offset + 1))
    seconds = int(match.group(offset + 2))
    millis = int(match.group(offset + 3).ljust(3, "0")[:3])
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}.{millis:03d}"


def _ass_time(value: str) -> str:
    match = re.match(r"(\d+):(\d{2}):(\d{2})[.,](\d{1,2})", value.strip())
    if not match:
        return "00:00:00.000"
    hours = int(match.group(1))
    minutes = int(match.group(2))
    seconds = int(match.group(3))
    centis = int(match.group(4).ljust(2, "0")[:2])
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}.{centis * 10:03d}"


def _ass_to_vtt(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = text.split("\n")
    in_events = False
    fields: List[str] = []
    cues: List[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped.lower().startswith("[events]"):
            in_events = True
            continue
        if not in_events:
            continue
        if stripped.startswith("["):
            in_events = False
            continue
        if stripped.lower().startswith("format:"):
            fields = [part.strip().lower() for part in stripped.split(":", 1)[1].split(",")]
            continue
        if not stripped.lower().startswith("dialogue:") or not fields:
            continue
        body = stripped.split(":", 1)[1]
        parts = body.split(",", len(fields) - 1)
        if len(parts) < len(fields):
            continue
        row = dict(zip(fields, parts))
        start = _ass_time(row.get("start", ""))
        end = _ass_time(row.get("end", ""))
        value = (row.get("text") or "").strip()
        value = value.replace("\\N", "\n").replace("\\n", "\n").replace("\\h", " ")
        value = re.sub(r"\{[^}]*\}", "", value)
        if not value:
            continue
        cues.append(f"{start} --> {end}\n{value}")
    if not cues:
        raise PlaybackError("The subtitle file has no readable cues.")
    return "WEBVTT\n\n" + "\n\n".join(cues) + "\n"


def _microdvd_to_vtt(text: str) -> str:
    cues: List[str] = []
    fps = 23.976
    for line in text.splitlines():
        match = re.match(r"\{(\d+)\}\{(\d+)\}(.*)", line.strip())
        if not match:
            continue
        start = int(match.group(1)) / fps
        end = int(match.group(2)) / fps
        body = match.group(3).replace("|", "\n").strip()
        body = re.sub(r"\{[^}]*\}", "", body)
        if not body:
            continue
        cues.append(f"{_seconds_to_vtt(start)} --> {_seconds_to_vtt(end)}\n{body}")
    if not cues:
        raise PlaybackError("The subtitle file has no readable cues.")
    return "WEBVTT\n\n" + "\n\n".join(cues) + "\n"


def _seconds_to_vtt(value: float) -> str:
    millis = int(round(max(0.0, value) * 1000))
    hours, millis = divmod(millis, 3600000)
    minutes, millis = divmod(millis, 60000)
    seconds, millis = divmod(millis, 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}.{millis:03d}"


def convert_to_vtt(raw: bytes, name: str = "") -> str:
    if raw[:4] == b"PK\x03\x04":
        try:
            with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                for entry in archive.infolist():
                    if not entry.is_dir() and filetypes.extension(entry.filename) in SUBTITLE_EXT:
                        return convert_to_vtt(archive.read(entry), entry.filename)
        except zipfile.BadZipFile:
            pass
    if raw[:2] == b"\x1f\x8b":
        raw = gzip.decompress(raw)
    ext = filetypes.extension(name)
    if ext == ".sub" and b"\x00" in raw[:256]:
        raise PlaybackError("This is a bitmap subtitle file; use a text subtitle instead.")
    text = _decode_subtitle(raw)
    if ext in (".ass", ".ssa") or "[Script Info]" in text[:2000]:
        return _ass_to_vtt(text)
    if ext == ".sub" and "{" in text[:500]:
        return _microdvd_to_vtt(text)
    if text.lstrip("\ufeff").startswith("WEBVTT") and "-->" in text:
        normalized = text.replace("\r\n", "\n").replace("\r", "\n").lstrip("\ufeff")
        return normalized if normalized.endswith("\n") else normalized + "\n"
    return _srt_to_vtt(text)


_VTT_TIMING = re.compile(
    r"^(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3}) --> (?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})(.*)$"
)


def _vtt_seconds(hours: Any, minutes: str, seconds: str, millis: str) -> float:
    return int(hours or 0) * 3600 + int(minutes) * 60 + int(seconds) + int(millis) / 1000


def shift_vtt(text: str, shift: float) -> str:
    """Move every cue by `shift` seconds (positive = subtitles later)."""
    if abs(shift) < 0.001:
        return text
    lines: List[str] = []
    for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        match = _VTT_TIMING.match(line.strip())
        if not match:
            lines.append(line)
            continue
        start = _vtt_seconds(*match.groups()[:4]) + shift
        end = _vtt_seconds(*match.groups()[4:8]) + shift
        settings = match.group(9) or ""
        lines.append(
            f"{_seconds_to_vtt(max(0.0, start))} --> {_seconds_to_vtt(max(0.05, end))}{settings}"
        )
    body = "\n".join(lines)
    return body if body.endswith("\n") else body + "\n"


async def _download_item(state: Any, item: Dict[str, Any], target: Path) -> None:
    message, _size, _mime = await state.service.media_info(item)
    await state.service.download_to(message, target)


async def ensure_sidecar_vtt(state: Any, movie: Dict[str, Any], sub_item: Dict[str, Any]) -> Path:
    target = SIDE_DIR / f"{int(sub_item['id'])}-{int(sub_item.get('size') or 0)}.vtt"
    if target.is_file():
        return target
    SIDE_DIR.mkdir(parents=True, exist_ok=True)
    name = str(sub_item.get("name") or "subtitle.srt")
    raw_path = SIDE_DIR / f"{target.stem}{filetypes.extension(name) or '.srt'}"
    if not raw_path.is_file():
        message, _size, _mime = await state.service.media_info(sub_item)
        await state.service.download_to(message, raw_path)
    try:
        vtt = await asyncio.to_thread(convert_to_vtt, raw_path.read_bytes(), name)
    finally:
        raw_path.unlink(missing_ok=True)
    target.write_text(vtt, encoding="utf-8")
    return target


def sidecar_subtitles(catalog: Any, item: Dict[str, Any]) -> List[Dict[str, Any]]:
    folder = str(item.get("folder") or "")
    if not folder:
        return []
    try:
        entries = catalog.folder_items(folder, chat_id=item.get("chat_id"), include_hidden=False)
    except Exception:
        log.exception("sidecar scan failed")
        return []
    movie_folder = folder
    result: List[Dict[str, Any]] = []
    for entry in entries:
        if entry.get("id") == item.get("id"):
            continue
        name = str(entry.get("name") or "")
        if filetypes.extension(name) not in SUBTITLE_EXT:
            continue
        sub_folder = str(entry.get("folder") or "")
        if sub_folder != movie_folder:
            parent, _, leaf = sub_folder.rpartition("/")
            if parent != movie_folder or leaf.strip().lower() not in SUBTITLE_FOLDERS:
                continue
        label, lang = _subtitle_label(name)
        result.append({
            "id": int(entry["id"]),
            "name": name,
            "label": label,
            "lang": lang,
            "language": _lang_name(lang),
            "size": int(entry.get("size") or 0),
            "folder": sub_folder,
            "url": f"/api/play/{int(item['id'])}/subs/side/{int(entry['id'])}.vtt",
        })
    result.sort(key=lambda entry: (
        entry["language"] or entry["label"] or "zzz",
        "forced" in entry["label"].lower(),
        entry["label"].lower(),
    ))
    return result


# ---------------------------------------------------------------- preparing
_jobs: Dict[str, Dict[str, Any]] = {}
_jobs_lock = threading.Lock()
_prepare_lock: Optional[asyncio.Lock] = None


def _prepare_guard() -> asyncio.Lock:
    global _prepare_lock
    if _prepare_lock is None:
        _prepare_lock = asyncio.Lock()
    return _prepare_lock


def job_key(item: Dict[str, Any], video: str, audio: int) -> str:
    return f"{item_key(item)}-a{int(audio)}-{video}"


def job_status(item: Dict[str, Any], video: str, audio: int) -> Optional[Dict[str, Any]]:
    with _jobs_lock:
        job = _jobs.get(job_key(item, video, audio))
        return dict(job) if job else None


def _update(job: Dict[str, Any], **values: Any) -> None:
    job.update(values)


def _run_ffmpeg(args: List[str], job: Optional[Dict[str, Any]] = None,
                duration: float = 0.0, capture_stdout: bool = False,
                timeout: float = 0.0) -> bytes:
    ffmpeg = ffmpeg_path()
    if ffmpeg is None:
        raise PlaybackError("ffmpeg is not installed.")
    command = [str(ffmpeg), "-y", "-hide_banner", "-nostdin", "-loglevel", "warning"]
    command += args
    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE if capture_stdout else subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=False,
        creationflags=_NO_WINDOW,
    )
    watchdog = threading.Timer(timeout, process.kill) if timeout else None
    if watchdog:
        watchdog.start()
    errors: List[str] = []
    output = bytearray()

    def read_stdout() -> None:
        if not capture_stdout or process.stdout is None:
            return
        while True:
            chunk = process.stdout.read(65536)
            if not chunk:
                break
            output.extend(chunk)

    reader = threading.Thread(target=read_stdout, daemon=True) if capture_stdout else None
    if reader:
        reader.start()
    for raw_line in process.stderr or []:
        line = raw_line.decode("utf-8", "replace")
        if job is not None and duration > 0:
            match = _TIME_RE.search(line)
            if match:
                done = int(match.group(1)) * 3600 + int(match.group(2)) * 60 + float(match.group(3))
                _update(job, progress=max(0.0, min(0.99, done / duration)),
                        stage=f"Preparing video {int(done / duration * 100)}%")
        stripped = line.strip()
        if stripped and "error" in stripped.lower():
            errors.append(stripped)
            errors = errors[-6:]
    code = process.wait()
    if watchdog:
        watchdog.cancel()
    if reader:
        reader.join(timeout=10)
    if code != 0:
        detail = errors[-1] if errors else "ffmpeg failed."
        raise PlaybackError(detail[:300])
    return bytes(output)


def extract_embedded(source: Any, directory: Path, index: int) -> Optional[Path]:
    """Convert one embedded subtitle track (from a file or a URL) to WebVTT."""
    target = directory / f"emb-{int(index)}.vtt"
    if target.is_file():
        return target
    data = _run_ffmpeg(
        ["-i", str(source), "-map", f"0:s:{int(index)}", "-f", "webvtt", "-"],
        capture_stdout=True,
        timeout=180,
    )
    if not data.strip():
        return None
    target.write_bytes(data)
    return target


def _remux(source: Path, target: Path, info: Dict[str, Any], video_mode: str,
           audio_index: int, job: Dict[str, Any]) -> None:
    video = (info.get("video") or [{}])[0]
    codec = str(video.get("codec") or "")
    audio_streams = info.get("audio") or []
    if not audio_streams:
        raise PlaybackError("This file has no audio track.")
    audio_index = max(0, min(int(audio_index), len(audio_streams) - 1))
    audio = audio_streams[audio_index]
    args: List[str] = ["-i", str(source), "-sn", "-dn", "-map_metadata", "-1"]
    args += ["-map", "0:v:0", "-map", f"0:a:{audio_index}"]
    if video_mode == "copy" and codec in COPY_VIDEO:
        args += ["-c:v", "copy"]
        if codec == "hevc":
            args += ["-tag:v", "hvc1"]
    else:
        args += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p"]
    if str(audio.get("codec") or "") in COPY_AUDIO:
        args += ["-c:a", "copy"]
    else:
        args += ["-c:a", "aac", "-b:a", "192k"]
    language = str(audio.get("lang") or "")
    if re.fullmatch(r"[a-zA-Z]{2,3}", language):
        args += ["-metadata:s:a:0", f"language={language}"]
    args += [
        "-movflags", "+faststart",
        "-max_muxing_queue_size", "4096",
        "-avoid_negative_ts", "make_zero",
        str(target),
    ]
    partial = target.with_suffix(".part.mp4")
    partial.unlink(missing_ok=True)
    try:
        _run_ffmpeg(args[:-1] + [str(partial)], job=job, duration=float(info.get("duration") or 0))
        os.replace(partial, target)
    finally:
        partial.unlink(missing_ok=True)


def _extract_subtitles(source: Any, directory: Path, info: Dict[str, Any],
                       job: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """Convert embedded text subtitle tracks to WebVTT next to the movie."""
    subs: List[Dict[str, Any]] = []
    text_subs = [stream for stream in (info.get("subs") or []) if stream.get("text")]
    for count, stream in enumerate(text_subs):
        if job is not None:
            job["stage"] = f"Extracting subtitles {count + 1}/{len(text_subs)}"
        try:
            written = extract_embedded(source, directory, stream["index"])
        except PlaybackError:
            written = None
        if written is None:
            log.info("subtitle track %s could not be extracted", stream["index"])
            continue
        subs.append({
            "id": f"emb:{stream['index']}",
            "index": stream["index"],
            "label": stream.get("title") or _lang_name(stream.get("lang") or "") or f"Subtitle {stream['index'] + 1}",
            "lang": stream.get("lang") or "",
            "language": _lang_name(stream.get("lang") or ""),
            "kind": "embedded",
            "url": f"emb:{stream['index']}",
        })
    return subs


def evict_old(directory: Path) -> None:
    try:
        if not PLAY_DIR.is_dir():
            return
        entries = [entry for entry in PLAY_DIR.iterdir() if entry.is_dir() and entry != directory]
        total = sum(_dir_size(entry) for entry in entries)
        for entry in sorted(entries, key=lambda path: path.stat().st_mtime):
            if total <= CACHE_LIMIT:
                break
            total -= _dir_size(entry)
            shutil.rmtree(entry, ignore_errors=True)
    except OSError:
        log.exception("playback cache cleanup failed")


def _dir_size(path: Path) -> int:
    total = 0
    try:
        for root, _dirs, files in os.walk(path):
            for name in files:
                try:
                    total += os.path.getsize(os.path.join(root, name))
                except OSError:
                    pass
    except OSError:
        pass
    return total


async def prepare(state: Any, item: Dict[str, Any], video_mode: str = "copy",
                  audio_index: int = 0) -> None:
    key = job_key(item, video_mode, audio_index)
    with _jobs_lock:
        existing = _jobs.get(key)
        if existing and existing.get("state") in ("queued", "downloading", "probing", "remuxing", "subtitles"):
            return
        job: Dict[str, Any] = {
            "key": key, "state": "queued", "stage": "Waiting…", "progress": 0.0,
            "error": "", "video": video_mode, "audio": int(audio_index),
        }
        _jobs[key] = job
    try:
        if ffmpeg_path() is None:
            raise PlaybackError("ffmpeg is not installed on this PC.")
        directory = PLAY_DIR / item_key(item)
        directory.mkdir(parents=True, exist_ok=True)
        message, size, _mime = await state.service.media_info(item)
        source = directory / f"source{item_ext(item) or '.bin'}"
        meta_path = directory / f"meta-a{int(audio_index)}-{video_mode}.json"
        if meta_path.is_file():
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            _update(job, state="ready", stage="Ready", progress=1.0, **meta)
            return
        async with _prepare_guard():
            # Re-check after waiting: another request may have finished it.
            if meta_path.is_file():
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
                _update(job, state="ready", stage="Ready", progress=1.0, **meta)
                return
            if not source.is_file() or source.stat().st_size < max(1, int(size or 0)):
                _update(job, state="downloading", stage="Downloading from Telegram…", progress=0.0)

                def progress(done: int, total: int) -> None:
                    ratio = (done / total) if total else 0.0
                    _update(job, progress=max(0.0, min(0.99, ratio)),
                            stage=f"Downloading {int(ratio * 100)}%")

                await state.service.download_to(message, source, progress)
            _update(job, state="probing", stage="Reading tracks…", progress=0.0)
            info = await asyncio.to_thread(probe_file, source)
            _update(job, duration=float(info.get("duration") or 0),
                    audio_tracks=info.get("audio") or [])
            target = directory / f"movie-a{int(audio_index)}-{video_mode}.mp4"
            # MP4/M4V already streams; "copy" only needs a remux to pick a
            # second audio track out of the file.
            remux = (
                video_mode != "copy"
                or not is_direct(item)
                or len(info.get("audio") or []) > 1
            )
            if remux and not target.is_file():
                _update(job, state="remuxing", stage="Preparing video…", progress=0.0)
                await asyncio.to_thread(_remux, source, target, info, video_mode, audio_index, job)
            _update(job, state="subtitles", stage="Extracting subtitles…", progress=0.0)
            subs = await asyncio.to_thread(_extract_subtitles, source, directory, info, job)
            meta = {
                "duration": float(info.get("duration") or 0),
                "video_tracks": info.get("video") or [],
                "audio_tracks": [
                    {
                        "index": stream["index"],
                        "lang": stream.get("lang") or "",
                        "language": _lang_name(stream.get("lang") or ""),
                        "codec": stream.get("codec") or "",
                        "channels": stream.get("channels") or "",
                        "title": stream.get("title") or "",
                    }
                    for stream in (info.get("audio") or [])
                ],
                "embedded": subs,
                "source_url": (
                    f"/api/play/{int(item['id'])}/video?video={video_mode}&audio={int(audio_index)}"
                    if remux else f"/api/play/{int(item['id'])}/video"
                ),
            }
            meta_path.write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
            _update(job, state="ready", stage="Ready", progress=1.0, **meta)
        # Re-downloading a 2 GB movie just to switch audio is wasteful, so the
        # original is kept when there is more than one audio track to pick from.
        if len(info.get("audio") or []) <= 1:
            source.unlink(missing_ok=True)
        await asyncio.to_thread(evict_old, directory)
    except Exception as exc:
        log.warning("playback prepare failed: %s", exc)
        _update(job, state="error", stage="Could not prepare this movie.", error=str(exc)[:300])


def embedded_path(item: Dict[str, Any], index: int) -> Optional[Path]:
    target = PLAY_DIR / item_key(item) / f"emb-{int(index)}.vtt"
    return target if target.is_file() else None


def prepared_source(item: Dict[str, Any], video_mode: str, audio_index: int) -> Optional[Path]:
    target = PLAY_DIR / item_key(item) / f"movie-a{int(audio_index)}-{video_mode}.mp4"
    return target if target.is_file() else None


def cached_probe(item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    path = PLAY_DIR / item_key(item) / "tracks.json"
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return data if isinstance(data, dict) else None


def probe_source(item: Dict[str, Any], source: Any, timeout: int = 90) -> Dict[str, Any]:
    """Probe and remember the stream list; cached per movie."""
    cached = cached_probe(item)
    if cached:
        return cached
    info = probe_file(source, timeout=timeout)
    directory = PLAY_DIR / item_key(item)
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "tracks.json").write_text(
        json.dumps(info, ensure_ascii=False), encoding="utf-8"
    )
    return info


def public_tracks(info: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    info = info or {}
    return {
        "duration": float(info.get("duration") or 0),
        "video": [
            {
                "codec": stream.get("codec") or "",
                "width": int(stream.get("width") or 0),
                "height": int(stream.get("height") or 0),
            }
            for stream in (info.get("video") or [])
        ],
        "audio": [
            {
                "index": int(stream.get("index") or 0),
                "lang": stream.get("lang") or "",
                "language": _lang_name(stream.get("lang") or ""),
                "codec": stream.get("codec") or "",
                "channels": stream.get("channels") or "",
                "title": stream.get("title") or "",
            }
            for stream in (info.get("audio") or [])
        ],
        "embedded": [
            {
                "id": f"emb:{stream['index']}",
                "index": int(stream["index"]),
                "label": stream.get("title") or _lang_name(stream.get("lang") or "")
                         or f"Subtitle {int(stream['index']) + 1}",
                "lang": stream.get("lang") or "",
                "language": _lang_name(stream.get("lang") or ""),
                "forced": bool(stream.get("forced")),
                "kind": "embedded",
            }
            for stream in (info.get("subs") or [])
            if stream.get("text")
        ],
        "graphic": [
            _lang_name(stream.get("lang") or "") or "PGS"
            for stream in (info.get("subs") or [])
            if not stream.get("text")
        ],
    }


def latest_job(item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    prefix = item_key(item) + "-"
    with _jobs_lock:
        found = [
            job for key, job in _jobs.items()
            if key.startswith(prefix) and job.get("state") != "queued"
        ]
    if not found:
        return None
    return dict(found[-1])


# --------------------------------------------------------------- play tokens
# libVLC on Android opens the media URL itself and cannot send the session
# cookie, so short-lived tokens are minted for one movie and accepted by the
# local server for that movie's media and subtitle routes only.
_tokens: Dict[str, Dict[str, Any]] = {}
_token_lock = threading.Lock()
TOKEN_TTL = 6 * 3600


def mint_token(item_id: int) -> str:
    token = secrets.token_urlsafe(18)
    with _token_lock:
        now = time.time()
        for old, entry in list(_tokens.items()):
            if entry["expires"] < now:
                _tokens.pop(old, None)
        _tokens[token] = {"item": int(item_id), "expires": now + TOKEN_TTL}
    return token


def token_allows(token: Optional[str], path: str) -> bool:
    if not token:
        return False
    with _token_lock:
        entry = _tokens.get(token)
        if not entry:
            return False
        if entry["expires"] < time.time():
            _tokens.pop(token, None)
            return False
    item_id = entry["item"]
    return (
        path == f"/api/stream/{item_id}"
        or path == f"/api/file/{item_id}"
        or path.startswith(f"/api/play/{item_id}/")
        or path.startswith("/api/play/subs/")
    )


# ------------------------------------------------------------ online subtitles
ONLINE_UA = "TemporaryUserAgent"
ONLINE_HOSTS = {"dl.opensubtitles.org", "www.opensubtitles.org", "opensubtitles.org"}


def _http_get(url: str, timeout: int = 25) -> bytes:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": ONLINE_UA, "X-User-Agent": ONLINE_UA},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        data = response.read(ONLINE_LIMIT + 1)
    if len(data) > ONLINE_LIMIT:
        raise PlaybackError("That subtitle file is too large.")
    return data


def online_search(item: Dict[str, Any], query: str = "", lang: str = "eng") -> List[Dict[str, Any]]:
    lang = re.sub(r"[^a-zA-Z]", "", lang or "")[:3] or "eng"
    imdb = re.sub(r"[^0-9]", "", str(item.get("imdb_id") or ""))
    criteria = ""
    if imdb:
        criteria = f"imdbid-{imdb}"
    else:
        text = (query or "").strip() or _clean_title(str(item.get("name") or ""))
        text = re.sub(r"\s+", " ", text)[:80]
        if not text:
            raise PlaybackError("Enter a movie name to search for subtitles.")
        criteria = "query-" + urllib.parse.quote(text, safe="")
    url = f"https://rest.opensubtitles.org/search/{criteria}/sublanguageid-{lang}"
    try:
        raw = _http_get(url)
    except Exception as exc:
        raise PlaybackError(f"Subtitle search failed: {exc}") from exc
    try:
        data = json.loads(raw.decode("utf-8", "replace"))
    except ValueError as exc:
        raise PlaybackError("The subtitle service returned an unreadable reply.") from exc
    if not isinstance(data, list):
        return []
    results: List[Dict[str, Any]] = []
    seen = set()
    for row in data:
        link = str(row.get("SubDownloadLink") or "")
        name = str(row.get("SubFileName") or "")
        fmt = str(row.get("SubFormat") or "").lower()
        if not link or not name or fmt not in {"srt", "ass", "ssa", "vtt", "sub"}:
            continue
        fingerprint = (name.lower(), str(row.get("SubLanguageID") or ""))
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        code = str(row.get("SubLanguageID") or "")
        results.append({
            "id": str(row.get("IDSubtitleFile") or ""),
            "name": name,
            "language": _lang_name(code) or code.upper(),
            "lang": code,
            "format": fmt.upper(),
            "downloads": int(row.get("SubDownloadsCnt") or 0),
            "release": str(row.get("MovieReleaseName") or ""),
            "rating": str(row.get("SubRating") or ""),
            "url": link,
        })
        if len(results) >= 30:
            break
    return results


def online_download(url: str, label: str = "") -> Dict[str, Any]:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("https", "http") or (parsed.hostname or "").lower() not in ONLINE_HOSTS:
        raise PlaybackError("That subtitle link is not from OpenSubtitles.")
    raw = _http_get(url, timeout=40)
    name = parsed.path.rsplit("/", 1)[-1] or "subtitle.srt"
    vtt = convert_to_vtt(raw, name)
    digest = hashlib.sha1(vtt.encode("utf-8")).hexdigest()[:20]
    ONLINE_DIR.mkdir(parents=True, exist_ok=True)
    target = ONLINE_DIR / f"{digest}.vtt"
    if not target.is_file():
        target.write_text(vtt, encoding="utf-8")
    return {
        "url": f"/api/play/subs/online/{digest}.vtt",
        "label": label or Path(name).stem,
    }
