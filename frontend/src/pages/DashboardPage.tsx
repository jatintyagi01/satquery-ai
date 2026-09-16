import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Image as ImageIcon, MessageSquareText, Layers,
  Activity, Eye, Cpu, Zap, ChevronRight,
} from "lucide-react";
import { Badge, Card3D } from "../components/ui/primitives";
import { taskLabel } from "../utils/format";
import { api } from "../services/api";
import type { HistoryItem } from "../types";

/* ── palette shortcuts ──────────────────────────────────── */
const C = {
  bg:      "#120D0A",
  panel:   "#1C1510",
  border:  "#2E2018",
  hover:   "#44342A",
  primary: "#FFDBBB",
  second:  "#CCBEB1",
  third:   "#997E67",
  text:    "#F0E4D8",
  muted:   "#997E67",
  pos:     "#8FAF8A",
};

/* ── Stat card ──────────────────────────────────────────── */
function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; icon: any; color: string;
}) {
  return (
    <Card3D className="!p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] tracking-wider uppercase font-extrabold font-mono pop-heading-sm"
              style={{ color }}>
          {label}
        </span>
        <Icon size={16} style={{ color: C.second }} />
      </div>
      <div className="font-mono text-4xl font-black leading-none pop-heading" style={{ color }}>
        {value}
      </div>
      {sub && <div className="text-[11px] font-mono font-medium" style={{ color: C.second }}>{sub}</div>}
    </Card3D>
  );
}

