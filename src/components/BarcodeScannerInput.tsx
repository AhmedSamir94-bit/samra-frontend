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

  const focusInput = useCallback(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const processScan = useCallback(
    async (raw: string) => {
      const barcode = raw.trim();
      if (!barcode) return;

      setIsScanning(true);
      try {
        await onScan(barcode);
      } finally {
        setValue("");
        setIsScanning(false);
        focusInput();
      }
    },
    [onScan, focusInput]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void processScan(value);
    }
  };

  useEffect(() => {
    if (autoFocus) {
      focusInput();
    }
  }, [autoFocus, focusInput]);

  useEffect(() => {
    if (!keepFocus || disabled) return;

    const input = inputRef.current;
    if (!input) return;

    const handleBlur = () => {
      window.setTimeout(() => {
        const active = document.activeElement;
        if (active?.closest("[data-scanner-ignore]")) return;
        if (active === input) return;
        focusInput();
      }, 120);
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
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isScanning}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        inputMode="text"
        className={cn(
          "pr-10 text-center font-mono text-lg tracking-wider",
          isScanning && "opacity-70",
          className
        )}
        aria-label="قارئ الباركود"
      />
    </div>
  );
};

export default BarcodeScannerInput;
