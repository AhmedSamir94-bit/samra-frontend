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
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIos) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/** True only when running as an installed home-screen app. */
function isStandaloneDisplay() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
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
          في أسفل الشاشة (أو أعلى في بعض الإصدارات)
        </li>
        <li>
          مرّر للأسفل واختر{" "}
          <span className="font-semibold text-gray-900">
            «إضافة إلى الشاشة الرئيسية»
          </span>
        </li>
        <li>اضغط «إضافة» — سيظهر تطبيق سمرة على شاشتك</li>
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
  /** `card` = full guide on login; `compact` = header button + dialog */
  variant?: "card" | "compact";
  className?: string;
}

/**
 * Always visible install CTA.
 * Android/Chrome can use the native prompt; iOS always shows Safari how-to
 * (Apple does not support beforeinstallprompt).
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
      console.log("[pwa] beforeinstallprompt ready");
    };

    const onInstalled = () => {
      console.log("[pwa] app installed");
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
    console.log("[pwa] install choice:", choice.outcome);
    if (choice.outcome === "accepted") {
      setInstalled(true);
    }
    setDeferred(null);
  };

  const handleInstallClick = async () => {
    if (deferred) {
      await runNativeInstall();
      return;
    }
    // iOS / browsers without native prompt → show instructions
    setDialogOpen(true);
  };

  const ctaLabel = deferred
    ? "تثبيت الآن بنقرة واحدة"
    : platform === "ios"
      ? "كيفية التثبيت على آيفون"
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

  const guideBody = (
    <div className="space-y-4" dir="rtl">
      <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 space-y-2">
        <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
          <Smartphone className="w-4 h-4" />
          {platform === "ios"
            ? "تثبيت على آيفون / آيباد (Safari)"
            : platform === "android"
              ? "تثبيت على أندرويد"
              : "تثبيت على الكمبيوتر"}
        </p>
        <InstallSteps platform={platform} />
      </div>

      {platform === "ios" && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
          ملاحظة: آبل لا تدعم زر التثبيت المباشر — يجب الإضافة يدوياً من Safari كما
          بالأعلى.
        </p>
      )}

      <details className="text-sm text-gray-600">
        <summary className="cursor-pointer text-blue-700 font-medium">
          تعليمات الأجهزة الأخرى
        </summary>
        <div className="mt-3 space-y-4">
          {platform !== "android" && (
            <div>
              <p className="font-semibold text-gray-800 mb-2">أندرويد (Chrome)</p>
              <InstallSteps platform="android" />
            </div>
          )}
          {platform !== "ios" && (
            <div>
              <p className="font-semibold text-gray-800 mb-2">آيفون (Safari)</p>
              <InstallSteps platform="ios" />
            </div>
          )}
          {platform !== "desktop" && (
            <div>
              <p className="font-semibold text-gray-800 mb-2">الكمبيوتر</p>
              <InstallSteps platform="desktop" />
            </div>
          )}
        </div>
      </details>
    </div>
  );

  const instructionsDialog = (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right space-y-1">
          <DialogTitle>تثبيت تطبيق سمرة</DialogTitle>
          <DialogDescription>
            ثبّت التطبيق على جهازك للوصول السريع من الشاشة الرئيسية
          </DialogDescription>
        </DialogHeader>
        {guideBody}
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
          تثبيت التطبيق
        </Button>
        {instructionsDialog}
      </>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-blue-100 bg-white/80 p-3 space-y-3 text-right",
        className,
      )}
      dir="rtl"
    >
      <div>
        <p className="font-semibold text-blue-900 flex items-center gap-2 justify-start">
          <Download className="w-4 h-4" />
          ثبّت التطبيق على جهازك
        </p>
        <p className="text-xs text-gray-500 mt-1">
          استخدم سمرة كتطبيق من الشاشة الرئيسية — أسرع وأسهل للكاشير
        </p>
      </div>

      {/* Always visible — critical for iOS where native prompt never exists */}
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

      {/* Keep iOS steps visible on the login card without requiring a tap */}
      {platform === "ios" && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 space-y-2">
          <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            خطوات سريعة لآيفون
          </p>
          <InstallSteps platform="ios" />
        </div>
      )}

      {platform !== "ios" && !deferred && guideBody}

      {instructionsDialog}
    </div>
  );
}
