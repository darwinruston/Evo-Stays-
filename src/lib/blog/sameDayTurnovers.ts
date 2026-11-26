import type { Post } from "./types";

export const sameDayTurnoverPost: Post = {
  slug: "same-day-turnover-holiday-let",
  title: "Same-day turnovers: planning a changeover with no slack",
  description:
    "How to plan same-day turnovers in a holiday let or short let: work back from check-in, set a finish-by time, confirm arrivals and have a fallback ready.",
  topic: "Same-day turnover holiday let",
  published: "2026-11-26",
  image: { src: "/marketing/cleans-schedule.jpg", alt: "A schedule of today's holiday let cleans with each cleaner's arrival time" },
  body: `
One guest leaves in the morning, the next arrives in the afternoon. A same-day turnover is not harder to clean than any other. It is harder because there is no slack: if anything slips, a guest is the one who finds out.

The good news is that most of what goes wrong can be seen coming a day or more ahead.

## Work back from check-in

Start with the arrival time, not the departure time. Suppose check-out is 10am and check-in is 3pm. That looks like five hours. In practice it is often much less:

| What eats the time | Why |
| --- | --- |
| Late departures | Guests are not always gone on the dot |
| Travel | Your cleaner may be coming from another property |
| Linen | Clean sets have to be there before beds can be made |
| The unexpected | A blocked drain, a broken glass, a missing key |
| A buffer | You want the property ready before the guest is at the door, not as they arrive |

Take those away and decide a **finish-by time**. "Same day" is not a deadline. "Done by 2.30" is. Put the finish-by time on the job, where the cleaner will see it.

## Spot them early

The information is already in your bookings, but it is split across two of them, so nobody sees it until they look. Every afternoon, list tomorrow's same-day turnovers. Better still, look at the whole week on a Monday, because that is when you can still move something else.

For each one, check:

1. Who is cleaning it, and have they been told it is a same-day?
2. Are they booked somewhere else that day, and how far away?
3. Will linen be there in time?
4. Is anything known to be broken that needs someone besides the cleaner?

## Watch for one person in two places

The most common clash is not a cleaner who forgets. It is one cleaner given two tight properties across town on the same day. It is easy to do when each booking arrives separately. Check for it as you schedule, not on the morning.

If two properties must share a cleaner, decide the order now: usually the earlier arrival first, unless travel makes the other order much quicker.

## Confirm arrival, do not assume it

Ask each cleaner to confirm what time they will get there. This costs them a few seconds and gives you your earliest warning. A tight clean with no confirmed arrival on the morning is something you can still fix. A tight clean you learn about at 1pm is not.

## Get the linen there at the right moment

Linen is where good plans fail. The van needs to arrive after the cleaner is there to let it in and hand over the used set, but early enough that the beds can still be made. Tell your linen supplier the window for each property, and tell them when a clean moves. Our post on [holiday let linen](/blog/holiday-let-linen-how-many-sets) covers how many sets help here.

## Have a fallback before you need it

Write these down once and reuse them:

- **Who can cover at short notice?** Name two people, and ask them in advance.
- **Who tells the guest if arrival has to slip?** And how early will you tell them? An honest message at midday is received far better than silence at 3pm.
- **What gets done first if there is not time for everything?** Beds, bathrooms and kitchen usually come before windows and skirting boards.
- **Is there somewhere for the guest to leave bags?** A small offer can turn a delay into a non-event.

## When it keeps happening

If one property is always tight, look at why before blaming anyone. It may be that the checkout time is too late for the size of the place, that it is too far from the previous job, or that it needs two people. Time the visits for a few weeks and the answer is usually plain.

## Keeping it under control with several properties

With a handful of properties, a daily list is enough. With dozens, it helps for the same-day turnovers to flag themselves. [Evo Stays](/features#scheduling) does this from your bookings: same-day turnovers go first with a finish-by time, double bookings are flagged, cleaners confirm their arrival and you are told if one has not.

Whatever you use, the habit matters more than the tool: **look a day ahead.**
`,
  faq: [
    {
      question: "What check-out and check-in times work best for same-day turnovers?",
      answer:
        "The longer the gap the safer, but it depends on your market. Choose times that leave room for your largest property plus travel and a buffer, then review them against how long changeovers really take.",
    },
    {
      question: "Should two cleaners do a same-day turnover?",
      answer:
        "For larger properties it often makes sense. Two people can work in different rooms, and one can make beds as soon as linen arrives. Make sure your pay and invoices account for both.",
    },
    {
      question: "What should I tell a guest if the property will not be ready?",
      answer: "Tell them early, give a realistic time, and offer something practical such as leaving bags.",
    },
  ],
};
