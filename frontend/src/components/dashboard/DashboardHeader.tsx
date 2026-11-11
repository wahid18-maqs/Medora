"use client";

export default function DashboardHeader({
  name,
  hasResult = false,
  onUpload,
}: {
  name: string;
  hasResult?: boolean;
  onUpload: () => void;
}) {
  return (
    <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-primary-dark">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back, {name}.{" "}
          {hasResult
            ? "Here is your latest report."
            : "Start by uploading your latest blood test."}
        </p>
      </div>

      {hasResult && (
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={onUpload}
            className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Upload another report
          </button>
        </div>
      )}
    </header>
  );
}
