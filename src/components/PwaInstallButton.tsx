import { useEffect, useMemo, useState } from "react";
import { Download, Smartphone, CheckCircle2, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  const ua = navigator.userAgent || "";

  // iPadOS 13+ reports as Mac — detect via touch points
  const isIos =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIos) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function isStandaloneDisplay() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

function platformTitle(platform: Platform) {
  if (platform === "ios") return "خطوات التثبيت على آيفون / آيباد";
  if (platform === "android") return "خطوات التثبيت على أندرويد";
  return "خطوات التثبيت على الكمبيوتر";
}

function InstallSteps({ platform }: { platform: Platform }) {
  if (platform === "ios") {
    return (
      <ol className="space-y-3 text-sm text-gray-700 list-decimal list-inside">
        <li>
          افتح الموقع في{" "}
          <span className="font-semibold text-gray-900">Safari</span> فقط
        </li>
        <li className="leading-relaxed">
          اضغط زر{" "}
          <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
            المشاركة <Share className="w-3.5 h-3.5" />
          </span>{" "}
          في أسفل الشاشة
        </li>
        <li>
          اختر{" "}
          <span className="font-semibold text-gray-900">
            «إضافة إلى الشاشة الرئيسية»
          </span>
        </li>
        <li>اضغط «إضافة» ليظهر تطبيق سمرة على شاشتك</li>
      </ol>
    );
  }

  if (platform === "android") {
    return (
      <ol className="space-y-3 text-sm text-gray-700 list-decimal list-inside">
        <li>
          افتح الموقع في{" "}
          <span className="font-semibold text-gray-900">Chrome</span>
        </li>
        <li>اضغط القائمة ⋮ أعلى اليمين</li>
        <li>
          اختر{" "}
          <span className="font-semibold text-gray-900">
            «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»
          </span>
        </li>
        <li>أكد التثبيت ليظهر التطبيق مع باقي التطبيقات</li>
      </ol>
    );
  }

  return (
    <ol className="space-y-3 text-sm text-gray-700 list-decimal list-inside">
      <li>
        افتح الموقع في{" "}
        <span className="font-semibold text-gray-900">Chrome أو Edge</span>
      </li>
      <li>
        اضغط أيقونة التثبيت في شريط العنوان، أو من القائمة اختر{" "}
        <span className="font-semibold text-gray-900">«تثبيت التطبيق»</span>
      </li>
      <li>أكد التثبيت لفتح سمرة كتطبيق على سطح المكتب</li>
    </ol>
  );
}

interface PwaInstallButtonProps {
  variant?: "card" | "compact";
  className?: string;
}

/**
 * Detects the device and shows only that platform's install instructions.
 */
export function PwaInstallButton({
  variant = "card",
  className,
}: PwaInstallButtonProps) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const platform = useMemo(() => detectPlatform(), []);

  useEffect(() => {
    if (isStandaloneDisplay()) {
      setInstalled(true);
      return;
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setDialogOpen(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const runNativeInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferred(null);
  };

  const handleInstallClick = async () => {
    if (deferred) {
      await runNativeInstall();
      return;
    }
    setDialogOpen(true);
  };

  const ctaLabel = deferred
    ? "تثبيت الآن بنقرة واحدة"
    : platform === "ios"
      ? "كيفية التثبيت على آيفون"
      : platform === "android"
        ? "كيفية التثبيت على أندرويد"
        : "كيفية تثبيت التطبيق";

  if (installed) {
    if (variant === "compact") return null;
    return (
      <div
        className={cn(
          "rounded-lg border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-800 flex items-center gap-2",
          className,
        )}
        dir="rtl"
      >
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        التطبيق مثبت على هذا الجهاز
      </div>
    );
  }

  const platformGuide = (
    <div className="rounded-lg border border-blue-100 dark:border-slate-700 bg-blue-50/60 dark:bg-slate-800/60 p-3 space-y-2" dir="rtl">
      <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
        <Smartphone className="w-4 h-4" />
        {platformTitle(platform)}
      </p>
      <InstallSteps platform={platform} />
      {platform === "ios" && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 mt-2">
          ملاحظة: آبل لا تدعم زر التثبيت المباشر — أضف التطبيق يدوياً من Safari.
        </p>
      )}
    </div>
  );

  const instructionsDialog = (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right space-y-1">
          <DialogTitle>تثبيت تطبيق سمرة</DialogTitle>
          <DialogDescription>
            تعليمات التثبيت لجهازك الحالي فقط
          </DialogDescription>
        </DialogHeader>
        {platformGuide}
      </DialogContent>
    </Dialog>
  );

  if (variant === "compact") {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("gap-1 border-blue-200 text-blue-700", className)}
          onClick={handleInstallClick}
        >
          <Download className="w-4 h-4" />
          {platform === "ios"
            ? "تثبيت (آيفون)"
            : platform === "android"
              ? "تثبيت (أندرويد)"
              : "تثبيت التطبيق"}
        </Button>
        {instructionsDialog}
      </>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-blue-100 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 p-3 space-y-3 text-right",
        className,
      )}
      dir="rtl"
    >
      <div>
        <p className="font-semibold text-blue-900 flex items-center gap-2">
          <Download className="w-4 h-4" />
          ثبّت التطبيق على جهازك
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {platform === "ios"
            ? "تم اكتشاف جهاز آيفون / آيباد"
            : platform === "android"
              ? "تم اكتشاف جهاز أندرويد"
              : "تم اكتشاف جهاز كمبيوتر"}
        </p>
      </div>

      <Button
        type="button"
        className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        onClick={handleInstallClick}
      >
        {platform === "ios" && !deferred ? (
          <Share className="w-4 h-4" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {ctaLabel}
      </Button>

      {/* Only the matching platform instructions */}
      {platformGuide}

      {instructionsDialog}
    </div>
  );
}
