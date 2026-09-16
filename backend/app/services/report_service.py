"""Generates a downloadable PDF analysis report using reportlab."""
from __future__ import annotations
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage,
                                 PageBreak)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from ..core_config import REPORTS_DIR, UPLOAD_DIR
from ..schemas.schemas import AnalyzeResponse


def _styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="SatTitle", fontSize=20, leading=24, textColor=colors.HexColor("#0B1E33"),
                               spaceAfter=6))
    styles.add(ParagraphStyle(name="SatSection", fontSize=13, leading=16, textColor=colors.HexColor("#0B4F6C"),
                               spaceBefore=14, spaceAfter=6))
    styles.add(ParagraphStyle(name="SatBody", fontSize=10, leading=14))
    return styles


def build_report(response: AnalyzeResponse, image_meta: list[dict]) -> str:
    styles = _styles()
    out_path = REPORTS_DIR / f"SatQueryAI_Report_{response.analysis_id}.pdf"
    doc = SimpleDocTemplate(str(out_path), pagesize=A4,
                             leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm)
    story = []

    story.append(Paragraph("SatQuery AI — Remote-Sensing Analysis Report", styles["SatTitle"]))
    story.append(Paragraph(f"Generated: {response.timestamp} UTC &nbsp;&nbsp;|&nbsp;&nbsp; "
                            f"Analysis ID: {response.analysis_id}"
                            + (" &nbsp;&nbsp;|&nbsp;&nbsp; <b>DEMO DATA</b>" if response.is_demo else ""),
                            styles["SatBody"]))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Query & Task", styles["SatSection"]))
    data = [
        ["User Query", response.query],
        ["Detected Task", response.task_display],
        ["Agent", response.agent],
        ["Selected Model", response.selected_model],
        ["Model Type", response.metadata_used.get("model_type", "n/a")],
        ["Domain Adapted", str(response.metadata_used.get("adapted", False))],
    ]
    t = Table(data, colWidths=[45 * mm, 120 * mm])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EAF2F8")),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#B8C9D9")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(t)

    story.append(Paragraph("Input Imagery", styles["SatSection"]))
    for i, m in enumerate(image_meta):
        story.append(Paragraph(
            f"<b>Image {i+1}:</b> {m.get('filename','n/a')} | {m.get('width','?')}x{m.get('height','?')} px | "
            f"bands={m.get('bands','?')} | modality={m.get('modality_guess','?')} | "
            f"CRS={m.get('crs') or 'n/a'} | acquisition={m.get('acquisition_date') or 'n/a'}",
            styles["SatBody"]))

    story.append(Paragraph("AI Answer", styles["SatSection"]))
    story.append(Paragraph(response.answer, styles["SatBody"]))
    conf_txt = f"{response.confidence*100:.1f}% ({response.confidence_label})" if response.confidence is not None \
        else "Confidence unavailable"
    story.append(Paragraph(f"<b>Confidence:</b> {conf_txt}", styles["SatBody"]))

    story.append(Paragraph("Evidence", styles["SatSection"]))
    for e in response.evidence:
        story.append(Paragraph(f"• {e.get('detail', e.get('label','')) if isinstance(e, dict) else e.detail}",
                                styles["SatBody"]))

    if response.visual_outputs:
        story.append(Paragraph("Visual Evidence", styles["SatSection"]))
        for name, url in response.visual_outputs.items():
            fname = url.split("/")[-1]
            fpath = UPLOAD_DIR / fname
            if fpath.exists():
                try:
                    story.append(Paragraph(name.replace("_", " ").title(), styles["SatBody"]))
                    story.append(RLImage(str(fpath), width=90 * mm, height=60 * mm))
                    story.append(Spacer(1, 6))
                except Exception:
                    pass

    story.append(Paragraph("Execution Trace", styles["SatSection"]))
    trace_data = [["Step", "Tool", "Status", "Time (ms)"]]
    for step in response.trace:
        s = step if isinstance(step, dict) else step.dict()
        trace_data.append([s["step"], s["tool"], s["status"], str(s["processing_time_ms"])])
    tt = Table(trace_data, colWidths=[55 * mm, 45 * mm, 25 * mm, 25 * mm])
    tt.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B4F6C")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#B8C9D9")),
    ]))
    story.append(tt)

    if response.warnings:
        story.append(Paragraph("Warnings", styles["SatSection"]))
        for w in response.warnings:
            story.append(Paragraph(f"⚠ {w}", styles["SatBody"]))

    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "This report was generated by SatQuery AI. Fallback/heuristic inference is clearly labeled where a "
        "trained checkpoint is not loaded. No fabricated benchmark or ISRO/SAC results are included.",
        styles["SatBody"]))

    doc.build(story)
    return str(out_path)
