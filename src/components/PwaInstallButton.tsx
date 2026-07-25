import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Shows an install button when the browser fires beforeinstallprompt (Android/Chrome).
 * iOS users still install via Share → Add to Home Screen.
 */
export function PwaInstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      ("standalone" in navigator &&
        (navigator as Navigator & { standalone?: boolean }).standalone === true);

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      console.log("[pwa] beforeinstallprompt ready");
    };

    const onInstalled = () => {
      console.log("[pwa] app installed");
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || !deferred) return null;

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2 border-blue-200 text-blue-700"
      onClick={async () => {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        console.log("[pwa] install choice:", choice.outcome);
        setDeferred(null);
      }}
    >
      <Download className="w-4 h-4" />
      تثبيت التطبيق على الجهاز
    </Button>
  );
}
