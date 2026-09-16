import { useEffect, useState } from "react";
import { Boxes, ArrowRight } from "lucide-react";
import { Card, PanelTitle, Badge } from "../components/ui/primitives";
import { humanizeIdentifier, taskLabel } from "../utils/format";
import { api } from "../services/api";
import type { ModelCard } from "../types";

export default function ModelsPage() {
  const [models, setModels] = useState<ModelCard[]>([]);

  useEffect(() => {
    api.getModels().then(setModels);
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      <h1 className="font-display text-2xl font-medium text-slate-100 mb-1">Model registry</h1>
      <p className="text-sm text-slate-400 mb-6">
        Structured specialist tools the agent routes between. Fallback inference is clearly labeled and
        the architecture is ready for real trained checkpoints to be dropped in.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {models.map((m) => (
          <Card key={m.name}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Boxes size={16} className="text-accent-cyan" />
                <span className="font-medium text-sm text-slate-200">{humanizeIdentifier(m.name)}</span>
              </div>
              <Badge tone={m.status === "ready" ? "teal" : "amber"}>{m.status.toUpperCase()}</Badge>
            </div>
            <p className="text-[12px] text-slate-400 mt-3 leading-relaxed">{m.description}</p>
            <div className="grid grid-cols-2 gap-2 mt-4 text-[11px]">
              <div>
                <div className="text-slate-500">Task</div>
                <div className="text-slate-300 data">{taskLabel(m.task)}</div>
              </div>
              <div>
                <div className="text-slate-500">Input</div>
                <div className="text-slate-300 data">{m.input_type}</div>
              </div>
              <div>
                <div className="text-slate-500">Model type</div>
                <div className="text-slate-300 data">{m.model_type}</div>
              </div>
              <div>
                <div className="text-slate-500">Version</div>
                <div className="text-slate-300 data">{m.version}</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {m.output_type.map((o) => (
                <span key={o} className="flex items-center gap-1 text-[10px] data text-slate-500">
                  <ArrowRight size={10} /> {o}
                </span>
              ))}
            </div>
            {!m.adapted && (
              <div className="mt-3 pt-3 border-t border-white/10 text-[11px] text-accent-amber">
                Not yet fine-tuned on remote-sensing data — running fallback heuristic inference.
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
