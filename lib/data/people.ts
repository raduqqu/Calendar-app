import "server-only";
import type { KnownPerson } from "@/lib/matching/participants";
import { createClient } from "@/lib/supabase/server";
import type { PersonOption } from "@/lib/types";

/** Everyone in People, for the "+ Add person" search. Sorted by name. */
export async function listPersonOptions(): Promise<PersonOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("people")
    .select("id, name, organization, person_emails(email)")
    .order("name", { ascending: true })
    .returns<
      {
        id: string;
        name: string;
        organization: string | null;
        person_emails: { email: string }[] | null;
      }[]
    >();
  if (error) throw new Error(`Could not load people: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    organization: row.organization,
    emails: (row.person_emails ?? []).map((e) => e.email),
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
