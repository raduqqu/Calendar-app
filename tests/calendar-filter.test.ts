import { describe, expect, it } from "vitest";
import {
  otherAttendees,
  planCalendarSync,
  skipReason,
} from "@/lib/calendar/filter";
import { fromGoogleEvent } from "@/lib/calendar/google";
import type { ProviderAttendee, ProviderEvent } from "@/lib/calendar/types";

const me = "me@example.com";
const options = {
  myEmails: [me, "Me.Work@Firm.com"],
  includeSoloEvents: false,
};

function person(
  email: string,
  extra: Partial<ProviderAttendee> = {},
): ProviderAttendee {
  return {
    email,
    name: null,
    self: false,
    resource: false,
    response: "accepted",
    ...extra,
  };
}

function event(extra: Partial<ProviderEvent> = {}): ProviderEvent {
  return {
    externalId: "evt1",
    title: "Coffee",
    cancelled: false,
    allDay: false,
    startsAt: "2026-11-17T08:00:00.000Z",
    endsAt: "2026-11-17T09:00:00.000Z",
    eventType: "default",
    attendees: [person(me, { self: true }), person("ana@firm.com")],
    ...extra,
  };
}

describe("which events become meetings", () => {
  it("keeps a normal meeting with someone else", () => {
    expect(skipReason(event(), options)).toBeNull();
  });

  it("skips cancelled and all-day events", () => {
    expect(skipReason(event({ cancelled: true }), options)).toBe("cancelled");
    expect(
      skipReason(
        event({ allDay: true, startsAt: null, endsAt: null }),
        options,
      ),
    ).toBe("all-day");
  });

  it("skips focus time, out of office, working location and birthdays", () => {
    for (const eventType of [
      "focusTime",
      "outOfOffice",
      "workingLocation",
      "birthday",
    ]) {
      expect(skipReason(event({ eventType }), options)).toBe("not-a-meeting");
    }
  });

  it("skips meetings I declined", () => {
    const declined = event({
      attendees: [
        person(me, { self: true, response: "declined" }),
        person("ana@firm.com"),
      ],
    });
    expect(skipReason(declined, options)).toBe("declined");
  });

  it("notices a decline from one of my other addresses", () => {
    const declined = event({
      attendees: [
        person("me.work@firm.com", { response: "declined" }),
        person("ana@firm.com"),
      ],
    });
    expect(skipReason(declined, options)).toBe("declined");
  });

  it("skips solo events unless they are switched on", () => {
    const solo = event({ attendees: [] });
    expect(skipReason(solo, options)).toBe("solo");
    expect(
      skipReason(solo, { ...options, includeSoloEvents: true }),
    ).toBeNull();
  });

  it("treats me plus a meeting room as solo", () => {
    const withRoom = event({
      attendees: [
        person(me, { self: true }),
        person("c_1888abc@resource.calendar.google.com"),
        person("room-4@firm.com", { resource: true }),
      ],
    });
    expect(skipReason(withRoom, options)).toBe("solo");
  });
});

describe("who counts as an attendee", () => {
  it("drops me, my other addresses, rooms and group calendars", () => {
    const mixed = event({
      attendees: [
        person(me, { self: true }),
        person("me.work@firm.com"),
        person("ana@firm.com", { name: "Ana Popescu" }),
        person("ANA@firm.com"),
        person("team@group.calendar.google.com"),
        person("room@firm.com", { resource: true }),
        person("marco@lab.it"),
      ],
    });
    expect(otherAttendees(mixed, options.myEmails)).toEqual([
      { email: "ana@firm.com", name: "Ana Popescu" },
      { email: "marco@lab.it", name: null },
    ]);
  });
});

describe("planning a sync", () => {
  it("saves kept events and flags stored ones that disappeared", () => {
    const events = [
      event({ externalId: "keep" }),
      event({
        externalId: "declined-now",
        attendees: [
          person(me, { self: true, response: "declined" }),
          person("ana@firm.com"),
        ],
      }),
    ];
    const plan = planCalendarSync(
      events,
      ["keep", "declined-now", "deleted-in-google"],
      options,
    );
    expect(plan.keep.map((m) => m.externalEventId)).toEqual(["keep"]);
    expect(plan.removedIds).toEqual(["declined-now", "deleted-in-google"]);
  });
});

describe("reading Google's format", () => {
  it("translates a timed event", () => {
    const translated = fromGoogleEvent({
      id: "abc_20261117T080000Z",
      status: "confirmed",
      summary: "  Weekly sync ",
      start: { dateTime: "2026-11-17T10:00:00+02:00" },
      end: { dateTime: "2026-11-17T10:30:00+02:00" },
      attendees: [
        { email: "Me@Example.com", self: true, responseStatus: "accepted" },
        { email: "ana@firm.com", displayName: "Ana" },
      ],
    });
    expect(translated).toMatchObject({
      externalId: "abc_20261117T080000Z",
      title: "Weekly sync",
      allDay: false,
      startsAt: "2026-11-17T08:00:00.000Z",
      endsAt: "2026-11-17T08:30:00.000Z",
      eventType: "default",
    });
    expect(translated.attendees[0]).toMatchObject({
      email: "me@example.com",
      self: true,
    });
  });

  it("recognises all-day events and missing titles", () => {
    const translated = fromGoogleEvent({
      id: "x",
      start: { date: "2026-11-17" },
      end: { date: "2026-11-18" },
    });
    expect(translated.allDay).toBe(true);
    expect(translated.startsAt).toBeNull();
    expect(translated.title).toBe("(No title)");
  });
});
