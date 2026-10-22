import { savePushSubscription, removePushSubscription } from "@/app/push/actions";

// Browser-side half of push alerts: asking permission, creating this
// device's subscription, and telling the server about it. Only ever called
// from client components, in response to a tap (browsers refuse to ask for
// permission otherwise).

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isIos(): boolean {
  return typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// True when opened from the home screen icon rather than a browser tab.
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export type PushOutcome = { ok: true } | { ok: false; error: string };

// Asks permission, subscribes this device, and saves it.
export async function enablePush(publicKey: string): Promise<PushOutcome> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return {
        ok: false,
        error:
          permission === "denied"
            ? "Alerts are blocked for this app. Allow them in your phone or browser settings, then try again."
            : "No permission was given.",
      };
    }

    const registration = await navigator.serviceWorker.ready;
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, error: "This device couldn't be registered." };
    }
    const saved = await savePushSubscription(
      { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
      navigator.userAgent,
    );
    return saved.ok ? { ok: true } : { ok: false, error: saved.error };
  } catch {
    return { ok: false, error: "Couldn't turn alerts on for this device." };
  }
}

export async function disablePush(): Promise<PushOutcome> {
  try {
    const subscription = await currentSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await removePushSubscription(endpoint);
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't turn alerts off." };
  }
}
