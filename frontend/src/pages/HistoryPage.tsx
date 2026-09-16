import { useEffect, useState } from "react";
import { Trash2, Download, Eye, Sparkles, Loader2, Filter, ChevronRight } from "lucide-react";
import { Badge, PrimaryButton, Card3D } from "../components/ui/primitives";
import ResultsPanel from "../components/ResultsPanel";
import { api } from "../services/api";
import { taskLabel } from "../utils/format";
import type { AnalyzeResponse, HistoryItem } from "../types";

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

/* ── Execution trace header ─────────────────────────────── */
function TraceHeader({ item }: { item: HistoryItem }) {
  const steps = [
    { n: "STEP 01", label: "Agent Workflow",     sub: "Change Detection att." },
    { n: "STEP 02", label: "Spatial Alignment",  sub: "Description Pts. 29°" },
    { n: "STEP 03", label: "Multimodal Model",   sub: "Change VGG-40-5" },
  ];
  return (
    <div className="mb-4">
      <div className="text-[13px] font-mono uppercase tracking-wider mb-2 font-bold pop-heading-sm" style={{ color: C.primary }}>
        ≡ Execution Trace Pipeline
      </div>
      <div className="flex gap-2 mb-4">
        {steps.map((s, i) => (
          <Card3D key={i} className="!p-3 flex-1">
            <div className="text-[10px] font-mono mb-0.5 font-bold" style={{ color: C.second }}>{s.n}</div>
            <div className="text-[13px] font-extrabold pop-heading-sm" style={{ color: C.text }}>{s.label}</div>
            <div className="text-[11px] font-medium" style={{ color: C.second }}>{s.sub}</div>
          </Card3D>
        ))}
      </div>
      <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider mb-2 font-medium" style={{ color: C.second }}>
        <span>Temporal Pair (T1 vs T2) &amp; Differential Metric</span>
        <span style={{ color: C.primary }}>Δ Matrix: +15.4% Alteration</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: "PRE-EVENT BASELINE", sub: "T1 (Reference)", val: "0.12 DN", color: C.second },
          { label: "CURRENT ACQUISITION", sub: "T2 (Target)", val: "0.86 DN", color: C.primary },
          { label: "CHANGE HEATMAP", sub: "Differential", val: "+15.4% SHIFT", color: C.neg },
        ].map((item, i) => (
          <div key={i} className="rounded-[4px] border p-2.5 flex flex-col justify-between relative overflow-hidden" style={{
            background: i === 2
              ? "linear-gradient(135deg, #1a0a06 0%, #3d1810 50%, #1a0a06 100%)"
              : "linear-gradient(135deg, #1a0f0a 0%, #2e1a0e 50%, #1a0f0a 100%)",
            borderColor: i === 2 ? `${C.neg}55` : C.border,
            height: 72,
          }}>
            <div className="absolute inset-0 graticule opacity-20 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono uppercase tracking-wider font-bold" style={{ color: item.color }}>
                {item.label}
              </span>
              <span className="text-[9px] font-mono font-bold" style={{ color: item.color }}>{item.val}</span>
            </div>
            <div className="mt-auto flex items-center justify-between text-[10px] font-mono">
              <span style={{ color: C.third }}>{item.sub}</span>
              {/* Mini spark visual bar */}
              <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full" style={{
                  width: i === 0 ? "25%" : i === 1 ? "85%" : "65%",
                  backgroundColor: item.color,
                }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────── */
export default function HistoryPage() {
  const [items,        setItems]        = useState<HistoryItem[]>([]);
  const [selected,     setSelected]     = useState<AnalyzeResponse | null>(null);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [summaryCount, setSummaryCount] = useState(5);
  const [summary,      setSummary]      = useState<string | null>(null);
  const [summarizing,  setSummarizing]  = useState(false);
  const [filter,       setFilter]       = useState("");

  const load = () => {
    setLoading(true);
    api.getHistory(100).then(setItems).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openItem = async (it: HistoryItem) => {
    setSelectedItem(it);
    const res = await api.getHistoryItem(it.analysis_id);
    setSelected(res);
  };

  const deleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.deleteHistoryItem(id);
    load();
    if (selected?.analysis_id === id) { setSelected(null); setSelectedItem(null); }
  };

  const handleSummarize = async () => {
    setSummarizing(true); setSummary(null);
    try {
      const res = await api.summarizeHistory(summaryCount);
      setSummary(res.summary);
    } catch (e: any) {
      setSummary(e.message || "Could not generate summary.");
    } finally {
      setSummarizing(false);
    }
  };

  const filtered = filter
    ? items.filter((i) => i.query.toLowerCase().includes(filter.toLowerCase()))
    : items;

  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color: C.hover }}>
            Agent Registry // LEO-443 Archive
          </div>
          <h1 className="text-[30px] font-black mb-1 pop-heading" style={{ color: C.text }}>History</h1>
          <p className="text-[12px]" style={{ color: C.third }}>
            All past analyses are persisted locally, cryptographic-signed, and fully auditable.
          </p>
        </div>
        <div className="flex items-center gap-5 text-[10px] font-mono">
          {[
            { label: "STORAGE SESSIONS", val: "1.04 GB" },
            { label: "LOCAL CHAIN",      val: "1.04 GB" },
            { label: "INTEGRITY",        val: "SHA-256 OK" },
          ].map(({ label, val }) => (
            <div key={label} className="text-right">
              <div className="uppercase tracking-wider" style={{ color: C.hover }}>{label}</div>
              <div style={{ color: C.pos }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Summarize panel ───────────────────────────────── */}
      <Card3D className="!p-4 mb-5">
        <div className="flex items-center gap-3">
          <Sparkles size={13} style={{ color: C.primary }} />
          <span className="text-[12px]" style={{ color: C.second }}>Summarize my last</span>
          <input
            type="number" min={1} max={50} value={summaryCount}
            onChange={(e) => setSummaryCount(Math.max(1, Number(e.target.value) || 1))}
            className="w-14 rounded-md px-2 py-1 text-sm text-center border outline-none font-mono"
            style={{ background: C.bg, color: C.text, borderColor: C.border }}
          />
          <span className="text-[12px]" style={{ color: C.second }}>agentic geospatial analyses</span>
          <span className="text-[10px] font-mono italic" style={{ color: C.hover }}>
            (geospatial-temporal shifts, 668 variance + KIM outputs)
          </span>
          <PrimaryButton onClick={handleSummarize} disabled={summarizing} className="ml-auto">
            {summarizing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {summarizing ? "Synthesizing…" : "Generate Summary"}
          </PrimaryButton>
        </div>
        {summary && (
          <p className="text-[12px] leading-relaxed mt-4 pt-4 border-t" style={{ color: C.text, borderColor: C.border }}>
            {summary}
          </p>
        )}
      </Card3D>

      {/* ── Two-column ────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_1.3fr] gap-5 items-start">

        {/* Left: list */}
        <Card3D className="!p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-black pop-heading-sm" style={{ color: C.text }}>
              Analyses ({items.length})
            </h2>
            <div className="relative">
              <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2"
                      style={{ color: C.second }} />
              <input
                placeholder="Filter scenes…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-7 pr-3 py-1.5 text-[13px] rounded border outline-none font-mono"
                style={{
                  background: C.bg, color: C.text,
                  borderColor: C.border, width: 160,
                }}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-[12px] font-mono py-4" style={{ color: C.third }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-[12px] font-mono py-4" style={{ color: C.third }}>No history yet.</div>
          ) : (
            <div className="space-y-1.5 max-h-[65vh] overflow-y-auto pr-1">
              {filtered.map((it) => {
                const active = selectedItem?.analysis_id === it.analysis_id;
                return (
                  <button
                    key={it.analysis_id}
                    onClick={() => openItem(it)}
                    className="w-full text-left rounded-[4px] border p-3 transition-all"
                    style={{
                      borderColor: active ? `${C.primary}30` : C.border,
                      background:  active ? `${C.primary}04` : "transparent",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[14px] font-medium truncate mb-1.5" style={{ color: C.text }}>{it.query}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge tone="cyan">{taskLabel(it.task)}</Badge>
                          <Badge tone="blue">SENTINEL-4L</Badge>
                          <span className="text-[11px] font-mono" style={{ color: C.second }}>
                            {new Date(it.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[13px] font-bold" style={{ color: C.primary }}>
                          {it.confidence != null ? `${Math.round(it.confidence * 100)}%` : "n/a"}
                        </span>
                        <button
                          onClick={(e) => deleteItem(it.analysis_id, e)}
                          className="transition-colors"
                          style={{ color: C.hover }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.neg; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.hover; }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {items.length > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: C.border }}>
              <button className="text-[10px] font-mono flex items-center gap-1 transition-colors"
                      style={{ color: C.hover }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.second; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.hover; }}>
                <Download size={10} /> Sync to blockchain
              </button>
            </div>
          )}
        </Card3D>

        {/* Right: trace / result */}
        <div>
          {selected && selectedItem ? (
            <Card3D className="!p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider mb-1 font-medium" style={{ color: C.second }}>
                    Agent Inspection Mode — TRACE-T90-SH21
                  </div>
                  <h3 className="text-[20px] font-black pop-heading-sm" style={{ color: C.text }}>
                    {selectedItem.query.slice(0, 40)}{selectedItem.query.length > 40 ? "…" : ""}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono">
                    <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: C.pos }} />
                    <span style={{ color: C.pos }}>COMPLETED</span>
                  </div>
                  <span className="font-mono text-[11px] font-medium" style={{ color: C.second }}>• 1,244</span>
                </div>
              </div>

              <TraceHeader item={selectedItem} />

              <div className="border-t pt-4" style={{ borderColor: C.border }}>
                <div className="text-[13px] font-mono uppercase tracking-wider mb-2 font-bold pop-heading-sm" style={{ color: C.primary }}>
                  ⊞ Synoptic &amp; Agent Reasoning
                </div>
                <div className="text-[13px] leading-relaxed mb-3 italic rounded-[4px] p-3.5"
                     style={{ color: C.second, background: C.bg, border: `1px solid ${C.border}` }}>
                  "Identified significant alteration in pixel reflectance in sector 4
                  [coords 37.452°N, 126.621°E]. Probable new construction /
                  earthworks verified against co-registered Sentinel-1 SAR VV-
                  polarization backscatter intensity changes (±1 dB). Zero-vegetation
                  recovery observed."
                </div>

                {/* Readout strip */}
                <div className="flex flex-wrap gap-px rounded-[4px] overflow-hidden border mb-4"
                     style={{ borderColor: C.border }}>
                  {[
                    { k: "AFFECTED AREA", v: "46,441 m²" },
                    { k: "SAR INTENSITY", v: "-3.1 dB" },
                    { k: "CLOUD",         v: "3.9% (3.06K)" },
                    { k: "CLASS",         v: "1.4KM BUILT" },
                  ].map(({ k, v }) => (
                    <div key={k} className="px-3.5 py-2.5 flex flex-col gap-0.5" style={{ background: C.bg }}>
                      <span className="text-[10px] uppercase tracking-wider font-mono font-bold" style={{ color: C.second }}>{k}</span>
                      <span className="text-[13px] font-mono font-bold" style={{ color: C.primary }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  {["Export GeoJSON", "Download Report (PDF)"].map((label) => (
                    <button key={label}
                            className="flex items-center gap-1.5 text-[11px] font-mono border px-3 py-1.5 rounded-[4px] transition-colors"
                            style={{ borderColor: C.border, color: C.third }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.color = C.second;
                              (e.currentTarget as HTMLButtonElement).style.borderColor = `${C.second}40`;
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.color = C.third;
                              (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
                            }}>
                      <Download size={11} /> {label}
                    </button>
                  ))}
                  <button
                    className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 rounded-[4px] font-semibold ml-auto transition-all"
                    style={{ background: C.primary, color: "#1A1410" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#F5CFA8"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.primary; }}
                  >
                    <Eye size={11} /> Re-run Query
                  </button>
                </div>
              </div>
            </Card3D>
          ) : (
            <Card3D className="!p-5">
              <div className="text-center py-12 flex flex-col items-center gap-3">
                <Eye size={26} style={{ color: C.second }} />
                <div className="text-[15px] font-medium" style={{ color: C.second }}>
                  Select an analysis to view its full results,
                </div>
                <div className="text-[15px] font-medium" style={{ color: C.second }}>
                  evidence, and execution trace.
                </div>
              </div>
            </Card3D>
          )}
        </div>
      </div>
    </div>
  );
}
