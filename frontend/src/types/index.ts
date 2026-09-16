export interface ImageMetadata {
  file_id: string;
  filename: string;
  size_bytes: number;
  width?: number;
  height?: number;
  bands?: number;
  dtype?: string;
  crs?: string;
  bounds?: number[];
  acquisition_date?: string;
  modality_guess?: string;
  format?: string;
  preview_url?: string;
  warnings: string[];
}

export interface TraceStep {
  step: string;
  tool: string;
  status: "ok" | "warning" | "error";
  input_summary: string;
  output_summary: string;
  processing_time_ms: number;
}

export interface EvidenceItem {
  label: string;
  detail: string;
  supports: boolean;
}

export interface ChainStep {
  step_index: number;
  query: string;
  task: string;
  task_display: string;
  answer: string;
  confidence?: number | null;
}

export interface RetryAttempt {
  attempt: number;
  confidence?: number | null;
  note: string;
}

export interface AnalyzeResponse {
  analysis_id: string;
  query: string;
  task: string;
  task_display: string;
  agent: string;
  selected_model: string;
  answer: string;
  confidence?: number | null;
  confidence_label: string;
  confidence_breakdown: Record<string, number>;
  evidence: EvidenceItem[];
  visual_outputs: Record<string, string>;
  trace: TraceStep[];
  metadata_used: Record<string, any>;
  timestamp: string;
  is_demo: boolean;
  warnings: string[];
  session_id?: string | null;
  suggested_followups: string[];
  clarification_needed: boolean;
  clarification_options: string[];
  chain_steps: ChainStep[];
  retries: RetryAttempt[];
  followup_context_used: boolean;
}

export interface RegionFollowupResponse {
  analysis_id: string;
  x: number;
  y: number;
  in_region: boolean;
  summary: string;
  local_stats: Record<string, number>;
}

export interface HistoryItem {
  analysis_id: string;
  query: string;
  task: string;
  mode: string;
  confidence?: number | null;
  timestamp: string;
}

export interface ModelCard {
  name: string;
  task: string;
  input_type: string;
  required_modalities: string[];
  output_type: string[];
  status: string;
  version: string;
  model_type: string;
  adapted: boolean;
  description: string;
}

export type AnalysisMode = "single" | "optical_sar" | "before_after";
