import type { Post } from "./types";

export const safetyCertificatesPost: Post = {
  slug: "holiday-let-safety-certificates-uk",
  title: "Holiday let safety certificates in the UK: what to track",
  description:
    "Gas safety, fire risk assessment, electrics, alarms and insurance for UK holiday lets: what to keep track of, with links to the official guidance.",
  topic: "Holiday let safety certificates UK",
  published: "2026-11-26",
  image: { src: "/marketing/health-safety.jpg", alt: "A list of safety checks that are overdue or coming up across several holiday lets" },
  body: `
Safety paperwork for a holiday let is not usually difficult. What goes wrong is that dates live in different places, nobody owns them, and one quietly passes.

This post sets out the main things UK short-let operators keep track of, with links to the official sources. **It is general information, not legal advice.** Rules differ between England, Scotland, Wales and Northern Ireland, they change, and what applies depends on the property and how it is let. Check the current guidance for your own properties.

## Gas safety

If a holiday let has gas appliances or flues, they need an annual safety check by a Gas Safe registered engineer. Keep the record, and make sure guests can see it. The Health and Safety Executive explains landlords' duties, including how long to keep records, in its [gas safety guidance for landlords and letting agents](https://www.hse.gov.uk/gas/domestic/faqlandlord.htm).

If a managing agent arranges checks for an owner, agree in writing who books them and who keeps the records. HSE is clear that the landlord keeps overall responsibility.

## Fire risk assessment

In England, premises that provide accommodation for paying guests fall under fire safety law, and that includes short-term lets that are not someone's principal home. You need a suitable and sufficient fire risk assessment, written down, and reviewed when the property changes.

The government guide [Making your small paying guest accommodation safe from fire](https://www.gov.uk/government/publications/making-your-small-paying-guest-accommodation-safe-from-fire) explains what to look at, including alarms, escape routes and what to tell guests. Larger or more complex buildings follow the sleeping accommodation guidance instead.

## Smoke, heat and carbon monoxide alarms

Alarms are part of your fire risk assessment. Test them regularly, replace batteries, and record that you did. A changeover is a natural moment for a cleaner to confirm that every alarm is in place and has not been taken down or covered.

## Electrics

Electrics in a holiday let must be safe, and many operators have an Electrical Installation Condition Report (EICR) carried out at least every five years. Whether a five-yearly report is a legal requirement for your property depends on how it is let and where it is: the private rented sector rules in England are aimed at tenancies, and Scotland has its own arrangements. Check before assuming either way, and ask your insurer what they expect.

## Portable appliances

Kettles, toasters, hair dryers and lamps take a lot of handling. Visual checks at changeovers catch damaged leads and plugs early. Some operators also have portable appliance testing done periodically as part of managing risk.

## Registration and licensing

- **Scotland** requires short-term lets to be licensed. See the Scottish Government's guidance for your council.
- **England** has announced a national registration scheme for short-term lets. At the time of writing it is not yet running: check [GOV.UK](https://www.gov.uk) for the current position and start date.
- **Wales and Northern Ireland** have their own rules.
- Some areas also have planning conditions or local licensing. Ask your council.

## Energy performance, insurance and the rest

- An Energy Performance Certificate may be needed, depending on how the property is let.
- Insurance should cover short-term letting specifically. An ordinary home policy often does not.
- Water systems should be assessed for legionella risk, proportionately.
- Hot tubs need their own cleaning and water testing routine.

## A simple tracking sheet

Whatever you use, record the same five things for every check at every property:

| Check | Last done | Next due | Who books it | Where the certificate is |
| --- | --- | --- | --- | --- |
| Gas safety | date | date | name | folder or link |
| Fire risk assessment | date | review date | name | folder or link |
| Electrical report | date | date | name | folder or link |
| Alarm tests | date | date | name | log |
| Insurance | start date | renewal date | name | folder or link |

## Remind early, and more than once

A reminder on the day is too late to book an engineer. A pattern that works:

1. **Three months before**: plan it, and check the property's bookings for an empty day.
2. **One month before**: book it.
3. **One week before**: confirm access.

Give every reminder to a named person. A reminder sent to everyone belongs to no one.

## Keep the old certificates

Do not overwrite last year's. When an owner, insurer or council asks what was in place two years ago, you want to find it in a minute.

## Doing this in software

[Evo Stays](/features#safety) keeps these dates against each property, reminds your team three months, one month and one week ahead, turns what is due into a task and stores the certificates. Its built-in list is a starting point based on UK checks: you mark off what does not apply and add what your area requires. A well kept spreadsheet is far better than nothing.
`,
  faq: [
    {
      question: "Do holiday lets need a gas safety certificate?",
      answer:
        "If there are gas appliances or flues, they need an annual safety check by a Gas Safe registered engineer, with the record kept. See the HSE guidance for landlords.",
    },
    {
      question: "Do holiday lets need a fire risk assessment?",
      answer:
        "In England, short-term lets that are not a principal home need a written fire risk assessment. See the government guide on small paying guest accommodation. Other UK nations have their own rules.",
    },
    {
      question: "Do holiday lets need an EICR?",
      answer:
        "The electrics must be safe. Whether a five-yearly report is legally required depends on where the property is and how it is let, so check the current rules and your insurance terms.",
    },
  ],
};
