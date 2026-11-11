import SummaryPdfButton from "./SummaryPdfButton";

export default function ActionFooter({ reportId }: { reportId?: string }) {
  return (
    <div>
      <SummaryPdfButton reportId={reportId} className="mb-3" />
      <p className="text-xs leading-relaxed text-muted-foreground">
        Medora provides informational insights and does not replace professional medical advice.
      </p>
    </div>
  );
}
