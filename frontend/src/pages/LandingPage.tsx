import { useNavigate } from "react-router-dom";
import { ArrowRight, GitCompareArrows, Radar, Search, Eye } from "lucide-react";
import { Badge, PrimaryButton, SecondaryButton, Card, Wordmark } from "../components/ui/primitives";

const HOW_IT_WORKS = [
  { label: "Upload", desc: "Provide single, cross-modal, or bi-temporal imagery." },
  { label: "Understand", desc: "Query interpreted; modality and configuration inspected." },
  { label: "Plan", desc: "Task classified and specialist model selected from the registry." },
  { label: "Analyze", desc: "Selected model executes on the imagery." },
  { label: "Validate", desc: "Outputs and evidence signals are validated." },
  { label: "Explain", desc: "Evidence-grounded answer with verified evidence and trace returned." },
];

const TASKS = [
  { icon: Search, title: "Visual question answering", desc: "Ask natural questions about a single scene." },
  { icon: Eye, title: "Captioning & grounding", desc: "Scene descriptions and text-guided region highlighting." },
  { icon: GitCompareArrows, title: "Bi-temporal change analysis", desc: "Detect and explain change across two dates." },
  { icon: Radar, title: "Optical-SAR fusion", desc: "Combine spectral and backscatter evidence." },
];

const PIPELINE = [
  "Query Understanding",
  "Input Validator",
  "Task Router",
  "Model Registry",
];

const SPECIALISTS = ["VQA", "Grounding", "Captioning", "Change", "Optical-SAR"];

