/**
 * Works out where each meeting card sits on the day timeline.
 * Pure maths, no screen code, so it can be tested on its own.
 */
import type { Meeting } from "@/lib/types";

/** Height of one hour on screen, in pixels. */
export const HOUR_HEIGHT = 88;
/** Short meetings still get a card tall enough to read and tap. */
export const MIN_CARD_HEIGHT = 64;
/** Space left between a card and the next hour line. */
const CARD_GAP = 4;

export interface PlacedMeeting {
  meeting: Meeting;
  /** Pixels from the top of the timeline. */
  top: number;
  height: number;
  /** When meetings overlap they sit side by side: column 0, 1, … */
  column: number;
  columns: number;
}

export interface DayLayout {
  startHour: number;
  endHour: number;
  height: number;
  items: PlacedMeeting[];
}

const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 19;

export function layoutDay(meetings: Meeting[], dayStartMs: number): DayLayout {
  const minutesIntoDay = (iso: string) =>
    (new Date(iso).getTime() - dayStartMs) / 60_000;

  const sorted = [...meetings].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  );

  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;
  for (const m of sorted) {
    startHour = Math.min(
      startHour,
      Math.floor(minutesIntoDay(m.startsAt) / 60),
    );
    endHour = Math.max(endHour, Math.ceil(minutesIntoDay(m.endsAt) / 60));
  }
  startHour = Math.max(0, startHour);
  endHour = Math.min(24, endHour);

  const pxPerMinute = HOUR_HEIGHT / 60;
  const items: PlacedMeeting[] = sorted.map((meeting) => {
    const start = Math.max(minutesIntoDay(meeting.startsAt), startHour * 60);
    const end = Math.min(minutesIntoDay(meeting.endsAt), endHour * 60);
    return {
      meeting,
      top: (start - startHour * 60) * pxPerMinute,
      height: Math.max(MIN_CARD_HEIGHT, (end - start) * pxPerMinute - CARD_GAP),
      column: 0,
      columns: 1,
    };
  });

  // Group cards that touch each other on screen, then give each card in a
  // group the first free column.
  let group: PlacedMeeting[] = [];
  let groupBottom = -Infinity;
  const closeGroup = () => {
    const columns = Math.max(0, ...group.map((i) => i.column)) + 1;
    for (const item of group) item.columns = columns;
    group = [];
  };
  for (const item of items) {
    if (group.length > 0 && item.top >= groupBottom) closeGroup();
    const columnBottoms: number[] = [];
    for (const other of group) {
      columnBottoms[other.column] = Math.max(
        columnBottoms[other.column] ?? -Infinity,
        other.top + other.height,
      );
    }
    let column = columnBottoms.findIndex((bottom) => bottom <= item.top);
    if (column === -1) column = columnBottoms.length;
    item.column = column;
    group.push(item);
    groupBottom = Math.max(groupBottom, item.top + item.height);
  }
  if (group.length > 0) closeGroup();

  // Make sure a card that was stretched to the minimum height is not cut off.
  const lastBottom = Math.max(0, ...items.map((i) => i.top + i.height));
  const height = Math.max((endHour - startHour) * HOUR_HEIGHT, lastBottom);

  return { startHour, endHour, height, items };
}
