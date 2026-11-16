import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Encrypts and decrypts the Google refresh token before it is stored.
 *
 * Method: AES-256-GCM. Besides hiding the text, it adds a "tag" that makes
 * any tampering detectable. A fresh random "iv" is used every time, so
 * encrypting the same token twice gives two different results.
 *
 * Stored format:  v1.<iv>.<tag>.<ciphertext>   (each part base64url)
 */
const VERSION = "v1";
const IV_BYTES = 12;

function parseKey(keyBase64: string | undefined): Buffer {
  if (!keyBase64) {
    throw new Error(
      "Missing environment variable TOKEN_ENCRYPTION_KEY. See docs/SETUP.md, Part 6.",
    );
  }
  const key = Buffer.from(keyBase64.trim(), "base64");
  if (key.length !== 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be 32 random bytes written as base64 (44 characters).",
    );
  }
  return key;
}

export function encryptToken(
  plain: string,
  keyBase64 = process.env.TOKEN_ENCRYPTION_KEY,
): string {
  const key = parseKey(keyBase64);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  return [
    VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptToken(
  stored: string,
  keyBase64 = process.env.TOKEN_ENCRYPTION_KEY,
): string {
  const key = parseKey(keyBase64);
  const [version, iv, tag, ciphertext] = stored.split(".");
  if (version !== VERSION || !iv || !tag || !ciphertext) {
    throw new Error("Stored token has an unknown format.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
