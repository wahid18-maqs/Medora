"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import PageContainer from "@/components/layout/PageContainer";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import UploadHero from "@/components/dashboard/UploadHero";
import KeyMetricsStrip from "@/components/dashboard/KeyMetricsStrip";
import BentoDashboardGrid from "@/components/dashboard/BentoDashboardGrid";
import ContextualChatPanel from "@/components/analysis/ContextualChatPanel";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { AnalysisResult, HistoryItem } from "@/lib/types";

function toAnalysisResult(item: HistoryItem): AnalysisResult {
  const formattedDate = isNaN(new Date(item.timestamp).getTime())
    ? item.timestamp
    : new Date(item.timestamp).toLocaleDateString();

  return {
    id: item.analysis_id || item.file,
    date: formattedDate,
    title: item.query || "Blood Test Analysis",
    source: item.file,
    agents: item.agents || {
      medical: item.analysis,
      verification: "",
      nutrition: "",
      exercise: "",
    },
    markers: item.markers || [],
  };
}

function clearAnalysisParam() {
  if (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("analysis_id")
  ) {
    window.history.replaceState(null, "", "/dashboard");
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeResult, setActiveResult] = useState<AnalysisResult | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"empty" | "analyzing" | "ready" | "error">("empty");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  useEffect(() => {
    const analysisId = new URLSearchParams(window.location.search).get("analysis_id");
    if (!analysisId) return;

    let cancelled = false;
    setIsRestoring(true);

    api
      .getReport(analysisId)
      .then((item) => {
        if (cancelled) return;
        setActiveResult(toAnalysisResult(item));
        setUploadStatus("ready");
        setIsChatOpen(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setRestoreError(
          err instanceof Error ? err.message : "Could not load the selected analysis."
        );
      })
      .finally(() => {
        if (!cancelled) setIsRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAnalyzed = (result: AnalysisResult) => {
    setActiveResult(result);
    setUploadStatus("ready");
    clearAnalysisParam();
    // Keep chat closed by default; user opens it via the left sidebar "AI Assistant" item
  };

  const handleReset = () => {
    setActiveResult(null);
    setUploadStatus("empty");
    setIsChatOpen(false);
    setRestoreError(null);
    clearAnalysisParam();
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* 1. Collapsible Navigation Sidebar */}
      <Sidebar
        activeHref="/dashboard"
        isChatOpen={isChatOpen}
        onToggleChat={() => setIsChatOpen((prev) => !prev)}
      />

      {/* 2. Main Scrollable Content Area (Reflows when contextual assistant is opened) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <PageContainer width="full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <DashboardHeader name={user?.name ?? "there"} />
            {activeResult && (
              <button
                onClick={handleReset}
                className="text-xs font-medium text-muted-foreground hover:text-foreground bg-card border border-border px-3 py-1.5 rounded-lg shadow-xs cursor-pointer"
              >
                New Analysis
              </button>
            )}
          </div>

          {/* Restore status for a session opened from History */}
          {restoreError && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs">
              {restoreError}
            </div>
          )}

          {/* Centered dashboard content column: upload, status, and results share one width. */}
          <div className="mx-auto mt-10 w-full max-w-6xl">
            {/* 1. Progressive Disclosure: State-Driven Upload Hero */}
            {isRestoring ? (
              <div className="mx-auto w-full max-w-2xl rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-xs sm:p-10">
                Loading saved analysis session...
              </div>
            ) : (
              <div className="flex w-full justify-center">
                <UploadHero
                  status={uploadStatus}
                  setStatus={setUploadStatus}
                  onAnalyzed={handleAnalyzed}
                  currentFileName={activeResult?.source}
                  onReset={handleReset}
                />
              </div>
            )}

            {/* Render Inverted Pyramid & Bento Grid only when Ready */}
            {activeResult && uploadStatus === "ready" && (
              <div className="mt-8 space-y-6 animate-in fade-in duration-300">
                {/* 2. Inverted Pyramid: Key Metrics Strip at the top */}
                <KeyMetricsStrip markers={activeResult.markers} />

                {/* 3. Bento Grid: Hero Data Table + Multi-Agent Findings */}
                <BentoDashboardGrid result={activeResult} />
              </div>
            )}
          </div>
        </PageContainer>
      </div>

      {/* 4. Master-Detail Contextual AI Assistant Panel (Main area reflows) */}
      {activeResult && (
        <ContextualChatPanel
          reportId={activeResult.id}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  );
}

