"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { SampleNote } from "@/components/ui/PageHeader";
import { getDemoMeetings } from "@/lib/demo/data";
import { toDateKey } from "@/lib/time";
import { useNow } from "@/lib/time/useNow";
import { DayHeader } from "./DayHeader";
import { Timeline } from "./Timeline";

/**
 * The Today screen. `dateKey` is the day chosen in the address bar
 * (/today?date=2026-11-12); without it the screen shows the current day.
 */
export function TodayView({ dateKey }: { dateKey: string | null }) {
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

  const todayKey = toDateKey(new Date(now));
  const selectedKey = dateKey ?? todayKey;
  const meetings = getDemoMeetings(selectedKey, now);

  return (
    <>
      <DayHeader dateKey={selectedKey} todayKey={todayKey} />
      <SampleNote>
        Sample meetings for now. Your real calendar appears in the next step.
      </SampleNote>
      {meetings.length === 0 ? (
        <EmptyState
          title={selectedKey === todayKey ? "No meetings today" : "No meetings"}
          description="Ran into someone or had a call? Add it with the + button."
        />
      ) : (
        <Timeline
          dateKey={selectedKey}
          meetings={meetings}
          nowMs={now}
          isToday={selectedKey === todayKey}
        />
      )}
    </>
  );
}
