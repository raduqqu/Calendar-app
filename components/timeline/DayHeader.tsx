import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  addDays,
  formatLongDate,
  parseDateKey,
  weekOf,
  weekdayInitial,
} from "@/lib/time";

interface DayHeaderProps {
  dateKey: string;
  todayKey: string;
}

const hrefFor = (key: string, todayKey: string) =>
  key === todayKey ? "/today" : `/today?date=${key}`;

const arrowClass =
  "text-ink-secondary hover:bg-subtle inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150";

/** Date title with previous / next arrows, a "Today" pill, and the week strip. */
export function DayHeader({ dateKey, todayKey }: DayHeaderProps) {
  const isToday = dateKey === todayKey;

  return (
    <header className="bg-background/95 sticky top-0 z-10 -mx-4 px-4 pt-4 pb-3 backdrop-blur">
      <div className="flex min-h-11 items-center justify-between gap-2">
        <h1 className="text-title">{formatLongDate(dateKey)}</h1>
        {!isToday && (
          <Link
            href="/today"
            className="bg-primary-light text-primary-hover text-meta inline-flex min-h-8 shrink-0 items-center rounded-full px-3 font-medium"
          >
            Today
          </Link>
        )}
      </div>

      <nav aria-label="Days" className="-mx-2 mt-2 flex items-center">
        <Link
          href={hrefFor(addDays(dateKey, -1), todayKey)}
          aria-label="Previous day"
          className={arrowClass}
        >
          <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
        </Link>
        <ul className="flex flex-1 justify-between">
          {weekOf(dateKey).map((key) => {
            const selected = key === dateKey;
            const today = key === todayKey;
            const circle = today
              ? "bg-primary text-white"
              : selected
                ? "bg-primary-light text-primary-hover"
                : "text-ink";
            return (
              <li key={key}>
                <Link
                  href={hrefFor(key, todayKey)}
                  aria-current={selected ? "date" : undefined}
                  aria-label={formatLongDate(key)}
                  className="flex min-h-11 w-9 flex-col items-center gap-1"
                >
                  <span className="text-tiny text-ink-secondary font-medium uppercase">
                    {weekdayInitial(key)}
                  </span>
                  <span
                    className={`text-meta inline-flex size-8 items-center justify-center rounded-full font-semibold tabular-nums ${circle} ${selected && today ? "ring-primary-light ring-4" : ""}`}
                  >
                    {parseDateKey(key).getDate()}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <Link
          href={hrefFor(addDays(dateKey, 1), todayKey)}
          aria-label="Next day"
          className={arrowClass}
        >
          <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </nav>
    </header>
  );
}
