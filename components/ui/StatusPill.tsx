import { Check, Clock } from "lucide-react";
import type { DisplayStatus } from "@/lib/types";

interface StatusPillProps {
  status: DisplayStatus;
  /** Icon only, for narrow cards. The label stays available to screen readers. */
  compact?: boolean;
}

export function StatusPill({ status, compact = false }: StatusPillProps) {
  if (status === "upcoming" || status === "skipped") return null;

  const pending = status === "pending";
  const label = pending ? "Debrief pending" : "Debriefed";
  const Icon = pending ? Clock : Check;

  return (
    <span
      className={`text-tiny inline-flex shrink-0 items-center gap-1 rounded-full font-semibold whitespace-nowrap ${compact ? "size-5 justify-center" : "px-2 py-0.5"} ${pending ? "bg-warning-light text-warning-ink" : "bg-success-light text-success-ink"}`}
    >
      <Icon size={12} strokeWidth={2.25} aria-hidden="true" />
      <span className={compact ? "sr-only" : ""}>{label}</span>
    </span>
  );
}