/* ── Sensor / right panel ───────────────────────────────── */
function SensorPanel() {
  return (
    <Card3D className="!p-4 space-y-4">
      {/* Fake satellite tile */}
      <div className="relative rounded-[3px] overflow-hidden" style={{ height: 138 }}>
        <div className="absolute inset-0"
             style={{ background: "linear-gradient(135deg, #1a0f0a 0%, #2a1a0e 40%, #1a0f0a 100%)" }} />
        <div className="absolute inset-0 graticule opacity-30" />
        {/* geographic patches */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-28 h-20">
            <div className="absolute top-2 left-4 w-16 h-11 rounded-sm opacity-50"
                 style={{ background: "linear-gradient(45deg, #3d2010, #5a3018)" }} />
            <div className="absolute top-5 right-2 w-8 h-7 rounded-sm opacity-40"
                 style={{ background: "#2d1a0e" }} />
            <div className="absolute bottom-1 left-5 w-12 h-3 rounded-sm opacity-60"
                 style={{ background: "#4d2a18" }} />
          </div>
        </div>
        {/* crosshair */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-5 h-5 border rounded-[2px]" style={{ borderColor: `${C.primary}60` }} />
        </div>
        <div className="absolute top-2 left-2 text-[10px] font-mono font-semibold" style={{ color: C.pos }}>
          REF-AO1-NORTH-DELTA
        </div>
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          <div className="w-5 h-px" style={{ background: C.second }} />
          <span className="text-[10px] font-mono font-semibold" style={{ color: C.second }}>10m GSD</span>
        </div>
      </div>

      {/* Sensor readouts */}
      <div className="space-y-2">
        <div className="text-[13px] tracking-wider uppercase font-mono font-bold pop-heading-sm" style={{ color: C.primary }}>
          Optical Bands
        </div>
        {[
          { k: "BANDS",      v: "B2, B3, B4, B8  C-Band IW SLC" },
          { k: "TARGETS",    v: "52, 53, 54" },
          { k: "POLAR",      v: "VV+VH" },
        ].map(({ k, v }) => (
          <div key={k} className="flex items-start justify-between gap-2 text-[12px] font-mono">
            <span style={{ color: C.second }}>{k}</span>
            <span className="text-right font-medium" style={{ color: C.text }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Agent fleet */}
      <div className="border-t pt-3 space-y-2.5" style={{ borderColor: C.border }}>
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold pop-heading-sm text-[13px]" style={{ color: C.primary }}>Agent Inference Fleet</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: C.pos }} />
            <span className="font-mono text-[10px] font-bold uppercase" style={{ color: C.pos }}>ONLINE</span>
          </div>
        </div>
        {/* mini bar chart */}
        <div className="flex items-end gap-1 h-8">
          {[60, 80, 45, 90, 70, 55, 85, 65].map((h, i) => (
            <div key={i} className="flex-1 rounded-[1px]"
                 style={{ height: `${h}%`, background: i === 3 ? C.primary : C.border }} />
          ))}
        </div>
        <div className="space-y-1 text-[11px] font-mono font-medium" style={{ color: C.second }}>
          <div>✓ Multi-Sensor Fusion Bank</div>
          <div>✓ Temporal Differential Tool</div>
        </div>
      </div>
    </Card3D>
  );
}

/* ── Main ───────────────────────────────────────────────── */
export default function DashboardPage() {
  const navigate = useNavigate();
  const [recent, setRecent] = useState<HistoryItem[]>([]);
  const [stats, setStats]   = useState({ analyzed: 0, queries: 0 });

  useEffect(() => {
    api.getHistory(8).then((h) => {
      setRecent(h);
      setStats({ analyzed: h.length, queries: h.length });
    }).catch(() => {});
  }, []);

  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">

      {/* ── Hero ──────────────────────────────────────────── */}
      <Card3D
        config={{ maxTilt: 3, scale: 1.005, parallax: false }}
        className="!px-7 !py-7 mb-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 graticule opacity-30 pointer-events-none" />
        <div className="relative z-10">
          <div className="text-[13px] tracking-wider uppercase font-mono font-bold mb-3 pop-heading-sm"
               style={{ color: C.primary }}>
            # MULTI-MODAL CORE V1.2
          </div>
          <h1 className="text-[34px] font-black leading-tight mb-2 pop-heading"
              style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Ask questions. Understand Earth.
          </h1>
          <p className="text-[14px] max-w-lg mb-5 leading-relaxed" style={{ color: C.second }}>
            An agentic vision-language assistant for multimodal remote-sensing intelligence — optical, SAR,
            multispectral, and multitemporal imagery, one natural-language query at a time.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => navigate("/missions")}
              className="inline-flex items-center gap-2 rounded-[5px] px-5 py-2.5 text-[14px] font-semibold transition-all shadow-glow"
              style={{ background: C.primary, color: "#1A1410" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#F5CFA8"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.primary; }}
            >
              <Zap size={15} /> 🛰️ Mission Mode Investigation
            </button>
            <button
              onClick={() => navigate("/analyze")}
              className="inline-flex items-center gap-2 rounded-[5px] px-4 py-2.5 text-[14px] font-semibold border transition-all"
              style={{ background: "transparent", color: C.second, borderColor: C.border }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.third; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; }}
            >
              Query &amp; Analyze
            </button>
          </div>
        </div>
      </Card3D>

      {/* ── Stats row ─────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="Images Analyzed"     value={stats.analyzed} sub={`${stats.analyzed * 2} FILE INGEST · 100% OK`} icon={ImageIcon}        color={C.primary} />
        <StatCard label="Queries Processed"   value={stats.queries}  sub="~429ms AVG · 0 FALLBACKS"                      icon={MessageSquareText} color={C.second}  />
        <StatCard label="Supported Modalities" value={3}             sub="OPT / SAR / MSI · SUB-PIXEL"                   icon={Layers}           color={C.pos}     />
        <StatCard label="Available AI Models"  value={7}             sub="VQA / DET / CNG · FPGA ENGINE"                  icon={Cpu}              color={C.third}   />
      </div>

      {/* ── Two-column ────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_280px] gap-4">

        {/* Recent analyses */}
        <Card3D className="!p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Activity size={16} style={{ color: C.primary }} />
              <h2 className="text-[17px] font-black pop-heading-sm" style={{ color: C.text }}>Recent Analyses</h2>
              <span className="text-[11px] font-mono ml-1 font-medium" style={{ color: C.second }}>
                LATEST MULTI-TEMPORAL SESSIONS
              </span>
            </div>
            <button
              onClick={() => navigate("/history")}
              className="flex items-center gap-1 text-[13px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: C.primary }}
            >
              View All <ChevronRight size={13} />
            </button>
          </div>

          {recent.length === 0 ? (
            <div className="text-[15px] py-10 text-center font-medium" style={{ color: C.second }}>
              No analyses yet — start one above.
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((r) => (
                <button
                  key={r.analysis_id}
                  onClick={() => navigate("/history")}
                  className="w-full text-left flex items-center justify-between p-3 rounded-[4px] border transition-all"
                  style={{ borderColor: C.border }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = `${C.third}60`;
                    (e.currentTarget as HTMLButtonElement).style.background  = `${C.primary}04`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
                    (e.currentTarget as HTMLButtonElement).style.background  = "transparent";
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-[3px] flex items-center justify-center shrink-0"
                         style={{ background: C.bg }}>
                      <Eye size={11} style={{ color: C.third }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium truncate" style={{ color: C.text }}>{r.query}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge tone="cyan">{taskLabel(r.task)}</Badge>
                        <span className="text-[11px] font-mono" style={{ color: C.second }}>
                          {new Date(r.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-[10px] font-mono border px-2 py-0.5 rounded transition-colors"
                          style={{ borderColor: C.border, color: C.third }}>
                      Inspect
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card3D>

        {/* Sensor panel */}
        <SensorPanel />
      </div>
    </div>
  );
}
