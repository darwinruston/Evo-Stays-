// Takes the public website's screenshots from the running app, signed in to the
// made-up company from demo-data.ts. Drives a headless Edge or Chrome over its
// debugging protocol, so nothing extra needs installing.
//
//   npm run dev -- -p 3100        (in another window)
//   npx tsx scripts/marketing/demo-data.ts
//   node scripts/marketing/capture.mjs
//
// BROWSER_PATH overrides where the browser is; APP_URL where the app is.
import { spawn } from "child_process";
import { mkdtemp, readFile, writeFile, rm } from "fs/promises";
import { existsSync } from "fs";
import os from "os";
import path from "path";

const APP = process.env.APP_URL ?? "http://localhost:3100";
const OUT = path.join(process.cwd(), "public", "marketing");
// Written by demo-data.ts.
const PASSWORD = (await readFile(path.join(process.cwd(), "storage", "showcase-password.txt"), "utf8")).trim();
const PORT = 9333;
const BROWSER = [
  process.env.BROWSER_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((p) => p && existsSync(p));
if (!BROWSER) throw new Error("No Edge or Chrome found. Set BROWSER_PATH.");

const desktop = (width, height) => ({ width, height, mobile: false });
const phone = { width: 390, height: 800, mobile: true };

const SHOTS = {
  "showcase.admin@evostays.test": [
    ["dashboard", "/admin", desktop(1200, 860)],
    ["property-overview", "/admin/properties/showcase-riverside", desktop(1100, 1040)],
    ["cleans-schedule", "/admin/cleans", desktop(1100, 860)],
    ["stock-levels", "/admin/properties/showcase-riverside?tab=checklist", desktop(1100, 900), "Cleaning checklist"],
    ["health-safety", "/admin/safety", desktop(1100, 800)],
    ["tasks", "/admin/team/tasks", desktop(1100, 760)],
  ],
  "showcase.priya@evostays.test": [
    ["cleaner-home", "/cleaner", phone],
    ["cleaner-checklist", "/cleaner/cleans/showcase-c1", phone, "Cleaning checklist"],
  ],
  "showcase.linen@evostays.test": [["linen-schedule", "/linen", phone]],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = await mkdtemp(path.join(os.tmpdir(), "evo-shots-"));
const browser = spawn(
  BROWSER,
  ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "--hide-scrollbars", "--no-first-run", "about:blank"],
  { stdio: "ignore" },
);

try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(300);
    target = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      .then((r) => r.json())
      .then((list) => list.find((t) => t.type === "page"))
      .catch(() => null);
  }
  if (!target) throw new Error("The browser did not start");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const waiting = new Map();
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    waiting.get(message.id)?.(message);
    waiting.delete(message.id);
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      waiting.set(n, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const run = async (expression) =>
    (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.value;
  // Waits until the page has loaded and gone quiet.
  const open = async (url) => {
    await send("Page.navigate", { url });
    for (let i = 0; i < 100; i++) {
      await sleep(300);
      if ((await run("document.readyState").catch(() => null)) === "complete") break;
    }
    await sleep(2500);
  };

  await send("Page.enable");
  await send("Network.enable");

  for (const [email, shots] of Object.entries(SHOTS)) {
    await send("Network.clearBrowserCookies");
    await send("Emulation.setDeviceMetricsOverride", { ...desktop(1000, 800), deviceScaleFactor: 1 });
    await open(`${APP}/login`);
    await run(`(() => {
      const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); };
      set(document.querySelector("input[type=email]"), ${JSON.stringify(email)});
      set(document.querySelector("input[name=password]"), ${JSON.stringify(PASSWORD)});
      document.querySelector("form").requestSubmit();
    })()`);
    await sleep(6000);

    for (const [name, url, view, scrollTo] of shots) {
      await send("Emulation.setDeviceMetricsOverride", { ...view, deviceScaleFactor: 2 });
      await open(`${APP}${url}`);
      // The development server's own badge has no place in a screenshot, and
      // neither do the banners asking this browser to set up alerts.
      await run(`(() => {
        const style = document.createElement("style");
        style.textContent = "nextjs-portal{display:none!important}";
        document.head.appendChild(style);
        const banner = [...document.querySelectorAll("h2, h3, p")].find((e) => e.textContent.trim() === "Get the most out of Evo Stays");
        banner?.closest("[class*=rounded]")?.remove();
        ${scrollTo ? `const h = [...document.querySelectorAll("h2")].find((e) => e.textContent.trim().startsWith(${JSON.stringify(scrollTo)})); if (h) window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 74);` : ""}
      })()`);
      await sleep(800);
      const { data } = await send("Page.captureScreenshot", { format: "jpeg", quality: 82 });
      await writeFile(path.join(OUT, `${name}.jpg`), Buffer.from(data, "base64"));
      console.log(`${name}.jpg`);
    }
  }
  ws.close();
} finally {
  browser.kill();
  await sleep(1000);
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
