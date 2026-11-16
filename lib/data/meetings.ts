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

/** How far back the Inbox looks for meetings that still need a debrief. */
const INBOX_DAYS = 14;
const DAY_MS = 86_400_000;

/**
 * Meetings waiting for a debrief: ended, still "open", not deleted from the
 * calendar, from the last two weeks. Newest first.
 */
export async function getPendingMeetings(now = new Date()): Promise<Meeting[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select(
      "id, title, starts_at, ends_at, status, attendees, removed_from_calendar, meeting_participants(people(id, name))",
    )
    .eq("status", "open")
    .eq("removed_from_calendar", false)
    .lte("ends_at", now.toISOString())
    .gte("ends_at", new Date(now.getTime() - INBOX_DAYS * DAY_MS).toISOString())
    .order("ends_at", { ascending: false })
    .limit(100)
    .returns<MeetingRow[]>();
  if (error) throw new Error(`Could not load the inbox: ${error.message}`);

  const rows = data ?? [];
  const personIds = rows.flatMap((row) =>
    row.meeting_participants.flatMap((p) => (p.people ? [p.people.id] : [])),
  );
  const notes = await countNotesByPerson([...new Set(personIds)]);
  return rows.map((row) => toMeeting(row, notes));
}

/** The number shown on the Inbox tab. */
export async function countPendingMeetings(now = new Date()): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .eq("status", "open")
    .eq("removed_from_calendar", false)
    .lte("ends_at", now.toISOString())
    .gte(
      "ends_at",
      new Date(now.getTime() - INBOX_DAYS * DAY_MS).toISOString(),
    );
  if (error) throw new Error(`Could not count the inbox: ${error.message}`);
  return count ?? 0;
}

/**
 * Marks a meeting as "no debrief needed". It leaves the Inbox but stays on
 * the timeline, and can still be debriefed later.
 */
export async function skipMeeting(meetingId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("meetings")
    .update({ status: "skipped" })
    .eq("id", meetingId)
    .eq("status", "open");
  if (error) throw new Error(`Could not skip the meeting: ${error.message}`);
}
