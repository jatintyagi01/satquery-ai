"""Analysis history persistence and retrieval."""
from __future__ import annotations
import json
from typing import List, Optional
from ..db.database import get_session, AnalysisRecord, init_db
from ..schemas.schemas import AnalyzeResponse, HistoryItem

init_db()


def save_analysis(response: AnalyzeResponse, mode: str, image_ids: List[str]):
    session = get_session()
    try:
        record = AnalysisRecord(
            analysis_id=response.analysis_id,
            query=response.query,
            mode=mode,
            task=response.task,
            agent=response.agent,
            selected_model=response.selected_model,
            answer=response.answer,
            confidence=response.confidence,
            confidence_label=response.confidence_label,
            evidence_json=json.dumps([e.dict() for e in response.evidence]),
            visual_outputs_json=json.dumps(response.visual_outputs),
            trace_json=json.dumps([t.dict() for t in response.trace]),
            metadata_json=json.dumps(response.metadata_used),
            image_ids_json=json.dumps(image_ids),
            is_demo=response.is_demo,
        )
        session.merge(record)
        session.commit()
    finally:
        session.close()


def list_history(limit: int = 50) -> List[HistoryItem]:
    session = get_session()
    try:
        rows = session.query(AnalysisRecord).order_by(AnalysisRecord.timestamp.desc()).limit(limit).all()
        return [HistoryItem(analysis_id=r.analysis_id, query=r.query, task=r.task, mode=r.mode,
                             confidence=r.confidence, timestamp=r.timestamp.isoformat()) for r in rows]
    finally:
        session.close()


def get_analysis(analysis_id: str) -> Optional[AnalyzeResponse]:
    session = get_session()
    try:
        r = session.query(AnalysisRecord).filter_by(analysis_id=analysis_id).first()
        if not r:
            return None
        from ..agents.confidence_and_router import TASK_DISPLAY
        return AnalyzeResponse(
            analysis_id=r.analysis_id, query=r.query, task=r.task,
            task_display=TASK_DISPLAY.get(r.task, r.task), agent=r.agent,
            selected_model=r.selected_model, answer=r.answer, confidence=r.confidence,
            confidence_label=r.confidence_label, evidence=json.loads(r.evidence_json),
            visual_outputs=json.loads(r.visual_outputs_json), trace=json.loads(r.trace_json),
            metadata_used=json.loads(r.metadata_json), timestamp=r.timestamp.isoformat(),
            is_demo=r.is_demo,
        )
    finally:
        session.close()


def delete_analysis(analysis_id: str) -> bool:
    session = get_session()
    try:
        r = session.query(AnalysisRecord).filter_by(analysis_id=analysis_id).first()
        if not r:
            return False
        session.delete(r)
        session.commit()
        return True
    finally:
        session.close()


# ---------------------------------------------------------------------------
# Multi-analysis natural-language summary (Innovation #4)
# ---------------------------------------------------------------------------

def summarize_analyses(limit: int = 5, analysis_ids: Optional[List[str]] = None) -> dict:
    """Synthesizes a short natural-language summary across several past
    analyses -- rule-based synthesis over real stored results (task mix,
    confidence stats, notable findings), never a fabricated narrative.
    """
    session = get_session()
    try:
        if analysis_ids:
            rows = (session.query(AnalysisRecord)
                    .filter(AnalysisRecord.analysis_id.in_(analysis_ids))
                    .order_by(AnalysisRecord.timestamp.desc()).all())
        else:
            rows = (session.query(AnalysisRecord)
                    .order_by(AnalysisRecord.timestamp.desc()).limit(limit).all())
    finally:
        session.close()

    if not rows:
        return {"summary": "No past analyses are available to summarize yet. Run an analysis first.",
                "analyses_included": [], "count": 0}

    task_counts: Dict[str, int] = {}
    confidences: List[float] = []
    best = None  # (confidence, row)
    worst = None
    for r in rows:
        task_counts[r.task] = task_counts.get(r.task, 0) + 1
        if r.confidence is not None:
            confidences.append(r.confidence)
            if best is None or r.confidence > best[0]:
                best = (r.confidence, r)
            if worst is None or r.confidence < worst[0]:
                worst = (r.confidence, r)

    n = len(rows)
    task_summary = ", ".join(f"{count} {task.replace('_', ' ')}" for task, count in
                              sorted(task_counts.items(), key=lambda x: -x[1]))
    lines = [f"Summary of your last {n} {'analysis' if n == 1 else 'analyses'}: {task_summary}."]

    if confidences:
        avg_conf = sum(confidences) / len(confidences)
        lines.append(f"Average confidence across analyses with a computed score was "
                      f"{avg_conf*100:.0f}% ({len(confidences)}/{n} analyses had a confidence score).")
    else:
        lines.append("None of these analyses produced a numeric confidence score.")

    if best:
        lines.append(f"Highest-confidence result ({best[0]*100:.0f}%) was for \"{best[1].query}\" "
                      f"({best[1].task.replace('_', ' ')}): {best[1].answer[:140]}"
                      + ("..." if len(best[1].answer) > 140 else ""))
    if worst and worst[1].analysis_id != (best[1].analysis_id if best else None):
        lines.append(f"Lowest-confidence result ({worst[0]*100:.0f}%) was for \"{worst[1].query}\" "
                      f"({worst[1].task.replace('_', ' ')}) — worth a manual double-check.")

    demo_count = sum(1 for r in rows if r.is_demo)
    if demo_count:
        lines.append(f"{demo_count} of these {n} analyses used demo/synthetic sample data.")

    return {
        "summary": " ".join(lines),
        "analyses_included": [r.analysis_id for r in rows],
        "count": n,
    }
