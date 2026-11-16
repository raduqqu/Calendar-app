import { describe, expect, it } from "vitest";
import { parsePersonInput } from "@/lib/people/validate";

const personId = "22222222-0000-4000-8000-000000000002";

describe("checking an edited person before saving", () => {
  it("tidies names, details and emails", () => {
    const result = parsePersonInput({
      personId,
      name: "  Ana Popescu ",
      organization: " Northwind ",
      role: "",
      about: " Likes sailing ",
      emails: [" Ana@Firm.com ", "ana@firm.com", "", "ana.p@gmail.com"],
    });
    expect(result).toEqual({
      ok: true,
      value: {
        personId,
        name: "Ana Popescu",
        organization: "Northwind",
        role: "",
        about: "Likes sailing",
        emails: ["ana@firm.com", "ana.p@gmail.com"],
      },
    });
  });

  it("requires a name and real-looking emails", () => {
    const base = { personId, name: "Ana", emails: [] };
    expect(parsePersonInput({ ...base, name: "   " }).ok).toBe(false);
    expect(parsePersonInput({ ...base, emails: ["ana at firm"] }).ok).toBe(
      false,
    );
    expect(parsePersonInput({ ...base, emails: ["ana@firm"] }).ok).toBe(false);
    expect(parsePersonInput({ ...base, personId: "nope" }).ok).toBe(false);
    expect(parsePersonInput({ ...base, about: "a".repeat(5001) }).ok).toBe(
      false,
    );
    expect(parsePersonInput(null).ok).toBe(false);
  });
});
