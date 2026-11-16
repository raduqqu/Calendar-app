import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { syncIfStale, type SyncStatus } from "@/lib/calendar/sync";
import { getMeetingsBetween } from "@/lib/data/meetings";
import { getMyProfile } from "@/lib/data/profile";
import {
  addDays,
  dateKeyAt,
  FALLBACK_TIME_ZONE,
  isValidTimeZone,
  startOfDay,
} from "@/lib/time";
import type { Meeting } from "@/lib/types";

export interface DayData {
  dateKey: string;
  timeZone: string;
  dayStartMs: number;
  meetings: Meeting[];
  syncStatus: SyncStatus | "not-connected";
}

/**
 * Everything the Today screen needs for one day: refreshes the calendar if
 * needed, then loads that day's meetings in the user's time zone.
 */
export async function loadDay(requestedKey: string | null): Promise<DayData> {
  await connection();
  const profile = await getMyProfile();
  if (!profile) redirect("/");

  let syncStatus: DayData["syncStatus"] = "not-connected";
  let timeZone = profile.timeZone;
  if (profile.googleConnected) {
    const sync = await syncIfStale(profile.id);
    syncStatus = sync.status;
    timeZone = sync.timeZone ?? timeZone;
  }
  if (!isValidTimeZone(timeZone)) timeZone = FALLBACK_TIME_ZONE;

  const dateKey = requestedKey ?? dateKeyAt(Date.now(), timeZone);
  const dayStartMs = startOfDay(dateKey, timeZone);
  const dayEndMs = startOfDay(addDays(dateKey, 1), timeZone);
  const meetings = await getMeetingsBetween(
    new Date(dayStartMs).toISOString(),
    new Date(dayEndMs).toISOString(),
  );

  return { dateKey, timeZone, dayStartMs, meetings, syncStatus };
}
