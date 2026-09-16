import { useEffect, useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

const STEPS = [
  "Query interpreted",
  "Input validated",
  "Modality detected",
  "Task identified",
  "Specialist model selected",
  "Inference executing",
  "Evidence validated",
  "Response generated",
];

export default function AgentExecutingPanel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((a) => (a < STEPS.length - 1 ? a + 1 : a));
    }, 260);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="panel rounded-md p-6 relative overflow-hidden mb-5">
      {/* sweep bar — peach primary */}
      <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden">
        <div className="w-1/3 h-full sweep-bar" style={{ background: "#FFDBBB", opacity: 0.7 }} />
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Loader2 size={16} className="animate-spin" style={{ color: "#FFDBBB" }} />
        <span className="font-medium text-[13px]" style={{ color: "#F0E4D8" }}>
          Remote Sensing Query Agent is working…
        </span>
      </div>
      <div className="space-y-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 text-[13px]">
            {i < active ? (
              <CheckCircle2 size={15} className="shrink-0" style={{ color: "#8FAF8A" }} />
            ) : i === active ? (
              <Loader2 size={15} className="animate-spin shrink-0" style={{ color: "#FFDBBB" }} />
            ) : (
              <div className="w-[15px] h-[15px] rounded-full border shrink-0"
                   style={{ borderColor: "#2E2018" }} />
            )}
            <span style={{ color: i <= active ? "#F0E4D8" : "#44342A" }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
