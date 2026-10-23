import Link from "next/link";
import type { ReactNode } from "react";
import type { FaqItem } from "@/lib/site";
import { button, card } from "@/lib/ui";

// Small building blocks shared by every public page, so the pages read as one
// site and each page file stays about its own content.

export function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 10.5 8 14l8-8" />
    </svg>
  );
}

// One full-width band of the page. `tone="surface"` gives it the white
// background that alternates with the page's off-white one.
export function Section({
  id,
  tone = "plain",
  children,
  className = "",
}: {
  id?: string;
  tone?: "plain" | "surface";
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`px-4 py-16 sm:px-6 sm:py-20 lg:px-10 ${tone === "surface" ? "border-y border-black/5 bg-surface" : ""} ${className}`}
    >
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  centre = false,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  centre?: boolean;
}) {
  return (
    <div className={`flex max-w-2xl flex-col gap-3 ${centre ? "mx-auto items-center text-center" : ""}`}>
      {eyebrow && <span className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">{eyebrow}</span>}
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      {intro && <p className="text-zinc-600">{intro}</p>}
    </div>
  );
}

// A page's own opening: the one h1, a short line under it.
export function PageIntro({ eyebrow, title, intro }: { eyebrow?: string; title: string; intro: string }) {
  return (
    <section className="px-4 pt-14 pb-10 sm:px-6 sm:pt-20 lg:px-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {eyebrow && <span className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">{eyebrow}</span>}
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="text-lg text-zinc-600">{intro}</p>
      </div>
    </section>
  );
}

// A framed real screenshot of the product (public/marketing/*.jpg), with the
// dots-and-bar browser top that says "this is the actual screen".
export function ProductShot({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_48px_-24px_rgba(0,0,0,0.25)] ${className}`}
    >
      <div className="flex items-center gap-1.5 border-b border-black/5 bg-zinc-50 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>, see the reasoning on EvoTick.tsx: next/image's optimiser 400s on this project's static images. */}
      <img src={src} alt={alt} className="w-full" />
    </div>
  );
}

// A phone-shaped frame for a screenshot of a phone screen.
export function PhoneShot({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return (
    <div
      className={`mx-auto w-full max-w-[19rem] overflow-hidden rounded-[2rem] border-[6px] border-zinc-900 bg-white shadow-[0_24px_48px_-20px_rgba(0,0,0,0.35)] ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>, see ProductShot. */}
      <img src={src} alt={alt} className="w-full" />
    </div>
  );
}

// A question and answer that opens on tap. Plain <details>: no script, and
// every answer is still in the page for search engines and screen readers.
export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => (
        <details key={item.question} className={`group ${card("px-5 py-4")}`}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
            {item.question}
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180"
              aria-hidden="true"
            >
              <path d="M5 8l5 5 5-5" />
            </svg>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

// The closing call to action at the foot of a page.
export function CtaBand({
  title = "Want to see it with your own portfolio?",
  body = "Tell us how you run your operation and we will show you Evo Stays set up the way you work.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <Section tone="surface">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        <p className="text-zinc-600">{body}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/signup" className={button("primary", "lg")}>
            Register interest
          </Link>
          <Link href="/contact" className={button("secondary", "lg")}>
            Talk to us
          </Link>
        </div>
      </div>
    </Section>
  );
}

// Long-form text (the legal pages): readable measure and spacing, with the
// headings and lists styled from the wrapper so each page is just plain markup.
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <section className="px-4 pt-14 pb-20 sm:px-6 sm:pt-20 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated {updated}</p>
        <p className="mt-6 text-lg text-zinc-600">{intro}</p>
        <div className="mt-4 text-zinc-600 [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-zinc-900 [&_li]:mt-2 [&_p]:mt-3 [&_p]:leading-relaxed [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </div>
    </section>
  );
}
