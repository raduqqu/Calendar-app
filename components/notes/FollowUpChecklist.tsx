"use client";

import { useState, useTransition } from "react";
import { setFollowUpDoneAction } from "@/app/(app)/people/actions";

interface Item {
  id: string;
  text: string;
  done: boolean;
}

/**
 * Follow-ups as checkboxes. Ticking one saves straight away; if saving
 * fails the tick is undone and a short message is shown.
 */
export function FollowUpChecklist({ items }: { items: Item[] }) {
  const [state, setState] = useState(items);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(id: string, done: boolean) {
    setError(null);
    setState((list) => list.map((f) => (f.id === id ? { ...f, done } : f)));
    startTransition(async () => {
      const result = await setFollowUpDoneAction(id, done);
      if (!result.ok) {
        setState((list) =>
          list.map((f) => (f.id === id ? { ...f, done: !done } : f)),
        );
        setError(result.error);
      }
    });
  }

  return (
    <>
      <ul className="divide-border divide-y">
        {state.map((item) => (
          <li key={item.id}>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2">
              <input
                type="checkbox"
                checked={item.done}
                onChange={(event) => toggle(item.id, event.target.checked)}
                className="accent-primary size-5 shrink-0"
              />
              <span
                className={`text-body ${item.done ? "text-ink-secondary line-through" : ""}`}
              >
                {item.text}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-meta text-danger px-4 pb-3">
          {error}
        </p>
      )}
    </>
  );
}
