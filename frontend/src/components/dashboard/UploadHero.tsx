"use client";

import { useRef, useState, DragEvent } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAnalyzeReport } from "@/hooks/useAnalyzeReport";
import type { AnalysisResult } from "@/lib/types";

interface UploadHeroProps {
  onAnalyzed: (r: AnalysisResult) => void;
  status: "empty" | "analyzing" | "ready" | "error";
  setStatus: (s: "empty" | "analyzing" | "ready" | "error") => void;
  currentFileName?: string;
  onReset?: () => void;
}

export default function UploadHero({
  onAnalyzed,
  status,
  setStatus,
  currentFileName,
  onReset,
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
          onAnalyzed({
            id: data.analysis_id || data.file_processed || file.name,
            date: new Date().toLocaleDateString(),
            title: data.query || "Blood Test Report Analysis",
            source: data.file_processed || file.name,
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

  // 1. Ready state: compact bar with option to re-upload or switch report
  if (status === "ready") {
    return (
      <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">
                {currentFileName || "Blood Report Analyzed"}
              </span>
              <span className="text-[11px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                Ready
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              AI multi-agent breakdown, clinical markers, and recommendations generated.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Upload Another Report
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

        <p className="text-[11px] text-muted-foreground">Supports standard diagnostic laboratory PDF reports.</p>

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
