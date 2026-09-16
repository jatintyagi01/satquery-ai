import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { Card, PanelTitle, Badge, SecondaryButton } from "../components/ui/primitives";
import { api } from "../services/api";

const DATASETS = [
  { id: "vrsbench", label: "VRSBench", desc: "Captioning, grounding, VQA evaluation" },
  { id: "rsvqa", label: "RSVQA", desc: "Single-image VQA" },
  { id: "cdvqa", label: "CDVQA", desc: "Multitemporal change VQA" },
  { id: "custom", label: "Custom", desc: "User-provided evaluation set" },
];

export default function EvaluationPage() {
  const [evalResults, setEvalResults] = useState<Record<string, any>>({});
  const [evalLoading, setEvalLoading] = useState<string | null>(null);

  const runBenchmark = async (dataset: string) => {
    setEvalLoading(dataset);
    try {
      const res = await api.runEvaluation(dataset, 10);
      setEvalResults((prev) => ({ ...prev, [dataset]: res }));
    } finally {
      setEvalLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-medium text-slate-100 mb-1">Evaluation</h1>
        <p className="text-sm text-slate-400">
          Evaluate the pipeline against benchmark remote-sensing datasets.
        </p>
      </div>

      <Card>
        <PanelTitle>Benchmark evaluation</PanelTitle>
        <p className="text-[12px] text-slate-500 mb-4">
          Results are clearly labeled as SYNTHETIC RESULTS (computed on labeled synthetic data via the
          live pipeline) unless real benchmark files are placed under{" "}
          <code className="data">data/benchmarks/&lt;name&gt;</code>. No fabricated scores are shown.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {DATASETS.map((ds) => (
            <div key={ds.id} className="p-4 rounded-md border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold text-sm">{ds.label}</div>
                  <div className="text-[11px] text-slate-500">{ds.desc}</div>
                </div>
                <SecondaryButton onClick={() => runBenchmark(ds.id)} disabled={evalLoading === ds.id}>
                  <FlaskConical size={14} /> {evalLoading === ds.id ? "Running..." : "Run"}
                </SecondaryButton>
              </div>
              {evalResults[ds.id] && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <Badge tone={evalResults[ds.id].is_benchmark ? "teal" : "amber"}>
                    {evalResults[ds.id].is_benchmark ? "BENCHMARK RESULTS" : "SYNTHETIC RESULTS"}
                  </Badge>
                  <div className="mt-2 space-y-1">
                    {Object.entries(evalResults[ds.id].metrics || {}).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[12px]">
                        <span className="text-slate-400">{k}</span>
                        <span className="data text-slate-200">{typeof v === "number" ? v.toFixed(3) : String(v)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">{evalResults[ds.id].notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
