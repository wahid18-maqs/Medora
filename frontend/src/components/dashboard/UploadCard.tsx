"use client";
import { useRef, useState, DragEvent } from "react";
import { UploadCloud } from "lucide-react";
import { useAnalyzeReport } from "@/hooks/useAnalyzeReport";
import type { AnalysisResult } from "@/lib/types";

export default function UploadCard({ onAnalyzed }: { onAnalyzed: (r: AnalysisResult) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const { mutate, isPending } = useAnalyzeReport();

  function handleFile(file: File) {
    mutate(
      { file, query: "Summarise my Blood Test Report" },
      {
        onSuccess: (data) => {
          onAnalyzed({
            id: data.file_processed,
            date: new Date().toLocaleDateString(),
            title: data.query || "Blood Test Report Analysis",
            source: data.file_processed,
            agents: data.agents || {
              medical: data.analysis,
              verification: "",
              nutrition: "",
              exercise: "",
            },
            markers: data.markers || [],
          });
        },
      }
    );
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <section className="bg-card rounded-xl shadow-sm p-6 mb-8 border border-border">
      <h3 className="font-semibold text-primary-dark mb-4">Analyze New Report</h3>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-lg py-10 flex flex-col items-center justify-center gap-3 transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="bg-primary text-primary-foreground text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 cursor-pointer"
        >
          {isPending ? "Analyzing…" : "UPLOAD PDF"}
        </button>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <UploadCloud size={14} /> Drag & Drop
        </p>
        <p className="text-xs text-muted-foreground">Select a PDF report for AI-powered analysis.</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
    </section>
  );
}
