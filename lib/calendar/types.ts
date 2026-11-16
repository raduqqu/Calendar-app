/**
 * The calendar layer. Screens and the sync never talk to Google directly;
 * they use this interface. Supporting Outlook later means writing one more
 * file that implements CalendarProvider, without touching anything else.
 */

export type CalendarProviderId = "google";

export interface ProviderCalendar {
  externalId: string;
  name: string;
  isPrimary: boolean;
  timeZone: string | null;
}

export type ResponseStatus =
  "needsAction" | "declined" | "tentative" | "accepted";

export interface ProviderAttendee {
  /** Always lowercase. */
  email: string;
  name: string | null;
  /** True when this attendee is the signed-in user. */
  self: boolean;
  /** True for meeting rooms and other bookable resources. */
  resource: boolean;
  response: ResponseStatus | null;
}

/** A calendar event, already translated from the provider's own format. */
export interface ProviderEvent {
  externalId: string;
  title: string;
  cancelled: boolean;
  allDay: boolean;
  /** ISO timestamps (UTC); null for all-day events. */
  startsAt: string | null;
  endsAt: string | null;
  /** "default", "focusTime", "outOfOffice", "workingLocation", "birthday", … */
  eventType: string;
  attendees: ProviderAttendee[];
}

export interface CalendarProvider {
  id: CalendarProviderId;
  listCalendars(): Promise<ProviderCalendar[]>;
  /** Events overlapping the period from `from` to `to`. */
  listEvents(
    calendarExternalId: string,
    from: Date,
    to: Date,
  ): Promise<ProviderEvent[]>;
}

/** Calendar access was revoked or expired: the user must reconnect. */
export class CalendarAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalendarAuthError";
  }
}

/** An attendee as stored on a meeting. */
export interface StoredAttendee {
  email: string;
  name: string | null;
}

/** What the sync writes to the meetings table for one event. */
export interface MeetingDraft {
  externalEventId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  attendees: StoredAttendee[];
}
