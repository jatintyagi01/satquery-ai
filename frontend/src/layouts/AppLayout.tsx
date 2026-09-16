import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ScanSearch, GitCompareArrows, History, Radar,
  Satellite, Activity, ChevronRight, Compass,
} from "lucide-react";
import { Wordmark } from "../components/ui/primitives";

const NAV = [
  { to: "/dashboard",        label: "Dashboard",        icon: LayoutDashboard },
  { to: "/missions",         label: "Mission Mode",     icon: Compass, highlight: true },
  { to: "/analyze",          label: "Analyze",           icon: ScanSearch },
  { to: "/change-detection", label: "Change Detection",  icon: GitCompareArrows },
  { to: "/optical-sar",      label: "Optical + SAR",     icon: Radar },
  { to: "/history",          label: "History",           icon: History },
];

const PAGE_LABELS: Record<string, string> = {
  "/dashboard":        "Dashboard",
  "/missions":         "Mission Mode // Autonomous Investigation",
  "/analyze":          "Analysis // Agenti Dispatch",
  "/change-detection": "Change Detection // Pipeline",
  "/optical-sar":      "Optical + SAR // Fusion",
  "/history":          "Agent Registry // LEO-443 Archive",
};

/* ── Color tokens ───────────────────────────────────────────
   BG-deep:   #120D0A   BG-panel: #1A1410   BG-surface: #1C1510
   Border:    #2E2018   Hover:    #44342A
   Primary:   #FFDBBB   Secondary:#CCBEB1   Tertiary: #997E67
   Text:      #F0E4D8   Muted:    #997E67
   Positive:  #8FAF8A
   ─────────────────────────────────────────────────────── */

export default function AppLayout() {
  const location  = useLocation();
  const pageLabel = PAGE_LABELS[location.pathname] ?? "Mission Control";

  return (
    <div className="min-h-screen flex" style={{ background: "#120D0A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ══ Sidebar ══════════════════════════════════════════ */}
      <aside
        className="w-[200px] shrink-0 flex flex-col border-r"
        style={{ background: "#160F0B", borderColor: "#2E2018" }}
      >
        {/* Logo */}
        <div className="px-4 py-5 flex items-center gap-2.5 border-b" style={{ borderColor: "#2E2018" }}>
          <Wordmark size={20} />
          <div>
            <div className="font-semibold text-[14px] tracking-tight leading-none text-[#F0E4D8]"
                 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>SatQuery AI</div>
            <div className="text-[9px] mt-0.5 tracking-wider uppercase" style={{ color: "#997E67" }}>
              Mission Control
            </div>
          </div>
        </div>

        {/* SYS status */}
        <div className="px-4 py-2.5 border-b" style={{ borderColor: "#2E2018" }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: "#8FAF8A" }} />
            <span className="text-[11px] tracking-widest font-bold uppercase" style={{ color: "#8FAF8A" }}>
              SYS ONLINE
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3">
          <div className="text-[11px] tracking-widest font-bold px-2.5 mb-2 uppercase"
               style={{ color: "#997E67" }}>Operations</div>
          <div className="space-y-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-[4px] text-[14px] font-medium transition-all border-l-2 ${
                    isActive ? "font-semibold" : ""
                  }`
                }
                style={({ isActive }) =>
                  isActive
                    ? { color: "#FFDBBB", borderLeftColor: "#FFDBBB", background: "rgba(255,219,187,0.08)" }
                    : { color: "#CCBEB1", borderLeftColor: "transparent" }
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Telemetry footer */}
        <div className="p-3 border-t space-y-2" style={{ borderColor: "#2E2018" }}>
          {/* Agent / Orbit tiles */}
          <div className="flex rounded-[4px] overflow-hidden border text-[9px]" style={{ borderColor: "#2E2018" }}>
            <div className="flex-1 px-2 py-1.5" style={{ background: "#120D0A" }}>
              <div className="uppercase tracking-wider" style={{ color: "#44342A" }}>Agent</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1 h-1 rounded-full pulse-dot" style={{ background: "#8FAF8A" }} />
                <span className="font-mono" style={{ color: "#CCBEB1" }}>Online</span>
              </div>
            </div>
            <div className="flex-1 px-2 py-1.5 border-l" style={{ background: "#120D0A", borderColor: "#2E2018" }}>
              <div className="uppercase tracking-wider" style={{ color: "#44342A" }}>Orbit</div>
              <div className="font-mono mt-0.5" style={{ color: "#CCBEB1" }}>LEO-520km</div>
            </div>
          </div>

          {/* Telemetry line */}
          <div className="text-[9px] font-mono space-y-0.5" style={{ color: "#44342A" }}>
            <div className="flex items-center justify-between">
              <span>SENTINEL-2B</span>
              <span style={{ color: "#8FAF8A" }}>L-BAND</span>
            </div>
            <div className="text-[8px]" style={{ color: "#2E2018" }}>ORBIT: LEO-520km • LAT 22.6°…</div>
          </div>
        </div>
      </aside>

      {/* ══ Main area ════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Top header bar */}
        <header
          className="h-10 shrink-0 flex items-center justify-between px-5 border-b"
          style={{ background: "#160F0B", borderColor: "#2E2018" }}
        >
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-mono text-[10px]" style={{ color: "#FFDBBB" }}>▣</span>
            <span className="font-medium" style={{ color: "#F0E4D8" }}>Mission Control Node</span>
            <ChevronRight size={10} style={{ color: "#44342A" }} />
            <span style={{ color: "#997E67" }}>{pageLabel}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10px]">
              <Satellite size={11} style={{ color: "#8FAF8A" }} />
              <span className="font-mono" style={{ color: "#CCBEB1" }}>SENTINEL-2B</span>
              <span className="text-[9px] font-semibold tracking-wider uppercase" style={{ color: "#8FAF8A" }}>
                / ACTIVE
              </span>
            </div>
            <div className="w-6 h-6 rounded-full flex items-center justify-center border"
                 style={{ background: "#2E2018", borderColor: "rgba(255,219,187,0.12)" }}>
              <Activity size={11} style={{ color: "#FFDBBB" }} />
            </div>
          </div>
        </header>

        {/* Sub-breadcrumb banner */}
        <div className="shrink-0 px-5 py-2 flex items-center gap-2 border-b"
             style={{ background: "#120D0A", borderColor: "#2E2018" }}>
          <div className="text-[11px] font-mono tracking-wider uppercase font-medium" style={{ color: "#997E67" }}>
            # Agentic Remote-Sensing Intelligence
          </div>
          <span style={{ color: "#997E67" }}>•</span>
          <div className="text-[11px] font-mono font-medium" style={{ color: "#997E67" }}>STAC</div>
          <span style={{ color: "#997E67" }}>•</span>
          <div className="text-[11px] font-mono font-medium" style={{ color: "#997E67" }}>COG Pipeline Ready</div>
          <div className="ml-auto flex items-center gap-2 text-[11px] font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "#8FAF8A" }} />
            <span style={{ color: "#8FAF8A" }}>Sentinel-2 &amp; Sentinel-1 Constellation Connected</span>
          </div>
        </div>

        <main className="flex-1 min-h-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
