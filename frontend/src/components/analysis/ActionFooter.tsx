export default function ActionFooter() {
  return (
    <div>
      <div className="flex gap-3 mb-3">
        <button className="flex-1 border border-border rounded-lg py-2 text-sm text-foreground hover:bg-muted cursor-pointer">
          Export PDF
        </button>
        <button className="flex-1 bg-primary-dark text-primary-foreground rounded-lg py-2 text-sm hover:bg-primary cursor-pointer">
          Share with Doctor
        </button>
      </div>
      <p className="text-xs text-muted-foreground italic">
        All analyses are for informational purposes only. Consult a healthcare professional.
      </p>
    </div>
  );
}
