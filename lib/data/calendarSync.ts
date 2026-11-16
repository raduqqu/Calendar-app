import "server-only";
import type { MeetingDraft, ProviderCalendar } from "@/lib/calendar/types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Database reads and writes used by the calendar sync.
 *
 * The sync also runs in the background later (for notifications), when no
 * user is signed in, so it uses the secret key. That key ignores row-level
 * security, so EVERY query here filters by user_id explicitly.
 */

export interface SyncContext {
  email: string | null;
  extraEmails: string[];
  timeZone: string | null;
  includeSoloEvents: boolean;
  lastSyncedAt: number | null;
  encryptedRefreshToken: string | null;
}

export interface StoredCalendar {
  id: string;
  externalId: string;
}

const db = () => createAdminClient();

function check(error: { message: string } | null, what: string): void {
  if (error) throw new Error(`Could not ${what}: ${error.message}`);
}

export async function loadSyncContext(
  userId: string,
): Promise<SyncContext | null> {
  const admin = db();
  const [profile, token] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "email, extra_emails, time_zone, include_solo_events, last_synced_at",
      )
      .eq("id", userId)
      .maybeSingle(),
    admin
      .from("google_tokens")
      .select("refresh_token_encrypted")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  check(profile.error, "load the profile");
  check(token.error, "load the Google token");
  if (!profile.data) return null;

  return {
    email: profile.data.email,
    extraEmails: profile.data.extra_emails ?? [],
    timeZone: profile.data.time_zone,
    includeSoloEvents: profile.data.include_solo_events,
    lastSyncedAt: profile.data.last_synced_at
      ? new Date(profile.data.last_synced_at).getTime()
      : null,
    encryptedRefreshToken: token.data?.refresh_token_encrypted ?? null,
  };
}

/** Adds calendars seen for the first time. The primary one starts selected. */
export async function saveCalendars(
  userId: string,
  calendars: ProviderCalendar[],
): Promise<void> {
  if (calendars.length === 0) return;
  const { error } = await db()
    .from("calendars")
    .upsert(
      calendars.map((c) => ({
        user_id: userId,
        provider: "google",
        external_id: c.externalId,
        name: c.name,
        is_primary: c.isPrimary,
        selected: c.isPrimary,
        time_zone: c.timeZone,
      })),
      // Existing rows are left alone, so the user's choices are kept.
      { onConflict: "user_id,provider,external_id", ignoreDuplicates: true },
    );
  check(error, "save calendars");
}

export async function getSelectedCalendars(
  userId: string,
): Promise<StoredCalendar[]> {
  const { data, error } = await db()
    .from("calendars")
    .select("id, external_id")
    .eq("user_id", userId)
    .eq("provider", "google")
    .eq("selected", true);
  check(error, "load selected calendars");
  return (data ?? []).map((row) => ({
    id: row.id,
    externalId: row.external_id,
  }));
}

/** Event ids already stored for this calendar, starting within the period. */
export async function getStoredEventIds(
  userId: string,
  calendarId: string,
  from: Date,
  to: Date,
): Promise<string[]> {
  const { data, error } = await db()
    .from("meetings")
    .select("external_event_id")
    .eq("user_id", userId)
    .eq("calendar_id", calendarId)
    .eq("source", "google")
    .gte("starts_at", from.toISOString())
    .lt("starts_at", to.toISOString());
  check(error, "load stored meetings");
  return (data ?? [])
    .map((row) => row.external_event_id as string | null)
    .filter((id): id is string => Boolean(id));
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * Creates new meetings and updates existing ones (title, time, attendees).
 * The status (debriefed, skipped) is never touched here.
 */
export async function upsertMeetings(
  userId: string,
  calendarId: string,
  drafts: MeetingDraft[],
): Promise<void> {
  for (const batch of chunks(drafts, 200)) {
    const { error } = await db()
      .from("meetings")
      .upsert(
        batch.map((m) => ({
          user_id: userId,
          source: "google",
          calendar_id: calendarId,
          external_event_id: m.externalEventId,
          title: m.title,
          starts_at: m.startsAt,
          ends_at: m.endsAt,
          attendees: m.attendees,
          removed_from_calendar: false,
        })),
        { onConflict: "user_id,calendar_id,external_event_id" },
      );
    check(error, "save meetings");
  }
}

/** Keeps the meetings (and later their notes) but flags them as removed. */
export async function markRemovedFromCalendar(
  userId: string,
  calendarId: string,
  externalEventIds: string[],
): Promise<void> {
  for (const batch of chunks(externalEventIds, 100)) {
    const { error } = await db()
      .from("meetings")
      .update({ removed_from_calendar: true })
      .eq("user_id", userId)
      .eq("calendar_id", calendarId)
      .in("external_event_id", batch);
    check(error, "flag removed meetings");
  }
}

export async function saveTimeZone(
  userId: string,
  timeZone: string,
): Promise<void> {
  const { error } = await db()
    .from("profiles")
    .update({ time_zone: timeZone })
    .eq("id", userId);
  check(error, "save the time zone");
}

export async function markSynced(userId: string, at: Date): Promise<void> {
  const { error } = await db()
    .from("profiles")
    .update({ last_synced_at: at.toISOString(), google_connected: true })
    .eq("id", userId);
  check(error, "record the sync time");
}

export async function markDisconnected(userId: string): Promise<void> {
  const { error } = await db()
    .from("profiles")
    .update({ google_connected: false })
    .eq("id", userId);
  check(error, "record the lost calendar connection");
}
