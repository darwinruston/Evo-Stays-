import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { button, card } from "@/lib/ui";
import { FAQ } from "@/lib/site";
import { PMS_NAMES } from "@/lib/siteIntegrations";
import {
  AlertIcon,
  BellIcon,
  BoxIcon,
  ChecklistIcon,
  GridIcon,
  ReceiptIcon,
  ShieldIcon,
  WashingMachineIcon,
} from "@/components/Icons";
import { CheckIcon, CtaBand, FaqList, PhoneShot, ProductShot, Section, SectionHeading } from "@/components/marketing/parts";

// Signed-in visitors never see this: "/" is purely a router for them (see the
// redirect below). Everyone else lands here first, the front door for anyone
// who might become a customer.
export const metadata = {
  title: { absolute: "Evo Stays: run every short-let turnover from one place" },
  description:
    "The operations hub for short-let teams that run their own cleaners. Bookings become scheduled cleans, cleaners work a checklist on their phone, and stock, laundry, linen and hours follow.",
};

const PAIN_POINTS = [
  { title: "A booking changes and the cleaner finds out on the day", body: "Plans live in a spreadsheet and a group chat, so someone is always working from the old version." },
  { title: "One cleaner, two properties, both at 11am", body: "A double booking is usually found when somebody does not turn up, not before." },
  { title: "The linen arrives too early or too late to use", body: "Nobody knows exactly when the cleaner will be there, or how long that property takes." },
  { title: "Chasing photos, hours and stock counts", body: "Proof of the clean, what was used and who worked how long ends up pieced together afterwards." },
];

const AUDIENCES = [
  {
    title: "Property managers",
    lead: "You look after properties for owners.",
    points: [
      "Bookings from your system turn into scheduled cleans on their own",
      "Each client's cleaning cost kept on its own, property by property",
      "Problems reported with photos and tracked until they are fixed",
    ],
  },
  {
    title: "Cleaning companies",
    lead: "You clean for other businesses with your own team.",
    points: [
      "Cleaners get a guided checklist with before and after photos as proof",
      "Hours from real check-in and check-out times add up into invoices",
      "Switch off anything you handle yourself, such as laundry",
    ],
  },
  {
    title: "Hosts with a team",
    lead: "Your own properties, your own cleaners.",
    points: [
      "Works from calendar links, so no booking system is needed",
      "A simple schedule your cleaners can open on their phone",
      "Stock and laundry tracking only if you want them",
    ],
  },
];

const STEPS = [
  {
    icon: ChecklistIcon,
    title: "Tell us how you work",
    body: "A few short questions: where your bookings come from, how you pay cleaners, whether you track laundry and stock. Evo Stays switches on what you use and hides the rest.",
  },
  {
    icon: BellIcon,
    title: "Bookings become cleans",
    body: "Connect your booking system or calendar links and every checkout turns into a scheduled clean, matched to a cleaner who already knows the property. Same-day turnovers jump the queue with a finish-by time.",
  },
  {
    icon: GridIcon,
    title: "Cleaners work from their phone",
    body: "They confirm when they will arrive, check in, work the checklist, take before and after photos, tap the stock level and flag anything wrong.",
  },
  {
    icon: ReceiptIcon,
    title: "The rest follows",
    body: "Linen is timed around the clean, hours become invoices, and everyone affected is told the moment a plan changes.",
  },
];

const SHOWCASES = [
  {
    eyebrow: "Scheduling",
    title: "Assigned to whoever already knows the property",
    body: "Every checkout becomes a scheduled clean, matched to a cleaner who has worked that property and has room in their day, not just whoever is next in a queue. Same-day turnovers jump ahead with a finish-by time nobody has to work out by hand, and if one cleaner is booked twice in a day it is flagged on the schedule instead of being found when they do not show.",
    image: "/marketing/cleans-schedule.jpg",
    alt: "The cleans schedule for today, with two cleans flagged as the same cleaner being booked twice on one day",
    kind: "desktop" as const,
  },
  {
    eyebrow: "Cleaner workflow",
    title: "A checklist cleaners actually follow",
    body: "Access notes, key safe codes and a room-by-room checklist sit on the clean itself. Check in, work the list, photograph before and after, flag anything wrong. A step cannot be skipped from the browser: the order is enforced on the server, not just on the screen.",
    image: "/marketing/cleaner-checklist.jpg",
    alt: "A cleaner's guided checklist for a property, split into Kitchen, Bathroom and Bedrooms",
    kind: "desktop" as const,
  },
  {
    eyebrow: "Linen and laundry",
    title: "Linen timed around the clean",
    body: "Your linen company gets its own login. It shows them a week at a time: which properties, and the window to arrive in. The window opens once the cleaner has had time to strip the beds and closes while there is still time to make them with clean linen. Evo Stays learns how long each property's clean really takes, so a big house gets its linen earlier than a studio. They can pick an exact time or flag a problem, and they are told if a clean moves or is cancelled.",
    image: "/marketing/linen-schedule.jpg",
    alt: "A linen company's delivery schedule on a phone, showing for each property the estimated clean time and the window to bring clean linen",
    kind: "phone" as const,
  },
  {
    eyebrow: "Stock",
    title: "Stock levels, updated in one tap",
    body: "Set a par level once per property, then a cleaner taps High, Medium, Low or None on the way out. No typing a count off a shelf. Anything running low shows up before a guest notices, not after.",
    image: "/marketing/stock-levels.jpg",
    alt: "Per-property stock levels for toilet roll, bin bags and hand soap, each set with a High, Medium, Low or None toggle",
    kind: "desktop" as const,
  },
];

