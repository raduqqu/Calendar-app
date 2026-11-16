"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { skipMeetingAction } from "@/app/(app)/inbox/actions";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export interface InboxItem {
  id: string;
  title: string;
  /** "Sat 14 Nov · 16:30 – 20:00" */
  when: string;
  people: { id: string; name: string; hasNotes: boolean }[];
}

/** Meetings that have ended and still need a debrief, newest first. */
export function InboxList({ items }: { items: InboxItem[] }) {
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const visible = items.filter((item) => !skipped.has(item.id));

  function skip(id: string) {
    setError(null);
    // Hide it at once; bring it back if saving fails.
    setSkipped((set) => new Set(set).add(id));
    startTransition(async () => {
      const result = await skipMeetingAction(id);
      if (!result.ok) {
        setSkipped((set) => {
          const next = new Set(set);
          next.delete(id);
          return next;
        });
        setError("Could not skip. Please try again.");
      }
    });
  }

  if (visible.length === 0) {
    return (
      <EmptyState
        title="All caught up"
        description="Meetings waiting for a debrief will appear here."
      />
    );
  }

  return (
    <>
      {error && (
        <p role="alert" className="text-meta text-danger mb-3">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {visible.map((item) => (
          <li key={item.id}>
            <Card className="p-4">
              <h2 className="text-body truncate font-semibold">{item.title}</h2>
              <p className="text-meta text-ink-secondary">{item.when}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-1.5">
                  {item.people.slice(0, 5).map((person) => (
                    <Avatar
                      key={person.id}
                      name={person.name}
                      size="sm"
                      hasNotes={person.hasNotes}
                    />
                  ))}
                  {item.people.length > 5 && (
                    <span className="text-tiny text-ink-secondary font-medium">
                      +{item.people.length - 5}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => skip(item.id)}
                    aria-label={`Skip ${item.title}`}
                  >
                    Skip
                  </Button>
                  <Link
                    href={`/meetings/${item.id}?back=%2Finbox`}
                    aria-label={`Debrief ${item.title}`}
                    className="bg-primary hover:bg-primary-hover rounded-button text-meta inline-flex min-h-9 items-center px-3 font-medium text-white"
                  >
                    Debrief
                  </Link>
                </span>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
