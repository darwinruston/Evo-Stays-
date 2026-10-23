// Keeps the site in British English, and free of em dashes.
//
//   npm run check:spelling         report anything found (exit 1 if there is any)
//   npm run check:spelling -- --fix  also rewrite what can be safely rewritten
//
// It only looks at what a person can read: text shown on screen (string
// literals and JSX text) and comments in src/ and prisma/seed.ts, plus the
// comments in prisma/schema.prisma. Variable names, database names, CSS class
// names and library calls are code and stay as they are (a Prisma model called
// `Organization` is not a spelling mistake). A hyphenated word such as
// `items-center` is never matched.
//
// To allow a word on purpose, put `spelling-ok` in a comment on the same line.
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = path.resolve(import.meta.dirname, "..");
const FIX = process.argv.includes("--fix");

// [american stem, british stem, endings that can follow it]
const IZE = ["e", "ed", "es", "ing", "ation", "ations", "ational", "er", "ers"];
const ISE_FAMILY = [
  ["organiz", "organis"],
  ["authoriz", "authoris"],
  ["customiz", "customis"],
  ["finaliz", "finalis"],
  ["initializ", "initialis"],
  ["normaliz", "normalis"],
  ["denormaliz", "denormalis"],
  ["unrecogniz", "unrecognis"],
  ["optimiz", "optimis"],
  ["prioritiz", "prioritis"],
  ["recogniz", "recognis"],
  ["summariz", "summaris"],
  ["synchroniz", "synchronis"],
  ["minimiz", "minimis"],
  ["maximiz", "maximis"],
  ["utiliz", "utilis"],
  ["categoriz", "categoris"],
  ["standardiz", "standardis"],
  ["visualiz", "visualis"],
  ["personaliz", "personalis"],
  ["specializ", "specialis"],
  ["emphasiz", "emphasis"],
  ["apologiz", "apologis"],
  ["realiz", "realis"],
  ["capitaliz", "capitalis"],
  ["penaliz", "penalis"],
  ["familiariz", "familiaris"],
  ["generaliz", "generalis"],
  ["localiz", "localis"],
  ["memoriz", "memoris"],
  ["randomiz", "randomis"],
  ["serializ", "serialis"],
  ["sanitiz", "sanitis"],
  ["stabiliz", "stabilis"],
  ["centraliz", "centralis"],
  ["materializ", "materialis"],
  ["monetiz", "monetis"],
  ["hospitaliz", "hospitalis"],
];

