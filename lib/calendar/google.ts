import "server-only";
import {
  CalendarAuthError,
  type CalendarProvider,
  type ProviderAttendee,
  type ProviderCalendar,
  type ProviderEvent,
  type ResponseStatus,
} from "./types";

/**
 * Google Calendar, read-only. Uses the stored refresh token to get a
 * short-lived access token, then reads calendars and events.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3";

function env(name: "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. See docs/SETUP.md, Part 7.`,
    );
  }
  return value;
}

async function getAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
  };
  if (response.ok && body.access_token) return body.access_token;
  // "invalid_grant": the permission was revoked or has expired.
  if (body.error === "invalid_grant") {
    throw new CalendarAuthError("Google refused the stored permission.");
  }
  throw new Error(
    `Google token refresh failed (${response.status} ${body.error ?? ""}).`,
  );
}

interface GoogleError {
  error?: { errors?: { reason?: string }[]; message?: string };
}

async function getJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (response.ok) return (await response.json()) as T;

  const body = (await response.json().catch(() => ({}))) as GoogleError;
  const reason = body.error?.errors?.[0]?.reason ?? "";
  const rateLimited = /rateLimit/i.test(reason);
  if (response.status === 401 || (response.status === 403 && !rateLimited)) {
    // Expired, revoked, or the calendar box was not ticked at sign-in.
    throw new CalendarAuthError(
      `Google Calendar refused access (${response.status} ${reason}).`,
    );
  }
  throw new Error(
    `Google Calendar request failed (${response.status} ${reason || body.error?.message || ""}).`,
  );
}

/** Follows Google's "next page" links until everything is read. */
async function getAllPages<T>(
  baseUrl: string,
  accessToken: string,
): Promise<T[]> {
  const items: T[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 20; page++) {
    const url = new URL(baseUrl);
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const data = await getJson<{ items?: T[]; nextPageToken?: string }>(
      url.toString(),
      accessToken,
    );
    items.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return items;
}

interface GoogleCalendarListEntry {
  id: string;
  summary?: string;
  summaryOverride?: string;
  primary?: boolean;
  timeZone?: string;
}

interface GoogleEventTime {
  date?: string;
  dateTime?: string;
}

interface GoogleEvent {
  id: string;
  status?: string;
  summary?: string;
  start?: GoogleEventTime;
  end?: GoogleEventTime;
  eventType?: string;
  attendees?: {
    email?: string;
    displayName?: string;
    self?: boolean;
    resource?: boolean;
    responseStatus?: ResponseStatus;
  }[];
}

const toIso = (time?: GoogleEventTime) =>
  time?.dateTime ? new Date(time.dateTime).toISOString() : null;

/** Translates one Google event into the app's own format. */
export function fromGoogleEvent(event: GoogleEvent): ProviderEvent {
  const attendees: ProviderAttendee[] = (event.attendees ?? [])
    .filter((a) => a.email)
    .map((a) => ({
      email: (a.email as string).toLowerCase(),
      name: a.displayName ?? null,
      self: Boolean(a.self),
      resource: Boolean(a.resource),
      response: a.responseStatus ?? null,
    }));

  return {
    externalId: event.id,
    title: event.summary?.trim() || "(No title)",
    cancelled: event.status === "cancelled",
    allDay: Boolean(event.start?.date && !event.start?.dateTime),
    startsAt: toIso(event.start),
    endsAt: toIso(event.end),
    eventType: event.eventType ?? "default",
    attendees,
  };
}

export async function createGoogleProvider(
  refreshToken: string,
): Promise<CalendarProvider> {
  const accessToken = await getAccessToken(refreshToken);

  return {
    id: "google",

    async listCalendars(): Promise<ProviderCalendar[]> {
      const url = new URL(`${API}/users/me/calendarList`);
      url.searchParams.set("minAccessRole", "reader");
      url.searchParams.set("maxResults", "250");
      const entries = await getAllPages<GoogleCalendarListEntry>(
        url.toString(),
        accessToken,
      );
      return entries.map((entry) => ({
        externalId: entry.id,
        name: entry.summaryOverride ?? entry.summary ?? entry.id,
        isPrimary: Boolean(entry.primary),
        timeZone: entry.timeZone ?? null,
      }));
    },

    async listEvents(calendarExternalId, from, to): Promise<ProviderEvent[]> {
      const url = new URL(
        `${API}/calendars/${encodeURIComponent(calendarExternalId)}/events`,
      );
      // singleEvents: each occurrence of a repeating event comes separately.
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("orderBy", "startTime");
      url.searchParams.set("timeMin", from.toISOString());
      url.searchParams.set("timeMax", to.toISOString());
      url.searchParams.set("maxResults", "250");
      const events = await getAllPages<GoogleEvent>(
        url.toString(),
        accessToken,
      );
      return events.map(fromGoogleEvent);
    },
  };
}
