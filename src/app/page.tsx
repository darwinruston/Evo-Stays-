import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EvoTick } from "@/components/EvoTick";
import { button, card } from "@/lib/ui";
import {
  ChecklistIcon,
  BoxIcon,
  ReceiptIcon,
  WashingMachineIcon,
  GridIcon,
  ShieldIcon,
  BellIcon,
  AlertIcon,
} from "@/components/Icons";

// Signed-in visitors never see this -- "/" is purely a router for them (see
// the redirect below). Everyone else lands here first: the public front
// door describing what the platform actually does, before /login.
export const metadata = { title: "Evo Stays" };

// The three flagship flows, each paired with a real screenshot
// (public/marketing/*.jpg -- captured from this app's own seeded data, not
// stock photography or a mockup) rather than described in prose alone.
// Everything these three don't cover is still true, just in the lighter
// FEATURES grid further down instead of a full showcase section.
const SHOWCASES = [
  {
    eyebrow: "Scheduling",
    title: "Assigned to whoever already knows the property",
    body: "Every checkout becomes a scheduled clean on its own, matched to a cleaner who's already worked that property and has room in their day, not just whoever's next in a queue. Same-day turnovers jump ahead automatically, with a finish-by time nobody has to calculate by hand, and if the same cleaner ends up booked twice in one day, it's flagged right there on the schedule instead of being discovered when they don't show.",
    image: "/marketing/cleans-schedule.jpg",
    alt: "Evo Stays cleans schedule for today, showing two cleans flagged \"Cleaner User has 2 cleans this day\"",
  },
  {
    eyebrow: "Cleaner workflow",
    title: "A checklist cleaners actually follow",
    body: "Access notes, key safe codes, and a room-by-room checklist, right there on the clean itself: check in, work the list, photograph before and after, flag anything wrong. A step can't be faked from the browser, it's gated server-side, not just a UI that trusts whatever the phone sends back.",
    image: "/marketing/cleaner-checklist.jpg",
    alt: "A cleaner's guided checklist for a property, broken into Kitchen, Bathroom and Bedrooms",
  },
  {
    eyebrow: "Stock",
    title: "Stock levels, updated in one tap",
    body: "Set a par level once per property (a pack or order size, not a guess) and a cleaner confirms High, Medium, Low or None with a tap on their way out, no typing a count off a shelf. Anything running low shows up before a guest notices, not after.",
    image: "/marketing/stock-levels.jpg",
    alt: "Per-property stock levels for toilet roll, bin bags and hand soap, each set with a High/Medium/Low/None toggle",
  },
];

const STEPS = [
  {
    icon: BellIcon,
    title: "A booking comes in",
    body: "Connect a calendar feed or Hostify and every new checkout turns into a scheduled clean on its own. Nobody has to notice a booking and add it by hand.",
  },
  {
    icon: ChecklistIcon,
    title: "A cleaner works the checklist",
    body: "Check in, work room by room, before and after photos, notes: the same guided flow every time, on whatever phone they already carry.",
  },
  {
    icon: GridIcon,
    title: "The admin side takes care of itself",
    body: "Stock levels update in a tap, invoices generate from real check-in/check-out times, and staff are told the moment a plan changes, not left to find out in a group chat.",
  },
];

// Short, concrete claims -- each one traceable to real behaviour in the app
// (see src/lib/autoAssign.ts, src/lib/cleans.ts, src/lib/authz.ts) rather
// than generic marketing language.
const USPS = [
  "Auto-assigned by familiarity, not just availability",
  "Workflow gated server-side: a step can't be faked from the browser",
  "Invoices generated from real check-in/check-out times",
];

