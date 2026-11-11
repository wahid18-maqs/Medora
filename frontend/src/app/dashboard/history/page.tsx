"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ZoomIn, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import PageContainer from "@/components/layout/PageContainer";
import AnalysisDrawer from "@/components/analysis/AnalysisDrawer";
import { useHistory } from "@/hooks/useHistory";
import { stripMarkdown } from "@/lib/utils";
import type { HistoryItem, AnalysisResult } from "@/lib/types";

const FILTER_PILLS = ["All Reports", "Routine", "Comprehensive", "Specialized"];

export default function ReportsHistoryPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPill, setSelectedPill] = useState("All Reports");

  const [activeResult, setActiveResult] = useState<AnalysisResult | null>(null);

  const { data: historyData, isLoading } = useHistory({
    page,
    pageSize,
    search: searchQuery,
    reportType: selectedPill,
  });

  const items: HistoryItem[] = historyData?.items ?? [];
  const totalCount = historyData?.total ?? 0;
  const totalPages = historyData?.pages ?? 1;

  const startRange = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRange = Math.min(page * pageSize, totalCount);

  function handleSelectRow(item: HistoryItem) {
    const formattedDate = isNaN(new Date(item.timestamp).getTime())
      ? item.timestamp
      : new Date(item.timestamp).toLocaleDateString();

    setActiveResult({
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
      summary: item.summary ?? null,
    });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeHref="/dashboard/history" />

      <PageContainer width="wide">
        {/* Breadcrumb Header */}
        <header className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/dashboard" className="hover:text-primary-dark transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="font-semibold text-primary-dark">Report History</span>
          </div>
          <h1 className="text-2xl font-semibold text-primary-dark">Reports History</h1>
        </header>

        {/* Summary + Search Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Stat Card */}
          <div className="bg-card rounded-xl shadow-sm p-6 border border-border flex flex-col justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Reports
            </span>
            <div className="text-4xl font-bold text-primary-dark mt-2">
              {isLoading ? "..." : totalCount}
            </div>
          </div>

          {/* Right Search & Filter Card */}
          <div className="lg:col-span-2 bg-card rounded-xl shadow-sm p-6 border border-border flex flex-col justify-between gap-4">
            <div className="relative w-full">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-background border border-input rounded-lg pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {FILTER_PILLS.map((pill) => {
                const isSelected = selectedPill === pill;
                return (
                  <button
                    key={pill}
                    onClick={() => {
                      setSelectedPill(pill);
                      setPage(1);
                    }}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {pill}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Reports Table Card */}
        <section className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="text-muted-foreground border-b border-border bg-muted/50">
                  <th className="font-medium px-6 py-3.5">Analysis ID</th>
                  <th className="font-medium px-6 py-3.5">Date Analyzed</th>
                  <th className="font-medium px-6 py-3.5">Report Type</th>
                  <th className="font-medium px-6 py-3.5">Source</th>
                  <th className="font-medium px-6 py-3.5">Diagnostic Center</th>
                  <th className="font-medium px-6 py-3.5">Status</th>
                  <th className="font-medium px-6 py-3.5">Doctor Notes</th>
                  <th className="font-medium px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                      Loading report history...
                    </td>
                  </tr>
                )}
                {!isLoading && items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                      No reports found matching your criteria.
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  items.map((item, idx) => {
                    const formattedDate = isNaN(new Date(item.timestamp).getTime())
                      ? item.timestamp
                      : new Date(item.timestamp).toLocaleDateString();

                    const doctorNotes = stripMarkdown(item.agents?.medical || item.analysis) || "No doctor notes available.";

                    return (
                      <tr key={(item.analysis_id || item.file) + item.timestamp + idx}>
                        <td className="px-6 py-4 font-mono text-xs font-semibold text-foreground">
                          <Link
                            href={`/dashboard?analysis_id=${encodeURIComponent(
                              item.analysis_id || item.file
                            )}`}
                            title="Open this analysis in the Dashboard"
                            className="text-primary-dark hover:underline cursor-pointer"
                          >
                            #{item.analysis_id || `BTA-2026-${(idx + 1).toString().padStart(3, "0")}`}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{formattedDate}</td>
                        <td className="px-6 py-4 font-medium text-foreground">
                          {item.report_type || "Routine"}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            {item.source_type || "PDF"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {item.diagnostic_center || "Central Health Lab"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="bg-medical-bg text-medical-text text-xs font-medium px-3 py-1 rounded-full inline-block">
                            {item.status || "Completed - Reviewed"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-xs max-w-xs">
                          <p className="line-clamp-2 leading-relaxed">{doctorNotes}</p>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSelectRow(item)}
                              title="View Details"
                              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-colors cursor-pointer"
                            >
                              <ZoomIn size={16} />
                            </button>
                            <button
                              onClick={() => alert("PDF Export functionality is coming soon!")}
                              title="Export PDF"
                              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-colors cursor-pointer"
                            >
                              <FileText size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-card border-t border-border text-xs text-muted-foreground">
            <div>
              Showing <span className="font-semibold text-foreground">{startRange}</span>-
              <span className="font-semibold text-foreground">{endRange}</span> of{" "}
              <span className="font-semibold text-foreground">{totalCount}</span> results
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="px-3 py-1 rounded-lg bg-primary text-primary-foreground font-medium text-xs">
                {page}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </PageContainer>

      {/* Analysis Drawer right-side overlay */}
      {activeResult && (
        <AnalysisDrawer result={activeResult} onClose={() => setActiveResult(null)} />
      )}
    </div>
  );
}
