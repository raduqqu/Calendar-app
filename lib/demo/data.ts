/**
 * Sample data for milestone 1 only. Everything here is invented.
 * It is replaced by real calendar data in milestone 2 and then deleted.
 */
import { addDays, parseDateKey, toDateKey } from "@/lib/time";
import { displayStatus, type Meeting, type PersonSummary } from "@/lib/types";

const people = {
  ana: {
    id: "p-ana",
    name: "Ana Popescu",
    organization: "Northwind Capital",
    noteCount: 4,
    lastMetDaysAgo: 2,
  },
  marco: {
    id: "p-marco",
    name: "Marco Bianchi",
    organization: "Tessera Labs",
    noteCount: 2,
    lastMetDaysAgo: 9,
  },
  elena: {
    id: "p-elena",
    name: "Elena Rossi",
    organization: "Politecnico di Milano",
    noteCount: 6,
    lastMetDaysAgo: 21,
  },
  david: {
    id: "p-david",
    name: "David Chen",
    organization: "Harbor Ventures",
    noteCount: 0,
  },
  ioana: {
    id: "p-ioana",
    name: "Ioana Marin",
    organization: "Founders Club Bucharest",
    noteCount: 1,
    lastMetDaysAgo: 34,
  },
  sofia: {
    id: "p-sofia",
    name: "Sofia Greco",
    organization: "Tessera Labs",
    noteCount: 0,
  },
  tom: {
    id: "p-tom",
    name: "Tom Becker",
    noteCount: 3,
    lastMetDaysAgo: 5,
  },
} satisfies Record<string, PersonSummary>;

interface Template {
  slug: string;
  title: string;
  /** Start and end as minutes after midnight. */
  start: number;
  end: number;
  who: PersonSummary[];
  /** Already debriefed once the meeting is over. */
  debriefed?: boolean;
}

const at = (hour: number, minute = 0) => hour * 60 + minute;

/** Index 0 = Sunday … 6 = Saturday. Weekends are empty to show the empty state. */
const week: Template[][] = [
  [],
  [
    {
      slug: "sync",
      title: "Weekly sync",
      start: at(9, 30),
      end: at(10),
      who: [people.marco, people.sofia],
      debriefed: true,
    },
    {
      slug: "intro",
      title: "Intro: Northwind Capital",
      start: at(11),
      end: at(12),
      who: [people.ana],
    },
    {
      slug: "thesis",
      title: "Thesis check-in",
      start: at(15),
      end: at(15, 45),
      who: [people.elena],
    },
  ],
  [
    {
      slug: "coffee",
      title: "Coffee with Tom",
      start: at(8, 30),
      end: at(9, 15),
      who: [people.tom],
      debriefed: true,
    },
    {
      slug: "partners",
      title: "Event partners call",
      start: at(13),
      end: at(14),
      who: [people.ioana, people.david, people.sofia],
    },
  ],
  [
    {
      slug: "standup",
      title: "Product stand-up",
      start: at(9),
      end: at(9, 30),
      who: [people.marco, people.sofia],
      debriefed: true,
    },
    {
      slug: "pitch",
      title: "Pitch practice with Ana",
      start: at(11),
      end: at(12),
      who: [people.ana],
    },
    {
      slug: "harbor",
      title: "Harbor Ventures: first call",
      start: at(14),
      end: at(14, 30),
      who: [people.david],
    },
    {
      slug: "office-hours",
      title: "Office hours",
      start: at(16, 30),
      end: at(18),
      who: [people.elena, people.tom],
    },
    {
      slug: "dinner",
      title: "Founders dinner",
      start: at(20),
      end: at(21, 30),
      who: [people.ioana, people.marco, people.ana, people.tom],
    },
  ],
  [
    {
      slug: "review",
      title: "Deck review",
      start: at(10),
      end: at(11),
      who: [people.ana, people.marco],
    },
    {
      slug: "catchup",
      title: "Catch-up with Ioana",
      start: at(10, 30),
      end: at(11, 15),
      who: [people.ioana],
    },
    {
      slug: "lab",
      title: "Lab visit",
      start: at(15),
      end: at(17),
      who: [people.elena],
    },
  ],
  [
    {
      slug: "retro",
      title: "Week retro",
      start: at(9, 30),
      end: at(10, 15),
      who: [people.marco, people.sofia],
      debriefed: true,
    },
    {
      slug: "lunch",
      title: "Lunch with Tom",
      start: at(12, 30),
      end: at(13, 30),
      who: [people.tom],
    },
  ],
  [],
];

export function getDemoMeetings(dateKey: string, nowMs: number): Meeting[] {
  const day = parseDateKey(dateKey);
  return week[day.getDay()].map((t) => {
    const startsAt = new Date(day.getTime() + t.start * 60_000);
    const endsAt = new Date(day.getTime() + t.end * 60_000);
    const over = endsAt.getTime() <= nowMs;
    return {
      id: `${dateKey}-${t.slug}`,
      title: t.title,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      status: over && t.debriefed ? "debriefed" : "open",
      participants: t.who,
    };
  });
}

/** Ended meetings from the last few days that still need a debrief, newest first. */
export function getDemoPending(nowMs: number): Meeting[] {
  const today = toDateKey(new Date(nowMs));
  const pending: Meeting[] = [];
  for (let back = 0; back <= 3; back++) {
    for (const meeting of getDemoMeetings(addDays(today, -back), nowMs)) {
      if (displayStatus(meeting, nowMs) === "pending") pending.push(meeting);
    }
  }
  return pending.sort((a, b) => b.endsAt.localeCompare(a.endsAt));
}

/** Everyone, most recently met first; people never met go last. */
export function getDemoPeople(): PersonSummary[] {
  const all: PersonSummary[] = Object.values(people);
  return all.sort(
    (a, b) =>
      (a.lastMetDaysAgo ?? Number.MAX_SAFE_INTEGER) -
      (b.lastMetDaysAgo ?? Number.MAX_SAFE_INTEGER),
  );
}
