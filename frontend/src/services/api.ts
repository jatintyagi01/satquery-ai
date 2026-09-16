import type { AnalyzeResponse, HistoryItem, ImageMetadata, ModelCard, RegionFollowupResponse } from "../types";

const BASE = "/api";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  async uploadImage(file: File): Promise<ImageMetadata> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/upload`, { method: "POST", body: form });
    return handle<ImageMetadata>(res);
  },

  async analyze(payload: {
    query: string;
    mode: string;
    image_ids: string[];
    modality_hints?: Record<string, string>;
    session_id?: string;
  }): Promise<AnalyzeResponse> {
    const res = await fetch(`${BASE}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handle<AnalyzeResponse>(res);
  },

  async regionFollowup(analysisId: string, x: number, y: number): Promise<RegionFollowupResponse> {
    const res = await fetch(`${BASE}/analyze/region-followup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysis_id: analysisId, x: Math.round(x), y: Math.round(y) }),
    });
    return handle<RegionFollowupResponse>(res);
  },

  async getHistory(limit = 50): Promise<HistoryItem[]> {
    const res = await fetch(`${BASE}/history?limit=${limit}`);
    return handle<HistoryItem[]>(res);
  },

  async getHistoryItem(id: string): Promise<AnalyzeResponse> {
    const res = await fetch(`${BASE}/history/${id}`);
    return handle<AnalyzeResponse>(res);
  },

  async deleteHistoryItem(id: string): Promise<void> {
    const res = await fetch(`${BASE}/history/${id}`, { method: "DELETE" });
    await handle(res);
  },

  async summarizeHistory(limit: number): Promise<{ summary: string; analyses_included: string[]; count: number }> {
    const res = await fetch(`${BASE}/history/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit }),
    });
    return handle(res);
  },

  async getModels(): Promise<ModelCard[]> {
    const res = await fetch(`${BASE}/models`);
    return handle<ModelCard[]>(res);
  },

  async runEvaluation(dataset: string, subset_size: number) {
    const res = await fetch(`${BASE}/evaluation/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataset, subset_size }),
    });
    return handle<any>(res);
  },

  async getEvaluationDatasets() {
    const res = await fetch(`${BASE}/evaluation/datasets`);
    return handle<any[]>(res);
  },

  reportUrl(analysisId: string): string {
    return `${BASE}/reports/${analysisId}`;
  },

  async downloadReport(analysisId: string): Promise<Blob> {
    const res = await fetch(`${BASE}/reports/${analysisId}`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to generate report");
    return res.blob();
  },

  // ── Mission Mode APIs ──────────────────────────────────────────
  async planMission(payload: { objective: string; image_ids: string[] }): Promise<import("../types").MissionPlanResponse> {
    const res = await fetch(`${BASE}/missions/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handle(res);
  },

  async runMission(payload: { objective: string; image_ids: string[]; session_id?: string }): Promise<import("../types").Mission> {
    const res = await fetch(`${BASE}/missions/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handle(res);
  },

  async getMissions(limit = 50): Promise<import("../types").MissionSummaryItem[]> {
    const res = await fetch(`${BASE}/missions?limit=${limit}`);
    return handle(res);
  },

  async getMission(missionId: string): Promise<import("../types").Mission> {
    const res = await fetch(`${BASE}/missions/${missionId}`);
    return handle(res);
  },

  async deleteMission(missionId: string): Promise<void> {
    const res = await fetch(`${BASE}/missions/${missionId}`, { method: "DELETE" });
    await handle(res);
  },

  async downloadMissionReport(missionId: string): Promise<Blob> {
    const res = await fetch(`${BASE}/missions/${missionId}/report`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to generate mission report");
    return res.blob();
  },
};

