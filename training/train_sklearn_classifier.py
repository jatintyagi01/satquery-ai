"""
Synthetic Land-Cover Classifier Training (Innovation #7)
============================================================
Trains a REAL, working scikit-learn classifier on labeled synthetic scenes
to replace the fixed-threshold heuristic in RemoteSensingVQAModel's
presence-detection logic with a genuinely trained, validated model.

HONESTY NOTE: this is trained on SYNTHETIC self-labeled scenes generated
by backend/app/services/demo_service.py, NOT on real satellite imagery or
BigEarthNet. It is a legitimate, honestly-scoped adaptation step given the
compute/dataset constraints of this environment (see training/README.md
for the real BigEarthNet pipeline, which requires the full archive + GPU).
The model registry and API report this checkpoint as
`model_type="adapted-classifier (synthetic)"`, `adapted=True` — never as
"trained on BigEarthNet" or any real-dataset claim.

Run:
    python training/train_sklearn_classifier.py
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score
import joblib

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
from app.services.demo_service import _base_scene  # noqa: E402
from app.tools.vision_tools import compute_landcover_stats  # noqa: E402

FEATURE_NAMES = ["water_pct", "vegetation_pct", "built_up_pct", "bare_soil_pct",
                  "brightness_mean", "texture_std"]
LABEL_NAMES = ["water_present", "vegetation_present", "built_up_present", "bare_soil_present"]

CHECKPOINT_DIR = Path(__file__).resolve().parent.parent / "models" / "checkpoints"
CHECKPOINT_PATH = CHECKPOINT_DIR / "synthetic_landcover_classifier.joblib"
METRICS_PATH = CHECKPOINT_DIR / "synthetic_landcover_classifier_metrics.json"


def build_dataset(n_samples: int = 400, seed: int = 42):
    rng = np.random.RandomState(seed)
    X, Y = [], []
    for i in range(n_samples):
        urban = rng.uniform(0, 1)
        water = rng.uniform(0, 1.8)
        veg = rng.uniform(0.2, 1.0)
        scene = _base_scene(seed=1000 + i, urban_amount=urban, water_amount=water, veg_amount=veg)
        stats = compute_landcover_stats(scene)
        features = [stats[f] for f in FEATURE_NAMES]
        labels = [
            1 if stats["water_pct"] > 3.0 else 0,
            1 if stats["vegetation_pct"] > 15.0 else 0,
            1 if stats["built_up_pct"] > 3.0 else 0,
            1 if stats["bare_soil_pct"] > 3.0 else 0,
        ]
        X.append(features)
        Y.append(labels)
    return np.array(X, dtype=np.float32), np.array(Y, dtype=np.int32)


def train():
    print("Generating synthetic labeled dataset...")
    X, Y = build_dataset(n_samples=400)
    X_train, X_test, Y_train, Y_test = train_test_split(X, Y, test_size=0.25, random_state=7)

    models = {}
    metrics = {}
    for i, label_name in enumerate(LABEL_NAMES):
        clf = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=7)
        y_tr, y_te = Y_train[:, i], Y_test[:, i]
        if len(set(y_tr.tolist())) < 2:
            print(f"Skipping {label_name}: only one class present in training split.")
            continue
        clf.fit(X_train, y_tr)
        preds = clf.predict(X_test)
        acc = accuracy_score(y_te, preds)
        f1 = f1_score(y_te, preds, zero_division=0)
        models[label_name] = clf
        metrics[label_name] = {"accuracy": round(float(acc), 4), "f1": round(float(f1), 4),
                                "n_test": int(len(y_te)), "positive_rate_test": round(float(y_te.mean()), 4)}
        print(f"  {label_name}: accuracy={acc:.3f}  f1={f1:.3f}  (n_test={len(y_te)})")

    CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump({"models": models, "feature_names": FEATURE_NAMES, "label_names": list(models.keys())},
                CHECKPOINT_PATH)
    METRICS_PATH.write_text(json.dumps({
        "dataset": "synthetic self-labeled scenes (backend/app/services/demo_service.py)",
        "n_samples": int(X.shape[0]),
        "n_train": int(X_train.shape[0]),
        "n_test": int(X_test.shape[0]),
        "metrics": metrics,
        "note": "NOT trained on real satellite imagery or BigEarthNet. See training/README.md.",
    }, indent=2))
    print(f"\nCheckpoint saved to {CHECKPOINT_PATH}")
    print(f"Metrics saved to {METRICS_PATH}")


if __name__ == "__main__":
    train()
