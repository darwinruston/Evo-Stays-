// Drives a headless Edge or Chrome over its debugging protocol, for the
// screenshot and video scripts beside this. Nothing extra needs installing.
import { spawn } from "child_process";
import { mkdtemp, readFile, rm } from "fs/promises";
import { existsSync } from "fs";
import os from "os";
import path from "path";

export const APP = process.env.APP_URL_FOR_CAPTURE ?? "http://localhost:3100";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BROWSER = [
  process.env.BROWSER_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((p) => p && existsSync(p));

// The password demo-data.ts last wrote for the made-up company's logins.
export async function demoPassword() {
  return (await readFile(path.join(process.cwd(), "storage", "showcase-password.txt"), "utf8")).trim();
}

export async function launch(port = 9333) {
  if (!BROWSER) throw new Error("No Edge or Chrome found. Set BROWSER_PATH.");
  const profile = await mkdtemp(path.join(os.tmpdir(), "evo-capture-"));
  const process_ = spawn(
    BROWSER,
    ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--hide-scrollbars", "--no-first-run", "about:blank"],
    { stdio: "ignore" },
  );

  let target;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(300);
    target = await fetch(`http://127.0.0.1:${port}/json/list`)
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
  await send("Page.enable");
  await send("Network.enable");

  const run = async (expression) =>
    (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.value;

  // The development server's own badge, and the banner asking this browser to
  // set up alerts, have no place in a picture of the product.
  const tidy = () =>
    run(`(() => {
      if (!document.getElementById("capture-style")) {
        const style = document.createElement("style");
        style.id = "capture-style";
        style.textContent = "nextjs-portal{display:none!important} html{scroll-behavior:auto!important}";
        document.head.appendChild(style);
      }
      const banner = [...document.querySelectorAll("h2, h3, p")].find((e) => e.textContent.trim() === "Get the most out of Evo Stays");
      banner?.closest("[class*=rounded]")?.remove();
    })()`);

  let view = { width: 1000, height: 800, mobile: false, scale: 1 };
  const setView = async (next) => {
    view = { ...view, ...next };
    await send("Emulation.setDeviceMetricsOverride", {
      width: view.width,
      height: view.height,
      mobile: view.mobile,
      deviceScaleFactor: view.scale,
    });
  };

  const settle = async (pause = 1500) => {
    for (let i = 0; i < 100; i++) {
      await sleep(250);
      if ((await run("document.readyState").catch(() => null)) === "complete") break;
    }
    await sleep(pause);
    await tidy();
    await sleep(250);
  };

  const open = async (url, pause) => {
    await send("Page.navigate", { url: url.startsWith("http") ? url : `${APP}${url}` });
    await settle(pause);
  };

  const signIn = async (email, password) => {
    await send("Network.clearBrowserCookies");
    await open("/login", 1500);
    await run(`(() => {
      const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); };
      set(document.querySelector("input[type=email]"), ${JSON.stringify(email)});
      set(document.querySelector("input[name=password]"), ${JSON.stringify(password)});
      document.querySelector("form").requestSubmit();
    })()`);
    await sleep(6000);
  };

  // PNG of the screen, or of the whole page when full is set.
  const shot = async (full = false) => {
    if (!full) {
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      return Buffer.from(data, "base64");
    }
    const { cssContentSize } = await send("Page.getLayoutMetrics");
    const height = Math.min(Math.ceil(cssContentSize.height), 6000);
    const { data } = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: view.width, height, scale: 1 },
    });
    return Buffer.from(data, "base64");
  };

  const close = async () => {
    ws.close();
    process_.kill();
    await sleep(800);
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  };

  return { send, run, open, settle, setView, signIn, shot, tidy, close };
}
