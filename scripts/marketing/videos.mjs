// Makes the marketing videos from the real app, signed in to the made-up company
// from demo-data.ts: four short upright clips and one long walkthrough, each with
// burned-in captions and a matching .srt for recording a voiceover. No sound.
//
//   npm run dev -- -p 3100                       (in another window)
//   npm install --no-save ffmpeg-static          (or set FFMPEG_PATH)
//   node --env-file=.env scripts/marketing/videos.mjs            (all)
//   node --env-file=.env scripts/marketing/videos.mjs arrives    (one)
//
// Output goes to docs/marketing/video/, which is too big to keep in git. The
// demo company is rebuilt before each video, so each starts clean.
import { execFileSync } from "child_process";
import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { createRequire } from "module";
import os from "os";
import path from "path";
import sharp from "sharp";
import { demoPassword, launch, sleep } from "./browser.mjs";

const require = createRequire(import.meta.url);
const FFMPEG = process.env.FFMPEG_PATH ?? require("ffmpeg-static");
const OUT = path.join(process.cwd(), "docs", "marketing", "video");
const FPS = 30;

const ADMIN = "showcase.admin@evostays.test";
const CLEANER = "showcase.priya@evostays.test";
const LINEN = "showcase.linen@evostays.test";

// ---------- layouts: where the screen and the words go ----------

const LAYOUTS = {
  // Upright clip, phone screen.
  upright: { W: 1080, H: 1920, screen: { x: 214, y: 450, w: 652, h: 1338 }, bezel: 18, radius: 56, text: { x: 540, y: 140, size: 64, chars: 28, anchor: "middle" }, view: { width: 390, height: 800, mobile: true, scale: 2 } },
  // Wide video, phone screen on the right with the words beside it.
  phone: { W: 1920, H: 1080, screen: { x: 1210, y: 44, w: 484, h: 992 }, bezel: 14, radius: 44, text: { x: 150, y: 460, size: 60, chars: 26, anchor: "start" }, view: { width: 390, height: 800, mobile: true, scale: 2 } },
  // Wide video, desktop screen with the words underneath.
  desktop: { W: 1920, H: 1080, screen: { x: 240, y: 44, w: 1440, h: 860 }, bezel: 6, radius: 16, text: { x: 960, y: 985, size: 40, chars: 80, anchor: "middle" }, view: { width: 1200, height: 717, mobile: false, scale: 1.2 } },
};

const escapeXml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function wrap(text, chars) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line && (line + " " + word).length > chars) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

const gradient = (W, H) => `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#042f2e"/><stop offset="0.55" stop-color="#115e59"/><stop offset="1" stop-color="#075985"/>
</linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>`;

function textSvg(lines, { x, y, size, anchor }, colour = "#ffffff", weight = 700) {
  const gap = size * 1.25;
  return lines
    .map((l, i) => `<text x="${x}" y="${y + i * gap}" font-family="Segoe UI, Helvetica, Arial" font-size="${size}" font-weight="${weight}" fill="${colour}" text-anchor="${anchor}">${escapeXml(l)}</text>`)
    .join("");
}

const png = (svg) => sharp(Buffer.from(svg)).png().toBuffer();

// Background with the caption and the dark device surround.
function backdrop(L, caption) {
  const { screen: s, bezel: b, radius: r, text: t, W, H } = L;
  const lines = wrap(caption, t.chars);
  return png(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${gradient(W, H)}
    <rect x="${s.x - b}" y="${s.y - b}" width="${s.w + 2 * b}" height="${s.h + 2 * b}" rx="${r}" fill="#0b0f14"/>
    ${textSvg(lines, t)}</svg>`);
}

// The surround again, on top of the screen, so its corners come out rounded.
function frame(L) {
  const { screen: s, bezel: b, radius: r, W, H } = L;
  const inner = Math.max(r - b, 8);
  const rounded = (x, y, w, h, rx) =>
    `M${x + rx} ${y}h${w - 2 * rx}a${rx} ${rx} 0 0 1 ${rx} ${rx}v${h - 2 * rx}a${rx} ${rx} 0 0 1 ${-rx} ${rx}h${-(w - 2 * rx)}a${rx} ${rx} 0 0 1 ${-rx} ${-rx}v${-(h - 2 * rx)}a${rx} ${rx} 0 0 1 ${rx} ${-rx}z`;
  return png(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <path fill-rule="evenodd" fill="#0b0f14" d="${rounded(s.x - b, s.y - b, s.w + 2 * b, s.h + 2 * b, r)} ${rounded(s.x, s.y, s.w, s.h, inner)}"/></svg>`);
}

