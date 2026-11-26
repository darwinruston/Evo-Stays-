"use client";

import { useState } from "react";
import { button, card, inputCompact } from "@/lib/ui";

// A freshly made invite link, ready to pass on. Shown once: only a fingerprint
// of it is stored, so it cannot be looked up again (a new one can be made).
export function InviteLinkCard({ link, name, onDone }: { link: string; name: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const message = `Hi ${name.split(" ")[0]}, here is your link to set up Evo Stays. Open it and choose a password. It works once and lasts 7 days: ${link}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      // No clipboard on a plain http address: the box above can be selected
      // and copied by hand.
      setCopied(false);
    }
  }

  async function share() {
    // The phone's own share sheet (Messages, WhatsApp and so on) where there
    // is one, otherwise just copy.
    if (navigator.share) {
      await navigator.share({ text: message }).catch(() => undefined);
    } else {
      await copy();
    }
  }

  return (
    <div role="status" className={card("flex w-full max-w-md flex-col gap-3 p-4")}>
      <p className="text-sm font-medium">Invite link for {name}</p>
      <p className="text-sm text-zinc-600">
        Send it to them, and only them. It works once and expires in 7 days. You won&apos;t be able to see it again
        after closing this.
      </p>
      <input
        readOnly
        value={link}
        aria-label="Invite link"
        onFocus={(e) => e.target.select()}
        className={inputCompact}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={share} className={button("primary", "sm")}>
          Share
        </button>
        <button type="button" onClick={copy} className={button("secondary", "sm")}>
          {copied ? "Copied" : "Copy message"}
        </button>
        <button type="button" onClick={onDone} className={button("ghost", "sm")}>
          Done
        </button>
      </div>
    </div>
  );
}