// Whole words that are spelt differently. [american, british]
const WORDS = [
  ["analyze", "analyse"],
  ["analyzed", "analysed"],
  ["analyzes", "analyses"],
  ["analyzing", "analysing"],
  ["analyzer", "analyser"],
  ["color", "colour"],
  ["colors", "colours"],
  ["colored", "coloured"],
  ["coloring", "colouring"],
  ["colorful", "colourful"],
  ["behavior", "behaviour"],
  ["behaviors", "behaviours"],
  ["behavioral", "behavioural"],
  ["favorite", "favourite"],
  ["favorites", "favourites"],
  ["neighbor", "neighbour"],
  ["neighbors", "neighbours"],
  ["neighborhood", "neighbourhood"],
  ["honor", "honour"],
  ["honors", "honours"],
  ["labor", "labour"],
  ["flavor", "flavour"],
  ["center", "centre"],
  ["centers", "centres"],
  ["centered", "centred"],
  ["centering", "centring"],
  ["defense", "defence"],
  ["offense", "offence"],
  ["catalog", "catalogue"],
  ["catalogs", "catalogues"],
  ["gray", "grey"],
  ["canceled", "cancelled"],
  ["canceling", "cancelling"],
  ["traveled", "travelled"],
  ["traveling", "travelling"],
  ["traveler", "traveller"],
  ["labeled", "labelled"],
  ["labeling", "labelling"],
  ["modeled", "modelled"],
  ["modeling", "modelling"],
  ["leveled", "levelled"],
  ["leveling", "levelling"],
  ["fueled", "fuelled"],
  ["signaled", "signalled"],
  ["signaling", "signalling"],
  ["totaled", "totalled"],
  ["totaling", "totalling"],
  ["enroll", "enrol"],
  ["enrollment", "enrolment"],
  ["fulfill", "fulfil"],
  ["fulfillment", "fulfilment"],
  ["skillful", "skilful"],
  ["installment", "instalment"],
  ["theater", "theatre"],
  ["fiber", "fibre"],
  ["liter", "litre"],
  ["sizable", "sizeable"],
  ["mold", "mould"],
  ["moldy", "mouldy"],
  ["cozy", "cosy"],
  ["gotten", "got"],
  ["curb", "kerb"],
  ["aluminum", "aluminium"],
  ["pajamas", "pyjamas"],
  ["artifact", "artefact"],
  ["artifacts", "artefacts"],
  // Everyday words a cleaner or host in the UK would say differently.
  ["trash", "rubbish"],
  ["garbage", "rubbish"],
  ["faucet", "tap"],
  ["closet", "wardrobe"],
  ["closets", "wardrobes"],
  ["restroom", "toilet"],
  ["vacation", "holiday"],
  ["sidewalk", "pavement"],
  ["elevator", "lift"],
  ["comforter", "duvet"],
  ["flashlight", "torch"],
  ["dumpster", "skip"],
  ["diaper", "nappy"],
  ["diapers", "nappies"],
  ["drapes", "curtains"],
];

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const RULES = [];
for (const [us, uk] of ISE_FAMILY) {
  const re = new RegExp(`(?<![\\w./-])(${escapeRe(us)})(${IZE.join("|")})(?![\\w-]|\\()`, "gi");
  RULES.push({ re, replace: (m) => uk + m[2], label: us + "e" });
}
for (const [us, uk] of WORDS) {
  RULES.push({ re: new RegExp(`(?<![\\w./-])(${escapeRe(us)})(?![\\w-]|\\()`, "gi"), replace: () => uk, label: us });
}
// An em dash: written as a comma, colon or full stop instead.
RULES.push({ re: /—/g, replace: null, label: "em dash" });

// Strings that name code, not words (a Prisma model, for instance).
const EXACT_STRING_ALLOW = new Set(["Organization", "center", "gray", "color"]);

