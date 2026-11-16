"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { dateKeyAt } from "@/lib/time";
import { useNow } from "@/lib/time/useNow";
import type { Meeting } from "@/lib/types";
import { DayHeader } from "./DayHeader";
import { Timeline } from "./Timeline";

interface TodayViewProps {
  /** The day being shown, YYYY-MM-DD. */
  dateKey: string;
  /** The user's time zone, e.g. "Europe/Bucharest". */
  timeZone: string;
  /** The instant that day starts, in the user's time zone. */
  dayStartMs: number;
  meetings: Meeting[];
}

/** The Today screen: date header, week strip and the day's timeline. */
export function TodayView({
  dateKey,
  timeZone,
  dayStartMs,
  meetings,
}: TodayViewProps) {
  const now = useNow();

  // The server cannot know the device's clock, so the first paint is a
  // quiet placeholder and the real day appears a moment later.
  if (now === null) {
    return (
      <div aria-busy="true" className="pt-4">
        <div className="bg-subtle h-8 w-56 rounded-lg" />
        <div className="bg-subtle rounded-card mt-6 h-64" />
      </div>
    );
  }

  const todayKey = dateKeyAt(now, timeZone);
  const isToday = dateKey === todayKey;

  return (
    <>
      <DayHeader dateKey={dateKey} todayKey={todayKey} />
      {meetings.length === 0 ? (
        <EmptyState
          title={isToday ? "No meetings today" : "No meetings"}
          description="Nothing in your calendar for this day. Ran into someone or had a call? Add it with the + button."
        />
      ) : (
        <Timeline
          dayStartMs={dayStartMs}
          timeZone={timeZone}
          meetings={meetings}
          nowMs={now}
          isToday={isToday}
        />
      )}
    </>
  );
}
