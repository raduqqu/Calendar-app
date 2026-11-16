import "server-only";
import type { StoredAttendee } from "@/lib/calendar/types";
import { displayName } from "@/lib/matching/names";
import { countNotesByPerson } from "./people";
import { createClient } from "@/lib/supabase/server";
import type { Meeting, MeetingStatus } from "@/lib/types";

interface MeetingRow {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: MeetingStatus;
  attendees: StoredAttendee[] | null;
  removed_from_calendar: boolean;
  meeting_participants: { people: { id: string; name: string } | null }[];
}

function toMeeting(row: MeetingRow, notes: Map<string, number>): Meeting {
  const confirmed = row.meeting_participants
    .map((p) => p.people)
    .filter((p): p is { id: string; name: string } => Boolean(p));

  return {
    id: row.id,
    title: row.title,
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: new Date(row.ends_at).toISOString(),
    status: row.status,
    // People confirmed in a debrief; before that, the people on the invite.
    participants:
      confirmed.length > 0
        ? confirmed.map((person) => ({
            id: person.id,
            name: person.name,
            noteCount: notes.get(person.id) ?? 0,
          }))
        : (row.attendees ?? []).map((attendee) => ({
            id: attendee.email,
            name: displayName(attendee),
            noteCount: 0,
          })),
  };
}

/**
 * The signed-in user's meetings that overlap the period between two
 * instants, earliest first. Meetings deleted from the calendar are hidden
 * unless they were already debriefed (their notes must stay reachable).
 */
export async function getMeetingsBetween(
  startIso: string,
  endIso: string,
): Promise<Meeting[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select(
      "id, title, starts_at, ends_at, status, attendees, removed_from_calendar, meeting_participants(people(id, name))",
    )
    .lt("starts_at", endIso)
    .gt("ends_at", startIso)
    .order("starts_at", { ascending: true })
    .returns<MeetingRow[]>();
  if (error) throw new Error(`Could not load meetings: ${error.message}`);

  const rows = (data ?? []).filter(
    (row) => !row.removed_from_calendar || row.status === "debriefed",
  );
  const personIds = rows.flatMap((row) =>
    row.meeting_participants.flatMap((p) => (p.people ? [p.people.id] : [])),
  );
  const notes = await countNotesByPerson([...new Set(personIds)]);
  return rows.map((row) => toMeeting(row, notes));
}
