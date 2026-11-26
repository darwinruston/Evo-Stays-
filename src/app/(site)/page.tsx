import { normaliseEmail } from "@/lib/emailAddress";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PMS_NAMES } from "@/lib/siteIntegrations";
import { cta, CtaBand, PhoneShot, ProductShot, Section, SectionHeading } from "@/components/marketing/parts";

// Signed-in visitors never see this: "/" is purely a router for them (see the
// redirect below). Everyone else lands here first.
//
// Kept short on purpose: what Evo Stays is, and what it does for you. How it
// works, step by step, lives on the Features page and only there, so the two
// pages never say the same thing.
//
// The positioning: the channel manager owns the bookings; Evo Stays is where a
// property team keeps everything else about a property.
//
// The screenshots are the real screens with made-up data: see
// scripts/marketing/ for how to take them again after the app changes.
export const metadata = {
  title: { absolute: "Evo Stays: software that works for you" },
  description:
    "Property management for everything outside your channel manager. Evo Stays keeps each property's codes, maintenance and cleaning in one place for your whole team.",
};

// Icon outlines, drawn on a 24 by 24 grid.
const ICONS = {
  key: "M15 7a4 4 0 1 1-3.9 4.9L9 14H7v2H5v2H3v-3l6.1-6.1A4 4 0 0 1 15 7Zm1 3h.01",
  tool: "M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.7V21h3.3l6.3-6.3a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z",
  shield: "M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Zm-3.5 9 2.5 2.5 4.5-4.5",
  sparkle: "M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.4l-1.8-4.9L5 9.7l5.2-1.8L12 3Zm7 12 .9 2.3L22 18l-2.1.8L19 21l-.9-2.2L16 18l2.1-.7L19 15Z",
  repeat: "M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4m14-1v1a4 4 0 0 1-4 4H3",
  phone: "M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm3 17h2",
  basket: "M5 10h14l-1.5 10h-11L5 10Zm3 0 4-6 4 6M10 14v2m4-2v2",
  box: "M21 8 12 3 3 8m18 0v8l-9 5m9-13-9 5m0 8-9-5V8m9 13v-8M3 8l9 5",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6",
  list: "M10 6h10M10 12h10M10 18h10M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
} as const;

function Icon({ name, className = "" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${className}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d={ICONS[name]} />
      </svg>
    </span>
  );
}

const KEPT_TOGETHER = [
  {
    icon: "key",
    colour: "bg-amber-100 text-amber-700",
    title: "Codes and access",
    body: "Key safe codes, entry notes and how to get in, shown only to the cleaners on that property.",
  },
  {
    icon: "tool",
    colour: "bg-rose-100 text-rose-700",
    title: "Maintenance",
    body: "Problems cleaners find are logged with photos, ranked by urgency and kept against the property until fixed.",
  },
  {
    icon: "shield",
    colour: "bg-emerald-100 text-emerald-700",
    title: "Health and safety",
    body: "Gas safety, electrical reports, insurance and more. Record when each was completed and your team is reminded before it runs out.",
  },
  {
    icon: "sparkle",
    colour: "bg-sky-100 text-sky-700",
    title: "Cleaning",
    body: "Every clean, who is doing it, the checklist and the photos, all on the property's own page.",
  },
] as const;

