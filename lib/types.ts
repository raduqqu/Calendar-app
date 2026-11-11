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
