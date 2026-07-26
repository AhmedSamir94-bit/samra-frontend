import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute(
        "content",
        resolvedTheme === "dark" ? "#0f172a" : "#2563eb",
      );
    }
  }, [mounted, resolvedTheme]);

  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="w-9 px-0" aria-label="تبديل الوضع">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-9 px-0"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
      title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
