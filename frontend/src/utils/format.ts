/**
 * Converts a PascalCase/camelCase identifier like "OpticalSARFusionModel"
 * into readable words: "Optical SAR Fusion Model", correctly keeping
 * acronym runs (SAR, VQA) together instead of splitting every capital.
 */
export function humanizeIdentifier(id: string): string {
  return id
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
}

const TASK_LABELS: Record<string, string> = {
  vqa: "Visual Question Answering",
  captioning: "Image Captioning",
  grounding: "Region Grounding",
  change_detection: "Change Detection",
  change_vqa: "Change VQA",
  change_description: "Change Description",
  optical_sar_fusion: "Optical-SAR Fusion",
  general_analysis: "General Analysis",
  multi_step_chain: "Multi-Step Chain",
  clarification_needed: "Clarification",
};

export function taskLabel(task: string): string {
  return TASK_LABELS[task] || humanizeIdentifier(task.replace(/_/g, " "));
}
