import { CheckIcon, CtaBand, PageIntro, PhoneShot, ProductShot, Section, SectionHeading } from "@/components/marketing/parts";

export const metadata = {
  title: "Features",
  description:
    "How Evo Stays works, and what it does: a page for every property with its codes, maintenance and cleaning, plus scheduling, the cleaner's phone, stock, linen, hours and booking connections.",
};

const STEPS = [
  {
    title: "Tell us how you work",
    body: "When you start, Evo Stays asks a few short questions: where your bookings come from, whether you want cleaner hours turned into invoices, and whether you track laundry and stock. It then shows only the parts you use. You can change this any time in Settings.",
  },
  {
    title: "Bookings become cleans",
    body: "Connect your booking system or calendar links yourself, or add cleans by hand. Each checkout becomes a clean. It goes to a cleaner who already knows the property and is free that day. Same-day turnovers go first.",
  },
  {
    title: "Cleaners do the clean on their phone",
    body: "They confirm what time they will arrive, check in, follow the checklist, take photos, tap the stock level and report anything wrong.",
  },
  {
    title: "The rest follows",
    body: "Your linen company sees when to bring linen. Cleaner hours become invoices. Stock and problems show up in one place. Everyone affected is told when something changes.",
  },
];

type Area = {
  id: string;
  title: string;
  lead: string;
  points: string[];
  image?: { src: string; alt: string; kind: "desktop" | "phone" };
};

