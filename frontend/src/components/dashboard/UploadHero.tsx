"use client";

import { useRef, useState, DragEvent } from "react";
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FilePlus2,
} from "lucide-react";
import { useAnalyzeReport } from "@/hooks/useAnalyzeReport";
import type { AnalysisResult } from "@/lib/types";

interface UploadHeroProps {
  onAnalyzed: (r: AnalysisResult) => void;
  status: "empty" | "analyzing" | "ready" | "error";
  setStatus: (s: "empty" | "analyzing" | "ready" | "error") => void;
  result?: AnalysisResult | null;
}

function formatReportDate(result?: AnalysisResult | null) {
  const value = result?.timestamp || result?.date;
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export default function UploadHero({
  onAnalyzed,
  status,
  setStatus,
  result,
}: UploadHeroProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { mutate, isPending } = useAnalyzeReport();

  function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage("Please select a valid PDF blood test report.");
      setStatus("error");
      return;
    }

    setErrorMessage(null);
    setStatus("analyzing");

    mutate(
      { file, query: "Summarise my Blood Test Report" },
      {
        onSuccess: (data) => {
          setStatus("ready");
          const timestamp = data.timestamp || new Date().toISOString();
          onAnalyzed({
            id: data.analysis_id || data.file_processed || file.name,
            date: new Date(timestamp).toLocaleDateString(),
            title: data.query || "Blood Test Report Analysis",
            source: data.file_processed || file.name,
            reportType: data.report_type,
            diagnosticCenter: data.diagnostic_center,
            markerWarning: data.marker_warning,
            timestamp,
            agents: data.agents || {
              medical: data.analysis,
              verification: "",
              nutrition: "",
              exercise: "",
            },
            markers: data.markers || [],
          });
        },
        onError: (err: any) => {
          setStatus("error");
          setErrorMessage(err?.message || "Failed to analyze blood test report. Please try again.");
        },
      }
    );
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  // 1. Ready state: file status card with metadata and report actions
  if (status === "ready") {
    return (
      <div className="w-full rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-semibold text-foreground">
                  {result?.source || "Blood Report Analyzed"}
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Ready
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                AI multi-agent breakdown, clinical markers, and recommendations generated.
              </p>

              <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2 text-xs sm:grid-cols-3">
                <div>
                  <dt className="font-medium uppercase tracking-wider text-muted-foreground">Report date</dt>
                  <dd className="mt-0.5 text-[13px] font-medium text-foreground">
                    {formatReportDate(result)}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium uppercase tracking-wider text-muted-foreground">Lab name</dt>
                  <dd className="mt-0.5 truncate text-[13px] font-medium text-foreground">
                    {result?.diagnosticCenter || "Not specified"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium uppercase tracking-wider text-muted-foreground">File name</dt>
                  <dd className="mt-0.5 truncate text-[13px] font-medium text-foreground" title={result?.source}>
                    {result?.source || "Not specified"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
            >
              <FilePlus2 size={15} />
              New Analysis
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processFile(file);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 2. Analyzing state: progressive steps
  if (status === "analyzing" || isPending) {
    return (
      <div className="mx-auto w-full max-w-2xl rounded-xl border border-border bg-card p-8 text-center shadow-xs sm:p-10">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Loader2 size={24} className="animate-spin" />
        </div>
        <h3 className="font-semibold text-foreground text-base mb-1">Analyzing Blood Report</h3>
        <p className="text-xs text-muted-foreground mb-6">
          Our specialized AI medical agents are reading and cross-verifying your data...
        </p>

        {/* Step progress list */}
        <div className="space-y-2.5 text-left max-w-sm mx-auto text-xs text-foreground bg-muted p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>1. Extracting text & laboratory test markers</span>
          </div>
          <div className="flex items-center gap-2 font-medium text-primary">
            <Loader2 size={14} className="animate-spin text-primary" />
            <span>2. Doctor & Verifier validating reference ranges</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-3.5 h-3.5 rounded-full border border-border ml-0.5" />
            <span>3. Synthesizing Nutritionist & Exercise plans</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Error state or Empty default dropzone
  return (
    <div className="mx-auto w-full max-w-2xl rounded-xl border border-border bg-card p-8 shadow-xs sm:p-10">
      {errorMessage && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl py-12 px-6 flex flex-col items-center justify-center gap-3 transition-colors text-center ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
        }`}
      >
        <div className="w-12 h-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center mb-1">
          <UploadCloud size={24} className="text-primary" />
        </div>

        <div>
          <h3 className="font-semibold text-foreground text-base">Upload Your Blood Test Report</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Drag & drop your PDF file here, or browse from your device
          </p>
        </div>

        <button
          onClick={() => inputRef.current?.click()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-xs cursor-pointer mt-2"
        >
          Select PDF Report
        </button>

        <p className="text-xs text-muted-foreground">Supports standard diagnostic laboratory PDF reports.</p>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
          }}
        />
      </div>
    </div>
  );
}
