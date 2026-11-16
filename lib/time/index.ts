/**
 * Date and time helpers. Two kinds of values are used in the app:
 *
 *  - A "date key" is a calendar day written as YYYY-MM-DD ("2026-11-17").
 *    It has no time zone, so maths on it (next day, which weekday) is plain
 *    calendar maths and gives the same answer everywhere.
 *  - An instant is a moment in time (milliseconds, or an ISO string in UTC,
 *    which is how the database stores times). Turning an instant into a day
 *    or a clock time always needs a time zone: an IANA name such as
 *    "Europe/Bucharest". Nothing here uses the device's own zone by accident.
 */

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export const FALLBACK_TIME_ZONE = "UTC";

// ---------------------------------------------------------------------------
// Date keys
// ---------------------------------------------------------------------------

/** Noon UTC on that day: safe for calendar maths, never slips to another day. */
function keyToUtc(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

function utcToKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_KEY.test(value)) return false;
  return utcToKey(keyToUtc(value)) === value;
}

export function addDays(key: string, days: number): string {
  return utcToKey(new Date(keyToUtc(key).getTime() + days * DAY_MS));
}

/** 0 = Sunday … 6 = Saturday */
export function dayOfWeek(key: string): number {
  return keyToUtc(key).getUTCDay();
}

export function dayOfMonth(key: string): number {
  return keyToUtc(key).getUTCDate();
}

/** The seven date keys (Monday to Sunday) of the week containing `key`. */
export function weekOf(key: string): string[] {
  const monday = addDays(key, -((dayOfWeek(key) + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function formatKey(key: string, options: Intl.DateTimeFormatOptions): string {
  return keyToUtc(key).toLocaleDateString("en-GB", {
    ...options,
    timeZone: "UTC",
  });
}

/** "Wednesday, 11 November" */
export function formatLongDate(key: string): string {
  return `${formatKey(key, { weekday: "long" })}, ${formatKey(key, { day: "numeric", month: "long" })}`;
}

/** "Wed 11 Nov" */
export function formatShortDate(key: string): string {
  return formatKey(key, { weekday: "short", day: "numeric", month: "short" });
}

/** Single letter for the week strip: M T W T F S S */
export function weekdayInitial(key: string): string {
  return formatKey(key, { weekday: "short" }).charAt(0);
}

// ---------------------------------------------------------------------------
// Time zones
// ---------------------------------------------------------------------------

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** The time zone the device says it is in. */
export function deviceTimeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimeZone(zone) ? zone : FALLBACK_TIME_ZONE;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const partFormatters = new Map<string, Intl.DateTimeFormat>();

/** What a wall clock in `timeZone` shows at the instant `ms`. */
function wallClock(ms: number, timeZone: string): WallClock {
  let formatter = partFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partFormatters.set(timeZone, formatter);
  }
  const parts: Record<string, number> = {};
  for (const part of formatter.formatToParts(new Date(ms))) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return parts as unknown as WallClock;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The calendar day it is in `timeZone` at the instant `ms`. */
export function dateKeyAt(ms: number, timeZone: string): string {
  const w = wallClock(ms, timeZone);
  return `${w.year}-${pad(w.month)}-${pad(w.day)}`;
}

/** How far `timeZone` is ahead of UTC at the instant `ms` (e.g. +2h). */
function offsetAt(ms: number, timeZone: string): number {
  const w = wallClock(ms, timeZone);
  const wallAsUtc = Date.UTC(
    w.year,
    w.month - 1,
    w.day,
    w.hour,
    w.minute,
    w.second,
  );
  return wallAsUtc - Math.floor(ms / 1000) * 1000;
}

/**
 * The instant midnight starts on day `key` in `timeZone`.
 * Correct on summer/winter time change days too (those days are 23 or 25
 * hours long, so "start + 24 hours" would be wrong there).
 */
export function startOfDay(key: string, timeZone: string): number {
  const [y, m, d] = key.split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d);
  let instant = wall - offsetAt(wall, timeZone);
  const corrected = wall - offsetAt(instant, timeZone);
  if (corrected !== instant) instant = corrected;
  return instant;
}

const timeFormatters = new Map<string, Intl.DateTimeFormat>();

/** "09:30" (24-hour clock) in `timeZone` */
export function formatTime(instant: string | number, timeZone: string): string {
  let formatter = timeFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    timeFormatters.set(timeZone, formatter);
  }
  return formatter.format(new Date(instant));
}

export function formatTimeRange(
  start: string | number,
  end: string | number,
  timeZone: string,
): string {
  return `${formatTime(start, timeZone)} – ${formatTime(end, timeZone)}`;
}

/** "today", "yesterday", "3 days ago", "2 weeks ago", "4 months ago" */
export function formatDaysAgo(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}
