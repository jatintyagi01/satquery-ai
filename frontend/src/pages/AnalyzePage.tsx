import { useState } from "react";
import { Sparkles, Mic, Image as ImageIcon, GitCompareArrows, Radar as RadarIcon, RotateCcw, ChevronRight } from "lucide-react";
import type { AnalysisMode, ImageMetadata, AnalyzeResponse } from "../types";
import UploadZone from "../components/UploadZone";
import { PrimaryButton, SecondaryButton, Card3D } from "../components/ui/primitives";
import AgentExecutingPanel from "../components/AgentExecutingPanel";
import ResultsPanel from "../components/ResultsPanel";
import ClarificationCard from "../components/ClarificationCard";
import { api } from "../services/api";
import { getSessionId, resetSessionId } from "../utils/session";

/* ── palette ────────────────────────────────────────────── */
const C = {
  bg:      "#120D0A",
  panel:   "#1C1510",
  border:  "#2E2018",
  hover:   "#44342A",
  primary: "#FFDBBB",
  second:  "#CCBEB1",
  third:   "#997E67",
  text:    "#F0E4D8",
  pos:     "#8FAF8A",
  neg:     "#C47A6A",
};

const MODES: { key: AnalysisMode; label: string; badge?: string; badgeColor?: string; icon: any; desc: string }[] = [
  { key: "single",       label: "Single Image",  badge: "ACTIVE",   badgeColor: C.pos,    icon: ImageIcon,        desc: "VQA, captioning, grounding & zero-shot detection" },
  { key: "optical_sar",  label: "Optical + SAR", badge: "BETA",     badgeColor: C.second, icon: RadarIcon,        desc: "Cross-modal fusion for cloud-penetrating analysis" },
  { key: "before_after", label: "Before + After",badge: "TEMPORAL", badgeColor: C.third,  icon: GitCompareArrows, desc: "Temporal change matrix, bi-temporal segmentation" },
];

const CHIPS_BY_MODE: Record<AnalysisMode, string[]> = {
  single:      ["Describe the image", "Find water bodies", "Identify built-up areas",
                "Are there buildings in this image?", "Highlight the water body then describe this image"],
  optical_sar: ["Use both images to identify built-up regions", "Analyze optical and SAR jointly",
                "Filter cloud cover using SAR penetration", "Detect all-weather maritime results"],
  before_after:["What changed?", "Has the built-up area increased?", "Compare these images",
                "Segment newly constructed roads", "Estimate vegetation loss percentage"],
};

