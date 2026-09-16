import { HelpCircle } from "lucide-react";
import { Card, PanelTitle } from "./ui/primitives";

export default function ClarificationCard({
  answer,
  options,
  inputImage,
  onPick,
}: {
  answer: string;
  options: string[];
  inputImage?: string;
  onPick: (query: string) => void;
}) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-md bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center shrink-0">
          <HelpCircle size={18} className="text-accent-amber" />
        </div>
        <div className="flex-1">
          <PanelTitle>Clarification needed</PanelTitle>
          <p className="text-sm text-slate-300 leading-relaxed">{answer}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => onPick(opt)}
                className="focus-ring text-[12px] px-3 py-1.5 rounded-full border border-accent-amber/30 text-accent-amber hover:bg-accent-amber/10 transition-colors"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        {inputImage && (
          <img src={inputImage} className="w-20 h-20 object-cover rounded-md border border-white/10 shrink-0" />
        )}
      </div>
    </Card>
  );
}
