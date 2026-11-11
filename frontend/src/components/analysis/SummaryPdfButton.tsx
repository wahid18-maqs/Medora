"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Download, Loader2, X } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type ButtonStatus = "idle" | "generating" | "success" | "error";
type ToastState = { kind: "success" | "error"; message: string } | null;

export default function SummaryPdfButton({
  reportId,
  disabled = false,
  className,
}: {
  reportId?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [status, setStatus] = useState<ButtonStatus>("idle");
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (status !== "success") return;
    const timer = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (!toast || toast.kind === "error") return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleDownload = useCallback(async () => {
    if (!reportId || status === "generating") return;

    setStatus("generating");
    setToast(null);

    try {
      const blob = await api.summaryPdf(reportId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      anchor.href = url;
      anchor.download = `medora-summary-${reportId}-${date}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("success");
      setToast({ kind: "success", message: "Summary downloaded" });
    } catch (error) {
      setStatus("error");
      setToast({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not generate the summary PDF. Please try again.",
      });
    }
  }, [reportId, status]);

  const isGenerating = status === "generating";
  const isDisabled = !reportId || disabled || isGenerating;

  return (
    <>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDisabled}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        {isGenerating ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Download size={14} />
        )}
        {isGenerating ? "Generating summary..." : "Generate summary PDF"}
      </button>

      {toast && (
        <div
          role={toast.kind === "error" ? "alert" : "status"}
          className={`fixed bottom-20 right-6 z-50 flex max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg ${
            toast.kind === "error"
              ? "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-200"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200"
          }`}
        >
          {toast.kind === "error" ? (
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{toast.message}</p>
            {toast.kind === "error" && reportId && (
              <button
                type="button"
                onClick={handleDownload}
                className="mt-2 text-xs font-semibold underline underline-offset-2 cursor-pointer"
              >
                Retry
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="shrink-0 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </>
  );
}
