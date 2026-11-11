"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { Stethoscope } from "lucide-react";
import type { AnalysisResult } from "@/lib/types";
import MarkdownLite from "./MarkdownLite";

const TAB_KEYS = ["medical", "nutrition", "exercise", "verification"] as const;
const TAB_LABELS: Record<(typeof TAB_KEYS)[number], string> = {
  medical: "Medical",
  nutrition: "Nutrition",
  exercise: "Exercise",
  verification: "Questions for your doctor",
};

export default function RecommendationTabs({
  agents,
}: {
  agents: AnalysisResult["agents"];
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Stethoscope size={17} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Recommendations</h3>
          <p className="text-xs text-muted-foreground">
            Based only on the markers extracted from this report.
          </p>
        </div>
      </div>

      <Tabs.Root defaultValue="medical">
        <Tabs.List className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
          {TAB_KEYS.map((key) => (
            <Tabs.Trigger
              key={key}
              value={key}
              className="shrink-0 cursor-pointer border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground"
            >
              {TAB_LABELS[key]}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {TAB_KEYS.map((key) => (
          <Tabs.Content key={key} value={key} className="focus:outline-none">
            {agents[key] ? (
              <MarkdownLite content={agents[key]} />
            ) : (
              <p className="text-sm text-muted-foreground">No recommendations yet.</p>
            )}
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </div>
  );
}
