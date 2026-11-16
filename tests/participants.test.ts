import { describe, expect, it } from "vitest";
import { chipsFromInvite, type KnownPerson } from "@/lib/matching/participants";

const ana: KnownPerson = { id: "p-ana", name: "Ana Popescu", hasNotes: true };

describe("people suggested from the calendar invite", () => {
  it("uses the existing person when the email is known (any letter case)", () => {
    const chips = chipsFromInvite(
      [{ email: "ANA@firm.com", name: "Ana P." }],
      new Map([["ana@firm.com", ana]]),
    );
    expect(chips).toEqual([
      {
        kind: "existing",
        personId: "p-ana",
        name: "Ana Popescu",
        hasNotes: true,
      },
    ]);
  });

  it("suggests a new person, named from the invite or the email", () => {
    const chips = chipsFromInvite(
      [
        { email: "marco.bianchi@lab.it", name: null },
        { email: "sofia@lab.it", name: "Sofia Greco" },
      ],
      new Map(),
    );
    expect(chips).toEqual([
      {
        kind: "new",
        key: "invite:marco.bianchi@lab.it",
        name: "Marco Bianchi",
        email: "marco.bianchi@lab.it",
      },
      {
        kind: "new",
        key: "invite:sofia@lab.it",
        name: "Sofia Greco",
        email: "sofia@lab.it",
      },
    ]);
  });

  it("does not list the same person twice", () => {
    const chips = chipsFromInvite(
      [
        { email: "ana@firm.com", name: null },
        { email: "ana.p@gmail.com", name: null },
        { email: "ana@firm.com", name: null },
      ],
      new Map([
        ["ana@firm.com", ana],
        ["ana.p@gmail.com", ana],
      ]),
    );
    expect(chips).toHaveLength(1);
  });
});
