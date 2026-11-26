import type { Post } from "./types";

export const suppliesPost: Post = {
  slug: "holiday-let-supplies-stock",
  title: "Holiday let supplies: a restocking list and how not to run out",
  description:
    "What to keep stocked in a holiday let, a restocking checklist by room, and a simple way to track supplies without asking cleaners to count.",
  topic: "Holiday let supplies checklist",
  published: "2026-11-26",
  image: { src: "/marketing/stock-levels.jpg", alt: "Supply levels for a holiday let set to high, medium, low or none, grouped by room" },
  body: `
Nobody gets a good review for toilet roll. Plenty get a bad one without it. Supplies are cheap, easy to forget and surprisingly hard to track once you have more than one property.

## What to stock, by room

Decide what you provide and say so in your listing. Then keep it consistent.

**Kitchen**
- Washing up liquid, sponge or cloth
- Dishwasher tablets, rinse aid and salt, where there is a dishwasher
- Bin bags
- Kitchen roll
- Tea, coffee, sugar, if you offer a welcome tray
- Hand soap

**Bathrooms**
- Toilet roll, with spares where guests can find them
- Hand soap
- Body wash and shampoo, if you provide them
- Toilet cleaner

**Utility and cupboards**
- Cleaning products your cleaners use
- Laundry tablets, where there is a washing machine
- Spare light bulbs and batteries
- A basic first aid kit

Only list what belongs in that property. Rinse aid for a property with no dishwasher is noise, and noise gets skimmed.

## Why counting fails

Most stock sheets ask for numbers: how many rolls, how many bags. At the end of a changeover nobody wants to count bin bags, so the numbers are guessed, then left blank, then the sheet is abandoned.

## Ask for a level instead

Use four levels:

| Level | What it means | What happens |
| --- | --- | --- |
| High | Plenty | Nothing |
| Medium | Fine for a few stays | Nothing yet |
| Low | Will run out soon | Add to the next restock run |
| None | Gone | Restock before the next guest |

A cleaner can answer that at a glance, and it is all you need to decide what to send.

## Ask in walking order

Group the questions by room in the order someone moves through the property: kitchen, kitchen cupboard, living area, bathroom, bedroom, store cupboard. A list that sends someone to the kitchen, then the cupboard, then back to the kitchen will not be done properly.

## One list for restocking

Collect every "low" and "none" from all properties into one list. Now restocking is a planned run, with the right quantities, rather than a dash to the shop between changeovers.

Look at it at a fixed time each week, and again the day before a busy weekend.

## Where to keep spares

- Keep a small reserve in each property, somewhere guests will not use it up
- Keep bulk stock in one place you control
- Lock owner and cleaner supplies away from guest supplies if you can
- Make sure whoever restocks can get in

## What it costs you

You do not need elaborate accounting, but note roughly what each property uses over a few months. One that gets through far more than similar ones is worth a look: a guest pattern, a leak that is eating kitchen roll, or stock walking off.

## Doing it on a phone

In [Evo Stays](/features#stock) each property has its own list, cleaners tap a level for each item as they work through the rooms, dishwasher supplies are only offered where there is a dishwasher, and everything running low appears in one place. The four levels work just as well on a shared sheet.

Related: [the changeover cleaning checklist](/blog/holiday-let-cleaning-checklist).
`,
  faq: [
    {
      question: "What supplies should a holiday let provide?",
      answer:
        "At a minimum, enough toilet roll, hand soap, washing up liquid and bin bags to start a stay. What else you provide is your choice: say so clearly in your listing.",
    },
    {
      question: "Who should restock a holiday let?",
      answer:
        "Cleaners are best placed to report levels. Whether they also restock depends on whether they can carry or store supplies, and whether you pay for that time.",
    },
  ],
};
