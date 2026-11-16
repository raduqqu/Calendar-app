import { describe, expect, it } from "vitest";
import {
  addDays,
  dateKeyAt,
  dayOfWeek,
  formatLongDate,
  formatTime,
  isDateKey,
  isValidTimeZone,
  startOfDay,
  weekOf,
} from "@/lib/time";

const HOUR = 3_600_000;

describe("date keys", () => {
  it("adds days across months and years", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("starts the week on Monday", () => {
    expect(weekOf("2026-11-11")).toEqual([
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
    ]);
    expect(weekOf("2026-11-15")[0]).toBe("2026-11-09");
    expect(dayOfWeek("2026-11-15")).toBe(0);
  });

  it("rejects dates that do not exist", () => {
    expect(isDateKey("2026-11-11")).toBe(true);
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("11/11/2026")).toBe(false);
  });

  it("formats a long date", () => {
    expect(formatLongDate("2026-11-11")).toBe("Wednesday, 11 November");
  });
});

describe("time zones", () => {
  // 22:30 UTC on 16 November 2026
  const lateEvening = Date.UTC(2026, 10, 16, 22, 30);

  it("gives the day as seen in the user's time zone", () => {
    expect(dateKeyAt(lateEvening, "UTC")).toBe("2026-11-16");
    expect(dateKeyAt(lateEvening, "Europe/Bucharest")).toBe("2026-11-17");
    expect(dateKeyAt(lateEvening, "America/New_York")).toBe("2026-11-16");
  });

  it("finds midnight in the user's time zone", () => {
    expect(startOfDay("2026-11-17", "Europe/Bucharest")).toBe(
      Date.UTC(2026, 10, 16, 22, 0),
    );
    expect(startOfDay("2026-11-17", "America/New_York")).toBe(
      Date.UTC(2026, 10, 17, 5, 0),
    );
  });

  it("handles the short and the long day when clocks change", () => {
    const zone = "Europe/Bucharest";
    // Clocks go forward on 29 March 2026: that day has 23 hours.
    expect(
      startOfDay("2026-03-30", zone) - startOfDay("2026-03-29", zone),
    ).toBe(23 * HOUR);
    // Clocks go back on 25 October 2026: that day has 25 hours.
    expect(
      startOfDay("2026-10-26", zone) - startOfDay("2026-10-25", zone),
    ).toBe(25 * HOUR);
  });

  it("shows clock times in the user's time zone", () => {
    const iso = "2026-11-17T08:00:00.000Z";
    expect(formatTime(iso, "Europe/Bucharest")).toBe("10:00");
    expect(formatTime(iso, "Europe/Rome")).toBe("09:00");
    expect(formatTime(iso, "UTC")).toBe("08:00");
  });

  it("recognises real time zone names", () => {
    expect(isValidTimeZone("Europe/Bucharest")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(isValidTimeZone(null)).toBe(false);
  });
});
