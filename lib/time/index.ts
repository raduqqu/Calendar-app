/**
 * Date helpers for the screens.
 *
 * For now these use the device's own time zone. From milestone 2 the user's
 * saved time zone is used instead, and these helpers get tests.
 *
 * A "date key" is a calendar day written as YYYY-MM-DD, e.g. "2026-11-11".
 */

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_KEY.test(value)) return false;
  return toDateKey(parseDateKey(value)) === value;
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Midnight (device time) at the start of the given day. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** The seven date keys (Monday to Sunday) of the week containing `key`. */
export function weekOf(key: string): string[] {
  const date = parseDateKey(key);
  const mondayOffset = (date.getDay() + 6) % 7;
  const monday = addDays(key, -mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** "Wednesday, 11 November" */
export function formatLongDate(key: string): string {
  const date = parseDateKey(key);
  const weekday = date.toLocaleDateString("en-GB", { weekday: "long" });
  const rest = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });
  return `${weekday}, ${rest}`;
}

/** "Wed 11 Nov" */
export function formatShortDate(key: string): string {
  return parseDateKey(key).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Single letter for the week strip: M T W T F S S */
export function weekdayInitial(key: string): string {
  return parseDateKey(key)
    .toLocaleDateString("en-GB", { weekday: "short" })
    .charAt(0);
}

/** "09:30" (24-hour clock) */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTimeRange(startIso: string, endIso: string): string {
  return `${formatTime(startIso)} – ${formatTime(endIso)}`;
}

/** "today", "yesterday", "3 days ago", "2 weeks ago", "4 months ago" */
export function formatDaysAgo(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}
