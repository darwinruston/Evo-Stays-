@AGENTS.md

# Language

Everything in this project is written in **British English**: every word a person reads on screen (headings, buttons, error messages, emails, notifications, demo data) and every code comment. The people using it are in the UK.

- Use British spellings: organisation, colour, behaviour, centre, cancelled, labelled, travelling, authorise, recognise, optimise, grey, licence (noun), programme (not a computer program), and so on. Use everyday UK words too: rubbish not trash, lift not elevator, wardrobe not closet, holiday not vacation.
- Dates are day first (dd/mm/yyyy) and money is in pounds (£).
- No em dashes anywhere. Use a comma, a colon or a full stop instead.
- Code is not prose. Leave identifiers, database and model names (`Organization`, `organizationId`), CSS and Tailwind classes (`text-center`, `items-center`), library and HTTP names (the `authorization` header, `Authorization`), and the exact values a booking system sends (such as `"canceled"`) exactly as they are.
- Before finishing any change, run `npm run check:spelling`. It must report nothing. `npm run check:spelling -- --fix` rewrites what it safely can. If a flagged word is genuinely code, add `spelling-ok` in a comment on that line.
