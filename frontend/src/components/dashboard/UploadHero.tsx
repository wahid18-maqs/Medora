"use client";

import { DragEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  FilePlus2,
  GripVertical,
  ImagePlus,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { z } from "zod";
import { useAnalyzeReport } from "@/hooks/useAnalyzeReport";
import { api } from "@/lib/api";
import type { AnalyzeResponse } from "@/lib/api";
import type {
  AnalysisResult,
  ExtractedMarker,
  ImageExtractionResponse,
  SourceType,
  UploadStatus,
} from "@/lib/types";

interface UploadHeroProps {
  onAnalyzed: (r: AnalysisResult) => void;
  status: UploadStatus;
  setStatus: (s: UploadStatus) => void;
  result?: AnalysisResult | null;
}

const DEFAULT_QUERY = "Summarise my Blood Test Report";
const MAX_IMAGES = 6;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_FILE_TYPES =
  ".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif";
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];

const reviewRowSchema = z.object({
  marker: z.string().trim().min(1, "Every row needs a marker name."),
  value: z.string().trim().min(1, "Every row needs a value."),
  unit: z.string(),
  reference_range: z.string(),
  confidence: z.number().min(0).max(1),
  plausibility_warning: z.string().nullable().optional(),
});

function formatDateValue(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatReportDate(result?: AnalysisResult | null) {
  return formatDateValue(result?.reportDate || result?.timestamp || result?.date);
}

function formatAnalysisDate(timestamp?: string) {
  if (!timestamp) return new Date().toLocaleDateString();
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleDateString();
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function validationError(file: File): string | null {
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  if (file.size > MAX_FILE_SIZE) {
    return `${file.name} is larger than 10 MB. Please choose a smaller file.`;
  }
  if (!IMAGE_EXTENSIONS.includes(extension)) {
    return "Please upload JPG, PNG, WebP, or HEIC images.";
  }
  return null;
}

function buildResult(
  data: AnalyzeResponse,
  sourceType: SourceType,
  fallbackName: string
): AnalysisResult {
  const timestamp = data.timestamp || new Date().toISOString();
  return {
    id: data.analysis_id || fallbackName,
    date: formatAnalysisDate(timestamp),
    title: data.query || "Blood Test Report Analysis",
    source: data.file_processed || fallbackName,
    reportType: data.report_type,
    diagnosticCenter: data.diagnostic_center,
    markerWarning: data.marker_warning,
    sourceType,
    reportDate: data.report_date ?? null,
    timestamp,
    agents: data.agents || {
      medical: data.analysis,
      verification: "",
      nutrition: "",
      exercise: "",
    },
    markers: data.markers || [],
    summary: data.summary ?? null,
  };
}

export default function UploadHero({
  onAnalyzed,
  status,
  setStatus,
  result,
}: UploadHeroProps) {
  const browseRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [reorderIndex, setReorderIndex] = useState<number | null>(null);
  const [extraction, setExtraction] = useState<ImageExtractionResponse | null>(null);
  const [reviewRows, setReviewRows] = useState<ExtractedMarker[]>([]);
  const { mutate, isPending } = useAnalyzeReport();

  const extractMutation = useMutation({
    mutationFn: ({ files }: { files: File[] }) => api.extractImages(files, DEFAULT_QUERY),
    onSuccess: (data) => {
      setExtraction(data);
      setReviewRows(data.markers || []);
      setErrorMessage(null);
      setStatus("reviewing");
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || "Could not read those images. Please try clearer photos.");
      setStatus("empty");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => {
      const rows = reviewRows.map((row) => reviewRowSchema.parse(row));
      return api.confirmImage({
        markers: rows,
        lab_name: extraction?.lab_name,
        report_date: extraction?.report_date,
        file_names: extraction?.file_names || imageFiles.map((file) => file.name),
        query: DEFAULT_QUERY,
      });
    },
    onSuccess: (data) => {
      const names = extraction?.file_names || imageFiles.map((file) => file.name);
      const nextResult = buildResult(data, "Image", names.join(", ") || "Report images");
      queryClient.invalidateQueries({ queryKey: ["history"] });
      resetImages();
      setStatus("ready");
      onAnalyzed(nextResult);
    },
    onError: (err: any) => {
      const message = err?.message || "Failed to analyze the report. Please try again.";
      setErrorMessage(message);
      setStatus("reviewing");
    },
  });

  useEffect(() => {
    const urls = imageFiles.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [imageFiles]);

  function resetImages() {
    setImageFiles([]);
    setPreviews([]);
    setExtraction(null);
    setReviewRows([]);
    setErrorMessage(null);
  }

  function processPdf(file: File) {
    resetImages();
    setErrorMessage(null);
    setStatus("analyzing");

    mutate(
      { file, query: DEFAULT_QUERY },
      {
        onSuccess: (data) => {
          setStatus("ready");
          onAnalyzed(buildResult(data, "PDF", file.name));
        },
        onError: (err: any) => {
          setStatus("error");
          setErrorMessage(err?.message || "Failed to analyze blood test report. Please try again.");
        },
      }
    );
  }

  function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;

    setErrorMessage(null);

    const pdfs = files.filter(isPdfFile);
    if (pdfs.length > 0) {
      if (files.length !== 1) {
        setStatus("error");
        setErrorMessage("Please upload one PDF at a time, or images only.");
        return;
      }
      processPdf(pdfs[0]);
      return;
    }

    const additions: File[] = [];
    for (const file of files) {
      const error = validationError(file);
      if (error) {
        setStatus("error");
        setErrorMessage(error);
        return;
      }
      additions.push(file);
    }

    if (imageFiles.length + additions.length > MAX_IMAGES) {
      setStatus("error");
      setErrorMessage(`You can upload up to ${MAX_IMAGES} images per report.`);
      return;
    }

    setImageFiles((current) => [...current, ...additions]);
    setExtraction(null);
    setReviewRows([]);
    setStatus("empty");
  }

  function removeImage(index: number) {
    setImageFiles((current) => current.filter((_, i) => i !== index));
    setExtraction(null);
    setReviewRows([]);
    setStatus("empty");
  }

  function reorderImages(from: number, to: number) {
    if (from === to) return;
    setImageFiles((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function updateRow(index: number, field: keyof ExtractedMarker, value: string) {
    setReviewRows((current) =>
      current.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function deleteRow(index: number) {
    setReviewRows((current) => current.filter((_, i) => i !== index));
  }

  function addRow() {
    setReviewRows((current) => [
      ...current,
      {
        marker: "",
        value: "",
        unit: "",
        reference_range: "",
        confidence: 0.5,
        plausibility_warning: null,
      },
    ]);
  }

  function confirmAnalysis() {
    if (!reviewRows.length) {
      setErrorMessage("Please keep at least one extracted marker.");
      return;
    }

    for (const row of reviewRows) {
      const parsed = reviewRowSchema.safeParse(row);
      if (!parsed.success) {
        setErrorMessage(parsed.error.issues[0]?.message || "Please complete every row.");
        return;
      }
    }

    setErrorMessage(null);
    setStatus("analyzing");
    confirmMutation.mutate();
  }

  const markerWarning =
    extraction?.marker_warning ||
    (reviewRows.length > 0 && reviewRows.length <= 2
      ? `Only ${reviewRows.length} marker${reviewRows.length === 1 ? "" : "s"} could be read from this image. Results may be incomplete.`
      : null);

  const hiddenInputs = (
    <>
      <input
        ref={browseRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </>
  );

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
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {result?.sourceType || "PDF"}
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
              onClick={() => browseRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
            >
              <FilePlus2 size={15} />
              New Analysis
            </button>
            {hiddenInputs}
          </div>
        </div>
      </div>
    );
  }

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

  if (status === "extracting" || extractMutation.isPending) {
    return (
      <div className="mx-auto w-full max-w-2xl rounded-xl border border-border bg-card p-8 text-center shadow-xs sm:p-10">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <Loader2 size={24} className="animate-spin" />
        </div>
        <h3 className="font-semibold text-foreground text-base mb-1">Reading your report images</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Checking image quality and extracting laboratory values for your review.
        </p>
        <p className="text-xs text-muted-foreground">
          Your original images are deleted after extraction and are not stored.
        </p>
      </div>
    );
  }

  if (status === "reviewing" && extraction) {
    return (
      <div className="mx-auto w-full max-w-5xl rounded-xl border border-border bg-card p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-foreground">Review extracted values</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Check each value against your original report. Low-confidence rows are highlighted in amber.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 rounded-lg bg-muted px-4 py-3 text-xs">
          <div>
            <span className="font-medium uppercase tracking-wider text-muted-foreground">Lab name</span>
            <p className="mt-0.5 text-[13px] font-medium text-foreground">
              {extraction.lab_name || "Not specified"}
            </p>
          </div>
          <div>
            <span className="font-medium uppercase tracking-wider text-muted-foreground">Report date</span>
            <p className="mt-0.5 text-[13px] font-medium text-foreground">
              {formatDateValue(extraction.report_date)}
            </p>
          </div>
          <div>
            <span className="font-medium uppercase tracking-wider text-muted-foreground">Images</span>
            <p className="mt-0.5 text-[13px] font-medium text-foreground">
              {extraction.file_names.length} processed
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2.5">Marker</th>
                <th className="px-3 py-2.5">Value</th>
                <th className="px-3 py-2.5">Unit</th>
                <th className="px-3 py-2.5">Reference range</th>
                <th className="px-3 py-2.5">Confidence</th>
                <th className="px-3 py-2.5 text-right">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reviewRows.map((row, index) => {
                const needsReview =
                  row.confidence < 0.75 || Boolean(row.plausibility_warning);
                return (
                  <tr key={index} className={needsReview ? "bg-amber-500/10" : "bg-card"}>
                    <td className="px-3 py-2">
                      <input
                        value={row.marker}
                        onChange={(e) => updateRow(index, "marker", e.target.value)}
                        className="w-full min-w-[150px] rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium text-foreground focus:border-input focus:bg-background focus:outline-none"
                        aria-label={`Marker ${index + 1}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.value}
                        onChange={(e) => updateRow(index, "value", e.target.value)}
                        className="w-full min-w-[90px] rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-foreground focus:border-input focus:bg-background focus:outline-none"
                        aria-label={`Value ${index + 1}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.unit}
                        onChange={(e) => updateRow(index, "unit", e.target.value)}
                        className="w-full min-w-[80px] rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-foreground focus:border-input focus:bg-background focus:outline-none"
                        aria-label={`Unit ${index + 1}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.reference_range}
                        onChange={(e) => updateRow(index, "reference_range", e.target.value)}
                        className="w-full min-w-[140px] rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-foreground focus:border-input focus:bg-background focus:outline-none"
                        aria-label={`Reference range ${index + 1}`}
                      />
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {Math.round(row.confidence * 100)}%
                      {needsReview && (
                        <span className="ml-1 font-medium text-amber-700 dark:text-amber-300">
                          Check
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => deleteRow(index)}
                        title="Remove row"
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={addRow}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Plus size={14} />
          Add marker
        </button>

        {markerWarning && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-medium text-amber-800 dark:text-amber-300">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{markerWarning}</span>
          </div>
        )}

        <div className="mt-5 rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
          <p className="flex items-start gap-2">
            <ShieldCheck size={15} className="mt-0.5 shrink-0" />
            <span>Your original images are deleted after extraction and are not stored.</span>
          </p>
          <p className="mt-2 font-medium text-foreground">
            Image analysis may contain errors. Please verify the values against your original report.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setStatus("empty");
            }}
            className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Back to images
          </button>
          <button
            type="button"
            onClick={confirmAnalysis}
            disabled={confirmMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirmMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Confirm & Analyze
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl rounded-xl border border-border bg-card p-8 shadow-xs sm:p-10">
      {errorMessage && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {imageFiles.length > 0 ? (
        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">Report images</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Add up to {MAX_IMAGES} images. Drag thumbnails to set page order.
              </p>
            </div>
            <button
              type="button"
              onClick={() => browseRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ImagePlus size={14} />
              Add more
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {imageFiles.map((file, index) => (
              <div
                key={`${file.name}-${file.lastModified}-${index}`}
                draggable
                onDragStart={() => setReorderIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (reorderIndex !== null) reorderImages(reorderIndex, index);
                  setReorderIndex(null);
                }}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                title="Drag to reorder"
              >
                {previews[index] ? (
                  <img
                    src={previews[index]}
                    alt={`Report page ${index + 1}`}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {index + 1}
                </span>
                <span className="absolute left-1 top-1 rounded bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <GripVertical size={12} />
                </span>
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  title="Remove image"
                  className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white transition-colors hover:bg-destructive"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="flex items-start gap-2">
              <ShieldCheck size={15} className="mt-0.5 shrink-0" />
              <span>Your original images are deleted after extraction and are not stored.</span>
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                resetImages();
                setStatus("empty");
              }}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear images
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
              >
                <Camera size={14} />
                Take photo
              </button>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setStatus("extracting");
                  extractMutation.mutate({ files: imageFiles });
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <ImagePlus size={15} />
                Extract values
              </button>
            </div>
          </div>
        </div>
      ) : (
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
              Drag & drop a PDF or image of your report, or browse from your device
            </p>
          </div>

          <button
            onClick={() => browseRef.current?.click()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-xs cursor-pointer mt-2"
          >
            Select Report
          </button>

          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:hidden"
          >
            <Camera size={14} />
            Take photo
          </button>

          <p className="text-xs text-muted-foreground">
            Supports PDF, JPG, PNG, WebP, and HEIC. Up to {MAX_IMAGES} images, 10 MB each.
          </p>
        </div>
      )}

      {hiddenInputs}
    </div>
  );
}
