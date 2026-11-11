"use client";

import { AlertTriangle } from "lucide-react";
import {
  buildGaugeScale,
  clamp,
  gaugeZoneSegments,
  needleRotation,
} from "@/lib/markerScale";
import type { Marker, MarkerStatus } from "@/lib/types";
import { markerReferenceLabel, markerStatusLabel, markerValueText } from "@/lib/markers";

const STATUS_BADGE: Record<MarkerStatus, string> = {
  high: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300",
  low: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300",
  normal:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300",
  unknown: "border-border bg-muted text-muted-foreground",
};

const ZONE_COLOR: Record<"low" | "normal" | "high", string> = {
  low: "#F59E0B",
  normal: "#22C55E",
  high: "#EF4444",
};

const GAUGE_PATH = "M15 60 A45 45 0 0 1 105 60";
const CENTER_X = 60;
const CENTER_Y = 60;
const NEEDLE_LENGTH = 34;

export default function MarkerGauge({ marker }: { marker: Marker }) {
  const scale = buildGaugeScale(marker);
  const zoneSegments = scale ? gaugeZoneSegments(scale.zones) : [];
  const needleAngle = scale
    ? needleRotation(clamp(scale.valuePosition, 0, 1))
    : needleRotation(0);
  const statusLabel = markerStatusLabel(marker.status);
  const valueLabel = `${markerValueText(marker)}${marker.unit ? ` ${marker.unit}` : ""}`;
  const referenceLabel = markerReferenceLabel(marker);
  const ariaLabel = `${marker.name}: ${valueLabel}, ${referenceLabel}, status ${statusLabel}`;

  return (
    <article className="flex min-h-[178px] flex-col rounded-xl border border-border bg-muted/40 p-3.5">
      <div className="mb-1 flex items-start justify-between gap-2">
        <h4 className="min-w-0 text-[13px] font-semibold leading-tight text-foreground">
          {marker.name}
        </h4>
        {marker.status !== "unknown" && (
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
              STATUS_BADGE[marker.status]
            }`}
          >
            {statusLabel}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        {scale ? (
          <div className="w-full" role="img" aria-label={ariaLabel}>
            <svg
              viewBox="0 0 120 72"
              className="w-full max-w-[190px] mx-auto overflow-hidden"
            >
              <path
                d={GAUGE_PATH}
                fill="none"
                stroke="var(--muted)"
                strokeWidth={10}
                strokeLinecap="butt"
              />
              {zoneSegments.map((zone) => (
                <path
                  key={`${zone.kind}-${zone.from}-${zone.to}`}
                  d={GAUGE_PATH}
                  fill="none"
                  stroke={ZONE_COLOR[zone.kind]}
                  strokeWidth={10}
                  strokeLinecap="butt"
                  pathLength={100}
                  strokeDasharray={`0 ${zone.from * 100} ${(zone.to - zone.from) * 100} 200`}
                />
              ))}
              <line
                x1={CENTER_X}
                y1={CENTER_Y}
                x2={CENTER_X}
                y2={CENTER_Y - NEEDLE_LENGTH}
                stroke="var(--foreground)"
                strokeWidth={3}
                strokeLinecap="round"
                transform={`rotate(${needleAngle} ${CENTER_X} ${CENTER_Y})`}
              />
              <circle cx={CENTER_X} cy={CENTER_Y} r={5} fill="var(--foreground)" />
              <circle cx={CENTER_X} cy={CENTER_Y} r={2} fill="var(--card)" />
            </svg>
          </div>
        ) : (
          <div
            className="flex h-[72px] w-full max-w-[186px] items-center justify-center rounded-lg bg-muted/50 px-3 text-center text-[11px] text-muted-foreground"
            role="img"
            aria-label={ariaLabel}
          >
            No numeric reference range
          </div>
        )}
      </div>

      <div className="mt-1 text-center">
        <p className="text-[19px] font-bold leading-tight text-foreground">
          {markerValueText(marker)}
          {marker.unit && (
            <span className="ml-1 text-xs font-medium text-muted-foreground">{marker.unit}</span>
          )}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{referenceLabel}</p>
        {marker.needs_review && (
          <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-300">
            <AlertTriangle size={11} />
            Check this value
          </p>
        )}
      </div>
    </article>
  );
}
