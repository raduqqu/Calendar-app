import "server-only";
import type { KnownPerson } from "@/lib/matching/participants";
import type { PersonInput } from "@/lib/people/validate";
import { createClient } from "@/lib/supabase/server";
import type { PersonOption, Tone } from "@/lib/types";

/** One person in the People list, with a few facts about them. */
export interface PersonOverview {
  id: string;
  name: string;
  organization: string | null;
  role: string | null;
  emails: string[];
  /** Start of the most recent past meeting they were part of. */
  lastMetAt: string | null;
  lastNoteAt: string | null;
  noteCount: number;
}

interface OverviewRow {
  id: string;
  name: string;
  organization: string | null;
  role: string | null;
  emails: string[] | null;
  last_met_at: string | null;
  last_note_at: string | null;
  note_count: number | null;
}

const OVERVIEW_COLUMNS =
  "id, name, organization, role, emails, last_met_at, last_note_at, note_count";

const toOverview = (row: OverviewRow): PersonOverview => ({
  id: row.id,
  name: row.name,
  organization: row.organization,
  role: row.role,
  emails: row.emails ?? [],
  lastMetAt: row.last_met_at,
  lastNoteAt: row.last_note_at,
  noteCount: row.note_count ?? 0,
});

/** When this person last came up (a meeting or a note), as milliseconds. */
const lastSeen = (p: PersonOverview): number =>
  Math.max(
    p.lastMetAt ? new Date(p.lastMetAt).getTime() : 0,
    p.lastNoteAt ? new Date(p.lastNoteAt).getTime() : 0,
  );

/** Everyone in People: most recently seen first, then by name. */
export async function listPeopleOverview(): Promise<PersonOverview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("people_overview")
    .select(OVERVIEW_COLUMNS)
    .returns<OverviewRow[]>();
  if (error) throw new Error(`Could not load people: ${error.message}`);
  return (data ?? [])
    .map(toOverview)
    .sort((a, b) => lastSeen(b) - lastSeen(a) || a.name.localeCompare(b.name));
}

/** People for the "+ Add person" search, most recently seen first. */
export async function listPersonOptions(): Promise<PersonOption[]> {
  return (await listPeopleOverview()).map((p) => ({
    id: p.id,
    name: p.name,
    organization: p.organization,
    emails: p.emails,
  }));
}

/** How many notes each of these people has. People without notes are left out. */
export async function countNotesByPerson(
  personIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (personIds.length === 0) return counts;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("note_people")
    .select("person_id")
    .in("person_id", personIds);
  if (error) throw new Error(`Could not count notes: ${error.message}`);
  for (const row of data ?? []) {
    counts.set(row.person_id, (counts.get(row.person_id) ?? 0) + 1);
  }
  return counts;
}

/** People who own any of these email addresses, keyed by address. */
export async function findPeopleByEmails(
  emails: string[],
): Promise<Map<string, KnownPerson>> {
  const found = new Map<string, KnownPerson>();
  const wanted = [...new Set(emails.map((e) => e.toLowerCase()))];
  if (wanted.length === 0) return found;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("person_emails")
    .select("email, people(id, name)")
    .in("email", wanted)
    .returns<
      { email: string; people: { id: string; name: string } | null }[]
    >();
  if (error) throw new Error(`Could not match emails: ${error.message}`);

  const rows = (data ?? []).filter((row) => row.people);
  const notes = await countNotesByPerson(rows.map((r) => r.people!.id));
  for (const row of rows) {
    const person = row.people!;
    found.set(row.email, {
      id: person.id,
      name: person.name,
      hasNotes: (notes.get(person.id) ?? 0) > 0,
    });
  }
  return found;
}

// ---------------------------------------------------------------------------
// One person's profile
// ---------------------------------------------------------------------------

export interface ProfileFollowUp {
  id: string;
  text: string;
  done: boolean;
}

export interface ProfileNote {
  id: string;
  body: string;
  tone: Tone | null;
  /** The meeting's start, or when a quick note was written. */
  when: string;
  meeting: { id: string; title: string } | null;
  followUps: ProfileFollowUp[];
}

export interface PersonProfile extends PersonOverview {
  about: string | null;
  /** Newest first. */
  notes: ProfileNote[];
  openFollowUps: ProfileFollowUp[];
}

interface NoteRow {
  notes: {
    id: string;
    body: string;
    tone: Tone | null;
    created_at: string;
    meetings: { id: string; title: string; starts_at: string } | null;
    follow_ups: {
      id: string;
      text: string;
      done: boolean;
      created_at: string;
    }[];
  } | null;
}

export async function getPersonProfile(
  personId: string,
): Promise<PersonProfile | null> {
  const supabase = await createClient();
  const [overview, details, noteRows] = await Promise.all([
    supabase
      .from("people_overview")
      .select(OVERVIEW_COLUMNS)
      .eq("id", personId)
      .maybeSingle<OverviewRow>(),
    supabase
      .from("people")
      .select("about")
      .eq("id", personId)
      .maybeSingle<{ about: string | null }>(),
    supabase
      .from("note_people")
      .select(
        "notes(id, body, tone, created_at, meetings(id, title, starts_at), follow_ups(id, text, done, created_at))",
      )
      .eq("person_id", personId)
      .returns<NoteRow[]>(),
  ]);
  for (const result of [overview, details, noteRows]) {
    if (result.error) {
      throw new Error(`Could not load the person: ${result.error.message}`);
    }
  }
  if (!overview.data) return null;

  const notes: ProfileNote[] = (noteRows.data ?? [])
    .map((row) => row.notes)
    .filter((note): note is NonNullable<NoteRow["notes"]> => Boolean(note))
    .map((note) => ({
      id: note.id,
      body: note.body,
      tone: note.tone,
      when: new Date(note.meetings?.starts_at ?? note.created_at).toISOString(),
      meeting: note.meetings
        ? { id: note.meetings.id, title: note.meetings.title }
        : null,
      followUps: [...note.follow_ups]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((f) => ({ id: f.id, text: f.text, done: f.done })),
    }))
    .sort((a, b) => b.when.localeCompare(a.when));

  return {
    ...toOverview(overview.data),
    about: details.data?.about ?? null,
    notes,
    openFollowUps: notes.flatMap((n) => n.followUps.filter((f) => !f.done)),
  };
}

/** Thrown when an email address already belongs to someone else. */
export class EmailTakenError extends Error {
  constructor(public email: string) {
    super(`${email} already belongs to another person.`);
    this.name = "EmailTakenError";
  }
}

export async function updatePerson(input: PersonInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_person", {
    p_person_id: input.personId,
    p_name: input.name,
    p_organization: input.organization,
    p_role: input.role,
    p_about: input.about,
    p_emails: input.emails,
  });
  if (!error) return;
  const taken = /EMAIL_TAKEN:(\S+)/.exec(error.message);
  if (taken) throw new EmailTakenError(taken[1]);
  throw new Error(`Could not save the person: ${error.message}`);
}

/** Moves everything from the duplicate onto the kept person, then deletes it. */
export async function mergePeople(
  keepId: string,
  removeId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("merge_people", {
    p_keep: keepId,
    p_remove: removeId,
  });
  if (error) throw new Error(`Could not merge: ${error.message}`);
}

export async function setFollowUpDone(
  followUpId: string,
  done: boolean,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("follow_ups")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", followUpId);
  if (error)
    throw new Error(`Could not update the follow-up: ${error.message}`);
}
