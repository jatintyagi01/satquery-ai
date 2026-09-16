# SatQuery AI — 5-Minute Presentation Walkthrough

A presentation flow for SIH final evaluation, built around uploading the
sample images provided separately (`sample_data/`) through the normal
Analyze workflow. Total runtime: ~5 minutes.

> Note: this walkthrough uses real file uploads rather than a preloaded
> "Demo Mode" scenario runner — that feature was intentionally removed
> from this build (see `SIH_REQUIREMENTS.md`). Have the `sample_data/`
> folder open and ready before you start.

---

### 0:00 – 0:30 — The Problem

**Say:** "Remote-sensing AI today is fragmented — a separate tool for
land-cover classification, another for VQA, another for change detection.
Each requires GIS expertise the end user often doesn't have. SatQuery AI
replaces all of that with one interface: upload imagery, ask a question in
plain English."

**Show:** Landing page (`/`) — hero section and the agentic architecture
diagram.

---

### 0:30 – 1:00 — Upload an Image

**Say:** "Let's start with a single scene and ask it a direct question."

**Do:** Go to **Analyze**, select "Single Image," upload
`sample_data/single/sample_scene.png`.

---

### 1:00 – 1:30 — Ask a VQA Question

**Say:** "The agent interprets the query, detects it needs Visual Question
Answering, and routes to the VQA specialist — not a generic LLM guess."

**Query:** *"Is there a water body in this image?"*

**Show:** The execution trace expanding step by step: Query Interpretation
→ Input Validation → Modality Detection → Task Classification → Inference
→ Evidence Validation → Confidence Estimation → Response Synthesis. Point
out that the answer cites a trained classifier's confidence, not a canned
response.

---

### 1:30 – 2:00 — Ground the Water Body, Then Follow Up

**Say:** "Now let's ask it to *show* us, not just tell us — and this time
notice the agent remembers our previous question."

**Do:** In the same session, click the **"Highlight the water body"**
follow-up suggestion chip from the previous result (or type it).

**Show:** The bounding-box overlay, color-coded by per-region confidence
(green/amber/red), and the evidence panel showing the inferred target
class. Then click directly on one of the highlighted regions in the image
to trigger an interactive region follow-up.

---

### 2:00 – 2:30 — Upload Before/After Imagery

**Say:** "Now for multitemporal change — one of the mandatory SIH tasks."

**Do:** Switch to **Change Detection** mode, upload
`sample_data/before_after/before.png` as T1 and `after.png` as T2.

---

### 2:30 – 3:30 — Change Analysis

**Say:** "The agent detects this is a bi-temporal pair, routes to the
Change Detection and Change-VQA specialists, and answers using actual
before/after land-cover statistics — not a guess."

**Query:** *"Has the built-up area increased, decreased, or remained
unchanged?"*

**Show:** Before/after slider, change heatmap, and the color-coded
change-region overlay — click a region for a localized explanation. Point
out the answer cites the exact percentage shift in built-up coverage, and
if a knowledge-context note appears (e.g. for a large water increase),
call out that it's a rule-based domain note, not a fabricated conclusion.

---

### 3:30 – 4:15 — Optical + SAR Fusion

**Say:** "This is the hardest mandatory requirement — combining two
completely different sensor types."

**Do:** Switch to **Optical + SAR** mode, upload
`sample_data/optical_sar/optical.png` and `sample_data/optical_sar/sar.png`.

**Query:** *"Use the optical and SAR images together to identify built-up
and water-covered regions."*

**Show:** The three-panel view — Optical, SAR (log-scaled backscatter), and
Fused Interpretation — plus the evidence panel explicitly separating
"OPTICAL EVIDENCE" (spectral cues) from "SAR EVIDENCE" (structural/backscatter
cues) and the cross-modal agreement score.

---

### 4:15 – 4:40 — Show the Agent Is Genuinely Agentic

**Say:** "A few things prove this is an agent, not a chatbot with an image
attached: it self-corrects, it chains reasoning steps, and it asks for
clarification instead of guessing."

**Do (pick one or two, time permitting):**
- Type a deliberately vague query like *"tell me something"* → show the
  clarification prompt instead of a guessed answer.
- Type a chained query like *"Highlight the water body then describe this
  image"* → show the multi-step chain result with both sub-answers.
- Point to the "self-corrected" banner if a retry fired during the demo
  (visible whenever a result shows low initial confidence).

---

### 4:40 – 5:00 — History Summary & Report

**Say:** "We also don't fabricate numbers, and everything is auditable."

**Do:** Open **History** → type "Summarize my last 5 analyses" → **Generate
Summary** to show the natural-language synthesis across real stored
results. Then click **Download Analysis Report** on any prior result to
show the generated PDF with query, evidence, visuals, and trace.

---

### 5:00 — Novelty and Impact

**Say:** "SatQuery AI's novelty isn't the individual models — it's the
agentic controller that decides *what to do* based on the query and imagery
configuration, then proves its work with evidence, confidence, and a full
execution trace, and can self-correct, chain reasoning steps, and remember
conversation context. It's built to scale to real fine-tuned checkpoints
without any changes to the orchestration layer — today it runs on
transparent, honestly-labeled fallback CV heuristics (plus one genuinely
trained classifier on synthetic data), tomorrow it can run BigEarthNet-
adapted vision-language models behind the exact same interface."

---

## Backup queries (if live demo hiccups)

- "Describe this image." (captioning)
- "What major objects are visible?" (VQA)
- "Where is the built-up area?" (grounding)
- "What changed between these two dates, and where?" (change description)

## Sample files reference

See `sample_data/README.md` for the full list of provided images and which
mode/query each is meant for.
