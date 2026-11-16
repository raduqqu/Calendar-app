/** Checks what the "Edit person" form sends before anything is saved. */
import { isUuid, type Parsed } from "@/lib/debrief/validate";

export interface PersonInput {
  personId: string;
  name: string;
  organization: string;
  role: string;
  about: string;
  emails: string[];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PERSON_LIMITS = { name: 200, field: 200, about: 5000, emails: 10 };

const fail = (error: string): Parsed<never> => ({ ok: false, error });

const text = (value: unknown): string | null =>
  value === undefined || value === null
    ? ""
    : typeof value === "string"
      ? value.trim()
      : null;

export function parsePersonInput(input: unknown): Parsed<PersonInput> {
  if (typeof input !== "object" || input === null)
    return fail("Nothing to save.");
  const raw = input as Record<string, unknown>;

  if (!isUuid(raw.personId)) return fail("Unknown person.");

  const name = text(raw.name);
  if (!name) return fail("A person needs a name.");
  if (name.length > PERSON_LIMITS.name) return fail("The name is too long.");

  const organization = text(raw.organization);
  const role = text(raw.role);
  const about = text(raw.about);
  if (organization === null || role === null || about === null) {
    return fail("Some details are invalid.");
  }
  if (organization.length > PERSON_LIMITS.field) {
    return fail("The organization is too long.");
  }
  if (role.length > PERSON_LIMITS.field) return fail("The role is too long.");
  if (about.length > PERSON_LIMITS.about) return fail("About is too long.");

  const rawEmails = raw.emails ?? [];
  if (!Array.isArray(rawEmails)) return fail("The emails are invalid.");
  const emails: string[] = [];
  for (const item of rawEmails) {
    if (typeof item !== "string") return fail("The emails are invalid.");
    const email = item.trim().toLowerCase();
    if (!email) continue;
    if (!EMAIL.test(email)) return fail(`“${item.trim()}” is not an email.`);
    if (!emails.includes(email)) emails.push(email);
  }
  if (emails.length > PERSON_LIMITS.emails) return fail("Too many emails.");

  return {
    ok: true,
    value: { personId: raw.personId, name, organization, role, about, emails },
  };
}
