import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { button, card } from "@/lib/ui";
import { PMS_NAMES } from "@/lib/siteIntegrations";
import { CtaBand, ProductShot, Section, SectionHeading } from "@/components/marketing/parts";

// Signed-in visitors never see this: "/" is purely a router for them (see the
// redirect below). Everyone else lands here first.
//
// Kept short on purpose: what Evo Stays is, and what it does for you. How it
// works, step by step, lives on the Features page and only there, so the two
// pages never say the same thing.
export const metadata = {
  title: { absolute: "Evo Stays: software that works for you" },
  description:
    "Evo Stays runs the day-to-day of your short-let cleaning: it schedules the cleans, guides your cleaners on their phones, and keeps stock, linen and hours in order.",
};

const COVERS = [
  {
    title: "Cleans organised for you",
    body: "Bookings turn into cleans and go to the right cleaner. Same-day turnovers and double bookings are flagged.",
    href: "/features#scheduling",
  },
  {
    title: "Cleaners always know what to do",
    body: "A checklist, photos and problem reports on their phone, opened like an app.",
    href: "/features#cleaners",
  },
  {
    title: "Linen there when it is needed",
    body: "Your linen company sees when to arrive at each property.",
    href: "/features#linen",
  },
  {
    title: "Stock and hours sorted",
    body: "Stock levels in a tap, and cleaner hours added up into invoices.",
    href: "/features#hours",
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
      {/* What we do */}
      <section className="px-4 pt-14 pb-16 sm:px-6 sm:pt-24 sm:pb-20 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full border border-black/10 bg-surface px-3 py-1 text-xs font-medium text-zinc-600">
            For short-let teams with their own cleaners
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">Software that works for you</h1>
          <p className="mt-5 text-lg text-zinc-600">
            Evo Stays runs the day-to-day of your short-let cleaning. It schedules the cleans, guides your cleaners on
            their phones, and keeps stock, linen and hours in order, so you can stop chasing.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className={button("primary", "lg")}>
              Register interest
            </Link>
            <Link href="/features" className={button("secondary", "lg")}>
              See what it does
            </Link>
          </div>
          <p className="mt-3 text-sm text-zinc-500">Not open to everyone yet. We will set up a demo with you.</p>
        </div>

        <ProductShot
          src="/marketing/dashboard.jpg"
          alt="The Evo Stays dashboard, showing clients, properties, cleans outstanding and this week's schedule"
          className="mx-auto mt-14 max-w-2xl"
        />
      </section>

      {/* What it covers */}
      <Section>
        <SectionHeading eyebrow="What it does for you" title="The jobs you stop doing by hand" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COVERS.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={card("flex flex-col gap-2 p-6 transition-colors hover:bg-black/[0.02]")}
            >
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-zinc-600">{item.body}</p>
            </Link>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-3 text-sm text-zinc-600">
          <p>
            Works with {PMS_NAMES.slice(0, -1).join(", ")} and {PMS_NAMES[PMS_NAMES.length - 1]}, or with calendar links
            from Airbnb, Vrbo and Booking.com.
          </p>
          <Link href="/features" className="w-fit font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-600">
            See every feature
          </Link>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
