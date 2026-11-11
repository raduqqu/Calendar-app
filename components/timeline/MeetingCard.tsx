import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatTime, formatTimeRange } from "@/lib/time";
import { type DisplayStatus, type Meeting } from "@/lib/types";

const MAX_AVATARS = 4;

interface MeetingCardProps {
  meeting: Meeting;
  status: DisplayStatus;
  /** Tall cards have room for a third row with names. */
  tall?: boolean;
  /** Narrow cards (two meetings side by side) show less. */
  narrow?: boolean;
}

function AvatarStack({ meeting }: { meeting: Meeting }) {
  const shown = meeting.participants.slice(0, MAX_AVATARS);
  const extra = meeting.participants.length - shown.length;
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {shown.map((person) => (
        <Avatar
          key={person.id}
          name={person.name}
          size="sm"
          hasNotes={person.noteCount > 0}
        />
      ))}
      {extra > 0 && (
        <span className="text-tiny text-ink-secondary font-medium">
          +{extra}
        </span>
      )}
    </span>
  );
}

export function MeetingCard({
  meeting,
  status,
  tall = false,
  narrow = false,
}: MeetingCardProps) {
  const past = status !== "upcoming";
  const names = meeting.participants
    .map((p) => p.name.split(" ")[0])
    .join(", ");

  return (
    <article
      className={`rounded-card shadow-soft flex h-full flex-col justify-between overflow-hidden border px-3 py-2.5 ${status === "pending" ? "border-warning/50 bg-surface" : "border-border bg-surface"}`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3
            className={`text-body truncate leading-5 font-semibold ${past && status !== "pending" ? "text-ink-secondary" : "text-ink"}`}
          >
            {meeting.title}
          </h3>
          <StatusPill status={status} compact={narrow} />
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="text-meta text-ink-secondary truncate">
            {narrow && !tall
              ? formatTime(meeting.startsAt)
              : formatTimeRange(meeting.startsAt, meeting.endsAt)}
          </p>
          {!tall && <AvatarStack meeting={meeting} />}
        </div>
      </div>
      {tall && (
        <div className="flex items-center gap-2">
          <AvatarStack meeting={meeting} />
          {!narrow && (
            <p className="text-meta text-ink-secondary truncate">{names}</p>
          )}
        </div>
      )}
    </article>
  );
}
