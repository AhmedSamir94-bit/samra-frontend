import { useEffect, useRef } from "react";

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void | Promise<void>;
  enabled?: boolean;
  minLength?: number;
  /**
   * How long to wait after the last key before discarding the buffer (ms).
   * USB scanners can be slow between digits — keep this generous.
   */
  idleResetMs?: number;
}

const recentScans = new Map<string, number>();

export const BARCODE_SCANNED_EVENT = "samra:barcode-scanned";

export function emitBarcodeScan(
  barcode: string,
  onScan: (barcode: string) => void | Promise<void>,
  source: string,
) {
  const code = barcode.trim();
  if (!code) return;

  const now = Date.now();
  const last = recentScans.get(code) ?? 0;
  if (now - last < 800) {
    console.log(`[barcode] duplicate ignored (${source}):`, code);
    return;
  }
  recentScans.set(code, now);

  console.log(`[barcode] scan accepted (${source}):`, code);

  // Update every scanner input UI with the code that was just read
  window.dispatchEvent(
    new CustomEvent(BARCODE_SCANNED_EVENT, { detail: { barcode: code, source } }),
  );

  void Promise.resolve(onScan(code)).catch((err) => {
    console.error("[barcode] onScan error:", err);
  });
}

function charFromKeyEvent(e: KeyboardEvent): string | null {
  if (
    e.key === "Enter" ||
    e.key === "Tab" ||
    e.key === "Escape" ||
    e.key === "Backspace" ||
    e.key === "Delete" ||
    e.key === "Shift" ||
    e.key === "Control" ||
    e.key === "Alt" ||
    e.key === "Meta"
  ) {
    return null;
  }

  if (e.key.length === 1) {
    return e.key;
  }

  // Some USB scanners report Unidentified — use which/keyCode
  const code = e.which || e.keyCode;
  if (
    (e.key === "Unidentified" || e.key === "Process") &&
    typeof code === "number" &&
    code >= 32 &&
    code <= 126
  ) {
    return String.fromCharCode(code);
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
 *
 * Uses an idle timeout to clear the buffer (not per-key gap resets),
 * so slower scanners still capture the full code.
 */
export function useBarcodeScanner({
  onScan,
  enabled = true,
  minLength = 3,
  idleResetMs = 600,
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef("");
  const idleTimerRef = useRef<number | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) {
      bufferRef.current = "";
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      console.log("[barcode] global listener disabled");
      return;
    }

    console.log("[barcode] global listener enabled, idleResetMs=", idleResetMs);

    const clearIdleTimer = () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };

    const scheduleIdleReset = () => {
      clearIdleTimer();
      idleTimerRef.current = window.setTimeout(() => {
        if (bufferRef.current) {
          console.log(
            "[barcode] idle reset, discarded buffer:",
            bufferRef.current,
          );
        }
        bufferRef.current = "";
        idleTimerRef.current = null;
      }, idleResetMs);
    };

    const finishScan = (source: string, event?: KeyboardEvent) => {
      clearIdleTimer();
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

      console.log("[barcode] raw keydown", {
        key: e.key,
        code: e.code,
        which: e.which,
        buffer: bufferRef.current,
        target: target?.tagName,
      });

      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.repeat) return;

      // Allow normal typing in textareas / contenteditable
      if (target?.tagName === "TEXTAREA" || target?.isContentEditable) {
        return;
      }

      // If user is slowly typing in a normal form field, don't hijack —
      // but still capture fast wedge bursts (buffer already started or terminator).
      const inNormalInput =
        target instanceof HTMLInputElement &&
        !target.dataset.barcodeScanner &&
        target.closest("[data-scanner-ignore]");

      if (isTerminator(e)) {
        if (bufferRef.current.length >= minLength) {
          finishScan("global-enter", e);
        } else if (!inNormalInput) {
          // Clear stray short buffer
          bufferRef.current = "";
          clearIdleTimer();
        }
        return;
      }

      const ch = charFromKeyEvent(e);
      if (ch == null) {
        return;
      }

      // Slow typing in ignored form fields: don't build a scan buffer
      if (inNormalInput && bufferRef.current.length === 0) {
        return;
      }

      bufferRef.current += ch;
      scheduleIdleReset();

      console.log(
        "[barcode] buffered",
        JSON.stringify(ch),
        "→",
        bufferRef.current,
      );

      // Keep wedge keys out of other focused inputs once a scan has started
      if (bufferRef.current.length >= 1) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text")?.trim();
      console.log("[barcode] paste:", text);
      if (text && text.length >= minLength && !/\s/.test(text)) {
        e.preventDefault();
        clearIdleTimer();
        bufferRef.current = "";
        emitBarcodeScan(text, onScanRef.current, "paste");
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("paste", handlePaste, true);

    return () => {
      console.log("[barcode] global listener removed");
      clearIdleTimer();
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("paste", handlePaste, true);
    };
  }, [enabled, minLength, idleResetMs]);
}
