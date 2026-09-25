import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

// AES-256-GCM for secrets that must be read back in plaintext later (a
// Hostify API key has to go back out on every sync) -- bcrypt-style one-way
// hashing, the only precedent elsewhere in this app (User.passwordHash),
// isn't usable for that.
//
// The key never changes once something real is encrypted with it: rotating
// it makes every previously stored secret undecryptable, with no way to
// recover it short of re-entering it by hand.
//
// Where the key comes from: ENCRYPTION_KEY if it's set (the proper way --
// see .env). If it isn't, the first use creates a random key and saves it in
// a file beside the database, so a host that can't set environment
// variables still works. That file must be kept for as long as the database
// is: it lives in the same folder on purpose, so backing up or restoring the
// data folder keeps the two in step.

const IV_LENGTH = 12; // recommended nonce size for GCM
const KEY_FILE_NAME = ".encryption-key";

// The folder the SQLite database sits in (the persistent volume in Docker),
// falling back to ./storage for any non-file database URL.
function keyFilePath(): string {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("file:")) {
    const dbPath = url.slice("file:".length).split("?")[0];
    // Relative sqlite paths are relative to the prisma/ folder, as Prisma
    // itself reads them.
    const abs = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), "prisma", dbPath);
    return path.join(path.dirname(abs), KEY_FILE_NAME);
  }
  return path.join(process.cwd(), "storage", KEY_FILE_NAME);
}

let cachedFileKey: Buffer | null = null;

function loadOrCreateKeyFile(): Buffer {
  if (cachedFileKey) return cachedFileKey;
  const file = keyFilePath();
  if (!existsSync(file)) {
    mkdirSync(path.dirname(file), { recursive: true });
    try {
      // "wx" fails if another request created it first, rather than
      // overwriting a key that may already have encrypted something.
      writeFileSync(file, randomBytes(32).toString("base64"), { flag: "wx", mode: 0o600 });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
    }
  }
  const key = Buffer.from(readFileSync(file, "utf8").trim(), "base64");
  if (key.length !== 32) {
    throw new Error(`Encryption key file ${file} is not a valid 32-byte key`);
  }
  cachedFileKey = key;
  return key;
}

function loadKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return loadOrCreateKeyFile();
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