function PipelineDiagram() {
  return (
    <div className="flex flex-col items-center">
      {PIPELINE.map((step) => (
        <div key={step} className="flex flex-col items-center">
          <div className="panel rounded-[5px] px-4 py-2 text-[13px]" style={{ color: '#F0E4D8' }}>{step}</div>
          <div className="w-px h-6" style={{ background: 'rgba(204,190,177,0.18)' }} />
        </div>
      ))}
      <div className="flex items-start gap-2">
        {SPECIALISTS.map((s) => (
          <div key={s} className="flex flex-col items-center">
            <div className="w-px h-6" style={{ background: 'rgba(204,190,177,0.18)' }} />
            <div className="rounded-[5px] px-3 py-1.5 text-[12px] whitespace-nowrap border"
                 style={{ borderColor: 'rgba(255,219,187,0.22)', background: 'rgba(255,219,187,0.05)', color: '#FFDBBB' }}>{s}</div>
          </div>
        ))}
      </div>
      <div className="w-px h-6" style={{ background: 'rgba(204,190,177,0.18)' }} />
      {["Evidence Validator", "Response Synthesizer"].map((step) => (
        <div key={step} className="flex flex-col items-center">
          <div className="panel rounded-[5px] px-4 py-2 text-[13px]" style={{ color: '#F0E4D8' }}>{step}</div>
          <div className="w-px h-6" style={{ background: 'rgba(204,190,177,0.18)' }} />
        </div>
      ))}
      <div className="rounded-[5px] px-4 py-2 text-[13px] text-center border"
           style={{ borderColor: 'rgba(143,175,138,0.25)', background: 'rgba(143,175,138,0.05)', color: '#8FAF8A' }}>
        Answer + evidence + analysis + trace
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div style={{ background: "#120D0A", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <nav className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between" style={{ borderBottom: '1px solid #2E2018' }}>
        <div className="flex items-center gap-2.5">
          <Wordmark />
          <span className="font-semibold text-[15px] tracking-tight" style={{ color: '#F0E4D8' }}>SatQuery</span>
        </div>
        <SecondaryButton onClick={() => navigate("/dashboard")}>Enter app</SecondaryButton>
      </nav>

      <header className="max-w-6xl mx-auto px-8 pt-16 pb-20">
        <div className="max-w-4xl">
          <h1 className="text-[52px] font-black leading-[1.1] pop-heading tracking-tight" style={{ color: '#F0E4D8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Ask a question. Get evidence, not a guess.
          </h1>
          <p className="mt-6 max-w-2xl text-[16px] leading-relaxed" style={{ color: '#997E67' }}>
            SatQuery reads a natural-language question and a piece of satellite imagery, decides which
            specialist workflow applies — VQA, grounding, change detection, optical-SAR fusion — and
            answers with cited evidence and a full execution trace.
          </p>
          <div className="flex items-center gap-3 mt-8">
            <PrimaryButton onClick={() => navigate("/analyze")}>Start an analysis <ArrowRight size={15} /></PrimaryButton>
            <SecondaryButton onClick={() => navigate("/history")}>View history</SecondaryButton>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-8 py-16 grid grid-cols-2 gap-10 items-start border-t" style={{ borderColor: '#2E2018' }}>
        <div>
          <h2 className="text-2xl font-extrabold mb-3 pop-heading" style={{ color: '#F0E4D8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Remote-sensing AI is fragmented</h2>
          <p className="text-[14px] leading-relaxed" style={{ color: '#997E67' }}>
            Existing systems are isolated, single-task applications — land-cover classifiers, VQA models,
            change detectors — each requiring separate tooling and remote-sensing expertise to operate.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-extrabold mb-3 pop-heading" style={{ color: '#F0E4D8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>One agent, every workflow</h2>
          <p className="text-[14px] leading-relaxed" style={{ color: '#997E67' }}>
            SatQuery interprets a natural-language query and imagery configuration, then automatically
            selects and executes the correct specialist workflow — no manual model selection required.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-8 py-16 border-t" style={{ borderColor: '#2E2018' }}>
        <h2 className="text-2xl font-extrabold mb-8 pop-heading" style={{ color: '#F0E4D8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>From query to evidence-grounded answer</h2>
        <div className="grid grid-cols-6 gap-3">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.label} className="relative">
              <div className="data text-[11px] font-mono mb-2" style={{ color: '#FFDBBB' }}>{String(i + 1).padStart(2, "0")}</div>
              <div className="font-semibold text-[13px] mb-1.5" style={{ color: '#F0E4D8' }}>{s.label}</div>
              <div className="text-[12px] leading-relaxed" style={{ color: '#997E67' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-8 py-16 border-t" style={{ borderColor: '#2E2018' }}>
        <h2 className="text-2xl font-extrabold mb-3 pop-heading" style={{ color: '#F0E4D8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>A structured controller, not a chatbot</h2>
        <p className="text-[14px] leading-relaxed max-w-lg mb-8" style={{ color: '#997E67' }}>
          The agent doesn't ask a language model to guess an answer — it routes through a real,
          auditable pipeline with a fixed set of specialist tools.
        </p>
        <Card className="p-8 flex justify-center overflow-x-auto">
          <PipelineDiagram />
        </Card>
      </section>

      <section className="max-w-6xl mx-auto px-8 py-16 border-t" style={{ borderColor: '#2E2018' }}>
        <h2 className="text-2xl font-extrabold mb-8 pop-heading" style={{ color: '#F0E4D8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Multimodal intelligence, one interface</h2>
        <div className="grid grid-cols-4 gap-4">
          {TASKS.map(({ icon: Icon, title, desc }) => (
            <Card key={title}>
              <Icon size={18} className="mb-3" style={{ color: '#FFDBBB' }} />
              <div className="font-semibold text-[13px] mb-1" style={{ color: '#F0E4D8' }}>{title}</div>
              <div className="text-[12px] leading-relaxed" style={{ color: '#997E67' }}>{desc}</div>
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-8 py-16 border-t" style={{ borderColor: '#2E2018' }}>
        <h2 className="text-2xl font-extrabold mb-6 pop-heading" style={{ color: '#F0E4D8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Built for real deployment</h2>
        <div className="flex flex-wrap gap-2">
          {["React + TypeScript", "FastAPI", "PyTorch-ready", "Rasterio / GDAL", "OpenCV", "SQLite", "BigEarthNet adaptation pipeline"].map((t) => (
            <Badge key={t} tone="secondary">{t}</Badge>
          ))}
        </div>
      </section>

      <footer className="border-t py-8" style={{ borderColor: '#2E2018' }}>
        <div className="max-w-6xl mx-auto px-8 text-[12px] font-mono" style={{ color: '#44342A' }}>
          Built for Smart India Hackathon. Fallback inference is labeled clearly wherever a trained checkpoint isn't present.
        </div>
      </footer>
    </div>
  );
}