const FEATURE_GROUPS = [
  {
    icon: GridIcon,
    title: "For the office",
    points: [
      "Auto-assign by familiarity and availability",
      "Same-day turnovers with a finish-by time",
      "Double-booking warnings before the day",
      "Problems triaged by the system, not by cleaners",
      "An alert for every change, in the app and by email",
    ],
  },
  {
    icon: ChecklistIcon,
    title: "For cleaners",
    points: [
      "Opens like an app from the home screen",
      "Confirm arrival time ahead of the clean",
      "Guided checklist and as many photos as needed",
      "Stock level in a tap, issues reported with photos",
      "Alerts on their phone when a clean changes",
    ],
  },
  {
    icon: WashingMachineIcon,
    title: "Linen and laundry",
    points: [
      "Their own login, a week at a time",
      "Arrival windows that scale with the clean",
      "Pick a time within the window, or flag a problem",
      "Told when a clean moves or is cancelled",
      "Laundry loads tracked from drop-off to return",
    ],
  },
  {
    icon: ReceiptIcon,
    title: "Hours and setup",
    points: [
      "Hours from real check-in and check-out times",
      "Invoices per cleaner, kept per property",
      "A setup that matches how you work",
      "Switch parts on or off later in Settings",
      "Admin, office, cleaner and linen logins",
    ],
  },
];

