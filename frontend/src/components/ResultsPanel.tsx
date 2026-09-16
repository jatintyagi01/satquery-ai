import { useState } from "react";
import { Download, CheckCircle2, AlertCircle, Sparkles, RefreshCw, Workflow, MessageSquarePlus } from "lucide-react";
import type { AnalyzeResponse, RegionFollowupResponse } from "../types";
import { Card, PanelTitle, Badge, SecondaryButton } from "./ui/primitives";
import ClickableRegionImage from "./ClickableRegionImage";
import AdvancedSpectralBiophysicalAnalysis from "./AdvancedSpectralBiophysicalAnalysis";
import { api } from "../services/api";
import { humanizeIdentifier } from "../utils/format";

function BeforeAfterSlider({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50);
  const safePos = Math.max(1, pos); // avoid divide-by-zero when fully at 0%
  return (
    <div className="relative w-full aspect-video rounded-md overflow-hidden border border-white/10 select-none">
      <img src={after} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img
          src={before}
          className="h-full object-cover max-w-none"
          style={{ width: `${(100 / safePos) * 100}%` }}
        />
      </div>
      <div className="absolute top-0 bottom-0 w-0.5 bg-accent-cyan pointer-events-none" style={{ left: `${pos}%` }} />
      <input
        type="range" min={0} max={100} value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="absolute inset-x-0 bottom-2 w-[92%] mx-[4%] accent-accent-cyan"
      />
      <div className="absolute top-2 left-2"><Badge tone="blue">Before</Badge></div>
      <div className="absolute top-2 right-2"><Badge tone="amber">After</Badge></div>
    </div>
  );
}

