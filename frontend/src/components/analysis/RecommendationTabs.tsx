"use client";
import * as Tabs from "@radix-ui/react-tabs";
import { AlertCircle, CheckCircle2, Stethoscope } from "lucide-react";
import type { AnalysisResult, Marker } from "@/lib/types";
import MarkdownLite from "./MarkdownLite";

const TAB_KEYS = ["medical", "verification", "nutrition", "exercise"] as const;
const TAB_LABELS: Record<(typeof TAB_KEYS)[number], string> = {
  medical: "Medical",
  verification: "Questions for your doctor",
  nutrition: "Nutrition",
  exercise: "Exercise",
};

const STATUS_STYLE: Record<Marker["status"], string> = {
  Low: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  High: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
  Normal:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
};

function KeyFindings({ markers }: { markers: Marker[] }) {
  const flagged = markers.filter((marker) => marker.status !== "Normal");

  return (
    <div className="mb-5 rounded-xl border border-border bg-muted/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        {flagged.length > 0 ? (
          <AlertCircle size={16} className="text-amber-600 dark:text-amber-400" />
        ) : (
          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
        )}
        <h4 className="text-sm font-semibold text-foreground">Key findings</h4>
      </div>

      {markers.length === 0 ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          No markers were extracted, so there are no marker-specific findings to summarize.
        </p>
      ) : flagged.length === 0 ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          All {markers.length} extracted markers were within their reference ranges.
        </p>
      ) : (
        <ul className="space-y-2">
          {flagged.map((marker, index) => (
            <li key={`${marker.name}-${index}`} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-foreground">{marker.name}</span>
              <span className="text-muted-foreground">
                {marker.value} {marker.unit}
              </span>
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  STATUS_STYLE[marker.status]
                }`}
              >
                {marker.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function RecommendationTabs({
  agents,
  markers,
}: {
  agents: AnalysisResult["agents"];
  markers: Marker[];
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
            Grounded in the extracted markers shown above
          </p>
        </div>
      </div>

      <KeyFindings markers={markers} />

      <Tabs.Root defaultValue="medical">
        <Tabs.List className="-mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-border px-1">
          {TAB_KEYS.map((key) => (
            <Tabs.Trigger
              key={key}
              value={key}
              className="shrink-0 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary cursor-pointer"
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
