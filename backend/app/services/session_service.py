"""
Session Service — Multi-Turn Conversational Memory (Innovation #1)
=====================================================================
Lightweight in-memory session store so the agent can resolve follow-up
queries that reference a previous analysis ("compare that to...", "was
that significant?", "same area, but check vegetation instead").

For a demo-scale SIH app an in-memory dict is appropriate; a production
deployment would back this with Redis or a database with TTL eviction.
"""
from __future__ import annotations
import re
import time
from typing import Dict, List, Optional

# session_id -> list of context dicts (most recent last)
_SESSIONS: Dict[str, List[dict]] = {}
MAX_HISTORY_PER_SESSION = 8

# Phrases that signal the query is referencing prior context rather than
# standing alone. Used to decide whether to pull in session memory.
FOLLOWUP_MARKERS = [
    r"\bthat\b", r"\bit\b", r"\bthose\b", r"\bthe (last|previous|same)\b",
    r"\bcompare(d)? to\b", r"\bagain\b", r"\binstead\b", r"\bnow (check|find|show)\b",
    r"\bwhat about\b", r"\balso\b", r"\bthis time\b",
]


def is_followup_query(query: str) -> bool:
    q = query.lower()
    return any(re.search(p, q) for p in FOLLOWUP_MARKERS)


def record_turn(session_id: str, entry: dict):
    if not session_id:
        return
    history = _SESSIONS.setdefault(session_id, [])
    entry = {**entry, "_ts": time.time()}
    history.append(entry)
    if len(history) > MAX_HISTORY_PER_SESSION:
        del history[0]


def get_last_turn(session_id: str) -> Optional[dict]:
    if not session_id:
        return None
    history = _SESSIONS.get(session_id)
    return history[-1] if history else None


def get_history(session_id: str) -> List[dict]:
    return _SESSIONS.get(session_id, [])


def clear_session(session_id: str):
    _SESSIONS.pop(session_id, None)
