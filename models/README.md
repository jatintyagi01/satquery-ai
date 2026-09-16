# Model Checkpoints

This directory is where trained/adapted model checkpoints are placed so the
backend can load them instead of running fallback heuristic inference.

```
models/
└── checkpoints/
    ├── rs_vqa.pt                    (not present — VQA runs on fallback heuristics)
    ├── rs_caption.pt                (not present — captioning runs on fallback heuristics)
    ├── rs_grounding.pt              (not present — grounding runs on fallback heuristics)
    ├── change_det.pt                (not present — change detection runs on fallback heuristics)
    ├── change_vqa.pt                (not present — change VQA runs on fallback heuristics)
    ├── optical_sar_fusion.pt        (not present — fusion runs on fallback heuristics)
    └── bigearthnet_adapted_backbone.pt  (produced by training/train.py once run on real data)
```

## Plugging in a real checkpoint

1. Train or fine-tune a model (see `training/README.md` for the BigEarthNet
   adaptation pipeline) and save it here.
2. Update the corresponding entry in `backend/app/models/registry.py`:
   - set `model_path` to the checkpoint file
   - set `model_type="finetuned-checkpoint"`
   - set `adapted=True`
3. Implement the model-loading and inference call in the relevant file under
   `backend/app/tools/` (e.g. `vision_tools.py`, `change_and_fusion.py`),
   guarded by `core_config.INFERENCE_MODE`, so real inference is used when
   `SATQUERY_INFERENCE_MODE=checkpoint` and the file exists, and the pipeline
   degrades gracefully back to the fallback heuristic otherwise.

No fabricated checkpoints, benchmark scores, or fine-tuning claims are
included in this repository. Every model card in the `/models` page and API
response honestly reports `model_type` and `adapted` status.
