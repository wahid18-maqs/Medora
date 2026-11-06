import { Stethoscope, ShieldCheck, Apple, Dumbbell } from "lucide-react";
import type { AnalysisResult } from "@/lib/types";
import { stripMarkdown } from "@/lib/utils";

const CARDS = [
  { key: "medical", label: "Medical", sub: "Doctor Agent", icon: Stethoscope, bg: "bg-medical-bg", text: "text-medical-text" },
  { key: "verification", label: "Verification", sub: "Verifier Agent", icon: ShieldCheck, bg: "bg-verification-bg", text: "text-verification-text" },
  { key: "nutrition", label: "Nutrition", sub: "Nutritionist Agent", icon: Apple, bg: "bg-nutrition-bg", text: "text-nutrition-text" },
  { key: "exercise", label: "Exercise", sub: "Exercise Specialist", icon: Dumbbell, bg: "bg-exercise-bg", text: "text-exercise-text" },
] as const;

export default function AgentSummaryGrid({ agents }: { agents: AnalysisResult["agents"] }) {
  return (
    <div>
      <h4 className="font-medium text-sm text-primary-dark mb-2">Key Health Markers (Agent Summary)</h4>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {CARDS.map(({ key, label, sub, icon: Icon, bg, text }) => (
          <div key={key} className={`${bg} rounded-lg p-3`}>
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${text} mb-1`}>
              <Icon size={14} /> {label}
            </div>
            <p className={`text-[11px] ${text} opacity-70 mb-1`}>{sub}</p>
            <p className="text-xs text-foreground leading-snug line-clamp-3">
              {stripMarkdown(agents[key as keyof AnalysisResult["agents"]]) || "Pending analysis."}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
