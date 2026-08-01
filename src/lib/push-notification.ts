const API_URL =
  import.meta.env.VITE_API_URL || "https://samra-backend.vercel.app/api";

const ENABLED_KEY = "samra.staff.push.enabled";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { getAccessToken, isAccessTokenExpired, getRefreshToken } = await import(
    "./auth-storage"
  );
  if (getRefreshToken() && isAccessTokenExpired()) {
    const { api } = await import("./api");
    try {
      await api.refresh(getRefreshToken()!);
    } catch {
      /* ignore */
    }
  }
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function enableStaffPush(): Promise<boolean> {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return false;
  }

  // Never prompt on app load — that blocks UX and can feel like endless loading.
  // Only resume an already-granted subscription.
  if (Notification.permission !== "granted") {
    return false;
  }

  // Use the single VitePWA service worker. Do NOT unregister it or register a
  // second push-sw.js — that causes endless reload loops in normal browsers.
  const regs = await navigator.serviceWorker.getRegistrations();
  for (const reg of regs) {
    const script =
      reg.active?.scriptURL ||
      reg.waiting?.scriptURL ||
      reg.installing?.scriptURL ||
      "";
    if (script.includes("push-sw.js")) {
      await reg.unregister().catch(() => undefined);
    }
  }

  const ready = await navigator.serviceWorker.ready;

  const keyRes = await fetch(`${API_URL}/push/vapid-public-key`);
  const keyData = (await keyRes.json()) as { publicKey?: string };
  const key = keyData.publicKey?.trim();
  if (!key) return false;

  let sub = await ready.pushManager.getSubscription();
  if (!sub) {
    sub = await ready.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  }

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  const headers = await authHeaders();
  await fetch(`${API_URL}/staff/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    }),
  });

  localStorage.setItem(ENABLED_KEY, "1");
  startStaffInboxPolling();
  return true;
}

let inboxTimer: number | null = null;
const seenInbox = new Set<string>();

export function startStaffInboxPolling(): void {
  if (inboxTimer) return;
  void pullStaffInbox();
  inboxTimer = window.setInterval(() => void pullStaffInbox(), 8000);
}

async function pullStaffInbox(): Promise<void> {
  try {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/staff/push/inbox`, { headers });
    if (!res.ok) return;
    const items = (await res.json()) as Array<{
      id: string;
      title: string;
      body: string;
    }>;
    const fresh = items.filter((i) => !seenInbox.has(i.id));
    for (const item of fresh) {
      seenInbox.add(item.id);
      try {
        new Notification(item.title, {
          body: item.body,
          tag: `inbox-${item.id}`,
          dir: "rtl",
          lang: "ar",
        });
      } catch {
        /* ignore */
      }
    }
    if (fresh.length) {
      await fetch(`${API_URL}/staff/push/inbox/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ ids: fresh.map((i) => i.id) }),
      }).catch(() => undefined);
    }
  } catch {
    /* ignore */
  }
}
