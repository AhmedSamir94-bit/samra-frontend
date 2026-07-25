import { useEffect, useRef } from "react";

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void | Promise<void>;
  enabled?: boolean;
  minLength?: number;
  /** Max gap between keys to treat input as a scanner wedge (ms) */
  maxGapMs?: number;
}

const recentScans = new Map<string, number>();

/** Deduplicate the same barcode fired twice in a short window */
export function emitBarcodeScan(
  barcode: string,
  onScan: (barcode: string) => void | Promise<void>,
  source: string,
) {
  const code = barcode.trim();
  if (!code) return;

  const now = Date.now();
  const last = recentScans.get(code) ?? 0;
  if (now - last < 600) {
    console.log(`[barcode] duplicate ignored (${source}):`, code);
    return;
  }
  recentScans.set(code, now);

  console.log(`[barcode] scan accepted (${source}):`, code);
  void Promise.resolve(onScan(code)).catch((err) => {
    console.error("[barcode] onScan error:", err);
  });
}

function charFromKeyEvent(e: KeyboardEvent): string | null {
  if (e.key === "Enter" || e.key === "Tab" || e.key === "Escape") {
    return null;
  }
  // Normal printable character
  if (e.key.length === 1) {
    return e.key;
  }
  // Some USB scanners report Unidentified — fall back to which/keyCode
  if (
    (e.key === "Unidentified" || e.key === "Process") &&
    typeof e.which === "number" &&
    e.which >= 32 &&
    e.which <= 126
  ) {
    return String.fromCharCode(e.which);
  }
  if (
    e.key === "Unidentified" &&
    typeof e.keyCode === "number" &&
    e.keyCode >= 32 &&
    e.keyCode <= 126
  ) {
    return String.fromCharCode(e.keyCode);
  }
  return null;
}

function isTerminator(e: KeyboardEvent) {
  return (
    e.key === "Enter" ||
    e.key === "Tab" ||
    e.key === "NumpadEnter" ||
    e.code === "Enter" ||
    e.code === "NumpadEnter" ||
    e.keyCode === 13 ||
    e.which === 13
  );
}

/**
 * Global USB / keyboard-wedge barcode listener.
 * Must capture ALL keys (including while focused on the scanner input).
 */
export function useBarcodeScanner({
  onScan,
  enabled = true,
  minLength = 3,
  maxGapMs = 150,
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) {
      bufferRef.current = "";
      console.log("[barcode] global listener disabled");
      return;
    }

    console.log("[barcode] global listener enabled (capture=true)");

    const finishScan = (source: string, event?: KeyboardEvent) => {
      const barcode = bufferRef.current.trim();
      bufferRef.current = "";
      if (barcode.length < minLength) {
        console.log(
          `[barcode] terminator ignored — buffer too short (${source}):`,
          JSON.stringify(barcode),
        );
        return;
      }
      event?.preventDefault();
      event?.stopPropagation();
      emitBarcodeScan(barcode, onScanRef.current, source);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const targetDesc = target
        ? `${target.tagName}${target.id ? "#" + target.id : ""}${
            target.getAttribute?.("data-barcode-scanner")
              ? "[scanner]"
              : ""
          }`
        : "null";

      // Always log raw events so we can see whether the reader reaches the page
      console.log("[barcode] raw keydown", {
        key: e.key,
        code: e.code,
        which: e.which,
        keyCode: e.keyCode,
        repeat: e.repeat,
        target: targetDesc,
      });

      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.repeat) return;

      // Don't steal slow typing inside textareas
      if (target?.tagName === "TEXTAREA" || target?.isContentEditable) {
        return;
      }

      const now = Date.now();
      const gap = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (gap > maxGapMs) {
        if (bufferRef.current) {
          console.log(
            "[barcode] buffer reset (gap)",
            gap,
            "ms, had:",
            bufferRef.current,
          );
        }
        bufferRef.current = "";
      }

      if (isTerminator(e)) {
        console.log(
          "[barcode] terminator seen, buffer=",
          JSON.stringify(bufferRef.current),
        );
        finishScan("global-enter", e);
        return;
      }

      const ch = charFromKeyEvent(e);
      if (ch == null) {
        console.log("[barcode] non-char key ignored:", e.key, e.code);
        return;
      }

      bufferRef.current += ch;
      console.log(
        "[barcode] buffered",
        JSON.stringify(ch),
        "→",
        bufferRef.current,
        `(gap ${gap}ms)`,
      );

      // Once it looks like a wedge burst, stop keys leaking into other fields
      if (bufferRef.current.length >= 2 && gap <= maxGapMs) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Some readers only fire keypress reliably
    const handleKeyPress = (e: KeyboardEvent) => {
      console.log("[barcode] raw keypress", {
        key: e.key,
        which: e.which,
        charCode: e.charCode,
      });
    };

    // Paste support (some Bluetooth scanners)
    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text")?.trim();
      console.log("[barcode] paste:", text);
      if (text && text.length >= minLength && !/\s/.test(text)) {
        e.preventDefault();
        bufferRef.current = "";
        emitBarcodeScan(text, onScanRef.current, "paste");
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keypress", handleKeyPress, true);
    window.addEventListener("paste", handlePaste, true);

    return () => {
      console.log("[barcode] global listener removed");
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keypress", handleKeyPress, true);
      window.removeEventListener("paste", handlePaste, true);
    };
  }, [enabled, minLength, maxGapMs]);
}
