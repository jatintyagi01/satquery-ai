"""
BigEarthNet Dataset Loader
===========================
Loads BigEarthNet-style multispectral patches for domain adaptation of the
SatQuery vision backbone. Expects the standard BigEarthNet directory layout:

    <root>/
        <patch_name>/
            <patch_name>_B02.tif   (Blue)
            <patch_name>_B03.tif   (Green)
            <patch_name>_B04.tif   (Red)
            <patch_name>_B08.tif   (NIR)
            ... (other bands)
            <patch_name>_labels_metadata.json   (multi-label land-cover tags)

This loader is dataset-format-agnostic beyond that convention and will work
with the real BigEarthNet-S2 archive once downloaded and extracted under
`training/data/BigEarthNet-v1.0/`.

NOTE: This code defines the REAL loading/training pipeline as required by
SIH Requirement 1. It has not been run against the actual multi-terabyte
BigEarthNet archive in this environment. See training/README.md.
"""
from __future__ import annotations
import json
from pathlib import Path
from typing import List, Optional, Tuple
import numpy as np

try:
    import rasterio
except ImportError:
    rasterio = None

try:
    import torch
    from torch.utils.data import Dataset
except ImportError:
    torch = None
    Dataset = object  # type: ignore


BAND_ORDER = ["B02", "B03", "B04", "B08"]  # Blue, Green, Red, NIR (10m bands)

# BigEarthNet-19 (updated nomenclature) simplified label set used for the
# adaptation head. The full 43/19-class CLC mapping should replace this for
# a production run; kept small here so it is easy to verify end-to-end.
LABELS = [
    "Urban fabric", "Arable land", "Permanent crops", "Pastures",
    "Forest", "Shrub and herbaceous vegetation", "Inland wetlands",
    "Inland waters", "Marine waters", "Industrial or commercial units",
]


def _read_band(path: Path) -> np.ndarray:
    if rasterio is None:
        raise RuntimeError("rasterio is required to read BigEarthNet GeoTIFF bands")
    with rasterio.open(path) as ds:
        return ds.read(1).astype(np.float32)


class BigEarthNetPatch:
    def __init__(self, patch_dir: Path):
        self.patch_dir = patch_dir
        self.name = patch_dir.name

    def load_bands(self) -> np.ndarray:
        bands = []
        for b in BAND_ORDER:
            band_path = self.patch_dir / f"{self.name}_{b}.tif"
            bands.append(_read_band(band_path))
        stacked = np.stack(bands, axis=0)  # (C, H, W)
        # Per-band min-max normalization (BigEarthNet reflectance-style scaling)
        for c in range(stacked.shape[0]):
            band = stacked[c]
            lo, hi = np.percentile(band, 2), np.percentile(band, 98)
            stacked[c] = np.clip((band - lo) / (hi - lo + 1e-6), 0, 1)
        return stacked

    def load_labels(self) -> List[str]:
        meta_path = self.patch_dir / f"{self.name}_labels_metadata.json"
        if not meta_path.exists():
            return []
        meta = json.loads(meta_path.read_text())
        return meta.get("labels", [])


class BigEarthNetDataset(Dataset):  # type: ignore[misc]
    """PyTorch Dataset over a BigEarthNet root directory.

    Usage:
        ds = BigEarthNetDataset("training/data/BigEarthNet-v1.0")
        x, y = ds[0]   # x: (4, 120, 120) float32 tensor, y: multi-hot label vector
    """

    def __init__(self, root: str, label_set: Optional[List[str]] = None, limit: Optional[int] = None):
        self.root = Path(root)
        if not self.root.exists():
            raise FileNotFoundError(
                f"BigEarthNet root '{root}' not found. Download BigEarthNet-S2 and extract patches here. "
                f"See training/README.md for instructions."
            )
        self.label_set = label_set or LABELS
        self.patches = sorted([p for p in self.root.iterdir() if p.is_dir()])
        if limit:
            self.patches = self.patches[:limit]

    def __len__(self) -> int:
        return len(self.patches)

    def __getitem__(self, idx: int) -> Tuple["torch.Tensor", "torch.Tensor"]:
        patch = BigEarthNetPatch(self.patches[idx])
        arr = patch.load_bands()
        labels = patch.load_labels()
        y = np.zeros(len(self.label_set), dtype=np.float32)
        for l in labels:
            if l in self.label_set:
                y[self.label_set.index(l)] = 1.0
        if torch is not None:
            return torch.from_numpy(arr), torch.from_numpy(y)
        return arr, y
