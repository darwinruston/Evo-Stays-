import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EvoTick } from "@/components/EvoTick";
import { button, card } from "@/lib/ui";

// Signed-in visitors never see this -- "/" is purely a router for them (see
// the redirect below). Everyone else lands here first: the public front
// door describing what the platform actually does, before /login.
export const metadata = { title: "Evo Stays" };

const FEATURES = [
  {
    title: "Turnover cleaning, start to finish",
    body: "Schedule a clean, auto-assign it to whoever's already familiar with the property and has room that day, and let the cleaner work a guided flow on their phone: check in, before photos, after photos, notes. Each stage is gated server-side, not just hidden in the UI, so nothing gets skipped.",
  },
  {
    title: "Stock that doesn't run out mid-turnover",
    body: "Set a par level once per property -- a pack or order size, not a guess -- and cleaners confirm a High/Medium/Low/None level with a tap, no typing a count off a shelf. A running-low view surfaces every property before a guest notices, not after.",
  },
  {
    title: "Cleaner pay, generated in one click",
    body: "Set an hourly rate once, then generate invoices straight from real check-in/check-out times -- grouped per property, since each one belongs to a different client who needs their own cleaning cost visible on its own, not lumped in with the rest of the portfolio.",
  },
  {
    title: "Laundry, tracked door to door",
    body: "A photo of the ticket, the cost, and which launderette it went to -- covering however many visits' linen went out together in one trip. A property's own page shows exactly what's still out being cleaned, and it clears itself once it's back.",
  },
  {
    title: "One dashboard for the whole portfolio",
    body: "This week's schedule, workload per cleaner, and every property running low on stock -- all in one place, not scattered across a spreadsheet and a group chat.",
  },
];

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect(session.user.role === "CLEANER" ? "/cleaner" : "/admin");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-black/5 px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between">
          <EvoTick className="h-7 w-auto" />
          <Link href="/login" className={button("secondary", "sm")}>
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Cleaning and stock operations for short-let properties
            </h1>
            <p className="mt-5 text-lg text-zinc-600">
              Evo Stays is the operations hub a short-let management company runs its own team
              from -- scheduling turnovers, tracking stock and laundry, and paying cleaners, all
              in one place instead of a spreadsheet and a group chat.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/login" className={button("primary", "lg")}>
                Sign in
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:px-10">
          <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className={card("flex flex-col gap-2 p-6")}>
                <h2 className="font-semibold">{f.title}</h2>
                <p className="text-sm text-zinc-600">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-black/5 px-4 py-16 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Built for the team, not the guest</h2>
            <p className="mt-3 text-zinc-600">
              There&apos;s no guest-facing side and no client login by design -- this is a tool
              for a management company&apos;s own admin, office staff, and cleaners to run
              day-to-day operations, not something property owners sign into.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/5 px-4 py-6 text-center text-sm text-zinc-500 sm:px-6 lg:px-10">
        Evo Stays
      </footer>
    </div>
  );
}
