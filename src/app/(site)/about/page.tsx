import Link from "next/link";
import { CtaBand, PageIntro, Section, SectionHeading } from "@/components/marketing/parts";
import { button, card } from "@/lib/ui";

export const metadata = {
  title: "About",
  description:
    "Who is behind Evo Stays, what we believe about running short-let turnovers, and where the product is today.",
};

const PRINCIPLES = [
  {
    title: "Your team, not a marketplace",
    body: "We do not find you cleaners or take a cut. You already have a team, and Evo Stays is the tool that runs the day around them.",
  },
  {
    title: "Cleaners report facts, the system decides",
    body: "A cleaner should say what is wrong and show a photo. Whether it is urgent depends on the property and when the next guests arrive, so the system works that out and staff can overrule it.",
  },
  {
    title: "It fits how you work, not the other way round",
    body: "A property manager and a cleaning company run very differently. Evo Stays asks how you operate and switches on only what you use.",
  },
  {
    title: "Everyone sees what they need and no more",
    body: "A cleaner sees their own properties. A linen company sees addresses and times, never door codes. Each company's data stays separate from every other's.",
  },
  {
    title: "Honest about what it does",
    body: "It tracks hours but does not take payments. Drive times are estimates. It tells a cleaner when they have no signal. We would rather say where the edges are than hide them.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="About"
        title="Built for the people who run short-let turnovers"
        intro="Evo Stays comes from the day-to-day of running short-let cleaning: same-day turnovers, linen that has to arrive at the right time, and a team that needs to know where to be."
      />

      <Section>
        <div className="mx-auto grid max-w-3xl gap-6 text-zinc-600">
          <p>
            Short-let operations are won or lost on turnovers. A guest checks out, the next one arrives, and in
            between sits a cleaner, a set of keys, a bag of linen and a lot of messages. When that lives in a
            spreadsheet and a group chat, things fall through the gaps, and they fall through at the worst moment.
          </p>
          <p>
            We built Evo Stays alongside real short-let operations, starting with the problems that come up every
            week: who is going where, whether the clean was actually done, what has run out, and when the linen
            needs to be there. Each part was shaped by how a real team works.
          </p>
          <p>
            It is made for operations in the UK, so dates are day first, money is in pounds and addresses are found
            from postcodes.
          </p>
        </div>
      </Section>

      <Section tone="surface">
        <SectionHeading eyebrow="What we believe" title="The ideas behind the product" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className={card("flex flex-col gap-2 p-6")}>
              <h3 className="font-semibold">{p.title}</h3>
              <p className="text-sm text-zinc-600">{p.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="mx-auto max-w-3xl">
          <SectionHeading eyebrow="Where we are" title="Early, and working with a few teams at a time" />
          <div className="mt-6 grid gap-4 text-zinc-600">
            <p>
              Evo Stays is not open to everyone yet. We are setting up early customers one at a time, so each team
              gets it configured around how they really work, and so what we build next comes from real use.
            </p>
            <p>This is what happens when you get in touch:</p>
            <ol className="grid list-decimal gap-2 pl-5">
              <li>You register your interest or send us a message.</li>
              <li>We talk through how you run things today, and what is not working.</li>
              <li>If it looks like a fit, we show you Evo Stays and set it up around your portfolio.</li>
            </ol>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className={button("primary", "md")}>
              Register interest
            </Link>
            <Link href="/contact" className={button("secondary", "md")}>
              Talk to us
            </Link>
          </div>
        </div>
      </Section>

      <CtaBand title="Run your next turnover with it" body="Tell us about your portfolio and we will show you how Evo Stays would fit." />
    </>
  );
}