// Everything the three showcases above don't already cover in detail.
const FEATURES = [
  {
    icon: AlertIcon,
    title: "Problems caught before guests find them",
    body: "Cleaners report what they find mid-clean (no hot water, a leak, guest damage) with photos as evidence. The system works out how urgent it is from what's wrong and when the next guests arrive, and staff track each one through to resolved.",
  },
  {
    icon: BellIcon,
    title: "Everyone told the moment plans change",
    body: "A new booking, a cancellation, a reassignment: the cleaner affected is notified in the app and by email, and staff get a heads-up when a same-day turnover is running out of time.",
  },
  {
    icon: ReceiptIcon,
    title: "Hours added up into invoices, in one click",
    body: "Set an hourly rate once, then generate invoices straight from real check-in/check-out times, grouped per property, since each one belongs to a different client who needs their own cleaning cost visible on its own, not lumped in with the rest of the portfolio.",
  },
  {
    icon: WashingMachineIcon,
    title: "Laundry, tracked door to door",
    body: "Which visits' linen went out and which laundry company is handling it, covering however many visits went together in one trip. A property's own page shows exactly what's still out, and it clears itself once it's back.",
  },
  {
    icon: BoxIcon,
    title: "Nine PMSs, one connection",
    body: "Hostify, Guesty, Hostaway, Lodgify, OwnerRez, Hospitable, Smoobu, Hostfully, Beds24: connect the one your portfolio already runs on and reservations start turning into scheduled cleans straight away, no spreadsheet exports.",
  },
  {
    icon: ShieldIcon,
    title: "Access scoped to the job",
    body: "A cleaner only ever sees a property they're actually assigned to, including the access notes and key safe codes, so onboarding someone new never means handing over the whole portfolio.",
  },
];

// What's actually in the package, as a flat checklist rather than the
// feature cards' prose -- for someone skimming to answer "does this cover
// what we need" in one glance, each line traceable to the same real
// behaviour FEATURES/SHOWCASES describe above.
const INCLUDED = [
  "Turnover scheduling with familiarity-based auto-assignment",
  "Guided cleaner workflow: check-in, before/after photos, notes",
  "Per-property stock level tracking, tapped not typed",
  "Issue reporting with automatic urgency triage",
  "In-app and email notifications for every schedule change",
  "Cleaner invoicing from real check-in/check-out times",
  "Laundry drop-off tracking, door to door",
  "Role-scoped access: cleaners see only their own assigned properties",
  "Self-service sync with 9 major PMSs, plus generic iCal",
  "One dashboard for the whole portfolio",
];

