"use server";

import { refresh } from "next/cache";
import { skipMeeting } from "@/lib/data/meetings";
import { isUuid } from "@/lib/debrief/validate";

export async function skipMeetingAction(
  meetingId: unknown,
): Promise<{ ok: boolean }> {
  if (!isUuid(meetingId)) return { ok: false };
  try {
    await skipMeeting(meetingId);
  } catch (error) {
    console.error("Skipping a meeting failed:", error);
    return { ok: false };
  }
  // Also refreshes the number on the Inbox tab.
  refresh();
  return { ok: true };
}
