// The articles on the public site (/articles). Written to be useful on their
// own, whether or not the reader ever buys anything, with the product mentioned
// plainly at the end. The same truthfulness rule as the rest of the site: no
// invented figures, customers or quotes, and nothing about the law that is not
// "check the current rules".

export type ArticleBlock = { heading: string } | { text: string } | { list: string[] };

export type Article = {
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  published: string;
  body: ArticleBlock[];
};

export const ARTICLES: Article[] = [
  {
    slug: "short-let-cleaning-checklist",
    title: "A short-let cleaning checklist your cleaners will actually use",
    summary: "A room-by-room list to copy, and what makes the difference between a checklist that is read and one that is ignored.",
    minutes: 4,
    published: "2026-11-26",
    body: [
      { text: "Most turnover checklists fail for the same reason: they try to describe how to clean. A good cleaner knows how to clean. What they need is a short list of what done looks like, and anything unusual about this particular property." },
      { heading: "The standard list" },
      { text: "Start with one list that is the same everywhere, so it becomes habit." },
      { heading: "Kitchen" },
      { list: ["Sink clear", "Dishes and cutlery put away", "Dishwasher run and emptied, where there is one", "Fridge wiped out", "Surfaces wiped down"] },
      { heading: "Bathroom" },
      { list: ["Toilet, sink and shower cleaned", "Mirror streak-free", "Fresh towels out", "Bin emptied"] },
      { heading: "Bedrooms" },
      { list: ["Fresh linen, bed made", "Surfaces dusted", "Floor clear"] },
      { heading: "Living area and the way out" },
      { list: ["Surfaces clear and dusted", "Cushions straightened", "Floor vacuumed", "Bins emptied and bags replaced", "Windows and doors locked", "Nothing left behind from the last guest"] },
      { heading: "Add only what is different" },
      { text: "A hot tub, a log burner, a welcome tray that has to be set a certain way. Add these to the property they belong to, not to everyone's list. And take away what does not apply: asking someone to empty a dishwasher that does not exist teaches them to skim." },
      { heading: "Ask for photos, before and after" },
      { text: "A before photo shows the state the guests left. An after photo shows the state you handed over. Together they settle most disagreements, and they take a few seconds on a phone." },
      { heading: "Keep it on the phone they already have" },
      { text: "A laminated sheet cannot tell you it was read. A list on the cleaner's phone, next to the way in and the arrival time, gets used because everything else they need is in the same place. That is how Evo Stays does it, but the list above works on paper too. Copy it and change it." },
    ],
  },
  {
    slug: "same-day-turnovers",
    title: "Same-day turnovers without the group chat",
    summary: "Checkout at 10, check-in at 3. How to know early which cleans are tight, instead of finding out at 2pm.",
    minutes: 3,
    published: "2026-11-26",
    body: [
      { text: "A same-day turnover is not harder to clean. It is harder because there is no slack: if anything goes wrong, a guest finds out." },
      { heading: "Know which ones they are, the day before" },
      { text: "The information is already in your bookings: one guest leaves and another arrives on the same date. The trouble is that it sits across two bookings, so nobody sees it until they look. List tomorrow's same-day turnovers every afternoon, or use something that flags them for you." },
      { heading: "Give each one a finish-by time" },
      { text: "\"Same day\" is not a deadline. \"Done by 2.30\" is. Work back from the arrival, leave room for the unexpected, and tell the cleaner the time, not just the date." },
      { heading: "Confirm arrival, do not assume it" },
      { text: "Ask each cleaner to confirm what time they will get there. A missing confirmation the morning of a tight clean is your earliest warning, and the cheapest one to act on." },
      { heading: "Watch for the same person in two places" },
      { text: "The most common clash is not a cleaner who forgets. It is one cleaner given two tight properties across town on the same day. Check for it when you schedule, not on the day." },
      { heading: "Decide your fallback in advance" },
      { list: ["Who can cover at short notice?", "Who tells the guest if arrival has to slip?", "What gets done first if there is not time for everything?"] },
      { text: "Evo Stays flags same-day turnovers, works out a finish-by time and warns you about double bookings. Whatever you use, the habit matters more than the tool: look a day ahead." },
    ],
  },
  {
    slug: "running-out-of-supplies",
    title: "How to stop running out of loo roll without counting anything",
    summary: "Cleaners will not count bin bags, and they should not have to. A simpler way to keep properties stocked.",
    minutes: 3,
    published: "2026-11-26",
    body: [
      { text: "Stock systems usually ask for numbers. Nobody counts bin bags at the end of a turnover, so the numbers are guessed, then skipped, then the system is abandoned." },
      { heading: "Ask for a level, not a number" },
      { text: "High, medium, low or none. A cleaner can answer that at a glance, and it is all you need to decide what to send." },
      { heading: "Ask in the order they walk" },
      { text: "If the list jumps from the kitchen to the store cupboard and back, it will not be done properly. Group it by room, in the order someone naturally moves through the property." },
      { heading: "Only list what belongs there" },
      { text: "Rinse aid and dishwasher salt for a property with no dishwasher is noise. Every irrelevant line makes the relevant ones easier to miss." },
      { heading: "Have one place to look" },
      { text: "The point of all this is a single list of what is running low across every property, so a restock run is planned rather than discovered by a guest." },
      { text: "This is how stock works in Evo Stays: a tap per item, grouped by room, with one list of what is low. A shared spreadsheet with the same four levels will take you a good part of the way." },
    ],
  },
  {
    slug: "safety-certificate-dates",
    title: "Where do your safety certificate dates live?",
    summary: "Gas, electrics, alarms, insurance. A simple way to make sure no date passes without anyone noticing.",
    minutes: 3,
    published: "2026-11-26",
    body: [
      { text: "Ask a short-let team where the gas safety date for a property is kept and you often hear: in an email, in the owner's folder, or in a spreadsheet someone made last year. None of those will tell you when it is about to run out." },
      { heading: "One list, every property, every date" },
      { text: "For each property, note each check that applies, when it was last done and when it is next due. Which checks apply, and how often, depends on where the property is and how it is let, so check the current rules on GOV.UK or with your local council rather than relying on any list, including ours." },
      { heading: "Remind early, more than once" },
      { text: "A reminder on the day is too late to book an engineer. Three months ahead lets you plan, one month ahead is when to book, and a week ahead is the last warning." },
      { heading: "Give it to a person" },
      { text: "A reminder sent to everyone belongs to no one. When something comes due, it should become a task with a name on it." },
      { heading: "Keep the certificates with the date" },
      { text: "File each certificate against the property it belongs to, and keep the old ones. When an owner, insurer or council asks in two years, you want to find it in a minute." },
      { text: "Evo Stays does this for each property: dates, reminders, certificates and a task for the team. It is a starting list, not legal advice. A spreadsheet with a column for the next due date, checked on the first of each month, is far better than nothing." },
    ],
  },
];

export function articleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
