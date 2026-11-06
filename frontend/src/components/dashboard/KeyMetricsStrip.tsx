"use client";

import { Activity, AlertTriangle, CheckCircle2, TrendingUp, ShieldAlert } from "lucide-react";
import type { Marker } from "@/lib/types";

interface KeyMetricsStripProps {
  markers: Marker[];
}

export default function KeyMetricsStrip({ markers }: KeyMetricsStripProps) {
  const total = markers.length;
  const normalCount = markers.filter((m) => m.status === "Normal").length;
  const highCount = markers.filter((m) => m.status === "High").length;
  const lowCount = markers.filter((m) => m.status === "Low").length;
  const flaggedCount = highCount + lowCount;
  const normalPercent = total > 0 ? Math.round((normalCount / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* 1. Overall Status Card */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-xs font-medium">Report Status</span>
          <Activity size={16} className="text-primary" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-foreground">
            {total === 0 ? "No Markers" : flaggedCount === 0 ? "Optimal" : `${flaggedCount} Out of Range`}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">Based on {total} evaluated test markers</p>
      </div>

      {/* 2. Normal Markers Card */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-xs font-medium">Optimal Range</span>
          <CheckCircle2 size={16} className="text-emerald-500 dark:text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{normalCount}</span>
          <span className="text-xs text-muted-foreground">/ {total} markers</span>
        </div>
        <p className="text-[11px] text-emerald-600 dark:text-emerald-400/80 mt-1 font-medium">
          {normalPercent}% within normal reference
        </p>
      </div>

      {/* 3. High Markers Card */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-xs font-medium">Elevated Markers</span>
          <TrendingUp size={16} className="text-red-500 dark:text-red-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-red-600 dark:text-red-400">{highCount}</span>
          <span className="text-xs text-muted-foreground">flagged high</span>
        </div>
        <p className="text-[11px] text-red-500 dark:text-red-400/80 mt-1">
          {highCount > 0 ? "Requires dietary or follow-up review" : "No elevated indicators"}
        </p>
      </div>

      {/* 4. Low Markers Card */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-xs font-medium">Deficient / Low</span>
          <ShieldAlert size={16} className="text-blue-500 dark:text-blue-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{lowCount}</span>
          <span className="text-xs text-muted-foreground">below reference</span>
        </div>
        <p className="text-[11px] text-blue-600 dark:text-blue-400/80 mt-1">
          {lowCount > 0 ? "Nutritional supplementation advised" : "No low deficiencies"}
        </p>
      </div>
    </div>
  );
}
