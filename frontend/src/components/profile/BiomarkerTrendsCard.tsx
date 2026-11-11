"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { Activity } from "lucide-react";
import type { HistoryItem } from "@/lib/types";
import { normalizeMarkers } from "@/lib/markers";

type ChartPoint = {
  date: string;
  fullDate: string;
  value: number;
  unit: string;
  range: [number, number] | null;
  rawTimestamp: number;
};

export default function BiomarkerTrendsCard({ history }: { history: HistoryItem[] }) {
  const availableMarkers = useMemo(() => {
    const namesSet = new Set<string>();
    history.forEach((item) => {
      item.markers?.forEach((m) => {
        if (m.name) namesSet.add(m.name);
      });
    });
    return Array.from(namesSet);
  }, [history]);

  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const activeMarker =
    selectedMarker && availableMarkers.includes(selectedMarker)
      ? selectedMarker
      : availableMarkers[0] || null;

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!activeMarker) return [];

    const points: ChartPoint[] = [];

    history.forEach((item) => {
      const foundMarker = normalizeMarkers(item.markers).find(
        (m) => m.name.toLowerCase() === activeMarker.toLowerCase()
      );
      if (foundMarker && foundMarker.value !== null) {
        const d = new Date(item.timestamp);
        const timeVal = isNaN(d.getTime()) ? 0 : d.getTime();
        const dateStr = isNaN(d.getTime())
          ? item.timestamp
          : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        const fullDate = isNaN(d.getTime())
          ? item.timestamp
          : d.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            });

        points.push({
          date: dateStr,
          fullDate,
          value: foundMarker.value,
          unit: foundMarker.unit || "",
          range:
            foundMarker.ref_low !== null && foundMarker.ref_high !== null
              ? [foundMarker.ref_low, foundMarker.ref_high]
              : null,
          rawTimestamp: timeVal,
        });
      }
    });

    return points.sort((a, b) => a.rawTimestamp - b.rawTimestamp);
  }, [history, activeMarker]);

  const referenceRange = useMemo(() => {
    for (let i = chartData.length - 1; i >= 0; i -= 1) {
      const range = chartData[i].range;
      if (range && range[0] !== range[1]) return range;
    }
    return null;
  }, [chartData]);

  const hasData = chartData.length > 0;

  return (
    <div className="col-span-full flex h-full min-h-[320px] flex-col rounded-xl border border-border bg-card p-6 shadow-sm lg:p-8">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Activity className="shrink-0 text-primary-dark" size={20} />
          <div>
            <h3 className="text-lg font-semibold text-primary-dark">Biomarker Trends</h3>
            <p className="text-[13px] text-muted-foreground">
              Historical trend derived from analyzed blood test reports
            </p>
          </div>
        </div>

        {availableMarkers.length > 0 && (
          <select
            value={activeMarker ?? ""}
            onChange={(e) => setSelectedMarker(e.target.value)}
            className="w-full cursor-pointer rounded-lg border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 sm:w-72"
          >
            {availableMarkers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}
      </div>

      {!hasData ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted p-6 text-center">
          <p className="mb-1 text-sm font-medium text-foreground">No trend data yet</p>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            Upload a blood test report containing {activeMarker ?? "this marker"} to start
            tracking this biomarker.
          </p>
        </div>
      ) : (
        <div className="flex-1">
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  content={({ active, payload }: TooltipContentProps) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as ChartPoint;
                      return (
                        <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
                          <p className="font-medium text-muted-foreground">{data.fullDate}</p>
                          <p className="mt-0.5 font-semibold text-primary-dark">
                            {data.value} {data.unit}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {referenceRange && (
                  <ReferenceArea
                    y1={referenceRange[0]}
                    y2={referenceRange[1]}
                    fill="var(--primary)"
                    fillOpacity={0.08}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "var(--primary)", strokeWidth: 2, stroke: "var(--card)" }}
                  activeDot={{ r: 6, fill: "var(--primary)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {chartData.length === 1 && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Upload more reports to see trends.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
