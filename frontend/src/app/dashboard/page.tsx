"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bot } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import UploadHero, { type UploadHeroHandle } from "@/components/dashboard/UploadHero";
import KeyMetricsStrip from "@/components/dashboard/KeyMetricsStrip";
import BentoDashboardGrid from "@/components/dashboard/BentoDashboardGrid";
import ResultsSkeleton from "@/components/dashboard/ResultsSkeleton";
import ContextualChatPanel from "@/components/analysis/ContextualChatPanel";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { normalizeMarkers } from "@/lib/markers";
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
    markers: normalizeMarkers(item.markers),
    summary: item.summary ?? null,
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
  const uploadRef = useRef<UploadHeroHandle>(null);
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

  const hasResult = Boolean(activeResult) && uploadStatus === "ready";
  const markerCount = activeResult?.markers.length ?? 0;
  const markerWarning =
    activeResult?.markerWarning ||
    (hasResult && markerCount < 3
      ? `Only ${markerCount} marker${markerCount === 1 ? "" : "s"} could be read from this report. Results may be incomplete.`
      : null);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activeHref="/dashboard" />

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1600px] px-6 py-6 lg:px-8">
          {restoreError && (
            <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              {restoreError}
            </div>
          )}

          {isRestoring ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-xs sm:p-10">
              Loading saved analysis session...
            </div>
          ) : hasResult && activeResult ? (
            <>
              <DashboardHeader
                name={user?.name ?? "there"}
                hasResult
                onUpload={() => uploadRef.current?.openFilePicker()}
              />

              <UploadHero
                ref={uploadRef}
                status={uploadStatus}
                setStatus={setUploadStatus}
                onAnalyzed={handleAnalyzed}
                result={activeResult}
              />

              {markerWarning && (
                <div
                  role="status"
                  className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-medium text-amber-800 dark:text-amber-300"
                >
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{markerWarning}</span>
                </div>
              )}

              <div className="mt-4 animate-in space-y-4 fade-in duration-300">
                <KeyMetricsStrip markers={activeResult.markers} />
                <BentoDashboardGrid result={activeResult} />
              </div>
            </>
          ) : (
            <>
              <DashboardHeader
                name={user?.name ?? "there"}
                hasResult={false}
                onUpload={() => uploadRef.current?.openFilePicker()}
              />

              <UploadHero
                ref={uploadRef}
                status={uploadStatus}
                setStatus={setUploadStatus}
                onAnalyzed={handleAnalyzed}
                result={activeResult}
              />

              {uploadStatus === "analyzing" && <ResultsSkeleton />}
            </>
          )}
        </div>
      </main>

      {hasResult && !isChatOpen && (
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105 print:hidden cursor-pointer"
        >
          <Bot size={18} />
          Ask AI
        </button>
      )}

      {hasResult && activeResult && (
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
