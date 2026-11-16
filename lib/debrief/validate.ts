/**
 * Checks what the Debrief screen sends to the server before anything is
 * saved. The server never trusts the browser, so every field is checked here.
 */
import type { Tone } from "@/lib/types";

export interface DebriefInput {
  meetingId: string;
  body: string;
  tone: Tone | null;
  existingPeopleIds: string[];
  newPeople: { name: string; email: string | null }[];
  followUps: { id: string | null; text: string; done: boolean }[];
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+$/;
const TONES: Tone[] = ["warm", "neutral", "cold"];

export const LIMITS = {
  body: 20_000,
  name: 200,
  followUp: 500,
  people: 100,
  followUps: 100,
};

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID.test(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const fail = (error: string): Parsed<never> => ({ ok: false, error });

export function parseDebriefInput(input: unknown): Parsed<DebriefInput> {
  if (!isRecord(input)) return fail("Nothing to save.");

  if (!isUuid(input.meetingId)) return fail("Unknown meeting.");

  if (typeof input.body !== "string") return fail("The note is missing.");
  const body = input.body.trim();
  if (body.length > LIMITS.body) return fail("The note is too long.");

  let tone: Tone | null = null;
  if (input.tone !== null && input.tone !== undefined) {
    if (!TONES.includes(input.tone as Tone)) return fail("Unknown tone.");
    tone = input.tone as Tone;
  }

  const existing = input.existingPeopleIds ?? [];
  if (!Array.isArray(existing) || !existing.every(isUuid)) {
    return fail("Unknown person.");
  }

  const rawNew = input.newPeople ?? [];
  if (!Array.isArray(rawNew)) return fail("Unknown person.");
  const newPeople: DebriefInput["newPeople"] = [];
  for (const item of rawNew) {
    if (!isRecord(item) || typeof item.name !== "string") {
      return fail("Every new person needs a name.");
    }
    const name = item.name.trim();
    if (!name) return fail("Every new person needs a name.");
    if (name.length > LIMITS.name) return fail("A name is too long.");
    let email: string | null = null;
    if (typeof item.email === "string" && item.email.trim()) {
      email = item.email.trim().toLowerCase();
      if (!EMAIL.test(email)) return fail(`“${item.email}” is not an email.`);
    }
    newPeople.push({ name, email });
  }
  if (existing.length + newPeople.length > LIMITS.people) {
    return fail("Too many people for one meeting.");
  }

  const rawFollowUps = input.followUps ?? [];
  if (!Array.isArray(rawFollowUps)) return fail("Follow-ups are invalid.");
  const followUps: DebriefInput["followUps"] = [];
  for (const item of rawFollowUps) {
    if (!isRecord(item) || typeof item.text !== "string") {
      return fail("Follow-ups are invalid.");
    }
    const text = item.text.trim();
    if (!text) continue;
    if (text.length > LIMITS.followUp) return fail("A follow-up is too long.");
    if (item.id !== undefined && item.id !== null && !isUuid(item.id)) {
      return fail("Follow-ups are invalid.");
    }
    followUps.push({
      id: (item.id as string | undefined) ?? null,
      text,
      done: item.done === true,
    });
  }
  if (followUps.length > LIMITS.followUps) {
    return fail("Too many follow-ups.");
  }

  return {
    ok: true,
    value: {
      meetingId: input.meetingId,
      body,
      tone,
      existingPeopleIds: [...new Set(existing as string[])],
      newPeople,
      followUps,
    },
  };
}
