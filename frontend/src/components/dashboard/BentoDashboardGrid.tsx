"use client";

import { Activity } from "lucide-react";
import DetailedBreakdownTable from "@/components/analysis/DetailedBreakdownTable";
import RecommendationTabs from "@/components/analysis/RecommendationTabs";
import ActionFooter from "@/components/analysis/ActionFooter";
import type { AnalysisResult } from "@/lib/types";

interface BentoDashboardGridProps {
  result: AnalysisResult;
}

export default function BentoDashboardGrid({ result }: BentoDashboardGridProps) {
  return (
    <div className="space-y-6">
      {/* 1. Primary Detail Table: Clinical Marker Measurements (Full Width) */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Activity size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground">
                Clinical Marker Measurements
              </h3>
              <p className="text-xs text-muted-foreground">
                Extracted values with calibrated gauge ranges and status flags
              </p>
            </div>
          </div>
        </div>

        <DetailedBreakdownTable markers={result.markers} />
      </div>

      {/* 2. Recommendations Tabs */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs">
        <RecommendationTabs agents={result.agents} markers={result.markers} />
        <ActionFooter reportId={result.id} />
      </div>
    </div>
  );
}
