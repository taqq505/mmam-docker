import os
from collections import deque
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from app.auth import require_roles

router = APIRouter()

LOG_FILES = {
    "api": "api.log",
    "audit": "audit.log"
}


def _log_root() -> Path:
    configured = Path(os.getenv("LOG_DIR", "/log"))
    if configured.exists():
        return configured
    fallback = Path("./logs")
    if fallback.exists():
        return fallback
    fallback.mkdir(parents=True, exist_ok=True)
    return fallback


def _resolve_log(kind: str) -> Path:
    if kind not in LOG_FILES:
        raise HTTPException(status_code=400, detail="Unknown log type")
    path = _log_root() / LOG_FILES[kind]
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"{kind} log not found")
    return path


def _tail_file(path: Path, max_lines: int) -> list[str]:
    with path.open("r", encoding="utf-8", errors="ignore") as fh:
        dq = deque(fh, maxlen=max_lines)
    return [line.rstrip("\n") for line in dq]


@router.get("/logs")
def read_log_lines(
    kind: str = Query(..., regex="^(api|audit)$"),
    lines: int = Query(200, ge=1, le=2000),
    user=Depends(require_roles("admin"))
):
    path = _resolve_log(kind)
    entries = _tail_file(path, lines)
    return {
        "kind": kind,
        "path": str(path),
        "lines": entries,
        "line_count": len(entries)
    }


def _stream_file(path: Path, chunk_size: int = 1024 * 64):
    with path.open("rb") as fh:
        while True:
            chunk = fh.read(chunk_size)
            if not chunk:
                break
            yield chunk


@router.get("/logs/download")
def download_log(
    kind: str = Query(..., regex="^(api|audit)$"),
    user=Depends(require_roles("admin"))
):
    path = _resolve_log(kind)
    filename = f"mmam-{kind}-log.txt"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(_stream_file(path), media_type="text/plain", headers=headers)