const COVERS = [
  {
    icon: "repeat",
    tone: "border-teal-200 bg-teal-50 hover:border-teal-400",
    colour: "bg-teal-600 text-white",
    title: "Cleans organised for you",
    body: "Bookings turn into cleans and go to the right cleaner. Regular ones repeat on their own, and same-day turnovers are flagged.",
    href: "/features#scheduling",
  },
  {
    icon: "phone",
    tone: "border-sky-200 bg-sky-50 hover:border-sky-400",
    colour: "bg-sky-600 text-white",
    title: "Cleaners always know what to do",
    body: "A checklist, photos and problem reports on their phone, opened like an app.",
    href: "/features#cleaners",
  },
  {
    icon: "basket",
    tone: "border-violet-200 bg-violet-50 hover:border-violet-400",
    colour: "bg-violet-600 text-white",
    title: "Linen there when it is needed",
    body: "Your linen company sees when to arrive at each property.",
    href: "/features#linen",
  },
  {
    icon: "box",
    tone: "border-amber-200 bg-amber-50 hover:border-amber-400",
    colour: "bg-amber-500 text-white",
    title: "Stock without counting",
    body: "A tap for each item, room by room, and one list of what is running low.",
    href: "/features#stock",
  },
  {
    icon: "list",
    tone: "border-rose-200 bg-rose-50 hover:border-rose-400",
    colour: "bg-rose-600 text-white",
    title: "Nothing slips through",
    body: "Team tasks with subtasks, repeats and reminders, beside the safety dates coming up.",
    href: "/features#tasks",
  },
  {
    icon: "receipt",
    tone: "border-emerald-200 bg-emerald-50 hover:border-emerald-400",
    colour: "bg-emerald-600 text-white",
    title: "Hours into invoices",
    body: "Cleaner hours are added up for you, and can be sent to Xero as bills.",
    href: "/features#hours",
  },
] as const;

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    // The platform owner has their own area entirely (see requirePlatformOwner
    // in src/lib/authz.ts), checked ahead of the role-based split below, since
    // that account still carries a staff role to satisfy the schema even though
    // it isn't a customer running cleaning operations.
    const owner = process.env.PLATFORM_OWNER_EMAIL;
    if (owner && session.user.email && normaliseEmail(session.user.email) === normaliseEmail(owner)) redirect("/owner");
    redirect(session.user.role === "CLEANER" ? "/cleaner" : session.user.role === "LINEN" ? "/linen" : "/admin");
  }

  return (
    <>
      {/* What we do, with the product in view */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-950 via-teal-800 to-sky-800 px-4 pt-14 text-white sm:px-6 sm:pt-20 lg:px-10">
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-emerald-400/25 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-24 h-96 w-96 rounded-full bg-violet-500/30 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-teal-50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            For short-let property teams
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">
            Software that{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-sky-300 bg-clip-text text-transparent">
              works for you
            </span>
          </h1>
          <p className="mt-5 text-lg text-teal-50/90">
            Your channel manager looks after the bookings. Evo Stays is your go-to for everything else about your
            properties: the codes, the maintenance and the cleaning, in one place for the whole team.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className={cta("onDark")}>
              Register interest
            </Link>
            <Link href="/features" className={cta("onDarkOutline")}>
              See what it does
            </Link>
          </div>
          <p className="mt-3 text-sm text-teal-100/80">Not open to everyone yet. We will set up a demo with you.</p>
        </div>

        <div className="relative mx-auto mt-12 max-w-5xl">
          <ProductShot
            src="/marketing/dashboard.jpg"
            alt="The Evo Stays overview, with counts of clients, properties, cleans and open issues above today's cleans"
            className="rounded-b-none border-white/10 text-left"
          />
          <div className="absolute -right-2 bottom-0 hidden w-44 translate-y-4 lg:-right-16 lg:block">
            <PhoneShot src="/marketing/cleaner-home.jpg" alt="A cleaner's list of cleans on their phone" />
          </div>
        </div>
      </section>
      <p className="px-4 pt-6 text-center text-xs text-zinc-500">Screens shown with made-up example data.</p>

      {/* The positioning: everything outside the channel manager */}
      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Beyond your channel manager"
              title="Property management for everything your channel manager does not do"
              intro="Bookings and pricing stay where they are. Everything your team needs to know about a property lives here instead of in notes, spreadsheets and group chats."
            />
            <ul className="mt-8 flex flex-col gap-5">
              {KEPT_TOGETHER.map((item) => (
                <li key={item.title} className="flex items-start gap-4">
                  <Icon name={item.icon} className={item.colour} />
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-zinc-600">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-teal-100 via-sky-100 to-violet-100 p-4 sm:p-8">
            <ProductShot
              src="/marketing/property-overview.jpg"
              alt="A property's page in Evo Stays, showing its address, key safe code, access notes and amenities"
              className="mx-auto w-full max-w-lg"
            />
          </div>
        </div>
      </Section>

      {/* What it covers */}
      <Section tone="tint">
        <SectionHeading eyebrow="And the day-to-day runs itself" title="The jobs you stop doing by hand" centre />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COVERS.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={`flex flex-col gap-3 rounded-2xl border p-6 transition-colors ${item.tone}`}
            >
              <Icon name={item.icon} className={item.colour} />
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-zinc-700">{item.body}</p>
            </Link>
          ))}
        </div>
      </Section>

      {/* On site: the cleaner and linen screens */}
      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <SectionHeading
              eyebrow="On the day"
              title="Everyone on the same page, on their own phone"
              intro="Your cleaners get their list, the way in and the checklist. Your linen company gets the times to arrive. Neither sees more than they need."
            />
            <div className="mt-8 flex flex-col gap-3 text-sm text-zinc-600">
              <p>
                Works with {PMS_NAMES.slice(0, -1).join(", ")} and {PMS_NAMES[PMS_NAMES.length - 1]}, or with calendar
                links from Airbnb, Vrbo and Booking.com.
              </p>
              <Link href="/features" className="w-fit font-semibold text-teal-700 underline underline-offset-4 hover:text-teal-900">
                See every feature
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 items-start gap-4 rounded-3xl bg-gradient-to-br from-amber-100 via-rose-100 to-violet-100 p-4 sm:gap-8 sm:p-8">
            <PhoneShot
              src="/marketing/cleaner-checklist.jpg"
              alt="A cleaner's checklist on a phone, split into rooms"
            />
            <PhoneShot
              src="/marketing/linen-schedule.jpg"
              alt="A linen company's delivery schedule on a phone, with the window to arrive at each property"
              className="mt-8"
            />
          </div>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
