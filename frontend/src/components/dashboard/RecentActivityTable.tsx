import type { HistoryItem, AnalysisResult, PaginatedHistory } from "@/lib/types";

export default function RecentActivityTable({
  items,
  onSelect,
}: {
  items: HistoryItem[] | PaginatedHistory;
  onSelect: (result: AnalysisResult) => void;
}) {
  const itemList = Array.isArray(items) ? items : items?.items ?? [];

  return (
    <section className="bg-card rounded-xl shadow-sm p-6 border border-border">
      <h3 className="font-semibold text-primary-dark mb-4">Recent Activity</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="font-medium py-2">Date</th>
            <th className="font-medium py-2">Report Type</th>
            <th className="font-medium py-2">Source</th>
            <th className="font-medium py-2">Analysis Status</th>
          </tr>
        </thead>
        <tbody>
          {itemList.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-muted-foreground">
                No reports analyzed yet.
              </td>
            </tr>
          )}
          {itemList.map((item, idx) => (
            <tr
              key={(item.analysis_id || item.file) + item.timestamp + idx}
              onClick={() =>
                onSelect({
                  id: item.analysis_id || item.file,
                  date: new Date(item.timestamp).toLocaleDateString(),
                  title: item.query || "Blood Test Analysis",
                  source: item.file,
                  agents: item.agents || {
                    medical: item.analysis,
                    verification: "",
                    nutrition: "",
                    exercise: "",
                  },
                  markers: item.markers || [],
                })
              }
              className="border-b border-border/60 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <td className="py-3">
                {isNaN(new Date(item.timestamp).getTime())
                  ? item.timestamp
                  : new Date(item.timestamp).toLocaleDateString()}
              </td>
              <td className="py-3 font-medium text-foreground">{item.report_type || "Routine"}</td>
              <td className="py-3 text-muted-foreground">{item.file}</td>
              <td className="py-3">
                <span className="bg-medical-bg text-medical-text text-xs font-medium px-3 py-1 rounded-full">
                  {item.status || "Completed"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

