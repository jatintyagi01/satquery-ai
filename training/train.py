"""
Domain Adaptation Training Script
===================================
Fine-tunes a lightweight CNN backbone on BigEarthNet multi-label land-cover
classification. The resulting backbone/checkpoint is what the fallback
SatQuery vision tools would be replaced with (see MODEL_REGISTRY model_path
fields and backend/app/tools/vision_tools.py) to move from heuristic
inference to a domain-adapted model.

Run:
    python training/train.py --config training/config.yaml

Requires the BigEarthNet-S2 archive to be downloaded and extracted under
the path configured in config.yaml. This script is REAL, runnable training
code -- it is not executed against the full dataset in this build because
the dataset (~66GB) and GPU compute are not available in this environment.
A short smoke-test mode (--smoke-test) runs on a tiny synthetic stand-in
so the pipeline itself can be verified end-to-end.
"""
from __future__ import annotations
import argparse
import sys
from pathlib import Path

import numpy as np
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dataset import BigEarthNetDataset, LABELS  # noqa: E402

try:
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, Dataset as TorchDataset
    HAVE_TORCH = True
except ImportError:
    HAVE_TORCH = False


if HAVE_TORCH:
    class SmallRSBackbone(nn.Module):
        """Compact CNN backbone for 4-band (B,G,R,NIR) remote-sensing patches.
        Intentionally small so it trains quickly on CPU for the smoke test;
        swap in a larger backbone (ResNet/ViT) for a full production run."""

        def __init__(self, in_channels: int = 4, num_classes: int = len(LABELS)):
            super().__init__()
            self.features = nn.Sequential(
                nn.Conv2d(in_channels, 32, 3, padding=1), nn.BatchNorm2d(32), nn.ReLU(),
                nn.MaxPool2d(2),
                nn.Conv2d(32, 64, 3, padding=1), nn.BatchNorm2d(64), nn.ReLU(),
                nn.MaxPool2d(2),
                nn.Conv2d(64, 128, 3, padding=1), nn.BatchNorm2d(128), nn.ReLU(),
                nn.AdaptiveAvgPool2d(1),
            )
            self.classifier = nn.Linear(128, num_classes)

        def forward(self, x):
            f = self.features(x).flatten(1)
            return self.classifier(f)


    class SyntheticBigEarthNetStandIn(TorchDataset):
        """Tiny synthetic stand-in with the same tensor shapes as
        BigEarthNetDataset, used only for --smoke-test to verify the
        training loop runs end-to-end without the real archive."""

        def __init__(self, n=32, size=60):
            self.n = n
            self.size = size

        def __len__(self):
            return self.n

        def __getitem__(self, idx):
            rng = np.random.RandomState(idx)
            x = rng.rand(4, self.size, self.size).astype(np.float32)
            y = np.zeros(len(LABELS), dtype=np.float32)
            y[rng.randint(0, len(LABELS))] = 1.0
            return torch.from_numpy(x), torch.from_numpy(y)


def load_config(path: str) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


def train(config: dict, smoke_test: bool = False):
    if not HAVE_TORCH:
        raise RuntimeError("PyTorch is required for training. pip install torch")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = SmallRSBackbone().to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=config.get("learning_rate", 1e-3))
    criterion = nn.BCEWithLogitsLoss()

    if smoke_test:
        print("[SMOKE TEST] Using synthetic stand-in dataset (real BigEarthNet archive not present).")
        dataset = SyntheticBigEarthNetStandIn(n=config.get("smoke_test_samples", 32))
    else:
        dataset = BigEarthNetDataset(config["bigearthnet_root"], limit=config.get("limit_samples"))

    loader = DataLoader(dataset, batch_size=config.get("batch_size", 8), shuffle=True)

    epochs = config.get("smoke_test_epochs", 2) if smoke_test else config.get("epochs", 20)
    model.train()
    for epoch in range(epochs):
        total_loss = 0.0
        n_batches = 0
        for x, y in loader:
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad()
            out = model(x)
            loss = criterion(out, y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
            n_batches += 1
        avg_loss = total_loss / max(1, n_batches)
        print(f"Epoch {epoch+1}/{epochs} - avg BCE loss: {avg_loss:.4f}")

    ckpt_dir = Path(config.get("checkpoint_dir", "models/checkpoints"))
    ckpt_dir.mkdir(parents=True, exist_ok=True)
    ckpt_path = ckpt_dir / ("smoke_test_backbone.pt" if smoke_test else "bigearthnet_adapted_backbone.pt")
    torch.save({"model_state_dict": model.state_dict(), "labels": LABELS}, ckpt_path)
    print(f"Checkpoint saved to {ckpt_path}")
    return str(ckpt_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default=str(Path(__file__).parent / "config.yaml"))
    parser.add_argument("--smoke-test", action="store_true",
                         help="Run a fast synthetic smoke test instead of real BigEarthNet training.")
    args = parser.parse_args()
    cfg = load_config(args.config)
    train(cfg, smoke_test=args.smoke_test)
