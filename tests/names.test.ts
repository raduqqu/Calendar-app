import { describe, expect, it } from "vitest";
import { displayName, nameFromEmail } from "@/lib/matching/names";

describe("names from email addresses", () => {
  it("turns separators into spaces and capitalises", () => {
    expect(nameFromEmail("ana.popescu@firm.com")).toBe("Ana Popescu");
    expect(nameFromEmail("marco_bianchi@lab.it")).toBe("Marco Bianchi");
    expect(nameFromEmail("JEAN-LUC@x.fr")).toBe("Jean Luc");
  });

  it("ignores +tags", () => {
    expect(nameFromEmail("tom+events@x.com")).toBe("Tom");
  });

  it("prefers the name from the invite", () => {
    expect(displayName({ email: "a@x.com", name: "Ana Popescu" })).toBe(
      "Ana Popescu",
    );
  });

  it("ignores a 'name' that is just the email again", () => {
    expect(displayName({ email: "ana@x.com", name: "ana@x.com" })).toBe("Ana");
    expect(displayName({ email: "ana@x.com", name: "  " })).toBe("Ana");
  });
});
