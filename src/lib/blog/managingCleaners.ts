import type { Post } from "./types";

export const managingCleanersPost: Post = {
  slug: "manage-cleaners-multiple-holiday-lets",
  title: "How to manage cleaners across several holiday lets",
  description:
    "A practical system for managing cleaners across multiple holiday lets: who cleans what, how jobs are given out, what cleaners report and how to check quality.",
  topic: "Managing holiday let cleaners",
  published: "2026-11-26",
  image: { src: "/marketing/dashboard.jpg", alt: "An overview of properties, outstanding cleans and open issues for a short-let team" },
  body: `
One property and one cleaner can run on text messages. Five properties and three cleaners cannot, though most teams try for longer than they should. The signs are familiar: you are the only person who knows who is going where, the access code is somewhere in a chat, and you find out about damage from a guest.

Here is a system that scales, whatever you use to run it.

## 1. Give every property one record

Each property needs a single place holding:

- The address and how to get in, including key safe codes
- Bedrooms, bathrooms and how many it sleeps
- What is in it, such as a dishwasher, hot tub or log burner
- The checklist, and anything unusual
- Who usually cleans it
- Open problems

If a cleaner is off sick, whoever covers should be able to do a good job from this record alone. Share access codes only with the people who need them for that property.

## 2. Prefer familiar cleaners

A cleaner who knows a property is faster and misses less. Assign each property a regular cleaner and a backup. Only reach for someone new when neither is free, and give them more time.

Keep a note of the days each person cannot work, collected ahead, so you are not discovering it when you try to book them.

## 3. Turn bookings into jobs automatically where you can

Retyping checkouts into a rota is where dates get missed. If your booking system can feed your schedule, use it. If not, set a fixed time each day to transfer new, changed and cancelled bookings. Cancellations matter as much as new ones: a cleaner sent to an occupied property is a bad day for everyone.

For regular work that does not come from a booking, such as a weekly office or a long let, set it up once as a repeating job.

## 4. Make the job tell the whole story

A good job message needs no follow-up questions:

- Which property, and how to get in
- Date, arrival time and finish-by time
- Number of guests arriving, and whether the sofa bed is needed
- Anything particular to this visit
- The checklist

## 5. Agree what cleaners report, and how

Ask for facts, not judgements. "The shower tray is cracked, here is a photo" is useful. "It's probably not urgent" puts a decision on someone who cannot see your bookings. Let whoever can see the whole picture decide urgency.

Agree the moments you want to hear from them:

1. Confirming their arrival time
2. Arriving
3. Anything broken, missing or left behind
4. What is running low
5. Finishing

## 6. Check quality without hovering

Before and after photos are the lightest form of quality control there is. Look at them for new properties and new cleaners, and spot check the rest. When something is missed, add it to that property's checklist, not just to a message.

## 7. Keep stock in one view

Ask for a level, not a count: high, medium, low or none. Then keep one list of what is low across all properties so restocking is a planned run. More on this in [how to stop running out of supplies](/blog/holiday-let-supplies-stock).

## 8. Make pay boring

Record arrival and departure times and how many people worked, and pay becomes arithmetic instead of a monthly negotiation. See [paying holiday let cleaners](/blog/paying-holiday-let-cleaners) for the choices and the rules to check.

## 9. Do not forget everyone else

Your linen supplier needs to know when a clean moves. Owners may want to know when damage is found. Your office needs to see what is unassigned. Decide who is told what, so it does not all go through you.

## What to use

| Approach | Works when | Breaks when |
| --- | --- | --- |
| Group chat | One or two properties | Anything has to be found later |
| Shared calendar and spreadsheet | A handful of properties, few changes | Bookings change often, or several people edit |
| Channel manager task tool | You mainly need jobs from bookings | You need property records, stock, safety or pay in one place |
| Dedicated operations software | Several cleaners and many properties | You will not keep it up to date |

[Evo Stays](/features) is the last of these, for teams that run their own cleaners. Whichever you choose, the nine points above are the system. Software only makes it easier to keep.

## Start small

Do not change everything at once. Write the property records first. Then the standard job message. Then arrival confirmations. Each one removes a particular kind of phone call.
`,
  faq: [
    {
      question: "How many holiday lets can one cleaner manage?",
      answer:
        "It depends on size, travel and how many changeovers fall on the same day. Plan by hours on your busiest day, not by the number of properties.",
    },
    {
      question: "Should I use employed or self-employed cleaners?",
      answer:
        "That depends on how you actually work together, not on what a contract calls it. Read the GOV.UK guidance on employment status and take advice if unsure.",
    },
    {
      question: "Do cleaners need an app?",
      answer:
        "No, but they need one dependable place for jobs, access details and reporting. A web app they add to their home screen avoids anything to install from an app store.",
    },
  ],
};
