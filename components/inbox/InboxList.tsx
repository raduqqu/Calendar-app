"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getDemoPending } from "@/lib/demo/data";
import {
  dateKeyAt,
  deviceTimeZone,
  formatShortDate,
  formatTimeRange,
} from "@/lib/time";
import { useNow } from "@/lib/time/useNow";

/** Meetings that have ended and still need a debrief, newest first. */
export function InboxList() {
  const now = useNow();
  if (now === null) {
    return <div aria-busy="true" className="bg-subtle rounded-card h-40" />;
  }

  const timeZone = deviceTimeZone();
  const pending = getDemoPending(now, timeZone);
  if (pending.length === 0) {
    return (
      <EmptyState
        title="All caught up"
        description="Meetings waiting for a debrief will appear here."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {pending.map((meeting) => (
        <li key={meeting.id}>
          <Card className="p-4">
            <h2 className="text-body font-semibold">{meeting.title}</h2>
            <p className="text-meta text-ink-secondary">
              {formatShortDate(
                dateKeyAt(new Date(meeting.startsAt).getTime(), timeZone),
              )}{" "}
              · {formatTimeRange(meeting.startsAt, meeting.endsAt, timeZone)}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5">
                {meeting.participants.map((person) => (
                  <Avatar
                    key={person.id}
                    name={person.name}
                    size="sm"
                    hasNotes={person.noteCount > 0}
                  />
                ))}
              </span>
              <span className="flex gap-2">
                <Button variant="ghost" size="sm" disabled>
                  Skip
                </Button>
                <Button size="sm" disabled>
                  Debrief
                </Button>
              </span>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
