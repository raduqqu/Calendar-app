import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { InboxList, type InboxItem } from "@/components/inbox/InboxList";
import { PageHeader } from "@/components/ui/PageHeader";
import { getPendingMeetings } from "@/lib/data/meetings";
import { getMyProfile } from "@/lib/data/profile";
import {
  dateKeyAt,
  FALLBACK_TIME_ZONE,
  formatShortDate,
  formatTimeRange,
  isValidTimeZone,
} from "@/lib/time";

export const metadata: Metadata = { title: "Inbox" };

async function Pending() {
  await connection();
  const [profile, meetings] = await Promise.all([
    getMyProfile(),
    getPendingMeetings(),
  ]);
  const timeZone = isValidTimeZone(profile?.timeZone)
    ? profile.timeZone
    : FALLBACK_TIME_ZONE;

  const items: InboxItem[] = meetings.map((meeting) => ({
    id: meeting.id,
    title: meeting.title,
    when: `${formatShortDate(dateKeyAt(new Date(meeting.startsAt).getTime(), timeZone))} · ${formatTimeRange(meeting.startsAt, meeting.endsAt, timeZone)}`,
    people: meeting.participants.map((person) => ({
      id: person.id,
      name: person.name,
      hasNotes: person.noteCount > 0,
    })),
  }));

  // A new key when the list changes, so skipped items are forgotten.
  return <InboxList key={items.map((i) => i.id).join(",")} items={items} />;
}

export default function InboxPage() {
  return (
    <>
      <PageHeader title="Inbox">
        <p className="text-meta text-ink-secondary mt-1">
          Meetings from the last two weeks that still need a note.
        </p>
      </PageHeader>
      <Suspense
        fallback={
          <div aria-busy="true" className="bg-subtle rounded-card h-40" />
        }
      >
        <Pending />
      </Suspense>
    </>
  );
}
