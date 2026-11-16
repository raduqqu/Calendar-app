"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDaysAgo } from "@/lib/time";
import type { PersonSummary } from "@/lib/types";

/** Searchable list of people; each row opens that person's profile. */
export function PeopleList({ people }: { people: PersonSummary[] }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? people.filter((p) =>
        `${p.name} ${p.organization ?? ""}`.toLowerCase().includes(needle),
      )
    : people;

  if (people.length === 0) {
    return (
      <EmptyState
        title="No people yet"
        description="Open a meeting on Today, add who was there and save. They will appear here with everything you noted."
      />
    );
  }

  return (
    <>
      <label className="bg-subtle rounded-button focus-within:outline-primary flex min-h-11 items-center gap-2 px-3 focus-within:outline-2">
        <Search
          size={20}
          strokeWidth={1.75}
          className="text-ink-secondary shrink-0"
          aria-hidden="true"
        />
        <span className="sr-only">Search people</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search people"
          className="text-body placeholder:text-ink-tertiary w-full bg-transparent outline-none"
        />
      </label>

      {shown.length === 0 ? (
        <EmptyState
          title="No one found"
          description={`Nobody matches “${query.trim()}”.`}
        />
      ) : (
        <ul className="divide-border mt-2 divide-y">
          {shown.map((person) => (
            <li key={person.id}>
              <Link
                href={`/people/${person.id}`}
                className="hover:bg-subtle -mx-2 flex min-h-16 items-center gap-3 rounded-lg px-2 py-3"
              >
                <Avatar name={person.name} hasNotes={person.noteCount > 0} />
                <span className="min-w-0 flex-1">
                  <span className="text-body block truncate font-medium">
                    {person.name}
                  </span>
                  {person.organization && (
                    <span className="text-meta text-ink-secondary block truncate">
                      {person.organization}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-right">
                  <span className="text-meta text-ink-secondary block">
                    {person.lastMetDaysAgo === undefined
                      ? "Not met yet"
                      : `Met ${formatDaysAgo(person.lastMetDaysAgo)}`}
                  </span>
                  <span className="text-meta text-ink-secondary block">
                    {person.noteCount === 1
                      ? "1 note"
                      : `${person.noteCount} notes`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
