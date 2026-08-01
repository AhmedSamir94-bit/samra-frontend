/**
 * Push handlers imported into the VitePWA service worker.
 * Keep this free of skipWaiting/clientsClaim so it does not fight autoUpdate.
 */
self.addEventListener("push", (event) => {
  event.waitUntil(handlePush(event));
});

async function handlePush(event) {
  let data = {};
  try {
    if (event.data) {
      try {
        data = event.data.json();
      } catch {
        data = { body: event.data.text() };
      }
    }
  } catch {
    /* ignore */
  }

  const n =
    data && typeof data === "object" && data.notification
      ? data.notification
      : data || {};
  const title = n.title || data.title || "سمرة POS";
  const body = n.body || data.body || "";

  await self.registration.showNotification(title, {
    body,
    icon: "/pwa-192.png",
    tag: n.tag || `samra-${Date.now()}`,
    renotify: true,
    dir: "rtl",
    lang: "ar",
    data: n.data || { url: "/" },
  });
}

self.addEventListener("notificationclick", (event) => {
  const rawUrl = event.notification?.data?.url || "/";
  event.notification.close();
  const target = new URL(rawUrl, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
