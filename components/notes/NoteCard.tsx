import { Check, Circle } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { ProfileNote } from "@/lib/data/people";
import type { Tone } from "@/lib/types";

const toneStyles: Record<Tone, string> = {
  warm: "bg-primary-light text-primary-hover",
  neutral: "bg-subtle text-ink-secondary",
  cold: "border-border text-ink-secondary border",
};

interface NoteCardProps {
  note: ProfileNote;
  /** "Sat 14 Nov 2026" */
  dateLabel: string;
  /** Where the Debrief screen's close button should return to. */
  backHref: string;
}

/** One note in a person's feed: when, which meeting, what was written. */
export function NoteCard({ note, dateLabel, backHref }: NoteCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-meta text-ink-secondary">{dateLabel}</p>
          {note.meeting ? (
            <Link
              href={`/meetings/${note.meeting.id}?back=${encodeURIComponent(backHref)}`}
              className="text-body hover:text-primary block truncate font-semibold"
            >
              {note.meeting.title}
            </Link>
          ) : (
            <p className="text-body font-semibold">Quick note</p>
          )}
        </div>
        {note.tone && (
          <span
            className={`text-tiny shrink-0 rounded-full px-2 py-0.5 font-semibold uppercase ${toneStyles[note.tone]}`}
          >
            {note.tone}
          </span>
        )}
      </div>

      {note.body ? (
        <p className="text-body mt-2 break-words whitespace-pre-wrap">
          {note.body}
        </p>
      ) : (
        <p className="text-meta text-ink-secondary mt-2">No text written.</p>
      )}

      {note.followUps.length > 0 && (
        <ul className="border-border mt-3 flex flex-col gap-1 border-t pt-3">
          {note.followUps.map((item) => (
            <li
              key={item.id}
              className={`text-meta flex items-start gap-2 ${item.done ? "text-ink-secondary line-through" : "text-ink"}`}
            >
              {item.done ? (
                <Check
                  size={14}
                  className="text-success mt-0.5 shrink-0"
                  aria-label="Done"
                />
              ) : (
                <Circle
                  size={14}
                  className="text-ink-tertiary mt-0.5 shrink-0"
                  aria-label="Open"
                />
              )}
              {item.text}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
