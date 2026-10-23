"use client";

import { useActionState } from "react";
import { sendContactMessage, type ContactState } from "./actions";
import { CONTACT_TOPICS } from "@/lib/site";
import { button, input } from "@/lib/ui";

export function ContactForm({ defaultTopic = "demo" }: { defaultTopic?: string }) {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(sendContactMessage, undefined);

  if (state && "success" in state) {
    return (
      <div role="status" className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Thanks, your message is on its way</h2>
        <p className="text-sm text-zinc-600">We have it, and we will reply to the email address you gave us.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Your name
          </label>
          <input id="name" name="name" required maxLength={100} autoComplete="name" className={input} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input id="email" name="email" type="email" required maxLength={200} autoComplete="email" className={input} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="company" className="text-sm font-medium">
            Company <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <input
            id="company"
            name="company"
            maxLength={150}
            autoComplete="organization" // spelling-ok: the HTML autofill name for a company field
            className={input}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="topic" className="text-sm font-medium">
            What is it about?
          </label>
          <select id="topic" name="topic" defaultValue={defaultTopic} className={input}>
            {CONTACT_TOPICS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-sm font-medium">
          Your message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          minLength={10}
          maxLength={3000}
          placeholder="Tell us a little about your portfolio and what you would like to know."
          className={input}
        />
      </div>

      {/* A trap for bots: people never see or fill this field. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Leave this empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {state && "error" in state && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <div>
        <button type="submit" disabled={pending} className={button("primary", "md")}>
          {pending ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}
