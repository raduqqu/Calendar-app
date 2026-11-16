/** What is stored for a meeting. */
export type MeetingStatus = "open" | "debriefed" | "skipped";

/**
 * What the user sees. "upcoming" and "pending" are not stored: they are worked
 * out from the clock (an open meeting that has ended is pending).
 */
export type DisplayStatus = "upcoming" | "pending" | "debriefed" | "skipped";

export interface PersonSummary {
  id: string;
  name: string;
  organization?: string;
  noteCount: number;
  /** Whole days since the last meeting with this person, if any. */
  lastMetDaysAgo?: number;
}

export interface Meeting {
  id: string;
  title: string;
  /** ISO timestamps (UTC). */
  startsAt: string;
  endsAt: string;
  status: MeetingStatus;
  participants: PersonSummary[];
}

export function displayStatus(meeting: Meeting, nowMs: number): DisplayStatus {
  if (meeting.status !== "open") return meeting.status;
  return new Date(meeting.endsAt).getTime() <= nowMs ? "pending" : "upcoming";
}

export type Tone = "warm" | "neutral" | "cold";

/** A person as offered in the "+ Add person" search. */
export interface PersonOption {
  id: string;
  name: string;
  organization: string | null;
  emails: string[];
}

/**
 * A person chip on the Debrief screen: either someone who already exists in
 * People, or someone who will be created when the debrief is saved.
 */
export type ParticipantChip =
  | { kind: "existing"; personId: string; name: string; hasNotes: boolean }
  | { kind: "new"; key: string; name: string; email: string | null };

export interface FollowUpItem {
  /** Missing for follow-ups that are not saved yet. */
  id?: string;
  text: string;
  done: boolean;
}