const AREAS: Area[] = [
  {
    id: "properties",
    title: "Every property in one place",
    lead: "Everything your team needs to know about a property, outside your channel manager.",
    points: [
      "Address, type, bedrooms, bathrooms and how many it sleeps",
      "Access notes and key safe codes, shown only to the cleaners on that property",
      "Which cleaners look after it",
      "Open problems with photos, kept against the property until fixed",
      "Every clean, with its checklist, photos and stock levels",
      "Bookings come in from your booking system, so you do not retype them",
    ],
    image: {
      src: "/marketing/property-overview.jpg",
      alt: "A property's page in Evo Stays, showing its address, key safe code and access notes, the cleaners assigned and an open maintenance issue",
      kind: "desktop",
    },
  },
  {
    id: "scheduling",
    title: "Scheduling",
    lead: "Every booking becomes a clean, and every clean goes to the right person.",
    points: [
      "New cleans go to a cleaner who already knows the property and is free",
      "Cleaners can mark days they cannot work, and those days are skipped",
      "Same-day turnovers go first, with a time the clean must be finished by",
      "If one cleaner is booked in two places at once, you are warned before the day",
      "A simple schedule: today, tomorrow, this week, next week. Anything overdue is at the top",
      "Move a clean to another day, or hand a cleaner's cleans to someone else, in a tap",
      "Cleaners confirm the time they will arrive, and you are told if one has not",
    ],
    image: {
      src: "/marketing/cleans-schedule.jpg",
      alt: "The cleans schedule for today, with two cleans flagged as the same cleaner being booked twice on one day",
      kind: "desktop",
    },
  },
  {
    id: "cleaners",
    title: "Cleaners' phones",
    lead: "The same simple steps every time, on the phone they already have.",
    points: [
      "Opens like an app from the home screen, with alerts on the lock screen",
      "Shows the access notes and key safe codes, only for the properties they are on",
      "Shows how the property should look, and any known problems, before they start",
      "A checklist room by room, with extras for that property",
      "Before and after photos, as many as needed, straight from the camera",
      "Steps cannot be skipped: the order is enforced, not just shown",
      "Stock level in a tap, and a place for notes",
    ],
    image: {
      src: "/marketing/cleaner-checklist.jpg",
      alt: "A cleaner's checklist for a property, split into Kitchen, Bathroom and Bedrooms",
      kind: "desktop",
    },
  },
  {
    id: "stock",
    title: "Stock",
    lead: "Nobody counts bin bags. They say whether there are enough.",
    points: [
      "Choose which items to track at each property",
      "Cleaners tap High, Medium, Low or None. No counting",
      "One list shows every property running low",
      "Each level is saved with the visit, so you can see when it changed",
    ],
    image: {
      src: "/marketing/stock-levels.jpg",
      alt: "Stock levels for toilet roll, bin bags and hand soap at a property, each set with a High, Medium, Low or None toggle",
      kind: "desktop",
    },
  },
  {
    id: "issues",
    title: "Problems",
    lead: "Cleaners report what they find. Evo Stays decides how urgent it is.",
    points: [
      "Cleaners report damage, repairs, missing items or lost property, with photos",
      "Urgency is worked out from what is wrong and when the next guests arrive, so cleaners do not have to decide",
      "Staff can log problems too, change the urgency and follow each one until it is fixed",
      "The next cleaner sees problems already reported, so they are not reported twice",
    ],
  },
  {
    id: "linen",
    title: "Linen and laundry",
    lead: "Your linen company works from the same plan as your cleaners.",
    points: [
      "Record laundry loads, and see what is still out at each property",
      "Give your linen company its own login. They only see the properties they supply",
      "They see a week at a time, with the window to arrive in for each property",
      "The window opens once the cleaner has had time to strip the beds, and closes while there is still time to make them with clean linen",
      "Evo Stays learns how long each property takes to clean, so a big house gets its linen earlier than a studio",
      "They can pick an exact time, or flag a problem that you see straight away",
      "They are told when a clean moves, is cancelled, or the cleaner's time changes",
      "Drive times are estimated from distance, not live traffic",
    ],
    image: {
      src: "/marketing/linen-schedule.jpg",
      alt: "A linen company's delivery schedule on a phone, showing for each property the estimated clean time and the window to bring clean linen",
      kind: "phone",
    },
  },
  {
    id: "hours",
    title: "Hours and invoices",
    lead: "Evo Stays adds up the hours. It does not take or make payments.",
    points: [
      "Hours come from real check-in and check-out times",
      "An invoice per cleaner, weekly, fortnightly or monthly, split by property",
      "Agree a minimum number of hours or a flat fee for a property",
      "Change any line, and mark an invoice paid when you have paid it",
    ],
  },
  {
    id: "bookings",
    title: "Bookings",
    lead: "Bookings turn into cleans without anyone retyping them.",
    points: [
      "Connect Hostify, Guesty, Hostaway, Lodgify, OwnerRez, Hospitable, Smoobu, Hostfully or Beds24 yourself",
      "Or use calendar links from Airbnb, Vrbo and Booking.com, or add cleans by hand",
      "Import a client's properties instead of typing them in",
      "New bookings, changes and cancellations are picked up automatically",
      "Choose how far ahead cleans are created",
    ],
  },
  {
    id: "alerts",
    title: "Alerts",
    lead: "Everyone affected hears about a change as it happens.",
    points: [
      "In the app, by email once it is set up, and on a phone that has alerts turned on",
      "Cleaners are told about a new clean, a move, a reassignment or a cancellation",
      "Staff are told about unassigned cleans, same-day turnovers running out of time, problems and unconfirmed arrivals",
      "Each person can switch their own email alerts off",
    ],
  },
  {
    id: "setup",
    title: "Set up your way",
    lead: "Not every team needs every part.",
    points: [
      "A few questions on day one switch on what you use: booking sync, cleaner invoices, laundry, stock",
      "Anything switched off is hidden for you and your cleaners, and can be turned back on in Settings",
      "Nothing you have already recorded is deleted when you switch something off",
      "Logins for admin, office staff, cleaners and your linen company, each with their own screens",
      "An activity log shows who changed what and when",
    ],
  },
  {
    id: "access",
    title: "Who sees what",
    lead: "Keys and codes only go to the people who need them.",
    points: [
      "A cleaner sees only the properties they are assigned to",
      "A linen company sees addresses and times, never access codes",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <PageIntro
        eyebrow="Features"
        title="How Evo Stays works, and what it does"
        intro="Your channel manager runs the bookings. Evo Stays runs everything else about a property. Everything here works today."
      />

      <Section id="how-it-works" tone="surface">
        <SectionHeading eyebrow="How it works" title="From setup to invoice" />
        <ol className="mt-10 grid gap-8 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-zinc-600">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-[13rem_1fr]">
          <nav aria-label="On this page" className="hidden lg:block">
            <ul className="sticky top-24 flex flex-col gap-2.5 text-sm text-zinc-500">
              {AREAS.map((a) => (
                <li key={a.id}>
                  <a href={`#${a.id}`} className="transition-colors hover:text-zinc-900">
                    {a.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-16">
            {AREAS.map((area) => (
              <section key={area.id} id={area.id} className="scroll-mt-24">
                <h2 className="text-2xl font-semibold tracking-tight">{area.title}</h2>
                <p className="mt-2 text-zinc-600">{area.lead}</p>
                <div className={`mt-6 grid items-start gap-8 ${area.image ? "xl:grid-cols-2" : ""}`}>
                  <ul className="flex flex-col gap-3">
                    {area.points.map((point) => (
                      <li key={point} className="flex items-start gap-3 text-sm text-zinc-700">
                        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-900" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  {area.image &&
                    (area.image.kind === "phone" ? (
                      <PhoneShot src={area.image.src} alt={area.image.alt} />
                    ) : (
                      <ProductShot src={area.image.src} alt={area.image.alt} />
                    ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