function matchCase(original, replacement) {
  if (original === original.toUpperCase() && original.length > 1) return replacement.toUpperCase();
  if (original[0] === original[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

// Everything that could be found in `text`, as { index, length, replacement|null, label }.
function findIssues(text, inComment) {
  const found = [];
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(text)) !== null) {
      // Skip anything inside backticks in a comment: that's naming code.
      const before = text.slice(0, m.index);
      if ((before.match(/`/g) ?? []).length % 2 === 1) continue;
      // A word a comment puts in double quotes is citing a literal value.
      if (inComment && text[m.index - 1] === '"' && text[m.index + m[0].length] === '"') continue;
      const replacement = rule.replace ? matchCase(m[0], rule.replace(m)) : null;
      found.push({ index: m.index, length: m[0].length, replacement, label: rule.label, word: m[0] });
    }
  }
  return found;
}

function lineAt(source, position) {
  let line = 1;
  for (let i = 0; i < position; i++) if (source.charCodeAt(i) === 10) line++;
  return line;
}

function scanTs(file, source) {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const segments = []; // { start, text } where start is the offset of text[0] in source
  const seen = new Set();

  function addComments(pos) {
    for (const ranges of [ts.getLeadingCommentRanges(source, pos), ts.getTrailingCommentRanges(source, pos)]) {
      for (const r of ranges ?? []) {
        if (seen.has(r.pos)) continue;
        seen.add(r.pos);
        segments.push({ start: r.pos, text: source.slice(r.pos, r.end), comment: true });
      }
    }
  }

  function visit(node) {
    addComments(node.pos);
    addComments(node.end);
    const k = node.kind;
    if (k === ts.SyntaxKind.StringLiteral || k === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
      const parent = node.parent;
      const isModuleSpecifier =
        parent && (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) && parent.moduleSpecifier === node;
      if (!isModuleSpecifier && !EXACT_STRING_ALLOW.has(node.text)) {
        // getStart()+1 skips the opening quote; the raw source is used so offsets line up.
        // A one-word string is as likely to be a code value ("canceled" from a
        // booking system, an HTTP header name) as a label: report it, but
        // never rewrite it automatically.
        const raw = source.slice(node.getStart() + 1, node.end - 1);
        segments.push({ start: node.getStart() + 1, text: raw, oneWord: !/\s/.test(raw) });
      }
    } else if (k === ts.SyntaxKind.TemplateHead || k === ts.SyntaxKind.TemplateMiddle || k === ts.SyntaxKind.TemplateTail) {
      segments.push({ start: node.getStart() + 1, text: source.slice(node.getStart() + 1, node.end - (k === ts.SyntaxKind.TemplateTail ? 1 : 2)) });
    } else if (k === ts.SyntaxKind.JsxText) {
      segments.push({ start: node.pos, text: source.slice(node.pos, node.end) });
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  // A comment inside a JSX block ({/* ... */}) isn't attached to any node the
  // walk above reaches, so block comments are also picked up straight from the text.
  const block = /\/\*[\s\S]*?\*\//g;
  let b;
  while ((b = block.exec(source)) !== null) {
    if (seen.has(b.index)) continue;
    seen.add(b.index);
    segments.push({ start: b.index, text: b[0], comment: true });
  }
  return segments;
}

function scanPrisma(source) {
  const segments = [];
  const re = /\/\/.*$/gm;
  let m;
  while ((m = re.exec(source)) !== null) segments.push({ start: m.index, text: m[0], comment: true });
  return segments;
}

function listFiles() {
  const out = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) out.push(full);
    }
  }
  walk(path.join(ROOT, "src"));
  out.push(path.join(ROOT, "prisma", "seed.ts"));
  out.push(path.join(ROOT, "prisma", "schema.prisma"));
  return out.filter((f) => fs.existsSync(f));
}

let total = 0;
let fixed = 0;
for (const file of listFiles()) {
  const source = fs.readFileSync(file, "utf8");
  const segments = file.endsWith(".prisma") ? scanPrisma(source) : scanTs(file, source);

  const edits = [];
  for (const seg of segments) {
    for (const issue of findIssues(seg.text, !!seg.comment)) {
      const abs = seg.start + issue.index;
      const line = lineAt(source, abs);
      const lineText = source.split("\n")[line - 1] ?? "";
      if (lineText.includes("spelling-ok")) continue;
      total++;
      const rel = path.relative(ROOT, file).replaceAll("\\", "/");
      const manual = seg.oneWord && issue.replacement;
      const note = manual
        ? ` -> ${issue.replacement} (one-word string: check by hand; it may be a code value, in which case add "spelling-ok" in a comment on that line)`
        : issue.replacement
          ? ` -> ${issue.replacement}`
          : " (rewrite without an em dash)";
      console.log(`${rel}:${line}  ${issue.word}${note}`);
      if (FIX && issue.replacement && !manual) edits.push({ abs, length: issue.length, replacement: issue.replacement });
    }
  }

  if (FIX && edits.length > 0) {
    edits.sort((a, b) => b.abs - a.abs);
    let next = source;
    for (const e of edits) next = next.slice(0, e.abs) + e.replacement + next.slice(e.abs + e.length);
    fs.writeFileSync(file, next);
    fixed += edits.length;
  }
}

if (total === 0) {
  console.log("British English check: nothing to fix.");
} else if (FIX) {
  console.log(`\n${total} found, ${fixed} rewritten${total > fixed ? `, ${total - fixed} need a human` : ""}.`);
  process.exit(total > fixed ? 1 : 0);
} else {
  console.log(`\n${total} to fix. Run "npm run check:spelling -- --fix" to rewrite the ones it can.`);
  process.exit(1);
}
