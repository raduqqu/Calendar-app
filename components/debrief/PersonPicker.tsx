"use client";

import { Plus, Search, UserPlus } from "lucide-react";
import { useId, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type { PersonOption } from "@/lib/types";

const MAX_RESULTS = 6;

interface PersonPickerProps {
  people: PersonOption[];
  /** Ids already chosen, hidden from the results. */
  excludeIds: Set<string>;
  onPickExisting: (person: PersonOption) => void;
  onCreate: (name: string) => void;
  onClose: () => void;
}

/** Search box under the chips: pick someone from People or create a new person. */
export function PersonPicker({
  people,
  excludeIds,
  onPickExisting,
  onCreate,
  onClose,
}: PersonPickerProps) {
  const [query, setQuery] = useState("");
  const listId = useId();
  const needle = query.trim().toLowerCase();

  const matches = people
    .filter((p) => !excludeIds.has(p.id))
    .filter(
      (p) =>
        !needle ||
        p.name.toLowerCase().includes(needle) ||
        (p.organization ?? "").toLowerCase().includes(needle) ||
        p.emails.some((e) => e.includes(needle)),
    )
    .slice(0, MAX_RESULTS);
  const exactMatch = people.some((p) => p.name.toLowerCase() === needle);
  const canCreate = needle.length > 0 && !exactMatch;

  function chooseFirst() {
    if (matches[0] && (needle || !canCreate)) onPickExisting(matches[0]);
    else if (canCreate) onCreate(query.trim());
  }

  const optionClass =
    "hover:bg-subtle flex min-h-11 w-full items-center gap-3 px-3 text-left";

  return (
    <div className="rounded-card border-border bg-surface shadow-soft mt-2 overflow-hidden border">
      <label className="border-border flex min-h-11 items-center gap-2 border-b px-3">
        <Search
          size={18}
          strokeWidth={1.75}
          className="text-ink-secondary shrink-0"
          aria-hidden="true"
        />
        <span className="sr-only">Find or add a person</span>
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              chooseFirst();
            }
            if (event.key === "Escape") onClose();
          }}
          placeholder="Type a name"
          aria-controls={listId}
          className="text-body placeholder:text-ink-tertiary w-full bg-transparent outline-none"
        />
      </label>
      <ul id={listId} className="max-h-72 overflow-y-auto py-1">
        {matches.map((person) => (
          <li key={person.id}>
            <button
              type="button"
              className={optionClass}
              onClick={() => onPickExisting(person)}
            >
              <Avatar name={person.name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="text-body block truncate">{person.name}</span>
                {(person.organization || person.emails[0]) && (
                  <span className="text-meta text-ink-secondary block truncate">
                    {person.organization ?? person.emails[0]}
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
        {canCreate && (
          <li>
            <button
              type="button"
              className={`${optionClass} text-primary`}
              onClick={() => onCreate(query.trim())}
            >
              <span className="bg-primary-light inline-flex size-6 items-center justify-center rounded-full">
                <UserPlus size={14} strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="text-body truncate">
                Add “{query.trim()}” as a new person
              </span>
            </button>
          </li>
        )}
        {matches.length === 0 && !canCreate && (
          <li className="text-meta text-ink-secondary flex items-center gap-2 px-3 py-3">
            <Plus size={16} aria-hidden="true" />
            Type a name to add someone new.
          </li>
        )}
      </ul>
    </div>
  );
}
