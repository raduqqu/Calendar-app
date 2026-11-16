"use server";

import { refresh } from "next/cache";
import {
  EmailTakenError,
  mergePeople,
  setFollowUpDone,
  updatePerson,
} from "@/lib/data/people";
import { isUuid } from "@/lib/debrief/validate";
import { parsePersonInput } from "@/lib/people/validate";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updatePersonAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = parsePersonInput(input);
  if (!parsed.ok) return parsed;
  try {
    await updatePerson(parsed.value);
  } catch (error) {
    if (error instanceof EmailTakenError) {
      return {
        ok: false,
        error: `${error.email} already belongs to another person. If they are the same person, merge them instead.`,
      };
    }
    console.error("Updating a person failed:", error);
    return { ok: false, error: "Could not save. Please try again." };
  }
  refresh();
  return { ok: true };
}

/** Keeps `keepId`; moves the duplicate's notes, emails and meetings onto it. */
export async function mergePeopleAction(
  keepId: unknown,
  removeId: unknown,
): Promise<ActionResult> {
  if (!isUuid(keepId) || !isUuid(removeId) || keepId === removeId) {
    return { ok: false, error: "Choose a different person to merge." };
  }
  try {
    await mergePeople(keepId, removeId);
  } catch (error) {
    console.error("Merging people failed:", error);
    return { ok: false, error: "Could not merge. Please try again." };
  }
  refresh();
  return { ok: true };
}

export async function setFollowUpDoneAction(
  followUpId: unknown,
  done: unknown,
): Promise<ActionResult> {
  if (!isUuid(followUpId) || typeof done !== "boolean") {
    return { ok: false, error: "Unknown follow-up." };
  }
  try {
    await setFollowUpDone(followUpId, done);
    return { ok: true };
  } catch (error) {
    console.error("Updating a follow-up failed:", error);
    return { ok: false, error: "Could not update. Please try again." };
  }
}