const TRUST = [
  {
    icon: ShieldIcon,
    title: "Each company's data kept apart",
    body: "Separation between companies is enforced in the database itself, so one company can never see another's properties, cleans or people.",
  },
  {
    icon: AlertIcon,
    title: "People see only what the job needs",
    body: "A cleaner sees the properties they are assigned to, including key safe codes. A linen company sees addresses and times, never access codes.",
  },
  {
    icon: BoxIcon,
    title: "Sign-in that defends itself",
    body: "Passwords are stored hashed, repeated wrong attempts are blocked, and changing a password signs that person out everywhere.",
  },
];

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    // The platform owner has their own area entirely (see requirePlatformOwner
    // in src/lib/authz.ts), checked ahead of the role-based split below, since
    // that account still carries a staff role to satisfy the schema even though
    // it isn't a customer running cleaning operations.
    if (session.user.email === process.env.PLATFORM_OWNER_EMAIL) redirect("/owner");
    redirect(session.user.role === "CLEANER" ? "/cleaner" : session.user.role === "LINEN" ? "/linen" : "/admin");
  }

  return (
    <>
      {/* Hero */}
      <section className="px-4 pt-14 pb-16 sm:px-6 sm:pt-24 sm:pb-20 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full border border-black/10 bg-surface px-3 py-1 text-xs font-medium text-zinc-600">
            For short-let teams with their own cleaners
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">Run every turnover from one place</h1>
          <p className="mt-5 text-lg text-zinc-600">
            Evo Stays is the operations hub for short-let teams that run their own cleaners. Bookings become scheduled
            cleans, cleaners work a checklist on their phone, and stock, laundry, linen and hours follow, instead of
            living in a spreadsheet and a group chat.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className={button("primary", "lg")}>
              Register interest
            </Link>
            <Link href="#how-it-works" className={button("secondary", "lg")}>
              See how it works
            </Link>
          </div>
          <p className="mt-3 text-sm text-zinc-500">
            Not open to everyone yet. Leave your details and we will set up a demo with you.
          </p>
        </div>

        <ProductShot
          src="/marketing/dashboard.jpg"
          alt="The Evo Stays dashboard, showing clients, properties, cleans outstanding and this week's schedule"
          className="mx-auto mt-14 max-w-2xl"
        />
      </section>

      {/* The problem */}
      <Section tone="surface">
        <SectionHeading
          eyebrow="Sound familiar?"
          title="Running turnovers should not depend on who remembered what"
          intro="Most teams start with a spreadsheet and a group chat, and it works until it does not."
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PAIN_POINTS.map((p) => (
            <li key={p.title} className="flex flex-col gap-2 rounded-2xl border border-black/5 bg-background p-5">
              <h3 className="font-semibold">{p.title}</h3>
              <p className="text-sm text-zinc-600">{p.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Who it's for */}
      <Section>
        <SectionHeading
          eyebrow="Who it is for"
          title="Built around how you actually operate"
          intro="No two operations look the same, so Evo Stays asks how yours works and sets itself up to match."
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {AUDIENCES.map((a) => (
            <div key={a.title} className={card("flex flex-col gap-4 p-6")}>
              <div>
                <h3 className="text-lg font-semibold">{a.title}</h3>
                <p className="mt-1 text-sm text-zinc-500">{a.lead}</p>
              </div>
              <ul className="flex flex-col gap-2.5">
                {a.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-zinc-700">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-900" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-zinc-500">
          Using a linen or laundry company? They can have their own login too, so the clean linen is there when your
          cleaner needs it.
        </p>
      </Section>

      {/* How it works */}
      <Section id="how-it-works" tone="surface">
        <SectionHeading
          eyebrow="How it works"
          title="From booking to invoice, without anyone chasing it"
        />
        <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <step.icon className="h-5 w-5 text-zinc-400" />
              </div>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-sm text-zinc-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Product showcases */}
      <Section>
        <div className="flex flex-col gap-20">
          {SHOWCASES.map((showcase, i) => (
            <div
              key={showcase.title}
              className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}
            >
              <div>
                <span className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">{showcase.eyebrow}</span>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{showcase.title}</h2>
                <p className="mt-4 text-zinc-600">{showcase.body}</p>
              </div>
              {showcase.kind === "phone" ? (
                <PhoneShot src={showcase.image} alt={showcase.alt} />
              ) : (
                <ProductShot src={showcase.image} alt={showcase.alt} />
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Everything in the box */}
      <Section tone="surface">
        <SectionHeading
          eyebrow="Everything included"
          title="One product for the whole chain"
          intro="Everyone who touches a turnover gets what they need, and nothing they do not."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURE_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-background p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900">
                <group.icon className="h-5 w-5" />
              </span>
              <h3 className="font-semibold">{group.title}</h3>
              <ul className="flex flex-col gap-2.5">
                {group.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-zinc-600">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/features" className="text-sm font-medium underline underline-offset-4 hover:text-zinc-600">
            See every feature
          </Link>
        </div>
      </Section>

      {/* Connections */}
      <Section>
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.2fr]">
          <SectionHeading
            eyebrow="Connections"
            title="Works with the booking system you already use"
            intro="Each company connects its own account from inside Evo Stays, with no help from us. No booking system? Calendar links from Airbnb, Vrbo and Booking.com work too, or add cleans by hand."
          />
          <ul className="flex flex-wrap gap-2.5">
            {PMS_NAMES.map((name) => (
              <li key={name} className="rounded-full border border-black/10 bg-surface px-4 py-2 text-sm font-medium text-zinc-700">
                {name}
              </li>
            ))}
            <li className="rounded-full border border-dashed border-black/15 px-4 py-2 text-sm text-zinc-500">
              Calendar links (iCal)
            </li>
          </ul>
        </div>
      </Section>

      {/* Phone */}
      <Section tone="surface">
        <SectionHeading
          eyebrow="On the phone"
          title="Works like an app, without the app store"
          intro="Cleaners open Evo Stays in their phone's browser and add it to the home screen. Nothing to download, nothing to keep updated."
          centre
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            ["Alerts on the lock screen", "A new clean, a change of time or a cancellation reaches the cleaner straight away, even when the app is closed."],
            ["Built for one hand", "Big buttons, a step at a time, and photos taken straight from the camera, one after another."],
            ["Honest about signal", "If a cleaner loses signal the app says so, rather than pretending a change has saved."],
          ].map(([title, body]) => (
            <div key={title} className="flex flex-col gap-2 rounded-2xl border border-black/5 bg-background p-6">
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-zinc-600">{body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Trust */}
      <Section>
        <SectionHeading eyebrow="Security and access" title="Keys, codes and people's data are taken seriously" centre />
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {TRUST.map((t) => (
            <div key={t.title} className={card("flex flex-col gap-3 p-6")}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900">
                <t.icon className="h-5 w-5" />
              </span>
              <h3 className="font-semibold">{t.title}</h3>
              <p className="text-sm text-zinc-600">{t.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-zinc-500">
          Evo Stays is built for your own team. There is no guest or property-owner login.{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-zinc-900">
            Read our privacy notice
          </Link>
          .
        </p>
      </Section>

      {/* FAQ */}
      <Section tone="surface">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <SectionHeading
            eyebrow="Questions"
            title="The things people usually ask"
            intro="Not here? Send us a message and we will answer it."
          />
          <div className="flex flex-col gap-5">
            <FaqList items={FAQ.slice(0, 6)} />
            <Link href="/faq" className="text-sm font-medium underline underline-offset-4 hover:text-zinc-600">
              All the questions
            </Link>
          </div>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
