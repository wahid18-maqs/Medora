"use client";

import { X } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import AgentSummaryGrid from "./AgentSummaryGrid";
import DetailedBreakdownTable from "./DetailedBreakdownTable";
import RecommendationTabs from "./RecommendationTabs";
import ActionFooter from "./ActionFooter";
import ReportChat from "./ReportChat";
import type { AnalysisResult } from "@/lib/types";

export default function AnalysisDrawer({
  result,
  onClose,
}: {
  result: AnalysisResult;
  onClose: () => void;
}) {
  return (
    <aside className="w-[35%] min-w-[380px] bg-card border-l border-border h-screen sticky top-0 overflow-y-auto px-6 py-6 shadow-lg z-40">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-primary-dark">Analysis Result</h2>
          <p className="text-xs text-muted-foreground">
            Analysis ID: #{result.id} | {result.date}
          </p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">
          <X size={18} />
        </button>
      </div>

      <h3 className="font-semibold text-primary-dark">{result.title}</h3>
      <p className="text-sm text-muted-foreground mb-5">
        {result.date} | Source: {result.source}
      </p>

      {/* 1. Agent Summary Grid (Unchanged position) */}
      <AgentSummaryGrid agents={result.agents} />

      {/* 2. New Tab Pair: Detailed Breakdown | Q&A Chat */}
      <div className="mb-6">
        <Tabs.Root defaultValue="breakdown">
          <Tabs.List className="flex gap-4 border-b border-border mb-4">
            <Tabs.Trigger
              value="breakdown"
              className="text-sm text-muted-foreground pb-2 border-b-2 border-transparent data-[state=active]:border-primary-dark data-[state=active]:text-primary-dark cursor-pointer font-medium"
            >
              Detailed Breakdown
            </Tabs.Trigger>
            <Tabs.Trigger
              value="chat"
              className="text-sm text-muted-foreground pb-2 border-b-2 border-transparent data-[state=active]:border-primary-dark data-[state=active]:text-primary-dark cursor-pointer font-medium"
            >
              Q&A Chat
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="breakdown">
            <DetailedBreakdownTable markers={result.markers} />
          </Tabs.Content>

          <Tabs.Content value="chat">
            <ReportChat reportId={result.id} markers={result.markers} />
          </Tabs.Content>
        </Tabs.Root>
      </div>

      {/* 3. Existing Tab Pair: RecommendationTabs (Unchanged position & internal logic) */}
      <RecommendationTabs agents={result.agents} markers={result.markers} />

      {/* 4. Action Footer (Unchanged position) */}
      <ActionFooter />
    </aside>
  );
}

