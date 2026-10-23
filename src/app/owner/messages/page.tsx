import { requirePlatformOwner } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatScheduledFor } from "@/lib/schedule";
import { CONTACT_TOPICS } from "@/lib/site";
import { badge, card } from "@/lib/ui";
import { deleteContactMessage, setContactMessageHandled } from "../actions";

export const metadata = { title: "Messages" };

// Everything sent from the public Contact page, still-waiting ones first. Reads
// through the unscoped `prisma` client on purpose (see UNSCOPED_MODELS in
// src/lib/prisma.ts): a message carries no organizationId to scope by.
export default async function MessagesPage() {
  await requirePlatformOwner();

  const messages = await prisma.contactMessage.findMany({
    orderBy: [{ handledAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
  });
  const waiting = messages.filter((m) => !m.handledAt).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="mt-1 text-sm text-zinc-500">Sent from the Contact page on the public website.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">
          {messages.length} {messages.length === 1 ? "message" : "messages"}
          {waiting > 0 ? `, ${waiting} waiting` : ""}
        </h2>

        {messages.length === 0 ? (
          <p className="text-sm text-zinc-600">Nothing yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((m) => {
              const topic = CONTACT_TOPICS.find((t) => t.value === m.topic)?.label ?? m.topic;
              return (
                <li key={m.id} className={card("flex flex-col gap-3 p-4")}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {m.name}
                        {m.company ? <span className="font-normal text-zinc-500">({m.company})</span> : null}
                        <span className={badge(m.handledAt ? "neutral" : "solid")}>{m.handledAt ? "Dealt with" : "Waiting"}</span>
                      </p>
                      <p className="text-sm text-zinc-600">
                        <a href={`mailto:${m.email}`} className="underline underline-offset-2">
                          {m.email}
                        </a>{" "}
                        · {topic} · {formatScheduledFor(m.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <form action={setContactMessageHandled.bind(null, m.id, !m.handledAt)}>
                        <button type="submit" className="text-xs text-zinc-600 hover:underline">
                          {m.handledAt ? "Mark as waiting" : "Mark as dealt with"}
                        </button>
                      </form>
                      <form action={deleteContactMessage.bind(null, m.id)}>
                        <button type="submit" className="text-xs text-red-600 hover:underline">
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                  <p className="border-t border-black/5 pt-3 text-sm whitespace-pre-line text-zinc-700">{m.message}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
