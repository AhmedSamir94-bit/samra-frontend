import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Barcode } from "lucide-react";
import { cn } from "@/lib/utils";
import { emitBarcodeScan } from "@/hooks/use-barcode-scanner";

interface BarcodeScannerInputProps {
  onScan: (barcode: string) => void | Promise<void>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Refocus after blur unless focus moved to an element with data-scanner-ignore */
  keepFocus?: boolean;
}

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
  const [isScanning, setIsScanning] = useState(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const focusInput = useCallback(() => {
    if (!disabled) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [disabled]);

  const processScan = useCallback(
    async (raw: string, source: string) => {
      const barcode = raw.trim();
      if (!barcode) {
        console.log(`[barcode] empty scan ignored (${source})`);
        return;
      }

      setIsScanning(true);
      try {
        emitBarcodeScan(barcode, onScanRef.current, source);
      } finally {
        setValue("");
        if (inputRef.current) {
          inputRef.current.value = "";
        }
        setIsScanning(false);
        // Refocus after React paint so the next scan lands here
        window.setTimeout(focusInput, 0);
      }
    },
    [focusInput],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    console.log(
      "[barcode] input keydown:",
      e.key,
      "domValue:",
      e.currentTarget.value,
      "reactValue:",
      value,
    );

    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      // Use DOM value — React state lags behind fast scanner keystrokes
      const domValue = e.currentTarget.value;
      void processScan(domValue || value, "scanner-input");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setValue(next);
    console.log("[barcode] input change:", next);
  };

  useEffect(() => {
    if (autoFocus) {
      console.log("[barcode] autofocus scanner input");
      focusInput();
    }
  }, [autoFocus, focusInput]);

  useEffect(() => {
    if (!keepFocus || disabled) return;

    const input = inputRef.current;
    if (!input) return;

    const handleBlur = () => {
      window.setTimeout(() => {
        const active = document.activeElement as HTMLElement | null;
        if (active?.closest("[data-scanner-ignore]")) {
          console.log("[barcode] blur kept — focus on scanner-ignore field");
          return;
        }
        if (active === input) return;
        console.log("[barcode] re-focusing scanner input after blur");
        focusInput();
      }, 80);
    };

    input.addEventListener("blur", handleBlur);
    return () => input.removeEventListener("blur", handleBlur);
  }, [keepFocus, disabled, focusInput]);

  return (
    <div className="relative">
      <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none" />
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isScanning}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        inputMode="none"
        data-barcode-scanner="true"
        className={cn(
          "pr-10 text-center font-mono text-lg tracking-wider",
          isScanning && "opacity-70",
          className,
        )}
        aria-label="قارئ الباركود"
      />
    </div>
  );
};

export default BarcodeScannerInput;
