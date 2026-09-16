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
  advanced_change_analysis?: AdvancedChangeAnalysis;
}

export interface MetricCardInfo {
  title: string;
  value: string;
  label: string;
  delta_pct?: number;
  t1_val?: string;
  t2_val?: string;
  color?: string;
  available?: boolean;
  note?: string;
  ndvi_available?: boolean;
  ndvi_note?: string;
}

export interface SpectralBandItem {
  band: string;
  wavelength?: string;
  T1_Before: number;
  T2_After: number;
  delta: string;
  available?: boolean;
}

export interface BiophysicalRadarItem {
  metric: string;
  Before: number;
  After: number;
  available?: boolean;
  is_ndvi?: boolean;
}

export interface RegionSpectralData {
  region_index: number;
  region_id: string;
  bbox: [number, number, number, number];
  area_pct: number;
  confidence: number;
  cards: {
    built_up: MetricCardInfo;
    vegetation: MetricCardInfo;
    sar: MetricCardInfo;
    spectral_distance: MetricCardInfo;
  };
  spectral_bands: SpectralBandItem[];
  biophysical_radar: BiophysicalRadarItem[];
  spectral_distance: number;
  ai_interpretation: string;
}

export interface AdvancedChangeAnalysis {
  title: string;
  subtitle: string;
  global_cards: {
    built_up: MetricCardInfo;
    vegetation: MetricCardInfo;
    sar: MetricCardInfo;
    spectral_distance: MetricCardInfo;
  };
  spectral_bands: SpectralBandItem[];
  biophysical_radar: BiophysicalRadarItem[];
  spectral_distance: number;
  ai_interpretation: string;
  sensor_status?: Record<string, string>;
  regions: RegionSpectralData[];
}

export interface RegionFollowupResponse {
  analysis_id: string;
  x: number;
  y: number;
  in_region: boolean;
  summary: string;
  local_stats: Record<string, number>;
  region_spectral_data?: RegionSpectralData;
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

export interface MissionTask {
  task_id: string;
  title: string;
  description: string;
  category: "planning" | "baseline" | "temporal" | "sar" | "impact" | "synthesis";
  status: "pending" | "running" | "completed" | "needs_input" | "failed";
  started_at?: string | null;
  completed_at?: string | null;
  output_summary?: string | null;
  error_message?: string | null;
}

export interface MissionEvidenceCard {
  title: string;
  category: string;
  description: string;
  modality: "optical" | "sar" | "temporal" | "domain";
  status: "verified" | "unavailable" | "inferred";
}

export interface MissionAffectedRegion {
  region_id: string;
  bbox: [number, number, number, number];
  area_km2: number;
  area_pct: number;
  change_type: string;
  land_type: string;
  temporal_status: string;
  evidence_summary: string;
}

export interface MissionStatistics {
  total_scene_area_km2: number;
  changed_area_km2: number;
  changed_area_pct: number;
  agricultural_affected_km2: number;
  agricultural_affected_pct: number;
  water_expansion_km2: number;
  built_up_expansion_km2: number;
  vegetation_loss_km2: number;
}

export interface MissionPlanResponse {
  objective: string;
  mission_type: string;
  mission_title: string;
  required_inputs_description: string;
  needs_additional_imagery: boolean;
  missing_input_warning?: string | null;
  tasks: MissionTask[];
}

export interface Mission {
  mission_id: string;
  objective: string;
  mission_type: string;
  mission_title: string;
  status: "running" | "completed" | "failed" | "needs_input";
  created_at: string;
  completed_at?: string | null;
  image_ids: string[];
  tasks: MissionTask[];
  visual_outputs: Record<string, string>;
  primary_finding: string;
  executive_summary: string;
  key_findings: string[];
  evidence_cards: MissionEvidenceCard[];
  affected_regions: MissionAffectedRegion[];
  statistics: MissionStatistics;
  missing_input_warning?: string | null;
  limitations: string[];
}

export interface MissionSummaryItem {
  mission_id: string;
  mission_title: string;
  objective: string;
  mission_type: string;
  status: string;
  created_at: string;
  changed_area_km2: number;
}