// A browser-chrome frame around a real screenshot (public/marketing/*.jpg)
// -- the dots-and-bar treatment is what tells a visitor "this is the actual
// product" rather than a decorative illustration, the same convention
// competitor sites (Breezeway, Turno) use around their own dashboard shots.
function ProductShot({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_48px_-24px_rgba(0,0,0,0.25)] ${className}`}>
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

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    // The platform owner has their own area entirely (see requirePlatformOwner
    // in src/lib/authz.ts) -- checked ahead of the role-based split below,
    // since that account still carries a staff role to satisfy the schema
    // even though it isn't a customer running cleaning operations.
    if (session.user.email === process.env.PLATFORM_OWNER_EMAIL) redirect("/owner");
    redirect(session.user.role === "CLEANER" ? "/cleaner" : session.user.role === "LINEN" ? "/linen" : "/admin");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-background/80 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <EvoTick className="h-7 w-auto" />
          <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-600 md:flex">
            <a href="#features" className="hover:text-zinc-900">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-zinc-900">
              How it works
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className={button("ghost", "sm")}>
              Sign in
            </Link>
            <Link href="/signup" className={button("primary", "sm")}>
              Register interest
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="px-4 pt-16 pb-20 sm:px-6 sm:pt-24 lg:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center rounded-full border border-black/10 bg-surface px-3 py-1 text-xs font-medium text-zinc-600">
              For short-let management teams
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
              Cleaning and stock operations for short-let properties
            </h1>
            <p className="mt-5 text-lg text-zinc-600">
              Evo Stays is the operations hub a short-let management company runs its own team
              from: scheduling turnovers, tracking stock and laundry, and paying cleaners, all
              in one place instead of a spreadsheet and a group chat.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/signup" className={button("primary", "lg")}>
                Register interest
              </Link>
              <Link href="/login" className={button("secondary", "lg")}>
                Sign in
              </Link>
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Not live yet. Leave your details and we&apos;ll be in touch for a demo.
            </p>
          </div>

          <ProductShot
            src="/marketing/dashboard.jpg"
            alt="Evo Stays dashboard overview, showing clients, properties, cleans outstanding, and this week's schedule"
            className="mx-auto mt-14 max-w-2xl"
          />

          <ul className="mx-auto mt-10 flex max-w-3xl flex-col gap-3 divide-y divide-black/5 sm:flex-row sm:gap-0 sm:divide-x sm:divide-y-0">
            {USPS.map((usp) => (
              <li key={usp} className="flex items-start gap-2 pt-3 text-sm text-zinc-600 first:pt-0 sm:flex-1 sm:items-center sm:px-5 sm:pt-0 sm:text-center sm:first:pl-0 sm:last:pr-0">
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 sm:mt-0 sm:hidden"
                  aria-hidden="true"
                >
                  <path d="M4 10.5 8 14l8-8" />
                </svg>
                {usp}
              </li>
            ))}
          </ul>
        </section>

        <section id="how-it-works" className="border-t border-black/5 bg-surface px-4 py-16 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-5xl">
            <div className="max-w-xl">
              <h2 className="text-sm font-medium text-zinc-500">How it works</h2>
              <p className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
                From booking to paid invoice, without anyone chasing it
              </p>
            </div>
            <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
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
          </div>
        </section>

        <section id="features" className="px-4 py-20 sm:px-6 lg:px-10">
          <div className="mx-auto flex max-w-5xl flex-col gap-20">
            {SHOWCASES.map((showcase, i) => (
              <div
                key={showcase.title}
                className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}
              >
                <div>
                  <span className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                    {showcase.eyebrow}
                  </span>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                    {showcase.title}
                  </h2>
                  <p className="mt-4 text-zinc-600">{showcase.body}</p>
                </div>
                <ProductShot src={showcase.image} alt={showcase.alt} />
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-black/5 bg-surface px-4 py-16 sm:px-6 lg:px-10">
          <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className={card("flex flex-col gap-4 p-6")}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900">
                  <f.icon className="h-5 w-5" />
                </span>
                <div className="flex flex-col gap-2">
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-zinc-600">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-10">
          <div className={`mx-auto max-w-3xl ${card("p-6 sm:p-10")}`}>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">What&apos;s included</h2>
            <p className="mt-1.5 text-sm text-zinc-500">
              Everything below is in the package from day one: no add-ons, no separate tier to
              unlock it.
            </p>
            <ul className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-700">
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 h-4 w-4 shrink-0 text-zinc-900"
                    aria-hidden="true"
                  >
                    <path d="M4 10.5 8 14l8-8" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-black/5 px-4 py-16 sm:px-6 lg:px-10">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900">
              <ShieldIcon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">Built for the team, not the guest</h2>
            <p className="mt-3 text-zinc-600">
              There&apos;s no guest-facing side and no client login by design. This is a tool
              for a management company&apos;s own admin, office staff, and cleaners to run
              day-to-day operations, not something property owners sign into.
            </p>
          </div>
        </section>

        <section className="border-t border-black/5 bg-surface px-4 py-16 sm:px-6 lg:px-10">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Want a look when it&apos;s ready?
            </h2>
            <p className="text-zinc-600">
              Leave your details and we&apos;ll reach out to set up a demo as soon as Evo Stays is
              live.
            </p>
            <Link href="/signup" className={button("primary", "lg")}>
              Register interest
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/5 px-4 py-6 text-center text-sm text-zinc-500 sm:px-6 lg:px-10">
        Evo Stays
      </footer>
    </div>
  );
}
