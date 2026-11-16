"use client";

import { ChevronDown, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import {
  deleteDebriefAction,
  saveDebriefAction,
} from "@/app/meetings/[id]/actions";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import type {
  FollowUpItem,
  ParticipantChip,
  PersonOption,
  Tone,
} from "@/lib/types";
import { PersonPicker } from "./PersonPicker";

interface DebriefFormProps {
  meetingId: string;
  title: string;
  /** "Saturday, 14 November · 16:30 – 20:00" */
  when: string;
  backHref: string;
  removedFromCalendar: boolean;
  people: PersonOption[];
  initialParticipants: ParticipantChip[];
  initialBody: string;
  initialTone: Tone | null;
  initialFollowUps: FollowUpItem[];
  hasNote: boolean;
}

const TONES: { value: Tone; label: string }[] = [
  { value: "warm", label: "Warm" },
  { value: "neutral", label: "Neutral" },
  { value: "cold", label: "Cold" },
];

const chipKey = (chip: ParticipantChip) =>
  chip.kind === "existing" ? chip.personId : chip.key;

let newKeyCounter = 0;

/** The Debrief screen: who was there, what happened, and what comes next. */
export function DebriefForm(props: DebriefFormProps) {
  const router = useRouter();
  const [participants, setParticipants] = useState(props.initialParticipants);
  const [body, setBody] = useState(props.initialBody);
  const [tone, setTone] = useState<Tone | null>(props.initialTone);
  const [followUps, setFollowUps] = useState(props.initialFollowUps);
  const [draftFollowUp, setDraftFollowUp] = useState("");
  const [picking, setPicking] = useState(false);
  const [moreOpen, setMoreOpen] = useState(
    props.initialTone !== null || props.initialFollowUps.length > 0,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const bodyId = useId();
  const moreId = useId();

  const chosenIds = new Set(
    participants.flatMap((p) => (p.kind === "existing" ? [p.personId] : [])),
  );
  const pendingFollowUp = draftFollowUp.trim();
  const nothingToSave =
    !body.trim() &&
    participants.length === 0 &&
    followUps.length === 0 &&
    !pendingFollowUp &&
    !props.hasNote;

  function addExisting(person: PersonOption) {
    setParticipants((list) => [
      ...list,
      {
        kind: "existing",
        personId: person.id,
        name: person.name,
        hasNotes: false,
      },
    ]);
    setPicking(false);
  }

  function addNew(name: string) {
    newKeyCounter += 1;
    setParticipants((list) => [
      ...list,
      { kind: "new", key: `new:${newKeyCounter}`, name, email: null },
    ]);
    setPicking(false);
  }

  function addFollowUp() {
    if (!pendingFollowUp) return;
    setFollowUps((list) => [...list, { text: pendingFollowUp, done: false }]);
    setDraftFollowUp("");
  }

  function save() {
    setError(null);
    const allFollowUps = pendingFollowUp
      ? [...followUps, { text: pendingFollowUp, done: false }]
      : followUps;
    startSaving(async () => {
      const result = await saveDebriefAction({
        meetingId: props.meetingId,
        body,
        tone,
        existingPeopleIds: participants.flatMap((p) =>
          p.kind === "existing" ? [p.personId] : [],
        ),
        newPeople: participants.flatMap((p) =>
          p.kind === "new" ? [{ name: p.name, email: p.email }] : [],
        ),
        followUps: allFollowUps.map((f) => ({
          id: f.id ?? null,
          text: f.text,
          done: f.done,
        })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`${props.backHref}&saved=${result.peopleCount}`);
    });
  }

  function remove() {
    if (!window.confirm("Delete this note and its follow-ups?")) return;
    setError(null);
    startDeleting(async () => {
      const result = await deleteDebriefAction(props.meetingId);
      if (!result.ok) {
        setError("Could not delete. Please try again.");
        return;
      }
      router.push(props.backHref);
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
      <header className="flex items-start gap-2 px-4 pt-4">
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="text-title break-words">{props.title}</h1>
          <p className="text-meta text-ink-secondary mt-1">{props.when}</p>
          {props.removedFromCalendar && (
            <p className="text-meta text-warning-ink mt-1">
              Removed from your calendar
            </p>
          )}
        </div>
        <Link
          href={props.backHref}
          aria-label="Close"
          className="text-ink-secondary hover:bg-subtle -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full"
        >
          <X size={22} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </header>

      <div className="flex-1 px-4 pb-6">
        <section aria-labelledby="who" className="mt-6">
          <h2
            id="who"
            className="text-tiny text-ink-secondary mb-2 font-semibold uppercase"
          >
            Who was there
          </h2>
          <div className="flex flex-wrap gap-2">
            {participants.map((chip) => (
              <Chip
                key={chipKey(chip)}
                name={chip.name}
                suffix={chip.kind === "new" ? "(new)" : undefined}
                hasNotes={chip.kind === "existing" && chip.hasNotes}
                selected={chip.kind === "existing" && chip.hasNotes}
                onRemove={() =>
                  setParticipants((list) =>
                    list.filter((p) => chipKey(p) !== chipKey(chip)),
                  )
                }
              />
            ))}
            {!picking && (
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="text-meta text-primary border-primary/40 hover:bg-primary-light inline-flex min-h-8 items-center gap-1 rounded-full border border-dashed px-3 font-medium"
              >
                <Plus size={14} strokeWidth={2} aria-hidden="true" />
                Add person
              </button>
            )}
          </div>
          {picking && (
            <PersonPicker
              people={props.people}
              excludeIds={chosenIds}
              onPickExisting={addExisting}
              onCreate={addNew}
              onClose={() => setPicking(false)}
            />
          )}
        </section>

        <section className="mt-6">
          <label
            htmlFor={bodyId}
            className="text-tiny text-ink-secondary mb-2 block font-semibold uppercase"
          >
            Notes
          </label>
          <textarea
            id={bodyId}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            autoFocus={!props.hasNote}
            rows={7}
            placeholder="What happened? What did they say, want, or share?"
            className="text-body bg-subtle placeholder:text-ink-tertiary rounded-card focus:outline-primary w-full resize-y p-4 leading-relaxed outline-none focus:outline-2"
          />
        </section>

        <section className="mt-4">
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls={moreId}
            onClick={() => setMoreOpen((open) => !open)}
            className="text-body text-ink flex min-h-11 w-full items-center justify-between font-medium"
          >
            <span>
              Follow-ups and tone
              {followUps.length > 0 && (
                <span className="text-ink-secondary font-normal">
                  {" "}
                  · {followUps.length}
                </span>
              )}
            </span>
            <ChevronDown
              size={20}
              strokeWidth={1.75}
              aria-hidden="true"
              className={`text-ink-secondary transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`}
            />
          </button>

          {moreOpen && (
            <div id={moreId} className="flex flex-col gap-5 pt-2">
              <fieldset>
                <legend className="text-tiny text-ink-secondary mb-2 font-semibold uppercase">
                  How it felt
                </legend>
                <div className="flex gap-2">
                  {TONES.map((option) => {
                    const active = tone === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setTone(active ? null : option.value)}
                        className={`text-meta min-h-9 rounded-full border px-4 font-medium ${active ? "bg-primary-light text-primary-hover border-transparent" : "border-border text-ink"}`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div>
                <p className="text-tiny text-ink-secondary mb-2 font-semibold uppercase">
                  Follow-ups and promises
                </p>
                <ul className="flex flex-col gap-1">
                  {followUps.map((item, index) => (
                    <li
                      key={item.id ?? `draft-${index}`}
                      className="flex min-h-11 items-center gap-3"
                    >
                      <input
                        type="checkbox"
                        checked={item.done}
                        aria-label={`Done: ${item.text}`}
                        onChange={(event) =>
                          setFollowUps((list) =>
                            list.map((f, i) =>
                              i === index
                                ? { ...f, done: event.target.checked }
                                : f,
                            ),
                          )
                        }
                        className="accent-primary size-5 shrink-0"
                      />
                      <span
                        className={`text-body flex-1 ${item.done ? "text-ink-secondary line-through" : ""}`}
                      >
                        {item.text}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove: ${item.text}`}
                        onClick={() =>
                          setFollowUps((list) =>
                            list.filter((_, i) => i !== index),
                          )
                        }
                        className="text-ink-secondary hover:bg-subtle inline-flex size-9 items-center justify-center rounded-full"
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-1 flex gap-2">
                  <label className="sr-only" htmlFor={`${moreId}-new`}>
                    New follow-up
                  </label>
                  <input
                    id={`${moreId}-new`}
                    value={draftFollowUp}
                    onChange={(event) => setDraftFollowUp(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addFollowUp();
                      }
                    }}
                    placeholder="e.g. Send them the deck"
                    className="text-body bg-subtle placeholder:text-ink-tertiary rounded-button focus:outline-primary min-h-11 flex-1 px-3 outline-none focus:outline-2"
                  />
                  <Button
                    variant="secondary"
                    onClick={addFollowUp}
                    disabled={!pendingFollowUp}
                    aria-label="Add follow-up"
                  >
                    <Plus size={18} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>

        {props.hasNote && (
          <button
            type="button"
            onClick={remove}
            disabled={deleting || saving}
            className="text-meta text-danger mt-8 inline-flex min-h-11 items-center gap-2 font-medium disabled:opacity-50"
          >
            <Trash2 size={16} aria-hidden="true" />
            {deleting ? "Deleting…" : "Delete note"}
          </button>
        )}
      </div>

      <div className="border-border bg-surface/95 sticky bottom-0 border-t px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur">
        {error && (
          <p role="alert" className="text-meta text-danger mb-2">
            {error}
          </p>
        )}
        <Button
          fullWidth
          className="min-h-12"
          onClick={save}
          disabled={saving || deleting || nothingToSave}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
