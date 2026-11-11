import { Plus, type LucideIcon } from "lucide-react";

export default function CardEmptyState({
  icon: Icon,
  message,
  onAdd,
  addLabel = "Add",
}: {
  icon: LucideIcon;
  message: string;
  onAdd: () => void;
  addLabel?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon size={18} />
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-muted"
      >
        <Plus size={13} />
        {addLabel}
      </button>
    </div>
  );
}
