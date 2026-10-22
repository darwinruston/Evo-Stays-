"use client";

import { useEffect, useState, useTransition } from "react";
import { currentSubscription, enablePush, isIos, isStandalone, pushSupported } from "@/lib/pushClient";
import { button, card } from "@/lib/ui";

// The browser's own "install this app" prompt, which Chrome and Edge hand
// over as an event. Safari on iPhone has no such thing and needs the steps
// spelled out instead.
type InstallEvent = Event & { prompt: () => Promise<void> };

const DISMISS_KEY = "evo-device-setup-dismissed";

function dismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

// A short, dismissible card at the top of the phone areas: add the app to the
// home screen, then turn alerts on. Shows only what's still to do, and
// nothing once both are done or it's been dismissed.
export function DeviceSetupBanner({ publicKey }: { publicKey: string | null }) {
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [needsInstallSteps, setNeedsInstallSteps] = useState(false);
  const [canTurnOnAlerts, setCanTurnOnAlerts] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    let cancelled = false;
    (async () => {
      const standalone = isStandalone();
      const ios = isIos();
      const stepsNeeded = ios && !standalone;

      // Alerts can be offered once they could actually work: not on an iPhone
      // that hasn't been added to the home screen yet.
      let alerts = false;
      if (publicKey && pushSupported() && !stepsNeeded && Notification.permission === "default") {
        const sub = await Promise.race([
          currentSubscription(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
        ]);
        alerts = !sub;
      }
      if (cancelled) return;
      setNeedsInstallSteps(stepsNeeded);
      setCanTurnOnAlerts(alerts);
      setHidden(dismissed());
      setReady(true);
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, [publicKey]);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Dismissal just won't be remembered.
    }
    setHidden(true);
  }

  function install() {
    if (!installEvent) return;
    startTransition(async () => {
      await installEvent.prompt();
      setInstallEvent(null);
    });
  }

  function turnOn() {
    setMessage(null);
    startTransition(async () => {
      const outcome = await enablePush(publicKey!);
      if (outcome.ok) {
        setCanTurnOnAlerts(false);
        setMessage("Alerts are on for this device.");
      } else {
        setMessage(outcome.error);
      }
    });
  }

  const showInstall = installEvent !== null || needsInstallSteps;
  if (!ready || hidden || (!showInstall && !canTurnOnAlerts && !message)) return null;

  return (
    <div className={card("flex flex-col gap-3 p-4")}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">Get the most out of Evo Stays</p>
        <button type="button" onClick={dismiss} className="text-sm text-zinc-500 hover:text-zinc-900" aria-label="Dismiss">
          ✕
        </button>
      </div>

      {installEvent && (
        <div className="flex flex-col items-start gap-1.5">
          <p className="text-sm text-zinc-600">Add it to your home screen to open it like an app.</p>
          <button type="button" onClick={install} disabled={pending} className={button("secondary", "sm")}>
            Add to home screen
          </button>
        </div>
      )}

      {!installEvent && needsInstallSteps && (
        <p className="text-sm text-zinc-600">
          To use it like an app and get alerts: tap the Share button in Safari, then Add to Home Screen, and open it
          from there.
        </p>
      )}

      {canTurnOnAlerts && (
        <div className="flex flex-col items-start gap-1.5">
          <p className="text-sm text-zinc-600">Get an alert the moment a clean changes, even when the app is closed.</p>
          <button type="button" onClick={turnOn} disabled={pending} className={button("primary", "sm")}>
            {pending ? "Turning on…" : "Turn on alerts"}
          </button>
        </div>
      )}

      {message && (
        <p role="status" className="text-xs text-zinc-600">
          {message}
        </p>
      )}
    </div>
  );
}
