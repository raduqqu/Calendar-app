import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FollowUpChecklist } from "@/components/notes/FollowUpChecklist";
import { NoteCard } from "@/components/notes/NoteCard";
import { PersonActions } from "@/components/people/PersonActions";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { getPersonProfile, listPersonOptions } from "@/lib/data/people";
import { getMyProfile } from "@/lib/data/profile";
import { isUuid } from "@/lib/debrief/validate";
import {
  dateKeyAt,
  daysBetween,
  FALLBACK_TIME_ZONE,
  formatDateWithYear,
  formatDaysAgo,
  isValidTimeZone,
} from "@/lib/time";
import { todayIn } from "@/lib/time/today";

export const metadata: Metadata = { title: "Person" };

type Params = PageProps<"/people/[id]">["params"];

const sectionTitle =
  "text-tiny text-ink-secondary mb-2 px-1 font-semibold uppercase";

async function Profile({ params }: { params: Params }) {
  await connection();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [profile, person, everyone] = await Promise.all([
    getMyProfile(),
    getPersonProfile(id),
    listPersonOptions(),
  ]);
  if (!person) notFound();

  const timeZone = isValidTimeZone(profile?.timeZone)
    ? profile.timeZone
    : FALLBACK_TIME_ZONE;
  const dayOf = (iso: string) => dateKeyAt(new Date(iso).getTime(), timeZone);
  const today = todayIn(timeZone);
  const lastMet = person.lastMetAt
    ? `Last met ${formatDaysAgo(Math.max(0, daysBetween(dayOf(person.lastMetAt), today)))}`
    : "Not met yet";
  const subtitle = [person.role, person.organization]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <header className="flex flex-col items-center pt-2 text-center">
        <Avatar name={person.name} size="lg" hasNotes={person.noteCount > 0} />
        <h1 className="text-title mt-3 break-words">{person.name}</h1>
        {subtitle && <p className="text-body text-ink-secondary">{subtitle}</p>}
        {person.emails.map((email) => (
          <p key={email} className="text-meta text-ink-secondary break-all">
            {email}
          </p>
        ))}
        <p className="text-meta text-ink-secondary mt-2">
          {lastMet} ·{" "}
          {person.noteCount === 1 ? "1 note" : `${person.noteCount} notes`}
        </p>
        <PersonActions
          person={{
            id: person.id,
            name: person.name,
            organization: person.organization,
            role: person.role,
            about: person.about,
            emails: person.emails,
          }}
          others={everyone.filter((other) => other.id !== person.id)}
        />
      </header>

      <section className="mt-8" aria-labelledby="about">
        <h2 id="about" className={sectionTitle}>
          About
        </h2>
        <Card className="p-4">
          {person.about ? (
            <p className="text-body break-words whitespace-pre-wrap">
              {person.about}
            </p>
          ) : (
            <p className="text-body text-ink-secondary">
              Nothing yet. Use Edit to add stable facts: family, interests,
              where they studied.
            </p>
          )}
        </Card>
      </section>

      {person.openFollowUps.length > 0 && (
        <section className="mt-6" aria-labelledby="follow-ups">
          <h2 id="follow-ups" className={sectionTitle}>
            Open follow-ups
          </h2>
          <Card>
            <FollowUpChecklist
              // Start fresh whenever the saved list changes.
              key={person.openFollowUps.map((f) => f.id).join(",")}
              items={person.openFollowUps}
            />
          </Card>
        </section>
      )}

      <section className="mt-6" aria-labelledby="notes">
        <h2 id="notes" className={sectionTitle}>
          Notes
        </h2>
        {person.notes.length === 0 ? (
          <Card className="p-4">
            <p className="text-body text-ink-secondary">
              No notes yet. They appear here after you save a debrief with{" "}
              {person.name}.
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {person.notes.map((note) => (
              <li key={note.id}>
                <NoteCard
                  note={note}
                  dateLabel={formatDateWithYear(dayOf(note.when))}
                  backHref={`/people/${person.id}`}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Placeholder() {
  return (
    <div aria-busy="true" className="flex flex-col items-center pt-2">
      <div className="bg-subtle size-16 rounded-full" />
      <div className="bg-subtle mt-3 h-7 w-40 rounded-lg" />
      <div className="bg-subtle rounded-card mt-8 h-40 w-full" />
    </div>
  );
}

export default function PersonPage({ params }: PageProps<"/people/[id]">) {
  return (
    <>
      <Link
        href="/people"
        className="text-primary text-body -ml-2 inline-flex min-h-11 items-center gap-1 pt-2 font-medium"
      >
        <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
        People
      </Link>
      <Suspense fallback={<Placeholder />}>
        <Profile params={params} />
      </Suspense>
    </>
  );
}
