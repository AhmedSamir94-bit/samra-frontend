import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Barcode } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BARCODE_SCANNED_EVENT,
  emitBarcodeScan,
} from "@/hooks/use-barcode-scanner";

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
 * Shows the last scanned barcode in the field.
 * Capture is handled by useBarcodeScanner; this input is the visual target.
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
  const [flash, setFlash] = useState(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const focusInput = useCallback(() => {
    if (disabled) return;
    const el = inputRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    el.focus({ preventScroll: true });
  }, [disabled]);

  const showScannedValue = useCallback((code: string) => {
    setValue(code);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 450);
    console.log("[barcode] input display updated:", code);
  }, []);

  // Reflect every accepted scan in this field (sales / products / purchases)
  useEffect(() => {
    const onScanned = (event: Event) => {
      const detail = (event as CustomEvent<{ barcode?: string }>).detail;
      const code = detail?.barcode?.trim();
      if (!code) return;
      showScannedValue(code);
    };

    window.addEventListener(BARCODE_SCANNED_EVENT, onScanned);
    return () => window.removeEventListener(BARCODE_SCANNED_EVENT, onScanned);
  }, [showScannedValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Manual fallback if someone pastes/types a full code somehow
    if (e.key === "Enter") {
      const code = (e.currentTarget.value || value).trim();
      if (code.length >= 3) {
        console.log("[barcode] input manual Enter fallback:", code);
        e.preventDefault();
        emitBarcodeScan(code, onScanRef.current, "scanner-input-manual");
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
      focusInput();
    }, 1500);

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
        readOnly
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-barcode-scanner="true"
        className={cn(
            className="pe-10 text-center font-mono text-lg tracking-wider caret-transparent transition-colors",
          flash && "border-green-500 bg-green-50 text-green-800",
          className,
        )}
        aria-label="قارئ الباركود"
      />
    </div>
  );
};

export default BarcodeScannerInput;
