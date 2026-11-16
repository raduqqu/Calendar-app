import { describe, expect, it } from "vitest";
import { parseDebriefInput } from "@/lib/debrief/validate";

const meetingId = "11111111-0000-4000-8000-000000000001";
const personId = "22222222-0000-4000-8000-000000000002";

const valid = {
  meetingId,
  body: "  Talked about the seed round.  ",
  tone: "warm",
  existingPeopleIds: [personId, personId],
  newPeople: [
    { name: " Marco ", email: " Marco@Lab.IT " },
    { name: "Sofia", email: "" },
  ],
  followUps: [
    { text: "Send the deck", done: false },
    { id: "33333333-0000-4000-8000-000000000003", text: "Intro", done: true },
    { text: "   ", done: false },
  ],
};

describe("checking a debrief before saving", () => {
  it("accepts and tidies a normal debrief", () => {
    const result = parseDebriefInput(valid);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.body).toBe("Talked about the seed round.");
    expect(result.value.existingPeopleIds).toEqual([personId]);
    expect(result.value.newPeople).toEqual([
      { name: "Marco", email: "marco@lab.it" },
      { name: "Sofia", email: null },
    ]);
    expect(result.value.followUps).toEqual([
      { id: null, text: "Send the deck", done: false },
      { id: "33333333-0000-4000-8000-000000000003", text: "Intro", done: true },
    ]);
  });

  it("allows saving without a tone", () => {
    expect(parseDebriefInput({ ...valid, tone: null }).ok).toBe(true);
  });

  it("rejects bad input", () => {
    const cases: unknown[] = [
      null,
      { ...valid, meetingId: "abc" },
      { ...valid, body: 42 },
      { ...valid, tone: "angry" },
      { ...valid, existingPeopleIds: ["not-an-id"] },
      { ...valid, newPeople: [{ name: "  " }] },
      { ...valid, newPeople: [{ name: "X", email: "not an email" }] },
      { ...valid, followUps: [{ id: "x", text: "a", done: false }] },
      { ...valid, body: "a".repeat(20_001) },
    ];
    for (const input of cases) {
      expect(parseDebriefInput(input).ok).toBe(false);
    }
  });
});
