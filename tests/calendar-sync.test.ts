import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncContext } from "@/lib/data/calendarSync";

// Replace the database layer, the token decryption and Google with fakes,
// so the sync's decisions can be checked without any network.
const store = vi.hoisted(() => ({
  loadSyncContext: vi.fn(),
  saveCalendars: vi.fn(),
  getSelectedCalendars: vi.fn(),
  getStoredEventIds: vi.fn(),
  upsertMeetings: vi.fn(),
  markRemovedFromCalendar: vi.fn(),
  saveTimeZone: vi.fn(),
  markSynced: vi.fn(),
  markDisconnected: vi.fn(),
}));
const google = vi.hoisted(() => ({
  listCalendars: vi.fn(),
  listEvents: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/data/calendarSync", () => store);
const crypto = vi.hoisted(() => ({ decryptToken: vi.fn() }));
vi.mock("@/lib/crypto/tokens", () => crypto);
vi.mock("@/lib/calendar/google", () => ({
  createGoogleProvider: google.create,
}));

const { syncIfStale, syncUser } = await import("@/lib/calendar/sync");
const { CalendarAuthError } = await import("@/lib/calendar/types");

const now = new Date("2026-11-17T10:00:00Z");

const context = (extra: Partial<SyncContext> = {}): SyncContext => ({
  email: "me@example.com",
  extraEmails: [],
  timeZone: null,
  includeSoloEvents: false,
  lastSyncedAt: null,
  encryptedRefreshToken: "v1.x.y.z",
  ...extra,
});

const meeting = (id: string, withOthers = true) => ({
  externalId: id,
  title: id,
  cancelled: false,
  allDay: false,
  startsAt: "2026-11-17T08:00:00.000Z",
  endsAt: "2026-11-17T09:00:00.000Z",
  eventType: "default",
  attendees: withOthers
    ? [
        {
          email: "me@example.com",
          name: null,
          self: true,
          resource: false,
          response: "accepted" as const,
        },
        {
          email: "ana@firm.com",
          name: "Ana",
          self: false,
          resource: false,
          response: "accepted" as const,
        },
      ]
    : [],
});

beforeEach(() => {
  vi.clearAllMocks();
  // Like the real database functions, every fake returns a promise.
  for (const fn of Object.values(store)) fn.mockResolvedValue(undefined);
  crypto.decryptToken.mockReturnValue("refresh");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  google.create.mockResolvedValue({
    id: "google",
    listCalendars: google.listCalendars,
    listEvents: google.listEvents,
  });
  google.listCalendars.mockResolvedValue([
    {
      externalId: "me@example.com",
      name: "Me",
      isPrimary: true,
      timeZone: "Europe/Bucharest",
    },
  ]);
  store.getSelectedCalendars.mockResolvedValue([
    { id: "cal-1", externalId: "me@example.com" },
  ]);
  store.getStoredEventIds.mockResolvedValue(["gone"]);
  google.listEvents.mockResolvedValue([
    meeting("keep"),
    meeting("solo", false),
  ]);
});

describe("calendar sync", () => {
  it("saves real meetings, flags deleted ones and learns the time zone", async () => {
    const result = await syncUser("u1", context(), now);

    expect(result).toEqual({ status: "synced", timeZone: "Europe/Bucharest" });
    expect(store.saveTimeZone).toHaveBeenCalledWith("u1", "Europe/Bucharest");
    const saved = store.upsertMeetings.mock.calls[0][2];
    expect(
      saved.map((m: { externalEventId: string }) => m.externalEventId),
    ).toEqual(["keep"]);
    expect(saved[0].attendees).toEqual([
      { email: "ana@firm.com", name: "Ana" },
    ]);
    expect(store.markRemovedFromCalendar).toHaveBeenCalledWith("u1", "cal-1", [
      "gone",
    ]);
    expect(store.markSynced).toHaveBeenCalledWith("u1", now);
  });

  it("asks Google for 7 days back to 14 days ahead", async () => {
    await syncUser("u1", context(), now);
    const [, from, to] = google.listEvents.mock.calls[0];
    expect(from.toISOString()).toBe("2026-11-10T10:00:00.000Z");
    expect(to.toISOString()).toBe("2026-12-01T10:00:00.000Z");
  });

  it("keeps a time zone the user already has", async () => {
    const result = await syncUser(
      "u1",
      context({ timeZone: "Europe/Rome" }),
      now,
    );
    expect(result.timeZone).toBe("Europe/Rome");
    expect(store.saveTimeZone).not.toHaveBeenCalled();
  });

  it("marks the calendar as disconnected when Google refuses access", async () => {
    google.create.mockRejectedValue(new CalendarAuthError("revoked"));
    const result = await syncUser("u1", context(), now);
    expect(result.status).toBe("disconnected");
    expect(store.markDisconnected).toHaveBeenCalledWith("u1");
    expect(store.markSynced).not.toHaveBeenCalled();
  });

  it("treats a missing stored permission as disconnected", async () => {
    const result = await syncUser(
      "u1",
      context({ encryptedRefreshToken: null }),
      now,
    );
    expect(result.status).toBe("disconnected");
    expect(google.create).not.toHaveBeenCalled();
  });

  it("asks to reconnect when the stored permission cannot be decrypted", async () => {
    crypto.decryptToken.mockImplementation(() => {
      throw new Error("bad key");
    });
    const result = await syncUser("u1", context(), now);
    expect(result.status).toBe("disconnected");
    expect(store.markDisconnected).toHaveBeenCalledWith("u1");
  });

  it("reports a temporary failure without disconnecting", async () => {
    google.listEvents.mockRejectedValue(new Error("Google is down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await syncUser("u1", context(), now);
    expect(result.status).toBe("failed");
    expect(store.markDisconnected).not.toHaveBeenCalled();
  });

  it("does not ask Google again within two minutes", async () => {
    store.loadSyncContext.mockResolvedValue(
      context({
        lastSyncedAt: now.getTime() - 60_000,
        timeZone: "Europe/Rome",
      }),
    );
    const result = await syncIfStale("u1", now);
    expect(result).toEqual({ status: "fresh", timeZone: "Europe/Rome" });
    expect(google.create).not.toHaveBeenCalled();
  });

  it("asks again once the last read is older than two minutes", async () => {
    store.loadSyncContext.mockResolvedValue(
      context({ lastSyncedAt: now.getTime() - 3 * 60_000 }),
    );
    const result = await syncIfStale("u1", now);
    expect(result.status).toBe("synced");
  });
});
