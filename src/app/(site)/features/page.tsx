import { CheckIcon, CtaBand, PageIntro, Section } from "@/components/marketing/parts";

export const metadata = {
  title: "Features",
  description:
    "Scheduling, a guided cleaner workflow, stock, issues, laundry and linen, hours and invoices, and booking connections. Everything in Evo Stays, area by area.",
};

const AREAS = [
  {
    id: "scheduling",
    title: "Scheduling and assignment",
    lead: "Every checkout becomes a clean, and every clean lands with the right person.",
    points: [
      "Auto-assign by familiarity: a cleaner who already knows the property is offered it first, then by who has room in their day",
      "Cleaners can block days they are unavailable, and auto-assign respects them",
      "Same-day turnovers jump the queue with a finish-by time worked out from when the next guests arrive",
      "A warning when the same cleaner is booked at two properties on one day, shown before the day, not after",
      "A clear schedule: today, tomorrow, this week, next week, with anything overdue pulled to the top",
      "Move a clean to another day in one tap, or reassign a cleaner's upcoming cleans in bulk",
      "Cleaners confirm the time they will arrive, and the office is told in good time if one has not",
    ],
  },
  {
    id: "cleaners",
    title: "The cleaner's phone",
    lead: "A guided flow that is the same every time, on whatever phone they already carry.",
    points: [
      "Opens like an app from the home screen, with alerts on the lock screen",
      "Access notes and key safe codes on the clean itself, only for the properties they are assigned",
      "Photos of how the property should look, and any known issues, before they start",
      "A standard turnover checklist plus extras for that property, room by room",
      "Before and after photos, as many as needed, taken straight from the camera",
      "A step cannot be skipped from the browser: the order is enforced on the server",
      "Stock levels in a tap on the way out, and a place for notes",
    ],
  },
  {
    id: "stock",
    title: "Stock",
    lead: "Nobody counts bin bags. They say whether there are enough.",
    points: [
      "Set the items you track and which properties hold them, once",
      "Cleaners tap High, Medium, Low or None, no typing a count off a shelf",
      "An overview of every property running low, so a restock run is one list",
      "Each level is recorded against the visit, so you can see when it changed",
    ],
  },
  {
    id: "issues",
    title: "Problems and issues",
    lead: "Cleaners report what they find. The system decides how urgent it is.",
    points: [
      "Report damage, repairs, missing items or lost property mid-clean, with photos",
      "Urgency worked out from what is wrong, the property and when the next guests arrive, so no cleaner has to judge it",
      "Staff can log an issue too, adjust its urgency, and track it through to resolved",
      "Known issues are shown to the next cleaner, so the same broken shower is not reported twice",
    ],
  },
  {
    id: "linen",
    title: "Laundry and linen",
    lead: "Your linen company works from the same plan as your cleaners.",
    points: [
      "Record laundry loads from the visits they cover, and see exactly what is still out at each property",
      "Give your linen company its own login, limited to the properties they supply",
      "A week at a time, with a window to arrive in for each property: after the cleaner has had time to strip the beds, and while there is still time to make them with clean linen",
      "The window scales with the clean, and Evo Stays learns how long each property's clean really takes",
      "They can pick an exact time inside the window, or flag a problem for the office, who see it straight away",
      "They are told when a clean is moved or cancelled, or the cleaner's time changes",
      "Drive times between properties are estimated from distance, not live traffic, and they never see access codes",
    ],
  },
  {
    id: "hours",
    title: "Hours and invoices",
    lead: "Evo Stays tracks the hours. It does not take payments.",
    points: [
      "Hours come from real check-in and check-out times, not from memory",
      "An invoice per cleaner, weekly, fortnightly or monthly, kept separate for each property so every client's cleaning cost stands alone",
      "A minimum number of billed hours per visit, or a flat fee for a property, where you agree one",
      "Adjust a line when you need to, and mark an invoice paid once you have paid it",
    ],
  },
  {
    id: "bookings",
    title: "Bookings and connections",
    lead: "Bookings turn into cleans without anyone retyping them.",
    points: [
      "Connect Hostify, Guesty, Hostaway, Lodgify, OwnerRez, Hospitable, Smoobu, Hostfully or Beds24 from inside Evo Stays",
      "Or use calendar links from Airbnb, Vrbo and Booking.com, or add cleans by hand",
      "Import a client's properties from the booking system instead of typing them in",
      "New bookings, changes and cancellations are picked up automatically in the background",
      "Choose how far ahead cleans are created for a property",
    ],
  },
  {
    id: "alerts",
    title: "Alerts",
    lead: "Everyone affected hears about a change as it happens.",
    points: [
      "In the app, by email once it is set up, and as a notification on a phone that has alerts turned on",
      "A cleaner is told about a new clean, a move, a reassignment or a cancellation",
      "Staff are told about unassigned cleans, same-day turnovers running out of time, problems and unconfirmed arrivals",
      "Each person can switch email alerts off for themselves",
    ],
  },
  {
    id: "setup",
    title: "Set up the way you work",
    lead: "Not every company needs every part.",
    points: [
      "A few questions on day one switch on what you use: booking sync, cleaner invoices, laundry, stock",
      "Anything switched off disappears from the menus for you and your cleaners, and can be switched back on any time in Settings",
      "Nothing you have already recorded is deleted when you switch something off",
      "Logins for admin, office staff, cleaners and your linen company, each seeing only their own area",
      "An activity log of who changed what and when",
    ],
  },
  {
    id: "security",
    title: "Access and security",
    lead: "Keys and codes are only shown to the people who need them.",
    points: [
      "A cleaner sees only the properties they are assigned to",
      "Each company's data is kept separate from every other company's, enforced in the database itself",
      "Passwords are stored hashed, repeated wrong sign-in attempts are blocked, and changing a password signs that person out everywhere",
      "Evo Stays support can view a company's account to help, and that is recorded in the company's activity log",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <PageIntro
        eyebrow="Features"
        title="Everything in Evo Stays, area by area"
        intro="Built from the day-to-day of running short-let turnovers. Everything below works today."
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-[14rem_1fr]">
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

          <div className="flex flex-col gap-14">
            {AREAS.map((area) => (
              <section key={area.id} id={area.id} className="scroll-mt-24">
                <h2 className="text-2xl font-semibold tracking-tight">{area.title}</h2>
                <p className="mt-2 text-zinc-600">{area.lead}</p>
                <ul className="mt-5 flex flex-col gap-3">
                  {area.points.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-sm text-zinc-700">
                      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-900" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