export default function ResultsPanel({
  result,
  onFollowupClick,
}: {
  result: AnalyzeResponse;
  onFollowupClick?: (query: string) => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [selectedRegionIndex, setSelectedRegionIndex] = useState<number | null>(null);
  const v = result.visual_outputs;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await api.downloadReport(result.analysis_id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SatQueryAI_Report_${result.analysis_id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Could not generate report.");
    } finally {
      setDownloading(false);
    }
  };

  const isChange = Boolean(v.before && v.after);
  const isGrounding = Boolean(v.grounding_overlay);

  return (
    <div className="space-y-5">
      {result.followup_context_used && (
        <div className="flex items-center gap-2 text-[12px] text-accent-cyan bg-accent-cyan/10 border border-accent-cyan/25 rounded-md px-3 py-2">
          <MessageSquarePlus size={13} /> Answered using context carried over from your previous question in this session.
        </div>
      )}

      {result.retries.length > 0 && (
        <div className="flex items-center gap-2 text-[12px] text-accent-teal bg-accent-teal/10 border border-accent-teal/25 rounded-md px-3 py-2">
          <RefreshCw size={13} /> The agent self-corrected and automatically retried with adjusted detection parameters.
        </div>
      )}

      <Card>
        <div>
          <PanelTitle>Answer</PanelTitle>
          <p className="text-lg leading-relaxed text-slate-100 whitespace-pre-line">{result.answer}</p>
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <Badge tone="cyan">{result.task_display}</Badge>
            <Badge tone="blue">{humanizeIdentifier(result.selected_model)}</Badge>
            {result.metadata_used?.model_type && (
              <Badge tone={result.metadata_used?.adapted ? "teal" : "amber"}>
                {result.metadata_used?.model_type === "fallback-heuristic" ? "Fallback inference" : String(result.metadata_used?.model_type)}
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Multi-step reasoning chain (Innovation #10) */}
      {result.chain_steps.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Workflow size={15} className="text-accent-cyan" />
            <PanelTitle>Reasoning chain</PanelTitle>
          </div>
          <div className="space-y-3">
            {result.chain_steps.map((cs) => (
              <div key={cs.step_index} className="relative pl-6">
                <div className="absolute left-0 top-0.5 w-4 h-4 rounded-full bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan text-[10px] flex items-center justify-center data">
                  {cs.step_index}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone="blue">{cs.task_display}</Badge>
                </div>
                <p className="text-[13px] text-slate-500 mt-1 italic">"{cs.query}"</p>
                <p className="text-sm text-slate-200 mt-1">{cs.answer}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Clarification handled by parent via ClarificationCard; this panel only renders full results */}

      {isChange && (
        <Card>
          <PanelTitle>Before / after comparison</PanelTitle>
          <BeforeAfterSlider before={v.before} after={v.after} />
          <div className="grid grid-cols-2 gap-3 mt-3">
            {v.change_heatmap && (
              <div>
                <div className="text-[11px] text-slate-400 mb-1 font-mono">Change heatmap</div>
                <img src={v.change_heatmap} className="rounded-md border border-white/10 w-full aspect-video object-cover" />
              </div>
            )}
            {v.change_overlay && (
              <div>
                <div className="text-[11px] text-slate-400 mb-1 font-mono flex items-center gap-1">
                  Change regions overlay <span className="text-[#997E67]">(click a region for details)</span>
                </div>
                <ClickableRegionImage
                  src={v.change_overlay}
                  analysisId={result.analysis_id}
                  className="rounded-md border border-white/10 w-full aspect-video object-cover"
                  onRegionFollowup={(res: RegionFollowupResponse) => {
                    if (res.local_stats?.region_index) {
                      setSelectedRegionIndex(res.local_stats.region_index);
                    }
                  }}
                />
              </div>
            )}
          </div>
          <p className="text-[11px] text-[#997E67] font-mono mt-2">
            Region outlines indicate detected spatial change zones.
          </p>

          {/* Advanced Spectral & Biophysical Change Analysis section */}
          {result.advanced_change_analysis && (
            <AdvancedSpectralBiophysicalAnalysis
              data={result.advanced_change_analysis}
              selectedRegionIndex={selectedRegionIndex}
              onSelectRegion={setSelectedRegionIndex}
            />
          )}
        </Card>
      )}

      {(v.optical || v.sar_backscatter || v.fused_overlay) && (
        <Card>
          <PanelTitle>Optical + SAR analysis</PanelTitle>
          <div className="grid grid-cols-3 gap-3">
            {v.optical && (
              <div>
                <div className="text-[11px] text-slate-500 mb-1">Optical</div>
                <img src={v.optical} className="rounded-md border border-white/10 w-full aspect-square object-cover" />
              </div>
            )}
            {v.sar_backscatter && (
              <div>
                <div className="text-[11px] text-slate-500 mb-1">SAR (Backscatter, log-scaled)</div>
                <img src={v.sar_backscatter} className="rounded-md border border-white/10 w-full aspect-square object-cover" />
              </div>
            )}
            {v.fused_overlay && (
              <div>
                <div className="text-[11px] text-slate-500 mb-1">Fused interpretation</div>
                <img src={v.fused_overlay} className="rounded-md border border-white/10 w-full aspect-square object-cover" />
              </div>
            )}
          </div>
        </Card>
      )}

      {(v.input_image || v.grounding_overlay) && (
        <Card>
          <PanelTitle>Visual evidence</PanelTitle>
          <div className="grid grid-cols-2 gap-3">
            {v.input_image && (
              <div>
                <div className="text-[11px] text-slate-500 mb-1">Input image</div>
                <img src={v.input_image} className="rounded-md border border-white/10 w-full aspect-square object-cover" />
              </div>
            )}
            {v.grounding_overlay && (
              <div>
                <div className="text-[11px] text-slate-500 mb-1">
                  Grounded region <span className="text-slate-600">(click a box for details)</span>
                </div>
                <ClickableRegionImage
                  src={v.grounding_overlay} analysisId={result.analysis_id}
                  className="rounded-md border border-white/10 w-full aspect-square object-cover"
                />
              </div>
            )}
          </div>
        </Card>
      )}

      <Card>
        <PanelTitle>Evidence</PanelTitle>
        <ul className="space-y-2">
          {result.evidence.map((e, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
              <CheckCircle2 size={15} className="text-accent-teal mt-0.5 shrink-0" />
              {e.detail}
            </li>
          ))}
        </ul>
        {result.warnings.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
            {result.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px] text-accent-amber">
                <AlertCircle size={13} className="mt-0.5 shrink-0" /> {w}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Follow-up suggestions (Innovation #2) */}
      {result.suggested_followups.length > 0 && onFollowupClick && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={15} className="text-accent-cyan" />
            <PanelTitle>Continue the conversation</PanelTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.suggested_followups.map((q) => (
              <button
                key={q}
                onClick={() => onFollowupClick(q)}
                className="focus-ring text-[12px] px-3 py-1.5 rounded-full border border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/10 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </Card>
      )}

      <SecondaryButton onClick={handleDownload} disabled={downloading}>
        <Download size={15} /> {downloading ? "Generating report..." : "Download analysis report"}
      </SecondaryButton>
    </div>
  );
}
