import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

registerSW({
  immediate: true,
  onRegistered(registration) {
    console.log("[pwa] service worker registered", registration?.scope);
  },
  onRegisterError(error) {
    console.error("[pwa] service worker registration failed", error);
  },
  onNeedRefresh() {
    console.log("[pwa] new content available — auto updating");
  },
  onOfflineReady() {
    console.log("[pwa] app ready to work offline (shell cached)");
  },
});

createRoot(document.getElementById("root")!).render(<App />);
