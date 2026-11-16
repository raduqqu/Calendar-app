"use server";

import { deleteDebrief, saveDebrief } from "@/lib/data/debrief";
import { isUuid, parseDebriefInput } from "@/lib/debrief/validate";

export type SaveDebriefResult =
  { ok: true; peopleCount: number } | { ok: false; error: string };

/** Called by the Save button on the Debrief screen. */
export async function saveDebriefAction(
  input: unknown,
): Promise<SaveDebriefResult> {
  const parsed = parseDebriefInput(input);
  if (!parsed.ok) return parsed;
  try {
    const { peopleCount } = await saveDebrief(parsed.value);
    return { ok: true, peopleCount };
  } catch (error) {
    console.error("Saving a debrief failed:", error);
    return { ok: false, error: "Could not save. Please try again." };
  }
}

export async function deleteDebriefAction(
  meetingId: unknown,
): Promise<{ ok: boolean }> {
  if (!isUuid(meetingId)) return { ok: false };
  try {
    await deleteDebrief(meetingId);
    return { ok: true };
  } catch (error) {
    console.error("Deleting a debrief failed:", error);
    return { ok: false };
  }
}
