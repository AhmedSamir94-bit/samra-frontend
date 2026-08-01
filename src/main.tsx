import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

const RELOAD_GUARD_KEY = "samra.pwa.reloadAt";

/** Remove the old competing push-only worker that caused reload loops. */
async function cleanupLegacyPushWorker() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs.map(async (reg) => {
      const script =
        reg.active?.scriptURL ||
        reg.waiting?.scriptURL ||
        reg.installing?.scriptURL ||
        "";
      if (script.includes("push-sw.js")) {
        await reg.unregister().catch(() => undefined);
      }
    }),
  );
}

void cleanupLegacyPushWorker().finally(() => {
  const updateSW = registerSW({
    immediate: true,
    onRegistered(registration) {
      console.log("[pwa] service worker registered", registration?.scope);
    },
    onRegisterError(error) {
      console.error("[pwa] service worker registration failed", error);
    },
    onNeedRefresh() {
      const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
      if (Date.now() - last < 15_000) {
        console.warn("[pwa] skipped rapid auto-reload");
        return;
      }
      sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
      console.log("[pwa] applying service worker update once");
      updateSW(true);
    },
    onOfflineReady() {
      console.log("[pwa] app ready to work offline (shell cached)");
    },
  });
});

createRoot(document.getElementById("root")!).render(<App />);
