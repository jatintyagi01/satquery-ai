"""File upload handling, validation and metadata caching."""
from __future__ import annotations
import shutil
from pathlib import Path
from typing import Dict
from fastapi import UploadFile, HTTPException

from ..core_config import UPLOAD_DIR, MAX_UPLOAD_MB, ALLOWED_EXTENSIONS
from ..tools import geo_io

# In-memory cache mapping file_id -> {array, meta, path}. For a demo-scale
# SIH app this avoids re-decoding images on every analysis call while
# keeping the architecture simple. A production deployment would persist
# this in object storage / a proper cache layer.
_IMAGE_CACHE: Dict[str, dict] = {}


def _sanitize_filename(name: str) -> str:
    keep = "".join(c for c in name if c.isalnum() or c in "._-")
    return keep or "upload"


def save_upload(file: UploadFile) -> Dict:
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400,
                             detail=f"Unsupported format '{ext}'. Please upload GeoTIFF, TIFF, PNG, or JPEG.")

    file_id = geo_io.new_file_id()
    safe_name = _sanitize_filename(file.filename)
    dest_path = UPLOAD_DIR / f"{file_id}_{safe_name}"

    with dest_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    size_mb = dest_path.stat().st_size / (1024 * 1024)
    if size_mb > MAX_UPLOAD_MB:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400,
                             detail=f"File exceeds maximum allowed size of {MAX_UPLOAD_MB} MB.")

    loaded = geo_io.load_image(str(dest_path))
    loaded.meta["filename"] = file.filename  # preserve original name for display
    preview_path = UPLOAD_DIR / f"{file_id}_preview.png"
    geo_io.save_preview(loaded.array, str(preview_path))

    record = {
        "file_id": file_id,
        "path": str(dest_path),
        "array": loaded.array,
        "meta": loaded.meta,
        "preview_url": f"/api/files/{preview_path.name}",
    }
    _IMAGE_CACHE[file_id] = record
    return record


def get_image(file_id: str) -> Dict:
    if file_id not in _IMAGE_CACHE:
        # Attempt lazy reload from disk if server restarted
        matches = list(UPLOAD_DIR.glob(f"{file_id}_*"))
        matches = [m for m in matches if "preview" not in m.name]
        if not matches:
            raise HTTPException(status_code=404, detail=f"Image '{file_id}' not found. Please re-upload.")
        loaded = geo_io.load_image(str(matches[0]))
        _IMAGE_CACHE[file_id] = {
            "file_id": file_id, "path": str(matches[0]), "array": loaded.array, "meta": loaded.meta,
            "preview_url": f"/api/files/{file_id}_preview.png",
        }
    return _IMAGE_CACHE[file_id]
