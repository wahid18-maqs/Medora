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
      {/* Clinical marker measurements */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Activity size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground">
                Clinical markers
              </h3>
              <p className="text-xs text-muted-foreground">
                Extracted values with reference ranges. Abnormal markers appear first.
              </p>
            </div>
          </div>
        </div>

        <DetailedBreakdownTable markers={result.markers} />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs">
        <RecommendationTabs agents={result.agents} />
      </div>

      <ActionFooter reportId={result.id} />
    </div>
  );
}
