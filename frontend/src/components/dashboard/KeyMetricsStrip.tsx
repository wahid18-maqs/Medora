"use client";

import type { Marker } from "@/lib/types";

interface KeyMetricsStripProps {
  markers: Marker[];
}

export default function KeyMetricsStrip({ markers }: KeyMetricsStripProps) {
  const evaluated = markers.filter((m) => m.status !== "unknown");
  const total = evaluated.length;
  const normalCount = evaluated.filter((m) => m.status === "normal").length;
  const highMarkers = evaluated.filter((m) => m.status === "high");
  const lowMarkers = evaluated.filter((m) => m.status === "low");
  const flaggedCount = highMarkers.length + lowMarkers.length;
  const normalPercent = total > 0 ? Math.round((normalCount / total) * 100) : 0;
  const unknownCount = markers.length - total;

  const flaggedNames = (items: Marker[]) => {
    if (items.length === 0) return null;
    if (items.length <= 2) return items.map((marker) => marker.name).join(", ");
    return `${items[0].name} +${items.length - 1}`;
  };
  const highLabel = flaggedNames(highMarkers);
  const lowLabel = flaggedNames(lowMarkers);

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <p className="text-[13px] text-muted-foreground">Report status</p>
        <p className="mt-1 text-[26px] font-bold leading-tight text-foreground">
          {total === 0
            ? "No markers"
            : flaggedCount === 0
              ? "Optimal"
              : `${flaggedCount} out of range`}
        </p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Based on {total} evaluated marker{total === 1 ? "" : "s"}
          {unknownCount > 0 ? ` · ${unknownCount} not reported` : ""}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <p className="text-[13px] text-muted-foreground">Optimal range</p>
        <p className="mt-1 text-[26px] font-bold leading-tight text-emerald-600 dark:text-emerald-400">
          {normalCount} / {total}
        </p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {normalPercent}% within reference
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <p className="text-[13px] text-muted-foreground">Elevated markers</p>
        <p className="mt-1 text-[26px] font-bold leading-tight text-red-600 dark:text-red-400">
          {highMarkers.length}
        </p>
        <p className="mt-0.5 truncate text-[13px] text-muted-foreground" title={highMarkers.map((marker) => marker.name).join(", ")}>
          {highLabel || "No elevated markers"}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <p className="text-[13px] text-muted-foreground">Deficient / low</p>
        <p className="mt-1 text-[26px] font-bold leading-tight text-amber-600 dark:text-amber-400">
          {lowMarkers.length}
        </p>
        <p className="mt-0.5 truncate text-[13px] text-muted-foreground" title={lowMarkers.map((marker) => marker.name).join(", ")}>
          {lowLabel || "No low markers"}
        </p>
      </div>
    </div>
  );
}
