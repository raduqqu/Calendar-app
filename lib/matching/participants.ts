/**
 * Turns the people on a calendar invite into person chips for the Debrief
 * screen: an address that already belongs to someone in People becomes that
 * person; an unknown address becomes a suggested new person (created only
 * when the debrief is saved).
 */
import type { StoredAttendee } from "@/lib/calendar/types";
import type { ParticipantChip } from "@/lib/types";
import { displayName } from "./names";

export interface KnownPerson {
  id: string;
  name: string;
  hasNotes: boolean;
}

export function chipsFromInvite(
  attendees: StoredAttendee[],
  personByEmail: Map<string, KnownPerson>,
): ParticipantChip[] {
  const chips: ParticipantChip[] = [];
  const seenPeople = new Set<string>();
  const seenEmails = new Set<string>();

  for (const attendee of attendees) {
    const email = attendee.email.trim().toLowerCase();
    if (!email || seenEmails.has(email)) continue;
    seenEmails.add(email);

    const known = personByEmail.get(email);
    if (known) {
      if (seenPeople.has(known.id)) continue;
      seenPeople.add(known.id);
      chips.push({
        kind: "existing",
        personId: known.id,
        name: known.name,
        hasNotes: known.hasNotes,
      });
    } else {
      chips.push({
        kind: "new",
        key: `invite:${email}`,
        name: displayName(attendee),
        email,
      });
    }
  }
  return chips;
}
