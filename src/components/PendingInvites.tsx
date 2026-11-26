"use client";

import { useState, useTransition } from "react";
import type { InviteResult } from "@/lib/invites";
import { InviteLinkCard } from "@/components/InviteLinkCard";
import { button, card } from "@/lib/ui";

// People who have been invited but not yet chosen a password, each with a way
// to make them a new link.
export function PendingInvites({
  people,
  newLink,
}: {
  people: { id: string; name: string; email: string; role: string }[];
  newLink: (id: string) => Promise<InviteResult>;
}) {
  const [made, setMade] = useState<{ link: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function makeLink(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await newLink(id);
        if (result && "error" in result) setError(result.error);
        else if (result) setMade({ link: result.inviteLink, name: result.name });
      } catch {
        setError("Something went wrong.");
      }
    });
  }

  return (
    <div className="flex max-w-2xl flex-col gap-2">
      {made && <InviteLinkCard key={made.link} link={made.link} name={made.name} onDone={() => setMade(null)} />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="flex flex-col gap-2">
        {people.map((p) => (
          <li key={p.id} className={card("flex flex-wrap items-center justify-between gap-3 p-4")}>
            <div className="min-w-0">
              <p className="font-medium">
                {p.name} <span className="text-xs font-normal text-zinc-500">{p.role}</span>
              </p>
              <p className="truncate text-sm text-zinc-500">{p.email}</p>
            </div>
            <button type="button" disabled={pending} onClick={() => makeLink(p.id)} className={button("secondary", "sm")}>
              New invite link
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
