/**
 * Turns an email address into a readable name when the calendar invite has
 * no display name: "ana.popescu@firm.com" → "Ana Popescu".
 */
export function nameFromEmail(email: string): string {
  const local = email.split("@")[0]?.split("+")[0] ?? "";
  const words = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  return words.length > 0 ? words.join(" ") : email;
}

/** The best name to show for an attendee. */
export function displayName(attendee: {
  email: string;
  name: string | null;
}): string {
  const name = attendee.name?.trim();
  // Some invites use the email address itself as the "name".
  if (name && name.toLowerCase() !== attendee.email.toLowerCase()) return name;
  return nameFromEmail(attendee.email);
}
