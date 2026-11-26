import type { Post } from "./types";

export const payingCleanersPost: Post = {
  slug: "paying-holiday-let-cleaners",
  title: "Paying holiday let cleaners: per changeover or by the hour?",
  description:
    "Flat fee per changeover or hourly pay for holiday let cleaners: how each works, what to record, and the UK rules to check before you decide.",
  topic: "How to pay holiday let cleaners",
  published: "2026-11-26",
  body: `
There are two common ways to pay for holiday let changeovers: a fixed fee for each property, or an hourly rate. Both work. Both cause arguments when the details are left vague.

**This post is general information, not legal or tax advice.** Check the official guidance linked below, and take advice about your own arrangements.

## Flat fee per changeover

You agree a price for each property.

**Good for:** predictable costs, simple invoicing, rewarding an efficient cleaner.

**Watch for:** a property left in a bad state costs the cleaner, not you, which breeds resentment or corner cutting. Large or awkward properties are easy to underprice. If the people are workers rather than genuinely self-employed, you still need their pay to meet minimum wage for the time actually worked.

**Make it work:** time several visits before setting the fee, say what counts as extra (heavy soiling, extra linen, a deep clean), and review it.

## Hourly pay

You pay for time on site.

**Good for:** fairness when the state of a property varies, and for new properties where you do not yet know how long it takes.

**Watch for:** you need dependable start and finish times, and costs move.

**Make it work:** record arrival and departure, record how many people worked, and agree whether there is a minimum number of hours for a visit.

## A mix of both

Many teams pay hourly while learning a property, then agree a fee once the time is clear. Others pay a fee with a stated hourly rate for extra work. Write down which applies to which property.

## What to record, whichever you choose

| Record | Why |
| --- | --- |
| Date and property | The basics of any invoice |
| Arrival and departure | Settles questions about time |
| Number of people | Two people for two hours is four hours of work |
| Extras agreed | Stops surprises at the end of the month |
| Rate or fee at the time | So a later change does not rewrite old work |

## Rules to check

**Employment status.** Whether someone is an employee, a worker or self-employed depends on how you actually work together: who controls the hours, who provides equipment, whether they can send someone else. Calling someone self-employed does not make it so. See GOV.UK on [employment status](https://www.gov.uk/employment-status/worker).

**Minimum wage.** Employees and workers are entitled to at least the National Minimum Wage or National Living Wage. Rates change, so check the current figures on GOV.UK.

**Travel between jobs.** For workers, time spent travelling from one assignment to another generally counts as working time. Travel from home to the first job generally does not. See [working hours for which the minimum wage must be paid](https://www.gov.uk/guidance/calculating-the-minimum-wage/working-hours-for-which-the-minimum-wage-must-be-paid).

**Holiday pay, pensions and insurance** may also apply, depending on status.

## Agree it in writing

A short written agreement avoids most disputes:

1. How pay is worked out
2. What happens for cancellations, and with how much notice
3. What counts as extra
4. When and how you pay
5. Who provides products and equipment

## Make the monthly sum boring

The aim is that nobody has to remember anything at the end of the month. If times and team size are recorded at each visit, the total adds itself up.

[Evo Stays](/features#hours) records check-in, check-out and how many people cleaned, adds it into an invoice per cleaner per property, supports flat fees and minimum hours, and can send the invoice to Xero as a bill. It does not make payments: that stays with you.

Related: [managing cleaners across several holiday lets](/blog/manage-cleaners-multiple-holiday-lets).
`,
  faq: [
    {
      question: "Is it better to pay holiday let cleaners per clean or per hour?",
      answer:
        "Per clean gives predictable costs once you know how long a property takes. Per hour is fairer when the work varies. Many teams start hourly and move to a fee.",
    },
    {
      question: "Do I have to pay cleaners for travel between properties?",
      answer:
        "For workers, GOV.UK says travel from one assignment to another generally counts as working time. It depends on their employment status, so check the guidance.",
    },
    {
      question: "Are holiday let cleaners self-employed?",
      answer: "Some are and some are not. It depends on how the arrangement works in practice, not on the label.",
    },
  ],
};
