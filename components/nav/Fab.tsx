"use client";

import { CalendarPlus, Plus, StickyNote } from "lucide-react";
import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";

const options = [
  {
    icon: CalendarPlus,
    title: "Manual meeting",
    description: "A call or chance encounter that was not in your calendar.",
  },
  {
    icon: StickyNote,
    title: "Quick note",
    description: "Jot something down about a person, no meeting needed.",
  },
];

/** The round blue "+" button that floats above the tab bar. */
export function Fab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add a meeting or note"
        className="bg-primary hover:bg-primary-hover fixed right-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 inline-flex size-14 items-center justify-center rounded-full text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] transition-colors duration-150 md:right-8 md:bottom-8"
      >
        <Plus size={24} strokeWidth={2} aria-hidden="true" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Add">
        <ul className="flex flex-col gap-2 pb-2">
          {options.map(({ icon: Icon, title, description }) => (
            <li key={title}>
              <button
                type="button"
                disabled
                className="rounded-card border-border flex w-full items-center gap-3 border p-3 text-left disabled:opacity-60"
              >
                <span className="bg-primary-light text-primary-hover inline-flex size-10 shrink-0 items-center justify-center rounded-full">
                  <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span>
                  <span className="text-body block font-medium">{title}</span>
                  <span className="text-meta text-ink-secondary block">
                    {description}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="text-meta text-ink-secondary pb-2">
          These switch on in step 3, when notes can be saved.
        </p>
      </Sheet>
    </>
  );
}
