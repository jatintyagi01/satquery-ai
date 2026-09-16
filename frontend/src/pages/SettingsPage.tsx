import { useState } from "react";
import { Cpu, Database, Info } from "lucide-react";
import { Card, PanelTitle, Badge } from "../components/ui/primitives";

export default function SettingsPage() {
  const [mode, setMode] = useState<"cpu" | "gpu">("cpu");

  return (
    <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-slate-100 mb-1">Settings</h1>
        <p className="text-sm text-slate-400">Local configuration for this SatQuery AI instance.</p>
      </div>

      <Card>
        <PanelTitle>Model configuration</PanelTitle>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2 text-sm"><Cpu size={15} className="text-accent-cyan" /> Compute mode</div>
          <div className="flex gap-2">
            {(["cpu", "gpu"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`focus-ring px-3 py-1 rounded-md text-xs data border ${
                  mode === m ? "border-accent-cyan text-accent-cyan bg-accent-cyan/10" : "border-white/10 text-slate-400"
                }`}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="text-[11px] text-slate-500">
          No GPU detected in this environment — inference runs via CPU fallback pipelines automatically.
        </div>
      </Card>

      <Card>
        <PanelTitle>Storage</PanelTitle>
        <div className="flex items-center gap-2 text-sm mb-1"><Database size={15} className="text-accent-cyan" /> SQLite (local)</div>
        <div className="text-[12px] text-slate-500">Uploaded imagery, previews, and history are stored locally under <code className="data">backend/uploads</code> and <code className="data">backend/satquery.db</code>.</div>
      </Card>

      <Card>
        <PanelTitle>API configuration</PanelTitle>
        <div className="text-[12px] text-slate-500">
          API keys and secrets are never exposed to the frontend. All model configuration is controlled via
          backend environment variables (see <code className="data">.env.example</code>).
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-2"><Info size={15} className="text-accent-cyan" /><PanelTitle>About SatQuery AI</PanelTitle></div>
        <p className="text-[12px] text-slate-400 leading-relaxed">
          SatQuery AI is an agentic vision-language assistant for multimodal remote-sensing image analysis,
          built for the Smart India Hackathon. It routes natural-language queries across single-image,
          cross-modal (optical+SAR), and bi-temporal imagery to the appropriate specialist workflow, returning
          evidence-grounded answers, cited evidence, and full execution traces.
        </p>
        <Badge tone="cyan" >v0.1.0</Badge>
      </Card>
    </div>
  );
}
