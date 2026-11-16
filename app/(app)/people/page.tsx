import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PeopleList } from "@/components/people/PeopleList";
import { PageHeader } from "@/components/ui/PageHeader";
import { listPeopleOverview } from "@/lib/data/people";
import { getMyProfile } from "@/lib/data/profile";
import {
  dateKeyAt,
  daysBetween,
  FALLBACK_TIME_ZONE,
  isValidTimeZone,
} from "@/lib/time";
import { todayIn } from "@/lib/time/today";
import type { PersonSummary } from "@/lib/types";

export const metadata: Metadata = { title: "People" };

async function People() {
  await connection();
  const [profile, people] = await Promise.all([
    getMyProfile(),
    listPeopleOverview(),
  ]);
  const timeZone = isValidTimeZone(profile?.timeZone)
    ? profile.timeZone
    : FALLBACK_TIME_ZONE;
  const today = todayIn(timeZone);

  const summaries: PersonSummary[] = people.map((person) => ({
    id: person.id,
    name: person.name,
    organization: person.organization ?? undefined,
    noteCount: person.noteCount,
    lastMetDaysAgo: person.lastMetAt
      ? Math.max(
          0,
          daysBetween(
            dateKeyAt(new Date(person.lastMetAt).getTime(), timeZone),
            today,
          ),
        )
      : undefined,
  }));

  return <PeopleList people={summaries} />;
}

export default function PeoplePage() {
  return (
    <>
      <PageHeader title="People" />
      <Suspense
        fallback={
          <div aria-busy="true" className="bg-subtle rounded-card h-40" />
        }
      >
        <People />
      </Suspense>
    </>
  );
}
