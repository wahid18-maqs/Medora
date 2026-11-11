import { Pencil } from "lucide-react";

export default function CardEditButton({
  onClick,
  label = "Edit",
  ariaLabel,
}: {
  onClick: () => void;
  label?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? `Edit ${label}`}
      className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-primary-dark"
    >
      <Pencil size={13} />
      <span>{label}</span>
    </button>
  );
}
