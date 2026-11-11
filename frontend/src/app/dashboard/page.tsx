"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Bot } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import PageContainer from "@/components/layout/PageContainer";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import UploadHero from "@/components/dashboard/UploadHero";
import KeyMetricsStrip from "@/components/dashboard/KeyMetricsStrip";
import BentoDashboardGrid from "@/components/dashboard/BentoDashboardGrid";
import ResultsSkeleton from "@/components/dashboard/ResultsSkeleton";
import ContextualChatPanel from "@/components/analysis/ContextualChatPanel";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { AnalysisResult, HistoryItem, UploadStatus } from "@/lib/types";

function toAnalysisResult(item: HistoryItem): AnalysisResult {
  const formattedDate = isNaN(new Date(item.timestamp).getTime())
    ? item.timestamp
    : new Date(item.timestamp).toLocaleDateString();

  return {
    id: item.analysis_id || item.file,
    date: formattedDate,
    title: item.query || "Blood Test Analysis",
    source: item.file,
    reportType: item.report_type,
    diagnosticCenter: item.diagnostic_center,
    markerWarning: item.marker_warning,
    sourceType: item.source_type || "PDF",
    reportDate: item.report_date ?? null,
    timestamp: item.timestamp,
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
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("empty");
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
        setIsChatOpen(false);
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
    setIsChatOpen(false);
    clearAnalysisParam();
  };

  const markerWarning =
    activeResult?.markerWarning ||
    (activeResult?.markers.length === 1
      ? `Only 1 marker could be read from this ${
          activeResult.sourceType === "Image" ? "image" : "report"
        }. Results may be incomplete.`
      : null);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        activeHref="/dashboard"
        isChatOpen={isChatOpen}
        onToggleChat={() => setIsChatOpen((prev) => !prev)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <PageContainer width="full">
          <div className="mx-auto w-full max-w-5xl">
            <DashboardHeader name={user?.name ?? "there"} hasResult={Boolean(activeResult) && uploadStatus === "ready"} />

            {restoreError && (
              <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                {restoreError}
              </div>
            )}

            {isRestoring ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-xs sm:p-10">
                Loading saved analysis session...
              </div>
            ) : (
              <UploadHero
                status={uploadStatus}
                setStatus={setUploadStatus}
                onAnalyzed={handleAnalyzed}
                result={activeResult}
              />
            )}

            {uploadStatus === "analyzing" && <ResultsSkeleton />}

            {markerWarning && uploadStatus === "ready" && !isRestoring && (
              <div
                role="status"
                className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-medium text-amber-800 dark:text-amber-300"
              >
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{markerWarning}</span>
              </div>
            )}

            {activeResult && uploadStatus === "ready" && (
              <div className="mt-6 animate-in space-y-6 fade-in duration-300">
                <KeyMetricsStrip markers={activeResult.markers} />
                <BentoDashboardGrid result={activeResult} />
              </div>
            )}
          </div>
        </PageContainer>
      </div>

      {activeResult && !isChatOpen && (
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105 print:hidden cursor-pointer"
        >
          <Bot size={18} />
          Ask AI
        </button>
      )}

      {activeResult && (
        <ContextualChatPanel
          reportId={activeResult.id}
          markers={activeResult.markers}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  );
}
