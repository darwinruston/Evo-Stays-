// Content shared across the public pages: navigation, contact topics and the
// FAQ. Every claim here is something the product really does today; nothing is
// promised that isn't built. Kept apart from the pages so the home page, the
// FAQ page and the footer can't drift out of step with each other.

export const SITE_NAME = "Evo Stays";

export const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const FOOTER_GROUPS = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/signup", label: "Register interest" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/cookies", label: "Cookies" },
    ],
  },
] as const;

export const CONTACT_TOPICS = [
  { value: "demo", label: "I'd like a demo" },
  { value: "question", label: "A question about Evo Stays" },
  { value: "partnership", label: "Working together" },
  { value: "other", label: "Something else" },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];

// An address shown on the site only when one has been set (CONTACT_EMAIL in
// the environment). Until then the Contact form is the way to get in touch.
export function publicContactEmail(): string | null {
  return process.env.CONTACT_EMAIL?.trim() || null;
}

export type FaqItem = { question: string; answer: string };

export const FAQ: FaqItem[] = [
  {
    question: "Who is Evo Stays for?",
    answer:
      "Teams that run their own cleaning for short-let properties: property management companies, cleaning companies working for those businesses, and hosts with a team of their own. It is not a marketplace. You bring your cleaners and Evo Stays runs the day-to-day around them.",
  },
  {
    question: "Is it live yet?",
    answer:
      "Not open to everyone yet. We are working with early customers and setting each one up personally. Register your interest and we will get in touch to talk through how you work and arrange a demo.",
  },
  {
    question: "How much does it cost?",
    answer:
      "During the early period, pricing is agreed with each company. Register your interest or send us a message and we will talk it through with you.",
  },
  {
    question: "Do my cleaners need to download an app?",
    answer:
      "No app store and nothing to install from one. Evo Stays works in the phone's browser, and a cleaner can add it to their home screen so it opens like an app and can send alerts. On an iPhone, alerts need iOS 16.4 or later and the app opened from the home screen icon.",
  },
  {
    question: "Which booking systems does it connect to?",
    answer:
      "Hostify, Guesty, Hostaway, Lodgify, OwnerRez, Hospitable, Smoobu, Hostfully and Beds24, plus any calendar link (iCal) from Airbnb, Vrbo or Booking.com. Or add cleans by hand if you prefer. Each company connects its own account, with no help from us needed.",
  },
  {
    question: "Does it take payments or pay my cleaners?",
    answer:
      "No. Evo Stays adds up the hours each cleaner has worked, from their real check-in and check-out times, into an invoice they can use to bill you. How and when you pay them stays with you.",
  },
  {
    question: "Can I switch parts of it off?",
    answer:
      "Yes. When a company starts, we ask a few questions about how it works: where bookings come from, whether cleaner hours become invoices, whether laundry is tracked, whether cleaners record stock. Anything you do not use is hidden for you and your cleaners, and you can change it later in Settings.",
  },
  {
    question: "How does our linen or laundry company fit in?",
    answer:
      "They get their own login. It shows a week at a time of the properties they supply, with the window to arrive in at each one. That window is worked out from when the cleaner arrives and how long the property usually takes to clean. They can pick an exact time or flag a problem, and they are told if a clean moves or is cancelled. Drive times between properties are estimated, not live traffic.",
  },
  {
    question: "Who can see what?",
    answer:
      "A cleaner sees only the properties they are assigned to, with the access notes for them. A linen company sees addresses and times, never access codes.",
  },
  {
    question: "Do property owners or guests get a login?",
    answer:
      "Not at the moment. Evo Stays is built for your own team: admin, office staff, cleaners and a linen company.",
  },
  {
    question: "What happens when a cleaner has no signal?",
    answer:
      "The app tells them they are offline, and anything they try to save will not go through until the signal is back. It does not store work to send later, so we would not promise it for a basement with no signal at all.",
  },
];
