"use client";
import * as Tabs from "@radix-ui/react-tabs";
import type { AnalysisResult } from "@/lib/types";
import { stripMarkdown } from "@/lib/utils";

const TAB_KEYS = ["medical", "verification", "nutrition", "exercise"] as const;
const TAB_LABELS: Record<(typeof TAB_KEYS)[number], string> = {
  medical: "Medical",
  verification: "Verification",
  nutrition: "Nutrition",
  exercise: "Exercise",
};

export default function RecommendationTabs({ agents }: { agents: AnalysisResult["agents"] }) {
  return (
    <div className="mb-6">
      <h4 className="font-medium text-sm text-primary-dark mb-2">Recommendations</h4>
      <Tabs.Root defaultValue="medical">
        <Tabs.List className="flex gap-4 border-b border-border mb-3">
          {TAB_KEYS.map((key) => (
            <Tabs.Trigger
              key={key}
              value={key}
              className="text-sm text-muted-foreground pb-2 border-b-2 border-transparent data-[state=active]:border-primary-dark data-[state=active]:text-primary-dark cursor-pointer font-medium"
            >
              {TAB_LABELS[key]}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {TAB_KEYS.map((key) => (
          <Tabs.Content key={key} value={key} className="text-sm text-foreground leading-relaxed whitespace-pre-line">
            {stripMarkdown(agents[key]) || "No recommendations yet."}
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </div>
  );
}
