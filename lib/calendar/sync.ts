import "server-only";
import { decryptToken } from "@/lib/crypto/tokens";
import {
  getSelectedCalendars,
  getStoredEventIds,
  loadSyncContext,
  markDisconnected,
  markRemovedFromCalendar,
  markSynced,
  saveCalendars,
  saveTimeZone,
  upsertMeetings,
  type SyncContext,
} from "@/lib/data/calendarSync";
import { isValidTimeZone } from "@/lib/time";
import { planCalendarSync } from "./filter";
import { createGoogleProvider } from "./google";
import { CalendarAuthError } from "./types";

/**
 * Copies the user's calendar events into the meetings table.
 * Period: 7 days back and 14 days ahead.
 */

const DAY_MS = 86_400_000;
const DAYS_BACK = 7;
const DAYS_AHEAD = 14;
/** On app open, read Google again only if the last read is older than this. */
const STALE_AFTER_MS = 2 * 60_000;

export type SyncStatus = "synced" | "fresh" | "disconnected" | "failed";

export interface SyncResult {
  status: SyncStatus;
  /** The user's time zone (from their profile, or from Google). */
  timeZone: string | null;
}

/** Reads the calendar unless it was read in the last couple of minutes. */
export async function syncIfStale(
  userId: string,
  now = new Date(),
): Promise<SyncResult> {
  let context: SyncContext | null;
  try {
    context = await loadSyncContext(userId);
  } catch (error) {
    console.error("Calendar sync could not start:", error);
    return { status: "failed", timeZone: null };
  }
  if (!context) return { status: "failed", timeZone: null };

  const recent =
    context.lastSyncedAt !== null &&
    now.getTime() - context.lastSyncedAt < STALE_AFTER_MS;
  if (recent) return { status: "fresh", timeZone: context.timeZone };

  return syncUser(userId, context, now);
}

export async function syncUser(
  userId: string,
  context: SyncContext,
  now = new Date(),
): Promise<SyncResult> {
  let timeZone = context.timeZone;

  try {
    if (!context.encryptedRefreshToken) {
      throw new CalendarAuthError("No Google permission is stored.");
    }
    let refreshToken: string;
    try {
      refreshToken = decryptToken(context.encryptedRefreshToken);
    } catch {
      // Usually TOKEN_ENCRYPTION_KEY was changed. Signing in again stores
      // a fresh permission encrypted with the new key.
      throw new CalendarAuthError("The stored permission could not be read.");
    }
    const provider = await createGoogleProvider(refreshToken);

    const calendars = await provider.listCalendars();
    await saveCalendars(userId, calendars);

    // First sync: take the time zone from the main Google calendar.
    const primary = calendars.find((c) => c.isPrimary);
    if (!isValidTimeZone(timeZone) && isValidTimeZone(primary?.timeZone)) {
      timeZone = primary.timeZone;
      await saveTimeZone(userId, timeZone);
    }

    const myEmails = [
      context.email ?? "",
      ...context.extraEmails,
      // The main calendar's id is the account's own address.
      ...(primary ? [primary.externalId] : []),
    ];
    const from = new Date(now.getTime() - DAYS_BACK * DAY_MS);
    const to = new Date(now.getTime() + DAYS_AHEAD * DAY_MS);

    for (const calendar of await getSelectedCalendars(userId)) {
      const [events, storedIds] = await Promise.all([
        provider.listEvents(calendar.externalId, from, to),
        getStoredEventIds(userId, calendar.id, from, to),
      ]);
      const plan = planCalendarSync(events, storedIds, {
        myEmails,
        includeSoloEvents: context.includeSoloEvents,
      });
      await upsertMeetings(userId, calendar.id, plan.keep);
      await markRemovedFromCalendar(userId, calendar.id, plan.removedIds);
    }

    await markSynced(userId, now);
    return { status: "synced", timeZone };
  } catch (error) {
    if (error instanceof CalendarAuthError) {
      console.warn("Calendar access lost:", error.message);
      await markDisconnected(userId).catch((e) =>
        console.error("Could not record the lost connection:", e),
      );
      return { status: "disconnected", timeZone };
    }
    // Google or the database had a hiccup: show what is already stored.
    console.error("Calendar sync failed:", error);
    return { status: "failed", timeZone };
  }
}
