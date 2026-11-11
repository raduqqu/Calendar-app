import { X } from "lucide-react";
import { Avatar } from "./Avatar";

interface ChipProps {
  name: string;
  hasNotes?: boolean;
  /** Highlighted (light blue) when the person has notes or is selected. */
  selected?: boolean;
  onRemove?: () => void;
}

/** A person shown as a small rounded pill with their initials. */
export function Chip({ name, hasNotes, selected, onRemove }: ChipProps) {
  return (
    <span
      className={`text-meta text-ink inline-flex min-h-8 items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 ${selected ? "bg-primary-light border-transparent" : "border-border bg-surface"}`}
    >
      <Avatar name={name} size="sm" hasNotes={hasNotes} />
      <span className="truncate">{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          className="text-ink-secondary hover:text-ink -mr-1.5 inline-flex size-6 items-center justify-center rounded-full"
        >
          <X size={14} strokeWidth={1.75} />
        </button>
      )}
    </span>
  );
}
