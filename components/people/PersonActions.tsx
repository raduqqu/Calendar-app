"use client";

import { GitMerge, Pencil, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import {
  mergePeopleAction,
  updatePersonAction,
} from "@/app/(app)/people/actions";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { PersonOption } from "@/lib/types";

interface Person {
  id: string;
  name: string;
  organization: string | null;
  role: string | null;
  about: string | null;
  emails: string[];
}

interface PersonActionsProps {
  person: Person;
  /** Everyone else, as candidates for merging. */
  others: PersonOption[];
}

const inputClass =
  "text-body bg-subtle placeholder:text-ink-tertiary rounded-button focus:outline-primary min-h-11 w-full px-3 outline-none focus:outline-2";
const labelClass = "text-meta text-ink-secondary mb-1 block font-medium";

function EditForm({ person, onDone }: { person: Person; onDone: () => void }) {
  const [name, setName] = useState(person.name);
  const [organization, setOrganization] = useState(person.organization ?? "");
  const [role, setRole] = useState(person.role ?? "");
  const [emails, setEmails] = useState(person.emails.join("\n"));
  const [about, setAbout] = useState(person.about ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const id = useId();

  function save() {
    setError(null);
    startSaving(async () => {
      const result = await updatePersonAction({
        personId: person.id,
        name,
        organization,
        role,
        about,
        emails: emails.split(/[\n,;]+/),
      });
      if (result.ok) onDone();
      else setError(result.error);
    });
  }

  return (
    <form
      className="flex flex-col gap-4 pb-2"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div>
        <label htmlFor={`${id}-name`} className={labelClass}>
          Name
        </label>
        <input
          id={`${id}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-org`} className={labelClass}>
            Organization
          </label>
          <input
            id={`${id}-org`}
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`${id}-role`} className={labelClass}>
            Role
          </label>
          <input
            id={`${id}-role`}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-emails`} className={labelClass}>
          Emails (one per line)
        </label>
        <textarea
          id={`${id}-emails`}
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          rows={2}
          inputMode="email"
          autoCapitalize="none"
          className={`${inputClass} py-2`}
        />
      </div>
      <div>
        <label htmlFor={`${id}-about`} className={labelClass}>
          About
        </label>
        <textarea
          id={`${id}-about`}
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          rows={4}
          placeholder="Stable facts: family, interests, where they studied…"
          className={`${inputClass} py-2 leading-relaxed`}
        />
      </div>
      {error && (
        <p role="alert" className="text-meta text-danger">
          {error}
        </p>
      )}
      <Button type="submit" fullWidth disabled={saving || !name.trim()}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

function MergeForm({
  person,
  others,
  onDone,
}: {
  person: Person;
  others: PersonOption[];
  onDone: () => void;
}) {
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<PersonOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [merging, startMerging] = useTransition();

  const needle = query.trim().toLowerCase();
  const matches = others
    .filter(
      (p) =>
        !needle ||
        p.name.toLowerCase().includes(needle) ||
        p.emails.some((e) => e.includes(needle)),
    )
    .slice(0, 8);

  function merge() {
    if (!chosen) return;
    setError(null);
    startMerging(async () => {
      const result = await mergePeopleAction(person.id, chosen.id);
      if (result.ok) onDone();
      else setError(result.error);
    });
  }

  if (chosen) {
    return (
      <div className="flex flex-col gap-4 pb-2">
        <p className="text-body">
          Merge <strong>{chosen.name}</strong> into{" "}
          <strong>{person.name}</strong>?
        </p>
        <p className="text-meta text-ink-secondary">
          All of {chosen.name}&apos;s notes, meetings, emails and follow-ups
          move to {person.name}, and {chosen.name} is removed from People. This
          cannot be undone.
        </p>
        {error && (
          <p role="alert" className="text-meta text-danger">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setChosen(null)}
            disabled={merging}
          >
            Back
          </Button>
          <Button variant="danger" fullWidth onClick={merge} disabled={merging}>
            {merging ? "Merging…" : "Merge"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-2">
      <p className="text-meta text-ink-secondary mb-3">
        Pick the duplicate. Everything noted about them moves to {person.name}.
      </p>
      {others.length === 0 ? (
        <p className="text-body text-ink-secondary py-4">
          There is nobody else to merge with yet.
        </p>
      ) : (
        <>
          <label className="bg-subtle rounded-button flex min-h-11 items-center gap-2 px-3">
            <Search
              size={18}
              strokeWidth={1.75}
              className="text-ink-secondary shrink-0"
              aria-hidden="true"
            />
            <span className="sr-only">Search people</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people"
              className="text-body placeholder:text-ink-tertiary w-full bg-transparent outline-none"
            />
          </label>
          <ul className="mt-2 max-h-72 overflow-y-auto">
            {matches.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => setChosen(option)}
                  className="hover:bg-subtle flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-left"
                >
                  <Avatar name={option.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="text-body block truncate">
                      {option.name}
                    </span>
                    {(option.organization || option.emails[0]) && (
                      <span className="text-meta text-ink-secondary block truncate">
                        {option.organization ?? option.emails[0]}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
            {matches.length === 0 && (
              <li className="text-meta text-ink-secondary px-2 py-3">
                Nobody matches.
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}

/** The Edit and Merge buttons on a person's profile, with their sheets. */
export function PersonActions({ person, others }: PersonActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState<"edit" | "merge" | null>(null);

  const done = () => {
    setOpen(null);
    router.refresh();
  };

  return (
    <>
      <div className="mt-4 flex justify-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setOpen("edit")}>
          <Pencil size={16} aria-hidden="true" />
          Edit
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setOpen("merge")}>
          <GitMerge size={16} aria-hidden="true" />
          Merge duplicate
        </Button>
      </div>

      <Sheet
        open={open === "edit"}
        onClose={() => setOpen(null)}
        title="Edit person"
      >
        {/* Mounted only while open, so it always starts from saved values. */}
        {open === "edit" && <EditForm person={person} onDone={done} />}
      </Sheet>
      <Sheet
        open={open === "merge"}
        onClose={() => setOpen(null)}
        title="Merge duplicate"
      >
        {open === "merge" && (
          <MergeForm person={person} others={others} onDone={done} />
        )}
      </Sheet>
    </>
  );
}
