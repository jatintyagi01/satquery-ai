# SatQuery AI — Remote-Sensing Adaptation Pipeline

This directory implements **SIH Requirement 1 (Remote-Sensing Adaptation)**:
a real dataset loader, preprocessing, and training/fine-tuning pipeline for
adapting a vision backbone to remote-sensing imagery using **BigEarthNet**.

## Honesty notice

No model shipped in this repository has actually been fine-tuned on
BigEarthNet — the archive (~66GB) and a GPU were not available in this
build environment. The application currently runs on **fallback classical
computer-vision heuristics** (see `backend/app/tools/`), which are clearly
labeled as such everywhere in the UI, API responses, and reports
(`model_type: "fallback-heuristic"`, `adapted: false`).

This pipeline is nevertheless **real and runnable** — see the smoke test
below — and is architected so a genuinely trained checkpoint can be dropped
in with no changes to the API or agent orchestration layer.

## Files

- `dataset.py` — `BigEarthNetDataset`: loads 4-band (B,G,R,NIR) patches and
  multi-label land-cover tags from the standard BigEarthNet-S2 directory layout.
- `train.py` — Trains a compact CNN backbone (`SmallRSBackbone`) with
  multi-label BCE loss and saves a checkpoint.
- `config.yaml` — Training hyperparameters and paths.

## Running the real pipeline

1. Download BigEarthNet-S2 from https://bigearth.net and extract patches to
   `training/data/BigEarthNet-v1.0/` (one subfolder per patch, containing
   `_B02.tif`, `_B03.tif`, `_B04.tif`, `_B08.tif`, and `_labels_metadata.json`).
2. Install PyTorch: `pip install torch --break-system-packages`
3. Run: `python training/train.py --config training/config.yaml`
4. The resulting checkpoint is written to `models/checkpoints/bigearthnet_adapted_backbone.pt`.
5. Wire the checkpoint into `backend/app/models/registry.py` (update
   `model_path`, set `model_type="finetuned-checkpoint"`, `adapted=True`) and
   implement the corresponding inference call in `backend/app/tools/`,
   replacing (or supplementing, via a feature flag) the heuristic fallback.

## Smoke test (no dataset required)

To verify the training loop itself runs end-to-end without the real archive:

```bash
pip install torch --break-system-packages
python training/train.py --smoke-test
```

This trains `SmallRSBackbone` for 2 epochs on a small synthetic stand-in
dataset with the same tensor shapes as real BigEarthNet patches, and saves
`models/checkpoints/smoke_test_backbone.pt`. It proves the dataset loader
API, training loop, and checkpointing all work correctly — it does **not**
produce a meaningful remote-sensing model and must never be presented as one.

## Datasets referenced elsewhere in the project

- **VRSBench** — captioning / grounding / VQA evaluation (see `backend/app/evaluation/`)
- **RSVQA** — single-image VQA evaluation
- **CDVQA** — multitemporal change VQA evaluation

These are wired into the Evaluation module's dataset registry
(`backend/app/evaluation/eval_runner.py`). If their files are not present
under `backend/data/benchmarks/<name>/`, the evaluation endpoint runs a
clearly-labeled DEMO evaluation on synthetic data instead of fabricating
benchmark scores.
