import { HOUR_HEIGHT, layoutDay } from "@/lib/timeline/layout";
import { parseDateKey } from "@/lib/time";
import { displayStatus, type Meeting } from "@/lib/types";
import { MeetingCard } from "./MeetingCard";

/** Width of the hour labels on the left, and where the blue line sits. */
const GUTTER = 52;
const TALL_CARD = 104;

interface TimelineProps {
  dateKey: string;
  meetings: Meeting[];
  nowMs: number;
  isToday: boolean;
}

export function Timeline({ dateKey, meetings, nowMs, isToday }: TimelineProps) {
  const dayStartMs = parseDateKey(dateKey).getTime();
  const layout = layoutDay(meetings, dayStartMs);
  const hours = Array.from(
    { length: layout.endHour - layout.startHour + 1 },
    (_, i) => layout.startHour + i,
  );

  const minutesNow = (nowMs - dayStartMs) / 60_000;
  const nowTop = (minutesNow - layout.startHour * 60) * (HOUR_HEIGHT / 60);
  const showNow = isToday && nowTop >= 0 && nowTop <= layout.height;

  return (
    <div className="relative mt-2 mb-4" style={{ height: layout.height + 16 }}>
      {/* Hour labels and faint hour lines */}
      <div aria-hidden="true">
        {hours.map((hour) => (
          <div
            key={hour}
            className="absolute inset-x-0 flex items-center"
            style={{ top: (hour - layout.startHour) * HOUR_HEIGHT - 9 }}
          >
            <span
              className="text-meta text-ink-secondary shrink-0 tabular-nums"
              style={{ width: GUTTER - 12 }}
            >
              {String(hour % 24).padStart(2, "0")}:00
            </span>
            <span className="bg-border ml-3 h-px flex-1" />
          </div>
        ))}
      </div>

      {/* The thin blue line the meetings hang from */}
      <div
        aria-hidden="true"
        className="bg-primary/30 absolute top-0 w-0.5 rounded-full"
        style={{ left: GUTTER - 1, height: layout.height }}
      />

      <ol
        className="absolute inset-y-0 right-0"
        style={{ left: GUTTER + 10 }}
        aria-label="Meetings"
      >
        {layout.items.map(({ meeting, top, height, column, columns }) => (
          <li
            key={meeting.id}
            className="absolute pr-0.5"
            style={{
              top,
              height,
              left: `${(column / columns) * 100}%`,
              width: `${100 / columns}%`,
              paddingLeft: column > 0 ? 4 : 0,
            }}
          >
            {column === 0 && (
              <span
                aria-hidden="true"
                className="border-primary bg-surface absolute top-3 size-2.5 rounded-full border-2"
                style={{ left: -15 }}
              />
            )}
            <MeetingCard
              meeting={meeting}
              status={displayStatus(meeting, nowMs)}
              tall={height >= TALL_CARD}
              narrow={columns > 1}
            />
          </li>
        ))}
      </ol>

      {showNow && (
        <div
          className="pointer-events-none absolute right-0 z-10 flex items-center"
          style={{ top: nowTop - 4, left: GUTTER - 5 }}
          role="img"
          aria-label="Current time"
        >
          <span className="bg-danger size-2.5 rounded-full" />
          <span className="bg-danger h-px flex-1" />
        </div>
      )}
    </div>
  );
}
