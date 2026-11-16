import "server-only";
import type { StoredAttendee } from "@/lib/calendar/types";
import type { DebriefInput } from "@/lib/debrief/validate";
import { createClient } from "@/lib/supabase/server";
import type { FollowUpItem, MeetingStatus, Tone } from "@/lib/types";
import { countNotesByPerson } from "./people";

export interface DebriefData {
  meeting: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    status: MeetingStatus;
    removedFromCalendar: boolean;
    attendees: StoredAttendee[];
  };
  /** People already confirmed for this meeting (empty before the first save). */
  participants: { id: string; name: string; hasNotes: boolean }[];
  note: { body: string; tone: Tone | null; updatedAt: string } | null;
  followUps: FollowUpItem[];
}

interface MeetingRow {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: MeetingStatus;
  removed_from_calendar: boolean;
  attendees: StoredAttendee[] | null;
  meeting_participants: { people: { id: string; name: string } | null }[];
}

/** Everything the Debrief screen shows for one meeting, or null if not found. */
export async function getDebrief(
  meetingId: string,
): Promise<DebriefData | null> {
  const supabase = await createClient();
  const { data: meeting, error } = await supabase
    .from("meetings")
    .select(
      "id, title, starts_at, ends_at, status, removed_from_calendar, attendees, meeting_participants(people(id, name))",
    )
    .eq("id", meetingId)
    .maybeSingle<MeetingRow>();
  if (error) throw new Error(`Could not load the meeting: ${error.message}`);
  if (!meeting) return null;

  const { data: note, error: noteError } = await supabase
    .from("notes")
    .select(
      "id, body, tone, updated_at, follow_ups(id, text, done, created_at)",
    )
    .eq("meeting_id", meetingId)
    .maybeSingle<{
      id: string;
      body: string;
      tone: Tone | null;
      updated_at: string;
      follow_ups: {
        id: string;
        text: string;
        done: boolean;
        created_at: string;
      }[];
    }>();
  if (noteError)
    throw new Error(`Could not load the note: ${noteError.message}`);

  const people = meeting.meeting_participants
    .map((p) => p.people)
    .filter((p): p is { id: string; name: string } => Boolean(p));
  const notes = await countNotesByPerson(people.map((p) => p.id));

  return {
    meeting: {
      id: meeting.id,
      title: meeting.title,
      startsAt: new Date(meeting.starts_at).toISOString(),
      endsAt: new Date(meeting.ends_at).toISOString(),
      status: meeting.status,
      removedFromCalendar: meeting.removed_from_calendar,
      attendees: meeting.attendees ?? [],
    },
    participants: people
      .map((p) => ({ ...p, hasNotes: (notes.get(p.id) ?? 0) > 0 }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    note: note
      ? { body: note.body, tone: note.tone, updatedAt: note.updated_at }
      : null,
    followUps: (note?.follow_ups ?? [])
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((f) => ({ id: f.id, text: f.text, done: f.done })),
  };
}

/** Saves note, people and follow-ups in one step. Returns how many people. */
export async function saveDebrief(
  input: DebriefInput,
): Promise<{ peopleCount: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_debrief", {
    p_meeting_id: input.meetingId,
    p_body: input.body,
    p_tone: input.tone,
    p_existing_people: input.existingPeopleIds,
    p_new_people: input.newPeople,
    p_follow_ups: input.followUps,
  });
  if (error) throw new Error(`Could not save the debrief: ${error.message}`);
  return { peopleCount: Number((data as { people?: number })?.people ?? 0) };
}

export async function deleteDebrief(meetingId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_debrief", {
    p_meeting_id: meetingId,
  });
  if (error) throw new Error(`Could not delete the note: ${error.message}`);
}
