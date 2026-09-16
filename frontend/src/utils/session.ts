// Multi-turn conversational memory (Innovation #1) — a per-browser-tab
// session id so follow-up queries ("what about that instead?") can be
// resolved against the previous turn on the backend. Regular app code
// (not a Claude.ai artifact), so sessionStorage is fine here.

const KEY = "satquery_session_id";

export function getSessionId(): string {
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

export function resetSessionId(): string {
  const id = crypto.randomUUID();
  sessionStorage.setItem(KEY, id);
  return id;
}
