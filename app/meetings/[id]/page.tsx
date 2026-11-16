import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { DebriefForm } from "@/components/debrief/DebriefForm";
import { getDebrief } from "@/lib/data/debrief";
import { findPeopleByEmails, listPersonOptions } from "@/lib/data/people";
import { getMyProfile } from "@/lib/data/profile";
import { isUuid } from "@/lib/debrief/validate";
import { chipsFromInvite } from "@/lib/matching/participants";
import {
  dateKeyAt,
  FALLBACK_TIME_ZONE,
  formatLongDate,
  formatTimeRange,
  isValidTimeZone,
} from "@/lib/time";
import type { ParticipantChip } from "@/lib/types";

export const metadata: Metadata = { title: "Debrief" };

type Params = PageProps<"/meetings/[id]">["params"];
type SearchParams = PageProps<"/meetings/[id]">["searchParams"];

/** Only a person's profile is accepted as a place to return to. */
const PERSON_PATH =
  /^\/people\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Debrief({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await connection();
  const { id } = await params;
  const { back } = await searchParams;
  const backToPerson =
    typeof back === "string" && PERSON_PATH.test(back) ? back : null;
  if (!isUuid(id)) notFound();

  const profile = await getMyProfile();
  if (!profile) redirect("/");
  const timeZone = isValidTimeZone(profile.timeZone)
    ? profile.timeZone
    : FALLBACK_TIME_ZONE;

  const data = await getDebrief(id);
  if (!data) notFound();
  const { meeting } = data;

  // Before the first save, suggest the people on the calendar invite.
  let participants: ParticipantChip[];
  if (data.participants.length > 0 || data.note) {
    participants = data.participants.map((p) => ({
      kind: "existing",
      personId: p.id,
      name: p.name,
      hasNotes: p.hasNotes,
    }));
  } else {
    const known = await findPeopleByEmails(
      meeting.attendees.map((a) => a.email),
    );
    participants = chipsFromInvite(meeting.attendees, known);
  }

  const dateKey = dateKeyAt(new Date(meeting.startsAt).getTime(), timeZone);
  const people = await listPersonOptions();

  return (
    <DebriefForm
      // A new key after every save or delete starts the form fresh from the
      // saved data (Next.js may otherwise keep the old, unsaved form state).
      key={`${meeting.id}:${data.note?.updatedAt ?? "none"}:${meeting.status}`}
      meetingId={meeting.id}
      title={meeting.title}
      when={`${formatLongDate(dateKey)} · ${formatTimeRange(meeting.startsAt, meeting.endsAt, timeZone)}`}
      backHref={backToPerson ?? `/today?date=${dateKey}`}
      toastOnReturn={!backToPerson}
      removedFromCalendar={meeting.removedFromCalendar}
      people={people}
      initialParticipants={participants}
      initialBody={data.note?.body ?? ""}
      initialTone={data.note?.tone ?? null}
      initialFollowUps={data.followUps}
      hasNote={Boolean(data.note)}
    />
  );
}

function Placeholder() {
  return (
    <div aria-busy="true" className="mx-auto max-w-[480px] px-4 pt-6">
      <div className="bg-subtle h-7 w-48 rounded-lg" />
      <div className="bg-subtle mt-3 h-4 w-64 rounded" />
      <div className="bg-subtle rounded-card mt-8 h-56" />
    </div>
  );
}

/** Full-screen Debrief for one meeting (no tab bar, so the keyboard has room). */
export default function DebriefPage({
  params,
  searchParams,
}: PageProps<"/meetings/[id]">) {
  return (
    <Suspense fallback={<Placeholder />}>
      <Debrief params={params} searchParams={searchParams} />
    </Suspense>
  );
}
