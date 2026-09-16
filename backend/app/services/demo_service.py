"""
Synthetic Scene Generator
===========================
Generates deterministic, parametrized synthetic remote-sensing scenes with
known land-cover composition (water/vegetation/built-up amounts), plus a
matching pseudo-SAR backscatter rendering.

This module is used by:
  - backend/app/evaluation/eval_runner.py — to compute honest "DEMO RESULTS"
    metrics (accuracy/IoU) against labeled synthetic data when a real
    benchmark dataset (VRSBench/RSVQA/CDVQA) is not present.
  - training/train_sklearn_classifier.py — to build the labeled training
    set for the synthetic land-cover classifier.

NOTE: The user-facing "Demo Mode" feature (preloaded scenario runner,
/api/demo/* endpoints, Evaluation-page demo section) has been removed from
the application. This module only provides the underlying scene-generation
primitives that the evaluation and training pipelines still depend on.
"""
from __future__ import annotations
import numpy as np
import cv2


def _base_scene(seed: int, urban_amount: float, water_amount: float, veg_amount: float, size=384) -> np.ndarray:
    rng = np.random.RandomState(seed)
    img = np.zeros((size, size, 3), dtype=np.float32)

    # vegetation base (green, textured)
    veg_noise = rng.normal(0, 1, (size, size))
    veg_noise = cv2.GaussianBlur(veg_noise, (0, 0), 8)
    veg_range = veg_noise.max() - veg_noise.min()
    img[..., 1] += 90 + 40 * (veg_noise - veg_noise.min()) / (veg_range + 1e-6)
    img[..., 0] += 40
    img[..., 2] += 30

    # water patch (blue, bottom-left region scaled by water_amount)
    yy, xx = np.mgrid[0:size, 0:size]
    cx, cy = size * 0.25, size * 0.7
    water_mask = ((xx - cx) ** 2 / (120 * water_amount + 5) ** 2 +
                  (yy - cy) ** 2 / (70 * water_amount + 5) ** 2) < 1
    img[water_mask] = [30, 80, 160]

    # built-up patch (gray, grid-like, top-right, scaled by urban_amount)
    n_blocks = int(4 + urban_amount * 10)
    block_size = size // 12
    for i in range(n_blocks):
        bx = int(size * 0.55 + (i % 5) * block_size * 1.1)
        by = int(size * 0.15 + (i // 5) * block_size * 1.1)
        if bx + block_size < size and by + block_size < size:
            shade = 150 + rng.randint(-20, 20)
            img[by:by + block_size, bx:bx + block_size] = [shade, shade, shade + 5]

    img = np.clip(img, 0, 255).astype(np.uint8)
    img = cv2.GaussianBlur(img, (3, 3), 0)
    return img


def _pseudo_sar_from_optical(optical: np.ndarray, seed: int) -> np.ndarray:
    gray = cv2.cvtColor(optical, cv2.COLOR_RGB2GRAY).astype(np.float32)
    rng = np.random.RandomState(seed)
    speckle = rng.gamma(shape=4.0, scale=0.25, size=gray.shape)
    sar = gray * speckle
    sar = np.clip(sar, 0, 255).astype(np.uint8)
    return np.stack([sar, sar, sar], axis=-1)
