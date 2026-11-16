/**
 * Which calendar events become meetings in Ply, and who counts as an
 * attendee. Pure rules with no database or network, so they are easy to test.
 */
import type {
  MeetingDraft,
  ProviderAttendee,
  ProviderEvent,
  StoredAttendee,
} from "./types";

/** Event types that are not real meetings with people. */
const SKIPPED_EVENT_TYPES = new Set([
  "focusTime",
  "outOfOffice",
  "workingLocation",
  "birthday",
]);

/** Addresses Google uses for rooms, equipment and shared calendars. */
const RESOURCE_DOMAINS = [
  "resource.calendar.google.com",
  "group.calendar.google.com",
  "group.v.calendar.google.com",
];

export interface FilterOptions {
  /** All of the user's own addresses, any letter case. */
  myEmails: string[];
  includeSoloEvents: boolean;
}

function isResource(attendee: ProviderAttendee): boolean {
  if (attendee.resource) return true;
  const domain = attendee.email.split("@")[1] ?? "";
  return RESOURCE_DOMAINS.some(
    (resourceDomain) =>
      domain === resourceDomain || domain.endsWith(`.${resourceDomain}`),
  );
}

function mySet(myEmails: string[]): Set<string> {
  return new Set(myEmails.filter(Boolean).map((e) => e.trim().toLowerCase()));
}

/** Everyone in the invite except me and meeting rooms, without duplicates. */
export function otherAttendees(
  event: ProviderEvent,
  myEmails: string[],
): StoredAttendee[] {
  const mine = mySet(myEmails);
  const seen = new Set<string>();
  const others: StoredAttendee[] = [];
  for (const attendee of event.attendees) {
    const email = attendee.email.trim().toLowerCase();
    if (!email || attendee.self || mine.has(email) || isResource(attendee)) {
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    others.push({ email, name: attendee.name?.trim() || null });
  }
  return others;
}

function iDeclined(event: ProviderEvent, myEmails: string[]): boolean {
  const mine = mySet(myEmails);
  return event.attendees.some(
    (a) =>
      (a.self || mine.has(a.email.toLowerCase())) && a.response === "declined",
  );
}

export type SkipReason =
  "cancelled" | "all-day" | "no-time" | "not-a-meeting" | "declined" | "solo";

/** Why an event is left out, or null when it becomes a meeting. */
export function skipReason(
  event: ProviderEvent,
  options: FilterOptions,
): SkipReason | null {
  if (event.cancelled) return "cancelled";
  if (event.allDay) return "all-day";
  if (!event.startsAt || !event.endsAt) return "no-time";
  if (SKIPPED_EVENT_TYPES.has(event.eventType)) return "not-a-meeting";
  if (iDeclined(event, options.myEmails)) return "declined";
  if (
    !options.includeSoloEvents &&
    otherAttendees(event, options.myEmails).length === 0
  ) {
    return "solo";
  }
  return null;
}

export interface SyncPlan {
  /** Events to create or update as meetings. */
  keep: MeetingDraft[];
  /** Stored events that are no longer in the calendar (or no longer count). */
  removedIds: string[];
}

/**
 * Compares what the calendar has now with what is already stored for the
 * same period, and works out what to save and what to mark as removed.
 */
export function planCalendarSync(
  events: ProviderEvent[],
  storedIds: string[],
  options: FilterOptions,
): SyncPlan {
  const keep: MeetingDraft[] = [];
  for (const event of events) {
    if (skipReason(event, options) !== null) continue;
    keep.push({
      externalEventId: event.externalId,
      title: event.title,
      startsAt: event.startsAt as string,
      endsAt: event.endsAt as string,
      attendees: otherAttendees(event, options.myEmails),
    });
  }
  const kept = new Set(keep.map((m) => m.externalEventId));
  const removedIds = storedIds.filter((id) => !kept.has(id));
  return { keep, removedIds };
}
