import { useState } from "react";
import { ChevronDown, CheckCircle2, AlertTriangle, XCircle, Activity } from "lucide-react";
import type { TraceStep } from "../types";
import { Card, PanelTitle } from "./ui/primitives";
import { humanizeIdentifier } from "../utils/format";

const statusIcon = {
  ok: <CheckCircle2 size={15} className="text-accent-teal" />,
  warning: <AlertTriangle size={15} className="text-accent-amber" />,
  error: <XCircle size={15} className="text-accent-red" />,
};

export default function ExecutionTracePanel({ trace, agent, model }: { trace: TraceStep[]; agent: string; model: string }) {
  const [open, setOpen] = useState(true);
  return (
    <Card>
      <button
        className="focus-ring w-full flex items-center justify-between"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-accent-cyan" />
          <span className="font-medium text-sm text-slate-200">Execution trace</span>
          <span className="flex items-center gap-2 text-[11px] text-slate-500 border-l border-white/10 pl-2 ml-1">
            <span>{agent}</span>
            <span className="data text-slate-600">{humanizeIdentifier(model)}</span>
          </span>
        </div>
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-4 space-y-0">
          {trace.map((step, i) => (
            <div key={i} className="relative pl-6 pb-4 last:pb-0">
              {i < trace.length - 1 && (
                <div className="absolute left-[7px] top-5 bottom-0 w-px bg-white/10" />
              )}
              <div className="absolute left-0 top-0.5">{statusIcon[step.status]}</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-200">{step.step}</span>
                <span className="data text-[11px] text-slate-500">{step.processing_time_ms} ms</span>
              </div>
              <div className="data text-[11px] text-accent-blue/90 mt-0.5">{humanizeIdentifier(step.tool)}</div>
              <div className="text-[12px] text-slate-400 mt-1">
                <span className="text-slate-500">in:</span> {step.input_summary}
              </div>
              <div className="text-[12px] text-slate-400">
                <span className="text-slate-500">out:</span> {step.output_summary}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
