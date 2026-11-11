import SummaryPdfButton from "./SummaryPdfButton";

export default function ActionFooter({ reportId }: { reportId?: string }) {
  return (
    <div className="mt-5 border-t border-border pt-4">
      <SummaryPdfButton reportId={reportId} />
      <p className="text-xs leading-relaxed text-muted-foreground">
        Medora provides informational insights and does not replace professional medical advice.
      </p>
    </div>
  );
}
