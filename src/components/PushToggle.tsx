"use client";

import { useEffect, useState, useTransition } from "react";
import { sendTestPush } from "@/app/push/actions";
import { currentSubscription, disablePush, enablePush, isIos, isStandalone, pushSupported } from "@/lib/pushClient";
import { button, card } from "@/lib/ui";

type State = "checking" | "unsupported" | "needs-install" | "no-server" | "blocked" | "off" | "on";

// Waits for the service worker, but not forever: if it never starts (some
// browsers and private windows), the answer is "can't do alerts here".
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | "timeout"> {
  return Promise.race([promise, new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), ms))]);
}

// The control for alerts on THIS phone or browser: turn them on or off, and
// send a test. Each device is switched on separately, since each has its own
// permission.
export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: State;
      if (!publicKey) next = "no-server";
      else if (isIos() && !isStandalone()) next = "needs-install";
      else if (!pushSupported()) next = "unsupported";
      else if (Notification.permission === "denied") next = "blocked";
      else {
        const sub = await withTimeout(currentSubscription(), 4000);
        next = sub === "timeout" ? "unsupported" : sub ? "on" : "off";
      }
      if (!cancelled) setState(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  function turnOn() {
    setMessage(null);
    startTransition(async () => {
      const outcome = await enablePush(publicKey!);
      if (outcome.ok) setState("on");
      else {
        setMessage(outcome.error);
        if (typeof Notification !== "undefined" && Notification.permission === "denied") setState("blocked");
      }
    });
  }

  function turnOff() {
    setMessage(null);
    startTransition(async () => {
      const outcome = await disablePush();
      if (outcome.ok) setState("off");
      else setMessage(outcome.error);
    });
  }

  function test() {
    setMessage(null);
    startTransition(async () => {
      const result = await sendTestPush();
      setMessage(result.ok ? "Test sent. It should appear on this device in a moment." : result.error);
    });
  }

  const explain: Record<State, string> = {
    checking: "Checking this device…",
    unsupported: "This browser can't show alerts. On a phone, use Chrome (Android) or add the app to your home screen (iPhone).",
    "needs-install":
      "On an iPhone, alerts only work once the app is on your home screen. Tap Share, then Add to Home Screen, open it from there, and come back here.",
    "no-server": "Alerts aren't set up on this server yet.",
    blocked: "Alerts are blocked for this app. Allow notifications in your phone or browser settings, then reload this page.",
    off: "Get an alert on this device the moment something changes, even when the app is closed.",
    on: "Alerts are on for this device.",
  };

  return (
    <section className={card("flex flex-col gap-3 p-4")}>
      <h2 className="text-sm font-medium">Alerts on this device</h2>
      <p className="text-sm text-zinc-600">{explain[state]}</p>
      <div className="flex flex-wrap items-center gap-2">
        {state === "off" && (
          <button type="button" onClick={turnOn} disabled={pending} className={button("primary", "sm")}>
            {pending ? "Turning on…" : "Turn on alerts"}
          </button>
        )}
        {state === "on" && (
          <>
            <button type="button" onClick={test} disabled={pending} className={button("secondary", "sm")}>
              Send a test
            </button>
            <button type="button" onClick={turnOff} disabled={pending} className={button("ghost", "sm")}>
              Turn off
            </button>
          </>
        )}
      </div>
      {message && (
        <p role="status" className="text-xs text-zinc-600">
          {message}
        </p>
      )}
    </section>
  );
}
