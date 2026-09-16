# Sample Data

For a curated set of ready-to-upload sample images covering every mandatory
task (single-image, before/after, and optical+SAR), see the separately
distributed `sample_data/` package and its README. Upload those through the
**Analyze** page like any real image — no special "demo" handling involved.

A synthetic scene generator (`backend/app/services/demo_service.py`) also
exists internally, used only by the Evaluation module and the training
pipeline to produce labeled test data — it is not a user-facing feature.

## For real imagery testing

Place GeoTIFF/TIFF/PNG/JPEG files anywhere and upload them through the
**Analyze** page, or drop sample scenes here for convenience:

```
data/samples/
├── optical_sample_1.tif
├── sar_sample_1.tif
├── before_after/
│   ├── t1.tif
│   └── t2.tif
```

## Benchmark datasets (for the Evaluation module)

Place benchmark dataset files under `backend/data/benchmarks/<name>/`:

```
backend/data/benchmarks/
├── vrsbench/
├── rsvqa/
├── cdvqa/
└── custom/
```

If a dataset's folder is empty or missing, the Evaluation module runs a
clearly-labeled SYNTHETIC evaluation on synthetic labeled data instead — it
never fabricates benchmark scores.

## ISRO/SAC evaluation compatibility

The architecture accepts pre-georeferenced Cartosat-2S optical and RISAT SAR
imagery, co-registered pairs, and hidden reference annotations without
requiring UI changes — simply upload through the same `/api/upload` and
`/api/analyze` endpoints. No fabricated ISRO/SAC results are included
anywhere in this repository.
