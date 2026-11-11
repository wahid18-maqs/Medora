import React from "react";
import type { Marker } from "@/lib/types";
import RangeGauge from "./RangeGauge";

const STATUS_STYLE: Record<Marker["status"], string> = {
  Low: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  High: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
  Normal: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
};

export default function DetailedBreakdownTable({ markers }: { markers: Marker[] }) {
  if (!markers || markers.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm text-foreground">Detailed Breakdown</h4>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="py-3 font-semibold">Marker Name</th>
              <th className="py-3 font-semibold">Measured Value</th>
              <th className="py-3 font-semibold">Reference Range</th>
              <th className="w-[200px] py-3 text-center font-semibold">Visual Indicator</th>
              <th className="py-3 text-right font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {markers.map((m, idx) => (
              <tr
                key={m.name + idx}
                className="border-b border-border/60 transition-colors hover:bg-muted/50"
              >
                <td className="py-4 align-middle text-sm font-medium text-foreground">{m.name}</td>
                <td className="py-4 align-middle text-sm font-semibold text-foreground">
                  {m.value}{" "}
                  <span className="text-[13px] font-normal text-muted-foreground">{m.unit}</span>
                </td>
                <td className="py-4 align-middle text-xs text-muted-foreground">
                  {m.range[0]} - {m.range[1]}
                </td>
                <td className="py-4 text-center align-middle">
                  <div className="flex justify-center items-center">
                    <RangeGauge value={m.value} range={m.range} status={m.status} unit={m.unit} />
                  </div>
                </td>
                <td className="py-4 align-middle text-right">
                  <span
                    className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${
                      STATUS_STYLE[m.status] || "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {m.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
