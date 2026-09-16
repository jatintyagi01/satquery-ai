import { useRef, type ReactNode } from "react";

/* ── palette ────────────────────────────────────────────── */
const C = {
  primary: "#FFDBBB",
  second:  "#CCBEB1",
  third:   "#997E67",
  text:    "#F0E4D8",
  border:  "#2E2018",
  pos:     "#8FAF8A",
  neg:     "#C47A6A",
};

export { Card3D, Card3DGroup, FeatureCard, ImageShowcaseCard } from "../Card3D";

/* ── Legacy Card (plain, no effect) ─────────────────────── */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`panel rounded-md p-5 ${className}`}>
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   PanelTitle — 3D pop heading
   ════════════════════════════════════════════════════════ */
export function PanelTitle({ children, pop = true }: { children: ReactNode; pop?: boolean }) {
  return (
    <h3
      className={`text-[15px] font-extrabold mb-3 ${pop ? "pop-heading-sm" : ""}`}
      style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {children}
    </h3>
  );
}

/* ════════════════════════════════════════════════════════
   Badge
   ════════════════════════════════════════════════════════ */
export function Badge({
  children,
  tone = "primary",
}: {
  children: ReactNode;
  tone?: "primary" | "secondary" | "tertiary" | "positive" | "negative" | "cyan" | "amber" | "teal" | "red" | "blue";
}) {
  const tones: Record<string, string> = {
    primary:   "bg-[#FFDBBB]/10 text-[#FFDBBB] border-[#FFDBBB]/20",
    secondary: "bg-[#CCBEB1]/10 text-[#CCBEB1] border-[#CCBEB1]/20",
    tertiary:  "bg-[#997E67]/10 text-[#997E67] border-[#997E67]/20",
    positive:  "bg-[#8FAF8A]/10 text-[#8FAF8A] border-[#8FAF8A]/20",
    negative:  "bg-[#C47A6A]/10 text-[#C47A6A] border-[#C47A6A]/20",
    cyan:   "bg-[#FFDBBB]/10 text-[#FFDBBB] border-[#FFDBBB]/20",
    amber:  "bg-[#997E67]/10 text-[#997E67] border-[#997E67]/20",
    teal:   "bg-[#8FAF8A]/10 text-[#8FAF8A] border-[#8FAF8A]/20",
    red:    "bg-[#C47A6A]/10 text-[#C47A6A] border-[#C47A6A]/20",
    blue:   "bg-[#CCBEB1]/10 text-[#CCBEB1] border-[#CCBEB1]/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold tracking-wide ${tones[tone] ?? tones.primary}`}>
      {children}
    </span>
  );
}

/* ════════════════════════════════════════════════════════
   PrimaryButton
   ════════════════════════════════════════════════════════ */
export function PrimaryButton({
  children, onClick, className = "", disabled = false, type = "button",
}: {
  children: ReactNode; onClick?: () => void; className?: string; disabled?: boolean; type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`focus-ring inline-flex items-center justify-center gap-2 rounded-[5px]
      font-bold px-5 py-2.5 text-[13px] transition-all
      disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={{ background: C.primary, color: "#1A1410" }}
      onMouseEnter={(e) => { if (!disabled) { const b = e.currentTarget as HTMLButtonElement; b.style.background = "#F5CFA8"; b.style.transform = "translateY(-1px)"; b.style.boxShadow = `0 6px 20px -4px rgba(255,219,187,0.4)`; } }}
      onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = C.primary; b.style.transform = ""; b.style.boxShadow = ""; }}
    >
      {children}
    </button>
  );
}

/* ════════════════════════════════════════════════════════
   SecondaryButton
   ════════════════════════════════════════════════════════ */
export function SecondaryButton({
  children, onClick, className = "", disabled = false,
}: {
  children: ReactNode; onClick?: () => void; className?: string; disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`focus-ring inline-flex items-center justify-center gap-2 rounded-[5px]
      font-semibold px-5 py-2.5 text-[13px] transition-all disabled:opacity-40
      border text-[#CCBEB1] hover:bg-[#FFDBBB]/[0.06] ${className}`}
      style={{ borderColor: "rgba(204,190,177,0.25)" }}
      onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = ""; }}
    >
      {children}
    </button>
  );
}

/* ════════════════════════════════════════════════════════
   SignalMeter
   ════════════════════════════════════════════════════════ */
export function SignalMeter({ value, segments = 10 }: { value?: number | null; segments?: number }) {
  if (value == null) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex gap-[3px]">
          {Array.from({ length: segments }).map((_, i) => (
            <div key={i} className="w-2 h-5 rounded-[1px] border" style={{ borderColor: C.border }} />
          ))}
        </div>
        <span className="data text-xs" style={{ color: C.third }}>n/a</span>
      </div>
    );
  }
  const pct    = Math.round(value * 100);
  const filled = Math.round((pct / 100) * segments);
  const color  = pct >= 80 ? C.pos : pct >= 60 ? C.third : C.neg;
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-[3px]">
        {Array.from({ length: segments }).map((_, i) => (
          <div key={i} className="w-2 h-5 rounded-[1px] border transition-colors"
               style={i < filled ? { backgroundColor: color, borderColor: color } : { borderColor: "rgba(153,126,103,0.25)" }} />
        ))}
      </div>
      <span className="data text-lg font-medium leading-none" style={{ color }}>{pct}%</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   TelemetryStrip
   ════════════════════════════════════════════════════════ */
export function TelemetryStrip({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="flex flex-wrap gap-px rounded-[5px] overflow-hidden border w-fit" style={{ borderColor: C.border }}>
      {items.map((item, i) => (
        <div key={i} className="px-3 py-1.5 flex items-center gap-2" style={{ background: "#1A1410" }}>
          <span className="text-[10px] font-mono" style={{ color: C.third }}>{item.label}</span>
          <span className="data text-[11px]" style={{ color: C.second }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   Wordmark — satellite orbit mark
   ════════════════════════════════════════════════════════ */
export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <ellipse cx="11" cy="11" rx="9.5" ry="4.2" stroke="#FFDBBB" strokeWidth="1.3" transform="rotate(-24 11 11)" />
      <circle cx="11" cy="11" r="2.1" fill="#FFDBBB" />
      <circle cx="18.4" cy="6.4" r="1.3" fill="#CCBEB1" />
    </svg>
  );
}
