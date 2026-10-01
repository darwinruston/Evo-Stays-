import { decrypt } from "@/lib/encryption";
import type { PmsCredentials } from "@/lib/pms/types";

// Every call site that needs to actually talk to a provider's API decrypts
// the stored blob once, here, and passes the resulting plaintext
// Record<string,string> into the adapter -- adapters never see ciphertext or
// import from src/lib/encryption.ts themselves. Throws a staff-readable
// message on a corrupt/undecryptable blob (ENCRYPTION_KEY rotated, or the
// stored ciphertext is otherwise bad) -- same wording the old Hostify-only
// sync code used for this exact failure.
export function decryptPmsCredentials(encrypted: string): PmsCredentials {
  let json: string;
  try {
    json = decrypt(encrypted);
  } catch {
    throw new Error("Couldn't decrypt the stored credentials — re-enter them on the client.");
  }
  return JSON.parse(json) as PmsCredentials;
}
