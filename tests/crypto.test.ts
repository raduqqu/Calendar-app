import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "@/lib/crypto/tokens";

const key = randomBytes(32).toString("base64");
const otherKey = randomBytes(32).toString("base64");
const token = "1//0gExampleRefreshToken-with_symbols.and/slashes";

describe("refresh token encryption", () => {
  it("gives back the original text after encrypting and decrypting", () => {
    expect(decryptToken(encryptToken(token, key), key)).toBe(token);
  });

  it("never stores the token in readable form", () => {
    expect(encryptToken(token, key)).not.toContain(token);
  });

  it("produces a different result every time, even for the same token", () => {
    expect(encryptToken(token, key)).not.toBe(encryptToken(token, key));
  });

  it("refuses to decrypt with a different key", () => {
    expect(() => decryptToken(encryptToken(token, key), otherKey)).toThrow();
  });

  it("detects a stored value that was tampered with", () => {
    const parts = encryptToken(token, key).split(".");
    parts[3] = Buffer.from("something else").toString("base64url");
    expect(() => decryptToken(parts.join("."), key)).toThrow();
  });

  it("rejects a missing or wrong-sized key with a clear message", () => {
    expect(() => encryptToken(token, "")).toThrow(/TOKEN_ENCRYPTION_KEY/);
    expect(() => encryptToken(token, "c2hvcnQ=")).toThrow(/32 random bytes/);
  });

  it("accepts a key generated in the browser console (44 characters)", () => {
    expect(key).toHaveLength(44);
    expect(() => encryptToken(token, ` ${key}\n`)).not.toThrow();
  });
});
