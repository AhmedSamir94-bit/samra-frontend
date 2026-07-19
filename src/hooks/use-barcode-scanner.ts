import { useEffect, useRef } from "react";

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void | Promise<void>;
  enabled?: boolean;
  minLength?: number;
  maxGapMs?: number;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;

  if (tag === "INPUT") {
    const input = target as HTMLInputElement;
    if (input.type === "hidden") return false;
    if (input.getAttribute("aria-label") === "قارئ الباركود") return true;
    return true;
  }

  return false;
}

export function useBarcodeScanner({
  onScan,
  enabled = true,
  minLength = 3,
  maxGapMs = 100,
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) {
      bufferRef.current = "";
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const now = Date.now();
      if (now - lastKeyTimeRef.current > maxGapMs) {
        bufferRef.current = "";
      }
      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        const barcode = bufferRef.current.trim();
        bufferRef.current = "";

        if (barcode.length >= minLength) {
          e.preventDefault();
          void onScanRef.current(barcode);
        }
        return;
      }

      if (e.key.length === 1 && !e.key.startsWith("F")) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [enabled, minLength, maxGapMs]);
}