/* ── Telemetry strip ────────────────────────────────────── */
function TelemetryBar({ mode }: { mode: AnalysisMode }) {
  const items =
    mode === "optical_sar"
      ? [
          { k: "ACTIVE CONSTELLATION", v: "Sentinel-2 MSI + S1 SAR" },
          { k: "GROUND RESOLUTION",    v: "10m/px Multi-Spectral" },
          { k: "CHANGE MODEL",         v: "Bi-Temporal Siamese-UNet" },
          { k: "EDGE COMPUTE",         v: "NVIDIA H100 + 10ms Latency" },
        ]
      : mode === "before_after"
      ? [
          { k: "ACTIVE CONSTELLATION", v: "Sentinel-2 MSI + S1 SAR" },
          { k: "SPATIAL CO-REG",       v: "Auto-Affine ≤ 0.3px RMS" },
          { k: "TEMPORAL DIFF",        v: "B-Spline Warp" },
          { k: "OUTPUT",               v: "GeoTIFF + Report PDF" },
        ]
      : [
          { k: "AGENT",                v: "SatQuery-Orchestrator v2.4" },
          { k: "SAT FEED",             v: "Geo-Coordinate Matrix Active" },
          { k: "SENSOR",               v: "RGB + NIR (SR)" },
          { k: "COORD",                v: "EPSG:4326 WGS84" },
        ];
  return (
    <div className="flex flex-wrap gap-px rounded-[4px] overflow-hidden border" style={{ borderColor: C.border }}>
      {items.map(({ k, v }) => (
        <div key={k} className="flex items-center gap-2 px-3 py-1.5" style={{ background: "#160F0B" }}>
          <span className="text-[9px] uppercase tracking-wider font-mono" style={{ color: C.hover }}>{k}</span>
          <span className="text-[9px] font-mono" style={{ color: C.second }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────── */
export default function AnalyzePage({ presetMode }: { presetMode?: AnalysisMode }) {
  const [mode, setMode]       = useState<AnalysisMode>(presetMode || "single");
  const [images, setImages]   = useState<(ImageMetadata | null)[]>([null, null]);
  const [query, setQuery]     = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<AnalyzeResponse | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [sessionId, setSessionId] = useState(getSessionId());
  const [turnCount, setTurnCount] = useState(0);

  const requiredCount = mode === "single" ? 1 : 2;
  const canRun = query.trim().length > 0 && images.slice(0, requiredCount).every((i) => i !== null) && !loading;

  const runQuery = async (q: string) => {
    setLoading(true); setError(null); setResult(null);
    try {
      const ids   = images.slice(0, requiredCount).map((i) => i!.file_id);
      const hints = mode === "optical_sar" ? { image_1: "optical", image_2: "sar" } : undefined;
      const res   = await api.analyze({ query: q, mode, image_ids: ids, modality_hints: hints, session_id: sessionId });
      setResult(res); setQuery(q); setTurnCount((c) => c + 1);
    } catch (e: any) {
      setError(e.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (key: AnalysisMode) => {
    setMode(key); setResult(null); setImages([null, null]); startNewConversation();
  };

  const startNewConversation = () => {
    setSessionId(resetSessionId()); setTurnCount(0); setResult(null); setQuery("");
  };

  const pageTitle =
    mode === "before_after" ? "Change Detection" :
    mode === "optical_sar"  ? "Optical + SAR Fusion" :
    "New Remote-Sensing Analysis";

  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">

      {/* ── Page header ───────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider mb-2"
               style={{ color: C.hover }}>
            <span>WORKSPACE</span>
            <ChevronRight size={9} />
            <span style={{ color: mode === "before_after" ? C.third : mode === "optical_sar" ? C.second : C.pos }}>
              {mode === "before_after" ? "WORKFLOW CONFIGURATOR • NODE_C3_04"
               : mode === "optical_sar"  ? "FUSION PIPELINE • MULTI-SENSOR"
               : "AGENTI_DISPATCH"}
            </span>
            <ChevronRight size={9} />
            <span style={{ color: C.third }}>GEO-COORDINATE MATRIX ACTIVE</span>
          </div>
          <h1 className="text-[30px] font-black leading-tight mb-1 pop-heading" style={{ color: C.text }}>
            {pageTitle}
          </h1>
          <p className="text-[12px]" style={{ color: C.third }}>
            Upload imagery, ask a question, and let the agent select the right specialist workflow.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {turnCount > 0 && (
            <SecondaryButton onClick={startNewConversation}>
              <RotateCcw size={13} /> New conversation
            </SecondaryButton>
          )}
        </div>
      </div>

      {/* ── Mode selector ─────────────────────────────────── */}
      {(() => {
        const currentModeConfig = MODES.find((m) => m.key === mode) || MODES[0];
        const ModeIcon = currentModeConfig.icon;
        return (
          <div className="w-full mb-5">
            <Card3D
              className="!p-5 cursor-default w-full"
              style={{
                borderColor: `${C.primary}40`,
                background: `${C.primary}06`,
              }}
            >
              <div className="w-full h-full text-left">
                <div className="flex items-center justify-between mb-2">
                  <ModeIcon size={22} style={{ color: C.primary }} />
                  {currentModeConfig.badge && (
                    <span
                      className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-[2px] border"
                      style={{
                        color: currentModeConfig.badgeColor || C.pos,
                        borderColor: `${currentModeConfig.badgeColor || C.pos}55`,
                        background: `${currentModeConfig.badgeColor || C.pos}12`,
                      }}
                    >
                      {currentModeConfig.badge}
                    </span>
                  )}
                </div>
                <div className="text-[17px] font-extrabold mb-1 pop-heading-sm" style={{ color: C.text }}>
                  {currentModeConfig.label}
                </div>
                <div className="text-[13px] leading-snug" style={{ color: C.second }}>
                  {currentModeConfig.desc}
                </div>
              </div>
            </Card3D>
          </div>
        );
      })()}

      {/* ── Upload zone ─────────────────────────────────────── */}
      <Card3D className="!p-5 mb-5 w-full">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[14px] font-mono uppercase tracking-wider font-extrabold pop-heading-sm" style={{ color: C.primary }}>
            {mode === "before_after"
              ? "Image Upload — Bi-temporal frame pair required"
              : "Image Upload // Primary Feed"}
          </div>
          <span className="text-[11px] font-mono font-medium" style={{ color: C.second }}>MAX 250MB // COG Optimised</span>
        </div>

        <div className={`grid gap-4 ${requiredCount === 2 ? "grid-cols-2" : "grid-cols-1 w-full"}`}>
          {mode === "before_after" ? (
            <>
              <div>
                <div className="text-[12px] font-mono uppercase mb-2 flex items-center gap-2 font-bold"
                     style={{ color: C.primary }}>
                  Before (T1)
                  <span className="text-[11px] font-medium" style={{ color: C.second }}>ACQUISITION IN PRIOR STATE</span>
                </div>
                <UploadZone label="Before (T1)" current={images[0]} onUploaded={(m) => setImages(([, b]) => [m, b])} />
                <div className="mt-1.5 text-[11px] font-mono font-medium" style={{ color: C.second }}>⊞ METADATA AUTO EXTRACT</div>
              </div>
              <div>
                <div className="text-[12px] font-mono uppercase mb-2 flex items-center gap-2 font-bold"
                     style={{ color: C.primary }}>
                  After (T2)
                  <span className="text-[11px] font-medium" style={{ color: C.pos }}>ACQUISITION IN RECENT STATE</span>
                </div>
                <UploadZone label="After (T2)" current={images[1]} onUploaded={(m) => setImages(([a]) => [a, m])} />
                <div className="mt-1.5 text-[11px] font-mono font-medium" style={{ color: C.second }}>⊞ ORTHO-REFERREC READY</div>
              </div>
            </>
          ) : mode === "optical_sar" ? (
            <>
              <div>
                <div className="text-[12px] font-mono uppercase mb-2 font-bold" style={{ color: C.primary }}>Optical Image</div>
                <UploadZone label="Optical Image" current={images[0]} onUploaded={(m) => setImages(([, b]) => [m, b])} />
                <div className="mt-1.5 text-[11px] font-mono font-medium" style={{ color: C.second }}>⊞ LSB Auto-Stretch</div>
              </div>
              <div>
                <div className="text-[12px] font-mono uppercase mb-2 font-bold" style={{ color: C.primary }}>SAR Image</div>
                <UploadZone label="SAR Image" current={images[1]} onUploaded={(m) => setImages(([a]) => [a, m])} />
                <div className="mt-1.5 text-[11px] font-mono font-medium" style={{ color: C.second }}>⊞ Speckle Filtering (Lee)</div>
              </div>
            </>
          ) : (
            <UploadZone label="Image" current={images[0]} onUploaded={(m) => setImages(([, b]) => [m, b])} />
          )}
        </div>
      </Card3D>

      {/* ── Query ───────────────────────────────────────────── */}
      <Card3D
        config={{ maxTilt: 3, scale: 1.005, parallax: false }}
        className="!p-5 mb-5"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-[14px] font-mono uppercase tracking-wider font-extrabold pop-heading-sm" style={{ color: C.primary }}>
            {turnCount > 0 ? `Follow-up Question (Turn ${turnCount + 1})` : "Query — Natural-Language Reasoning"}
          </div>
          <div className="text-[11px] font-mono font-medium" style={{ color: C.second }}>
            {turnCount > 0
              ? <span style={{ color: C.primary }}>Session remembers earlier turns</span>
              : "SAT-Orchestrator v2.4"}
          </div>
        </div>

        <div className="relative mb-3">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && canRun) runQuery(query); }}
            placeholder="Ask SatQuery anything about your imagery… tip: chain steps with 'then'"
            rows={2}
            className="w-full rounded-md px-4 py-3.5 pr-11 text-[15px] resize-none outline-none border transition-colors"
            style={{
              background: C.bg, color: C.text,
              borderColor: C.border,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
            onFocus={(e)  => { e.currentTarget.style.borderColor = `${C.primary}40`; }}
            onBlur={(e)   => { e.currentTarget.style.borderColor = C.border; }}
          />
          <Mic size={14} className="absolute right-4 top-3.5" style={{ color: C.hover }} />
        </div>

        {/* chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          {CHIPS_BY_MODE[mode].map((c) => (
            <button
              key={c}
              onClick={() => setQuery(c)}
              className="text-[13px] px-3.5 py-1.5 rounded-full border transition-colors font-medium"
              style={{ borderColor: `${C.second}40`, color: C.second }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = C.primary;
                (e.currentTarget as HTMLButtonElement).style.borderColor = C.primary;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = C.second;
                (e.currentTarget as HTMLButtonElement).style.borderColor = `${C.second}40`;
              }}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-[12px] font-mono font-medium" style={{ color: C.second }}>
            ⊞ Supports logical masking, mosaicing, area estimation &amp; classification
          </div>
          <div className="flex items-center gap-2">
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-[11px] border px-3 py-1.5 rounded-[4px] transition-colors"
                style={{ borderColor: C.border, color: C.third }}
              >
                Clear
              </button>
            )}
            <PrimaryButton onClick={() => runQuery(query)} disabled={!canRun}>
              <Sparkles size={14} />
              {mode === "before_after" ? "Execute Detection" : mode === "optical_sar" ? "Analyze Multimodal Imagery" : "Run Analysis"}
            </PrimaryButton>
          </div>
        </div>
        {error && <div className="text-[12px] font-mono mt-3" style={{ color: C.neg }}>{error}</div>}
      </Card3D>

      {/* ── Telemetry bar ─────────────────────────────────── */}
      <div className="mb-5"><TelemetryBar mode={mode} /></div>

      {/* ── Results ───────────────────────────────────────── */}
      {loading && <AgentExecutingPanel />}

      {result && !loading && result.clarification_needed && (
        <ClarificationCard
          answer={result.answer}
          options={result.clarification_options}
          inputImage={result.visual_outputs.input_image}
          onPick={(q) => runQuery(q)}
        />
      )}
      {result && !loading && !result.clarification_needed && (
        <ResultsPanel result={result} onFollowupClick={(q) => runQuery(q)} />
      )}

      {/* Optical+SAR info cards */}
      {mode === "optical_sar" && !loading && !result && (
        <div className="grid grid-cols-3 gap-4 mt-4">
          {[
            { title: "C-Band SAR Infiltration",  sub: "100% SRS ALL-WEATHER", desc: "Penetrates clouds & cirrus layers. Unlocks land-cover analysis during optical occlusion.", color: C.primary },
            { title: "Urban Double-Bounce",       sub: "BACKSCATTER ENGINE",   desc: "Computational urban backscatter correlates vertical man-made structures from natural terrain.",  color: C.second  },
            { title: "NDVI + SAR Co-variance",   sub: "SPECTRAL EQUATION",    desc: "Optical near-IR chlorophyll absorptions coupled with SAR biomass moisture estimations.",         color: C.pos    },
          ].map(({ title, sub, desc, color }) => (
            <Card3D key={title} className="!p-4">
              <div className="text-[11px] font-mono mb-1 font-bold pop-heading-sm" style={{ color }}>{sub}</div>
              <div className="text-[15px] font-extrabold mb-1 pop-heading-sm" style={{ color: C.text }}>{title}</div>
              <div className="text-[13px] leading-relaxed" style={{ color: C.second }}>{desc}</div>
            </Card3D>
          ))}
        </div>
      )}
    </div>
  );
}
