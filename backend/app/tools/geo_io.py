"""
Geospatial image I/O and metadata extraction.

Uses rasterio when available (GeoTIFF/TIFF, CRS, bounds, bands).
Falls back to Pillow for PNG/JPEG or when rasterio cannot open a file.
Always returns a normalized numpy array (H, W, C) in [0, 255] uint8 for
downstream processing, plus a metadata dict.
"""
from __future__ import annotations
import os
import uuid
from pathlib import Path
from typing import Optional
import numpy as np
from PIL import Image

try:
    import rasterio
    from rasterio.errors import RasterioIOError
    HAVE_RASTERIO = True
except Exception:
    HAVE_RASTERIO = False


class LoadedImage:
    def __init__(self, array: np.ndarray, meta: dict):
        self.array = array  # (H, W, C) uint8
        self.meta = meta


def _normalize_band(band: np.ndarray) -> np.ndarray:
    band = band.astype(np.float32)
    finite = band[np.isfinite(band)]
    if finite.size == 0:
        return np.zeros_like(band, dtype=np.uint8)
    lo, hi = np.percentile(finite, 2), np.percentile(finite, 98)
    if hi <= lo:
        lo, hi = finite.min(), finite.max() if finite.max() > finite.min() else finite.min() + 1
    band = np.clip((band - lo) / (hi - lo + 1e-6), 0, 1)
    return (band * 255).astype(np.uint8)


def _guess_modality(bands: int, ext: str, band_means: Optional[list] = None) -> str:
    """Heuristic modality detection.
    SAR: usually 1 band, high dynamic range speckle-like noise.
    Multispectral: >4 bands.
    Optical: 3 bands (RGB) typical of PNG/JPEG or Sentinel-2 true color.
    """
    if bands == 1:
        return "sar"
    if bands and bands > 4:
        return "multispectral"
    return "optical"


def load_image(path: str) -> LoadedImage:
    ext = Path(path).suffix.lower()
    meta = {
        "filename": Path(path).name,
        "size_bytes": os.path.getsize(path),
        "format": ext.replace(".", "").upper(),
        "crs": None,
        "bounds": None,
        "acquisition_date": None,
        "warnings": [],
    }

    if HAVE_RASTERIO and ext in (".tif", ".tiff"):
        try:
            with rasterio.open(path) as ds:
                bands = ds.count
                data = ds.read()  # (bands, H, W)
                meta["width"] = ds.width
                meta["height"] = ds.height
                meta["bands"] = bands
                meta["dtype"] = str(ds.dtypes[0])
                if ds.crs:
                    meta["crs"] = str(ds.crs)
                if ds.bounds:
                    meta["bounds"] = [ds.bounds.left, ds.bounds.bottom, ds.bounds.right, ds.bounds.top]
                tags = ds.tags()
                meta["acquisition_date"] = tags.get("TIFFTAG_DATETIME") or tags.get("acquisition_date")

                band_means = [float(np.nanmean(data[i])) for i in range(bands)]
                meta["modality_guess"] = _guess_modality(bands, ext, band_means)

                if bands >= 3:
                    rgb = np.stack([_normalize_band(data[i]) for i in range(min(3, bands))], axis=-1)
                elif bands == 1:
                    single = _normalize_band(data[0])
                    rgb = np.stack([single, single, single], axis=-1)
                else:
                    single = _normalize_band(data[0])
                    rgb = np.stack([single, single, single], axis=-1)
                return LoadedImage(rgb, meta)
        except RasterioIOError as e:
            meta["warnings"].append(f"rasterio could not parse georeferencing ({e}); falling back to PIL.")
        except Exception as e:
            meta["warnings"].append(f"Unexpected error reading GeoTIFF ({e}); falling back to PIL.")

    # Fallback: Pillow (also handles PNG/JPEG and non-georeferenced TIFF)
    try:
        img = Image.open(path)
        img.load()
        n_bands = len(img.getbands())
        meta["width"], meta["height"] = img.size
        meta["bands"] = n_bands
        meta["dtype"] = str(np.array(img).dtype)
        meta["modality_guess"] = _guess_modality(n_bands, ext)
        if img.mode not in ("RGB",):
            img_rgb = img.convert("RGB")
        else:
            img_rgb = img
        arr = np.array(img_rgb)
        return LoadedImage(arr, meta)
    except Exception as e:
        meta["warnings"].append(f"Failed to load image: {e}")
        arr = np.zeros((256, 256, 3), dtype=np.uint8)
        meta["width"], meta["height"], meta["bands"] = 256, 256, 3
        meta["modality_guess"] = "unknown"
        return LoadedImage(arr, meta)


def save_preview(array: np.ndarray, out_path: str) -> str:
    Image.fromarray(array.astype(np.uint8)).save(out_path)
    return out_path


def new_file_id() -> str:
    return uuid.uuid4().hex[:12]
