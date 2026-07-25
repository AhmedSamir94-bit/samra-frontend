import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Barcode } from "lucide-react";
import { cn } from "@/lib/utils";

interface BarcodeScannerInputProps {
  onScan: (barcode: string) => void | Promise<void>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Soft-refocus when the page is idle (not while typing in other fields) */
  keepFocus?: boolean;
}

/**
 * Visual target / focus landing pad for the scanner.
 * Actual scan detection is handled by useBarcodeScanner (global keydown).
 * This input still handles Enter as a fallback for manual entry.
 */
const BarcodeScannerInput = ({
  onScan,
  placeholder = "امسح الباركود بالقارئ...",
  className,
  disabled = false,
  autoFocus = true,
  keepFocus = false,
}: BarcodeScannerInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const focusInput = useCallback(() => {
    if (disabled) return;
    const el = inputRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    el.focus({ preventScroll: true });
    console.log("[barcode] focus scanner input");
  }, [disabled]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Manual typing fallback only — wedge scans are handled globally.
    // Do NOT stopPropagation so the global listener still sees the keys.
    if (e.key === "Enter") {
      const code = (e.currentTarget.value || value).trim();
      console.log("[barcode] input Enter fallback, value=", code);
      if (code.length >= 3) {
        e.preventDefault();
        setValue("");
        if (inputRef.current) inputRef.current.value = "";
        void onScanRef.current(code);
      }
    }
  };

  useEffect(() => {
    if (!autoFocus) return;
    const t = window.setTimeout(focusInput, 50);
    return () => window.clearTimeout(t);
  }, [autoFocus, focusInput]);

  useEffect(() => {
    if (!keepFocus || disabled) return;

    // Soft keep-focus: only reclaim focus when nothing useful is focused
    // (avoids the blur↔focus loop that was eating scanner keystrokes).
    const interval = window.setInterval(() => {
      const active = document.activeElement as HTMLElement | null;
      if (!active || active === document.body) {
        focusInput();
        return;
      }
      if (active.closest("[data-barcode-scanner]")) return;
      if (active.closest("[data-scanner-ignore]")) return;
      if (
        active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.tagName === "SELECT" ||
        active.isContentEditable
      ) {
        return;
      }
      // Focus is on a button/tab/etc. — reclaim for the next scan
      focusInput();
    }, 800);

    return () => window.clearInterval(interval);
  }, [keepFocus, disabled, focusInput]);

  return (
    <div className="relative">
      <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none" />
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-barcode-scanner="true"
        className={cn(
          "pr-10 text-center font-mono text-lg tracking-wider",
          className,
        )}
        aria-label="قارئ الباركود"
      />
    </div>
  );
};

export default BarcodeScannerInput;
