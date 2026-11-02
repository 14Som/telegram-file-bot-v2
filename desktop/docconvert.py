"""Convert legacy Word files to PDF with the Word installed on this PC.

Word is the only dependable .doc renderer on Windows, so the app drives it
headlessly for one document at a time and caches the result next to the other
reader caches.
"""

from __future__ import annotations

import os
import subprocess
from pathlib import Path

SCRIPT = r"""
$ErrorActionPreference = "Stop"
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($env:TFE_DOC_SRC, $false, $true)
    try { $doc.ExportAsFixedFormat($env:TFE_DOC_OUT, 17) }
    finally { $doc.Close(0) }
}
finally {
    $word.Quit()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
}
"""


class ConversionError(RuntimeError):
    """A message the reader can show when Word cannot open the file."""


def available() -> bool:
    return os.name == "nt"


def convert_to_pdf(source: Path, target: Path, timeout: float = 180.0) -> Path:
    if not available():
        raise ConversionError("Word conversion needs Windows and Microsoft Word.")
    source = Path(source)
    target = Path(target)
    script = target.with_suffix(".ps1")
    script.write_text(SCRIPT, encoding="utf-8")
    env = os.environ.copy()
    env["TFE_DOC_SRC"] = str(source)
    env["TFE_DOC_OUT"] = str(target)
    try:
        result = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(script),
            ],
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except FileNotFoundError as exc:
        raise ConversionError("Microsoft Word is not installed on this PC.") from exc
    except subprocess.TimeoutExpired as exc:
        raise ConversionError("Word took too long to open this document.") from exc
    finally:
        script.unlink(missing_ok=True)
    if result.returncode != 0 or not target.is_file():
        # Word's own text is noisy; the reader only needs the gist.
        raise ConversionError(
            "Microsoft Word could not open this .doc file. It may be damaged "
            "or password protected."
        )
    return target
