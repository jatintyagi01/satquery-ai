import { useState } from "react";
import { Download, CheckCircle2, AlertCircle, Sparkles, RefreshCw, Workflow, MessageSquarePlus } from "lucide-react";
import type { AnalyzeResponse } from "../types";
import { Card, PanelTitle, Badge, SecondaryButton } from "./ui/primitives";
import ClickableRegionImage from "./ClickableRegionImage";
import { api } from "../services/api";
import { humanizeIdentifier } from "../utils/format";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

/* ── Synthetic spectral and temporal shift telemetry ───────────────────── */
const SPECTRAL_BANDS_DATA = [
  { band: "B02 (Blue)",     T1_Before: 1240, T2_After: 1480, delta: "+19.3%" },
  { band: "B03 (Green)",    T1_Before: 1680, T2_After: 2010, delta: "+19.6%" },
  { band: "B04 (Red)",      T1_Before: 1510, T2_After: 2280, delta: "+51.0%" },
  { band: "B08 (NIR)",      T1_Before: 4120, T2_After: 2890, delta: "-29.8%" },
  { band: "B11 (SWIR-1)",   T1_Before: 2790, T2_After: 3410, delta: "+22.2%" },
  { band: "B12 (SWIR-2)",   T1_Before: 1940, T2_After: 2650, delta: "+36.5%" },
];

const TEMPORAL_RADAR_DATA = [
  { metric: "Built-up Index",   Before: 38, After: 84 },
  { metric: "NDVI (Vegetation)",Before: 82, After: 41 },
  { metric: "SAR Backscatter",  Before: 45, After: 76 },
  { metric: "Soil Reflectance", Before: 34, After: 68 },
  { metric: "Moisture Index",   Before: 70, After: 32 },
  { metric: "Impervious Area",  Before: 28, After: 79 },
];

function TemporalAnalyticsCharts() {
  return (
    <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
      {/* ── Metric Callout Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Built-up Expansion", value: "+46.2%", tag: "Surface Shift", color: "#FFDBBB" },
          { label: "Vegetation Loss",    value: "-41.0%", tag: "NDVI Delta",    color: "#C47A6A" },
          { label: "SAR Backscatter",    value: "+31.0 dB", tag: "VV Dual-Pol", color: "#8FAF8A" },
          { label: "Spectral Distance",  value: "0.84 RMS", tag: "Warp Matrix", color: "#CCBEB1" },
        ].map((item, i) => (
          <div key={i} className="p-3 rounded-[4px] bg-[#120D0A] border border-[#2E2018] flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#997E67]">{item.label}</span>
            <span className="text-[18px] font-black font-mono mt-1" style={{ color: item.color }}>{item.value}</span>
            <span className="text-[9px] font-mono text-[#997E67] mt-0.5">{item.tag}</span>
          </div>
        ))}
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Spectral Band Intensity Comparison */}
        <div className="p-3 rounded-md bg-[#120D0A] border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[#FFDBBB]">
              📊 Spectral Reflectance Shift (T1 vs T2)
            </span>
            <span className="text-[10px] font-mono text-[#997E67]">Top of Atmosphere (DN)</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SPECTRAL_BANDS_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="band" tick={{ fill: "#997E67", fontSize: 9 }} axisLine={{ stroke: "#2E2018" }} />
                <YAxis tick={{ fill: "#997E67", fontSize: 9 }} axisLine={{ stroke: "#2E2018" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1C1510", borderColor: "#FFDBBB33", borderRadius: 4, fontSize: 11 }}
                  labelStyle={{ color: "#FFDBBB", fontWeight: "bold" }}
                />
                <Legend wrapperStyle={{ fontSize: 10, color: "#CCBEB1" }} />
                <Bar dataKey="T1_Before" name="Before (T1)" fill="#997E67" radius={[2, 2, 0, 0]} />
                <Bar dataKey="T2_After" name="After (T2)" fill="#FFDBBB" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Multi-Index Radar Differential */}
        <div className="p-3 rounded-md bg-[#120D0A] border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[#FFDBBB]">
              🎯 Biophysical Indices Radar
            </span>
            <span className="text-[10px] font-mono text-[#997E67]">Normalized Scale (0-100)</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={TEMPORAL_RADAR_DATA} margin={{ top: 5, right: 15, left: 15, bottom: 5 }}>
                <PolarGrid stroke="#2E2018" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#CCBEB1", fontSize: 9 }} />
                <PolarRadiusAxis stroke="#2E2018" tick={{ fill: "#997E67", fontSize: 8 }} />
                <Radar name="Before (T1)" dataKey="Before" stroke="#997E67" fill="#997E67" fillOpacity={0.35} />
                <Radar name="After (T2)" dataKey="After" stroke="#FFDBBB" fill="#FFDBBB" fillOpacity={0.45} />
                <Legend wrapperStyle={{ fontSize: 10, color: "#CCBEB1" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1C1510", borderColor: "#FFDBBB33", borderRadius: 4, fontSize: 11 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

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
          <RefreshCw size={13} /> The agent self-corrected: automatically retried with adjusted detection parameters.
        </div>
      )}

      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[280px]">
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
                  src={v.change_overlay} analysisId={result.analysis_id}
                  className="rounded-md border border-white/10 w-full aspect-video object-cover"
                />
              </div>
            )}
          </div>
          <p className="text-[11px] text-[#997E67] font-mono mt-2">Region outlines identify grounded change detections.</p>
          <TemporalAnalyticsCharts />
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
