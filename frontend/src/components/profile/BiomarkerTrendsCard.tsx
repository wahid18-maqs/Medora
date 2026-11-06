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
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { Activity } from "lucide-react";
import type { HistoryItem } from "@/lib/types";

export default function BiomarkerTrendsCard({ history }: { history: HistoryItem[] }) {
  // Extract all available unique marker names across analyzed reports
  const availableMarkers = useMemo(() => {
    const namesSet = new Set<string>();
    history.forEach((item) => {
      item.markers?.forEach((m) => {
        if (m.name) namesSet.add(m.name);
      });
    });
    return Array.from(namesSet);
  }, [history]);

  const [selectedMarker, setSelectedMarker] = useState<string>(
    availableMarkers[0] || "Vitamin D"
  );

  // Extract historical trends for selected marker sorted by date ascending
  const chartData = useMemo(() => {
    const points: { date: string; value: number; unit: string; rawTimestamp: number }[] = [];

    history.forEach((item) => {
      const foundMarker = item.markers?.find(
        (m) => m.name.toLowerCase() === selectedMarker.toLowerCase()
      );
      if (foundMarker) {
        const d = new Date(item.timestamp);
        const timeVal = isNaN(d.getTime()) ? 0 : d.getTime();
        const dateStr = isNaN(d.getTime())
          ? item.timestamp
          : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

        points.push({
          date: dateStr,
          value: foundMarker.value,
          unit: foundMarker.unit || "",
          rawTimestamp: timeVal,
        });
      }
    });

    return points.sort((a, b) => a.rawTimestamp - b.rawTimestamp);
  }, [history, selectedMarker]);

  const hasEnoughData = chartData.length >= 2;

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6 flex flex-col justify-between col-span-1 lg:col-span-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="text-primary-dark" size={20} />
          <div>
            <h3 className="font-semibold text-primary-dark">Biomarker Trends</h3>
            <p className="text-xs text-muted-foreground">Historical trend derived from analyzed blood test reports</p>
          </div>
        </div>

        {availableMarkers.length > 0 && (
          <select
            value={selectedMarker}
            onChange={(e) => setSelectedMarker(e.target.value)}
            className="bg-muted border border-border text-xs rounded-lg px-3 py-1.5 font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
          >
            {availableMarkers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}
      </div>

      {!hasEnoughData ? (
        <div className="h-48 flex flex-col items-center justify-center bg-muted rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-sm font-medium text-foreground mb-1">
            Insufficient Historical Data
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            At least 2 analyzed reports containing {selectedMarker} are required to display trend visualization.
          </p>
        </div>
      ) : (
        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748B" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748B" }} domain={["auto", "auto"]} />
              <Tooltip
                content={({ active, payload }: TooltipContentProps) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-primary text-primary-foreground text-xs px-3 py-2 rounded-lg shadow-md">
                        <p className="font-medium">{data.date}</p>
                        <p className="text-emerald-400 font-semibold">
                          {data.value} {data.unit}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#1E3A8A"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#1E3A8A", strokeWidth: 2, stroke: "#FFFFFF" }}
                activeDot={{ r: 6, fill: "#0F172A" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
