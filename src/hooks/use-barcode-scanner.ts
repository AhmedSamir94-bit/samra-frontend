import { useEffect, useRef } from "react";

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void | Promise<void>;
  enabled?: boolean;
  minLength?: number;
  /** Max gap between keys to treat input as a scanner wedge (ms) */
  maxGapMs?: number;
}

const recentScans = new Map<string, number>();

/** Deduplicate the same barcode fired by both the input and the global listener */
export function emitBarcodeScan(
  barcode: string,
  onScan: (barcode: string) => void | Promise<void>,
  source: string,
) {
  const code = barcode.trim();
  if (!code) return;

  const now = Date.now();
  const last = recentScans.get(code) ?? 0;
  if (now - last < 500) {
    console.log(`[barcode] duplicate ignored (${source}):`, code);
    return;
  }
  recentScans.set(code, now);

  console.log(`[barcode] scan accepted (${source}):`, code);
  void onScan(code);
}

function shouldIgnoreTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  // Dedicated scanner field — handled by BarcodeScannerInput
  if (target.closest("[data-barcode-scanner]")) return true;

  // Explicit opt-out for normal form typing (search, qty, etc.)
  // Still allow wedge detection unless user is in textarea
  if (target.tagName === "TEXTAREA") return true;
  if (target.isContentEditable) return true;

  return false;
}

/**
 * Listens for USB/keyboard-wedge barcode scanners.
 * Scanners type characters very quickly then send Enter/Tab.
 */
export function useBarcodeScanner({
  onScan,
  enabled = true,
  minLength = 3,
  maxGapMs = 80,
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

    console.log("[barcode] global listener enabled");

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (shouldIgnoreTarget(e.target)) return;

      const now = Date.now();
      const gap = now - lastKeyTimeRef.current;

      if (gap > maxGapMs) {
        if (bufferRef.current) {
          console.log(
            "[barcode] buffer reset (slow typing gap)",
            gap,
            "ms, had:",
            bufferRef.current,
          );
        }
        bufferRef.current = "";
      }
      lastKeyTimeRef.current = now;

      if (e.key === "Enter" || e.key === "Tab") {
        const barcode = bufferRef.current.trim();
        bufferRef.current = "";

        if (barcode.length >= minLength) {
          console.log("[barcode] Enter/Tab with buffer:", barcode);
          e.preventDefault();
          e.stopPropagation();
          emitBarcodeScan(barcode, onScanRef.current, "global-wedge");
        }
        return;
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key;
        console.log(
          "[barcode] key:",
          JSON.stringify(e.key),
          "buffer:",
          bufferRef.current,
          "gap:",
          gap,
          "ms",
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      console.log("[barcode] global listener removed");
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [enabled, minLength, maxGapMs]);
}
