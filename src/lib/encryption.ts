import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// AES-256-GCM for secrets that must be read back in plaintext later (a
// Hostify API key has to go back out on every sync) -- bcrypt-style one-way
// hashing, the only precedent elsewhere in this app (User.passwordHash),
// isn't usable for that.
//
// The key never changes once something real is encrypted with it: rotating
// ENCRYPTION_KEY makes every previously stored secret undecryptable, with no
// way to recover it short of re-entering it by hand. See the comment in
// .env.

const IV_LENGTH = 12; // recommended nonce size for GCM

function loadKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to 32 bytes (base64-encoded)");
  }
  return key;
}

// "iv:authTag:ciphertext", each segment base64 -- a fresh random iv per call
// so encrypting the same plaintext twice never produces the same output.
export function encrypt(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decrypt(stored: string): string {
  const key = loadKey();
  const [ivB64, authTagB64, ciphertextB64] = stored.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Malformed ciphertext");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