async function titleCard(W, H, title, sub) {
  const tick = await sharp(path.join(process.cwd(), "public", "branding", "evo-tick-white.png"))
    .resize({ height: Math.round(Math.min(W, H) * 0.13) })
    .toBuffer();
  const tickMeta = await sharp(tick).metadata();
  const titleSize = W > H ? 84 : 78;
  const lines = wrap(title, W > H ? 36 : 22);
  const subLines = wrap(sub, W > H ? 64 : 36);
  const top = H / 2 - (lines.length * titleSize * 1.25) / 2;
  const base = await png(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${gradient(W, H)}
    ${textSvg(lines, { x: W / 2, y: top + titleSize, size: titleSize, anchor: "middle" })}
    ${textSvg(subLines, { x: W / 2, y: top + lines.length * titleSize * 1.25 + titleSize, size: Math.round(titleSize * 0.46), anchor: "middle" }, "#a7f3d0", 500)}</svg>`);
  return sharp(base)
    .composite([{ input: tick, left: Math.round((W - tickMeta.width) / 2), top: Math.round(top - tickMeta.height - 50) }])
    .png()
    .toBuffer();
}

// ---------- turning pictures into video ----------

const ff = (args) => execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "ignore", "pipe"] });
const ENCODE = ["-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-r", String(FPS)];

class Reel {
  constructor(dir) {
    this.dir = dir;
    this.parts = [];
    this.captions = [];
    this.time = 0;
    this.n = 0;
  }

  async file(buffer) {
    const p = path.join(this.dir, `i${this.n++}.png`);
    await writeFile(p, buffer);
    return p;
  }

  remember(caption, seconds) {
    const last = this.captions.at(-1);
    if (last && last.text === caption && Math.abs(last.end - this.time) < 0.01) last.end += seconds;
    else this.captions.push({ text: caption, start: this.time, end: this.time + seconds });
    this.time += seconds;
  }

  async card(L, title, sub, seconds = 3) {
    const input = await this.file(await titleCard(L.W, L.H, title, sub));
    const out = path.join(this.dir, `s${this.n++}.mp4`);
    ff(["-loop", "1", "-t", String(seconds), "-i", input, "-vf", `fps=${FPS},fade=in:0:9,fade=out:st=${seconds - 0.3}:d=0.3`, ...ENCODE, out]);
    this.parts.push(out);
    this.remember(`${title}. ${sub}`, seconds);
  }

  // One screen held still, or scrolled when `tall` is a whole page.
  async screen(L, image, caption, { seconds = 3.5, scroll = false, fadeIn = true, fadeOut = true } = {}) {
    const { w, h, x, y } = L.screen;
    const scaled = await sharp(image).resize({ width: w }).png().toBuffer();
    let { height } = await sharp(scaled).metadata();
    let content = scaled;
    if (height < h) {
      content = await sharp(scaled).extend({ bottom: h - height, background: "#fafafa" }).png().toBuffer();
      height = h;
    }
    if (!scroll && height > h) {
      content = await sharp(content).extract({ left: 0, top: 0, width: w, height: h }).png().toBuffer();
      height = h;
    }
    const bg = await this.file(await backdrop(L, caption));
    const body = await this.file(content);
    const top = await this.file(await frame(L));
    // Scroll after a beat, ease to a stop before the end, and not so fast it
    // cannot be read.
    const travel = scroll ? Math.min(height - h, Math.round((seconds - 1.6) * (L.screen.h * 0.45))) : 0;
    const move = `${travel}*(0.5-0.5*cos(PI*min(max((t-0.8)/${Math.max(seconds - 1.6, 0.5)},0),1)))`;
    const fades = [fadeIn ? "fade=in:0:8" : null, fadeOut ? `fade=out:st=${seconds - 0.27}:d=0.27` : null].filter(Boolean);
    const filter = [
      `[1:v]fps=${FPS},crop=${w}:${h}:0:'${move}'[page]`,
      `[0:v]fps=${FPS}[bg]`,
      `[bg][page]overlay=${x}:${y}[a]`,
      `[a][2:v]overlay=0:0${fades.length ? "," + fades.join(",") : ""}[v]`,
    ].join(";");
    const out = path.join(this.dir, `s${this.n++}.mp4`);
    ff(["-loop", "1", "-t", String(seconds), "-i", bg, "-loop", "1", "-t", String(seconds), "-i", body, "-loop", "1", "-t", String(seconds), "-i", top, "-filter_complex", filter, "-map", "[v]", "-t", String(seconds), ...ENCODE, out]);
    this.parts.push(out);
    this.remember(caption, seconds);
  }

  async save(name) {
    const list = path.join(this.dir, "list.txt");
    await writeFile(list, this.parts.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"));
    await mkdir(OUT, { recursive: true });
    const video = path.join(OUT, `${name}.mp4`);
    ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", video]);
    const stamp = (s) => new Date(Math.round(s * 1000)).toISOString().slice(11, 23).replace(".", ",");
    await writeFile(path.join(OUT, `${name}.srt`), this.captions.map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join("\n"));
    console.log(`${name}.mp4  ${this.time.toFixed(0)}s`);
  }
}

// ---------- what is on screen ----------

function actor(page, reel) {
  let L = LAYOUTS.upright;
  const self = {
    use: async (layout) => {
      L = LAYOUTS[layout];
      await page.setView(L.view);
    },
    layout: () => L,
    go: (url) => page.open(url),
    card: (title, sub, seconds) => reel.card(L, title, sub, seconds),
    show: async (caption, seconds) => reel.screen(L, await page.shot(), caption, { seconds }),
    scroll: async (caption, seconds = 6) => reel.screen(L, await page.shot(true), caption, { seconds, scroll: true }),
    // Brings something into view, a little below the top bar.
    focus: async (selector, text) => {
      await page.run(`(() => {
        const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.textContent.includes(${JSON.stringify(text ?? "")}));
        if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 110);
      })()`);
      await sleep(400);
    },
    // Shows where a tap lands, then taps.
    tap: async (selector, text, caption) => {
      const find = `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.textContent.trim().includes(${JSON.stringify(text)}))`;
      const found = await page.run(`(() => {
        const el = ${find};
        if (!el) return false;
        const r = el.getBoundingClientRect();
        if (r.top < 90 || r.bottom > innerHeight - 20) window.scrollTo(0, window.scrollY + r.top - innerHeight / 2);
        return true;
      })()`);
      if (!found) throw new Error(`Nothing to tap: ${selector} "${text}"`);
      await sleep(400);
      const point = await page.run(`(() => { const r = ${find}.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      const before = await page.shot();
      const meta = await sharp(before).metadata();
      const k = meta.width / L.view.width;
      const radius = Math.round(24 * k);
      const dot = await png(`<svg xmlns="http://www.w3.org/2000/svg" width="${radius * 2 + 8}" height="${radius * 2 + 8}"><circle cx="${radius + 4}" cy="${radius + 4}" r="${radius}" fill="rgba(20,184,166,0.35)" stroke="#0d9488" stroke-width="${3 * k}"/></svg>`);
      const marked = await sharp(before)
        .composite([{ input: dot, left: Math.max(0, Math.round(point.x * k - radius - 4)), top: Math.max(0, Math.round(point.y * k - radius - 4)) }])
        .png()
        .toBuffer();
      await reel.screen(L, before, caption, { seconds: 1.2, fadeOut: false });
      await reel.screen(L, marked, caption, { seconds: 0.8, fadeIn: false, fadeOut: false });
      await page.run(`${find}.click()`);
      await page.settle(3500);
    },
    fill: async (selector, value) => {
      await page.run(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        const kind = el.tagName === "SELECT" ? HTMLSelectElement : el.tagName === "TEXTAREA" ? HTMLTextAreaElement : HTMLInputElement;
        Object.getOwnPropertyDescriptor(kind.prototype, "value").set.call(el, ${JSON.stringify(value)});
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      })()`);
      await sleep(400);
    },
    // A drawn stand-in for a room photo, chosen as if from the phone.
    addPhoto: async () => {
      await page.run(`(async () => {
        const c = document.createElement("canvas"); c.width = 900; c.height = 700;
        const x = c.getContext("2d");
        x.fillStyle = "#e0f2fe"; x.fillRect(0, 0, 900, 700);
        x.fillStyle = "#d6d3d1"; x.fillRect(0, 480, 900, 220);
        x.fillStyle = "#0f766e"; x.fillRect(170, 330, 560, 190);
        x.fillStyle = "#f8fafc"; x.fillRect(190, 290, 520, 90);
        x.fillStyle = "#99f6e4"; x.fillRect(220, 250, 180, 70); x.fillRect(500, 250, 180, 70);
        x.fillStyle = "#bae6fd"; x.fillRect(340, 60, 220, 150);
        x.fillStyle = "#57534e"; x.font = "28px Segoe UI"; x.fillText("Drawn example, not a real photo", 250, 660);
        const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.9));
        const input = [...document.querySelectorAll("input[type=file]")].find((i) => i.multiple && !i.getAttribute("capture") && i.className.includes("hidden"));
        const data = new DataTransfer();
        data.items.add(new File([blob], "room.jpg", { type: "image/jpeg" }));
        input.files = data.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      })()`);
      await sleep(900);
    },
    signIn: async (email) => page.signIn(email, await demoPassword()),
    run: (code) => page.run(code),
    settle: (ms) => page.settle(ms),
  };
  return self;
}

// ---------- the videos ----------

// A cleaner's visit, from the job list to the first stock item.
async function visit(a, wide) {
  await a.go("/cleaner");
  await a.show("Your cleaners open their list for the day", 3.5);
  await a.go("/cleaner/cleans/showcase-c1");
  await a.scroll("At the door: the way in, the checklist and what is in the place", wide ? 9 : 8);
  await a.tap("button", "check in", "They say how many are cleaning, and check in");
  await a.focus("h2", "Before photos");
  await a.addPhoto();
  await a.focus("h2", "Before photos");
  await a.show("Before photos, straight from the camera", 3);
  await a.tap("button", "Save before photos", "Before photos, straight from the camera");
  await a.focus("h2", "After photos");
  await a.addPhoto();
  await a.focus("h2", "After photos");
  await a.tap("button", "Save after photos", "Then the finished result");
  await a.focus("p", "Stock 1 of");
  await a.show("Stock is one tap an item, room by room. No counting", 4);
}

const VIDEOS = {
  "short-a-cleaner-arrives": async (a) => {
    await a.use("upright");
    await a.card("A cleaner arrives", "No app store. No group chat.", 2.2);
    await a.signIn(CLEANER);
    await visit(a, false);
    await a.card("Evo Stays", "For short-let teams that run their own cleaners", 3);
  },

  "short-b-set-it-once": async (a) => {
    await a.use("upright");
    await a.card("Weekly clean? Set it once.", "Repeating cleans", 2.2);
    await a.signIn(ADMIN);
    await a.go("/admin/cleans/new");
    await a.fill("#propertyId", "showcase-dockside");
    await a.show("Choose the property", 2.5);
    await a.fill("#scheduledDate", isoDate(2));
    await a.fill("#scheduledTime", "11:00");
    await a.fill("#repeat", "WEEKLY");
    await a.focus("label", "Cleaner");
    await a.show("Pick a date and time, then how often it repeats", 4);
    await a.tap("button", "Schedule clean", "One press");
    await a.show("The next twelve weeks are in the diary", 3.5);
    await a.signIn(CLEANER);
    await a.go("/cleaner");
    await a.scroll("And the cleaner sees them on their phone", 6);
    await a.card("Evo Stays", "For short-let teams that run their own cleaners", 3);
  },

  "short-c-before-it-runs-out": async (a) => {
    await a.use("upright");
    await a.card("Who is watching that date?", "Gas, electrics, alarms, insurance", 2.2);
    await a.signIn(ADMIN);
    await a.go("/admin/safety");
    await a.scroll("Every property's safety dates in one list", 6);
    await a.go("/admin/properties/showcase-riverside?tab=safety");
    await a.scroll("Each property keeps its dates and certificates", 6);
    await a.go("/admin/team/tasks");
    await a.scroll("When one comes due it becomes a task for the team", 6);
    await a.card("Evo Stays", "A starting list. Always check the rules where you are", 3.5);
  },

  "short-d-linen-on-time": async (a) => {
    await a.use("upright");
    await a.card("Your linen company already knows", "A clean moves. So does the delivery.", 2.5);
    await a.signIn(LINEN);
    await a.go("/linen");
    await a.show("Their own login shows when to arrive at each property", 4);
    await a.signIn(ADMIN);
    await a.go("/admin/cleans/showcase-c2");
    await a.tap("button", "Move to next day", "You move a clean");
    await a.signIn(LINEN);
    await a.go("/linen");
    await a.scroll("Their delivery has moved with it", 6);
    await a.card("Evo Stays", "For short-let teams that run their own cleaners", 3);
  },

  walkthrough: async (a) => {
    await a.use("desktop");
    await a.card("Evo Stays: the walkthrough", "Everything about a property that your channel manager does not do", 5);
    await a.signIn(ADMIN);

    await a.card("1. Your day at a glance", "What needs attention, and today's cleans", 3);
    await a.go("/admin");
    await a.scroll("The overview shows what is outstanding, what is running low and today's cleans", 9);

    await a.card("2. A page for every property", "Codes, access, what is in it, who looks after it", 3);
    await a.go("/admin/properties");
    await a.show("Every property you look after, grouped by client", 4);
    await a.go("/admin/properties/showcase-riverside");
    await a.scroll("Access notes and codes, amenities, cleaners and open problems, all in one place", 12);
    await a.go("/admin/properties?has=hot-tub");
    await a.show("Need to know which places have a hot tub? Search by what is in them", 5);

    await a.card("3. Scheduling", "Bookings become cleans. Regular ones repeat.", 3);
    await a.go("/admin/cleans");
    await a.scroll("Today, tomorrow and this week, with each cleaner's confirmed arrival time", 9);
    await a.go("/admin/cleans/new");
    await a.fill("#propertyId", "showcase-dockside");
    await a.fill("#scheduledDate", isoDate(2));
    await a.fill("#scheduledTime", "11:00");
    await a.fill("#repeat", "WEEKLY");
    await a.show("Add a clean by hand, and have it repeat weekly, fortnightly or monthly", 5);
    await a.tap("button", "Schedule clean", "Add a clean by hand, and have it repeat weekly, fortnightly or monthly");
    await a.show("Each one is an ordinary clean you can move or change on its own", 5);

    await a.use("phone");
    await a.card("4. On the cleaner's phone", "The same simple steps every time", 3);
    await a.signIn(CLEANER);
    await visit(a, true);
    await a.go("/cleaner/cleans/showcase-c1");
    await a.focus("summary", "Report a problem");
    await a.run(`[...document.querySelectorAll("summary")].find((s) => s.textContent.includes("Report a problem"))?.click()`);
    await a.settle(800);
    await a.run(`(() => { const s = document.querySelector("select[name=category]"); if (s) { const v = [...s.options].find((o) => /broken/i.test(o.text))?.value; if (v) { s.value = v; s.dispatchEvent(new Event("change", { bubbles: true })); } } })()`);
    await a.fill("textarea[name=description]", "Bedside lamp is broken.");
    await a.focus("summary", "Report a problem");
    await a.show("A problem is reported with a photo. The cleaner does not have to judge how urgent it is", 6);

    await a.use("desktop");
    await a.signIn(ADMIN);
    await a.card("5. Problems and team tasks", "Nothing sits in a message", 3);
    await a.go("/admin/issues");
    await a.show("Reported problems arrive ranked by urgency", 5);
    await a.go("/admin/team/tasks");
    await a.scroll("Team tasks with owners, due dates, subtasks and repeats", 8);

    await a.card("6. Health and safety", "Dates, reminders and certificates", 3);
    await a.go("/admin/safety");
    await a.scroll("What is overdue and what is coming up, across every property", 8);
    await a.go("/admin/properties/showcase-riverside?tab=safety");
    await a.scroll("Record when each check was done and keep the certificate. Always check your local rules", 10);

    await a.card("7. Stock and linen", "Know before you run out", 3);
    await a.go("/admin/properties/showcase-riverside?tab=checklist");
    await a.scroll("Stock levels by room, with dishwasher supplies only where there is a dishwasher", 9);
    await a.go("/admin/stock");
    await a.show("One list of what is running low", 4);
    await a.go("/admin/laundry/schedule");
    await a.scroll("The linen schedule works from when each cleaner arrives", 7);

    await a.card("8. Hours and invoices", "Worked out from check-in and check-out", 3);
    await a.go("/admin/invoices");
    await a.tap("button", "This month", "Choose the period");
    await a.tap("button", "Generate invoices", "Hours become invoices, one per cleaner per property");
    await a.scroll("Check them, mark them paid, or send them to Xero as bills. Evo Stays does not move any money", 8);

    await a.card("Evo Stays", "We are setting up early companies one at a time. Register your interest.", 6);
  },
};

function isoDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function resetDemo(remove = false) {
  execFileSync("npx", ["tsx", "scripts/marketing/demo-data.ts", ...(remove ? ["--remove"] : [])], { stdio: "ignore", shell: true });
}

const wanted = process.argv[2];
const names = Object.keys(VIDEOS).filter((n) => !wanted || n.includes(wanted));
if (names.length === 0) throw new Error(`No video matches "${wanted}"`);

let failed = false;
for (const name of names) {
  resetDemo();
  const dir = await mkdtemp(path.join(os.tmpdir(), "evo-video-"));
  const page = await launch(9334);
  try {
    const reel = new Reel(dir);
    await VIDEOS[name](actor(page, reel));
    await reel.save(name);
  } catch (err) {
    failed = true;
    console.error(`${name} failed:`, err.stderr?.toString().slice(0, 600) || err.message);
  } finally {
    await page.close();
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
resetDemo(true);
process.exitCode = failed ? 1 : 0;
