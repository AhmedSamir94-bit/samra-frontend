import { formatCurrency } from "@/lib/currency";

export type PrintMetaRow = {
  label: string;
  value: string;
};

export type PrintLine = {
  name: string;
  quantityLabel: string;
  unitPrice: number;
  lineTotal: number;
  note?: string;
};

export type PrintDocument = {
  title: string;
  subtitle?: string;
  meta: PrintMetaRow[];
  lines: PrintLine[];
  totalLabel?: string;
  total: number;
  footerNote?: string;
};

/**
 * A print target opened during a user click so async work
 * (API calls) can still print afterward without popup blockers.
 */
export type PrintHandle = {
  writeAndPrint: (html: string) => void;
  close: () => void;
};

/** Common POS roll width */
const THERMAL_WIDTH_MM = 80;
const THERMAL_CONTENT_PX = 302;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Thermal receipt HTML for 80mm roll printers.
 * Do NOT set @page width×height — when height < width Chrome flips to landscape.
 * Force portrait and let height follow content.
 */
function buildPrintHtml(doc: PrintDocument) {
  const metaRows = doc.meta
    .map(
      (row) => `
      <div class="meta-row">
        <span class="meta-label">${escapeHtml(row.label)}</span>
        <span class="meta-value">${escapeHtml(row.value)}</span>
      </div>`,
    )
    .join("");

  const lineBlocks = doc.lines
    .map(
      (line) => `
      <div class="item">
        <div class="item-name">${escapeHtml(line.name)}</div>
        ${line.note ? `<div class="item-note">${escapeHtml(line.note)}</div>` : ""}
        <div class="item-row">
          <span>${escapeHtml(line.quantityLabel)} × ${escapeHtml(formatCurrency(line.unitPrice))}</span>
          <span class="item-total">${escapeHtml(formatCurrency(line.lineTotal))}</span>
        </div>
      </div>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(doc.title)}</title>
  <style>
    /* portrait only — never pass a custom width×height pair to @page */
    @page {
      size: portrait;
      margin: 0;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff;
      color: #000;
      width: ${THERMAL_WIDTH_MM}mm;
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
    }
    body {
      font-family: Tahoma, "Segoe UI", Arial, sans-serif;
      font-size: 12px;
      line-height: 1.3;
      direction: rtl;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt {
      width: ${THERMAL_WIDTH_MM}mm;
      max-width: ${THERMAL_WIDTH_MM}mm;
      padding: 2mm;
    }
    .store-title {
      margin: 0 0 2px;
      font-size: 15px;
      font-weight: 700;
      text-align: center;
    }
    .subtitle {
      margin: 0 0 6px;
      text-align: center;
      font-size: 11px;
    }
    .divider {
      border: 0;
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 11px;
      margin: 1px 0;
    }
    .meta-label { opacity: 0.8; }
    .meta-value { font-weight: 700; text-align: left; }
    .item { margin: 5px 0; }
    .item-name {
      font-weight: 700;
      font-size: 12px;
      word-break: break-word;
    }
    .item-note {
      font-size: 10px;
      opacity: 0.75;
      margin-top: 1px;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 11px;
      margin-top: 2px;
    }
    .item-total { font-weight: 700; white-space: nowrap; }
    .total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      font-weight: 700;
      padding-top: 2px;
    }
    .footer {
      margin: 8px 0 0;
      text-align: center;
      font-size: 11px;
    }
    @media print {
      @page {
        size: portrait;
        margin: 0;
      }
      html, body {
        width: ${THERMAL_WIDTH_MM}mm !important;
        height: auto !important;
      }
    }
  </style>
</head>
<body>
  <div class="receipt" id="receipt">
    <h1 class="store-title">${escapeHtml(doc.title)}</h1>
    ${doc.subtitle ? `<p class="subtitle">${escapeHtml(doc.subtitle)}</p>` : ""}
    <hr class="divider" />
    <div class="meta">${metaRows}</div>
    <hr class="divider" />
    <div class="items">${lineBlocks}</div>
    <hr class="divider" />
    <div class="total">
      <span>${escapeHtml(doc.totalLabel || "الإجمالي")}</span>
      <span>${escapeHtml(formatCurrency(doc.total))}</span>
    </div>
    ${
      doc.footerNote
        ? `<p class="footer">${escapeHtml(doc.footerNote)}</p>`
        : `<p class="footer">شكراً لتعاملكم معنا</p>`
    }
  </div>
</body>
</html>`;
}

function cleanupIframe(iframe: HTMLIFrameElement) {
  setTimeout(() => {
    iframe.remove();
  }, 2500);
}

function createThermalIframe(): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("title", "thermal-print-frame");
  // Start tall (portrait aspect) so Chrome does not auto-pick landscape.
  iframe.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    `width:${THERMAL_CONTENT_PX}px`,
    "height:900px",
    "border:0",
    "opacity:0",
    "pointer-events:none",
    "z-index:-1",
  ].join(";");
  document.body.appendChild(iframe);
  return iframe;
}

/**
 * Keep the iframe in a portrait aspect ratio so the browser
 * print dialog defaults to Portrait, not Landscape.
 */
function prepareThermalFrame(frameWindow: Window, iframe: HTMLIFrameElement) {
  const receipt = frameWindow.document.getElementById("receipt");
  const contentHeight = receipt
    ? Math.ceil(Math.max(receipt.scrollHeight, receipt.getBoundingClientRect().height))
    : 400;

  iframe.style.width = `${THERMAL_CONTENT_PX}px`;
  // Always taller than wide — Chrome uses frame aspect to pick orientation.
  iframe.style.height = `${Math.max(contentHeight + 24, THERMAL_CONTENT_PX + 200)}px`;
}

function runPrint(target: Window, onDone?: () => void) {
  let printed = false;
  const trigger = () => {
    if (printed) return;
    printed = true;
    try {
      target.focus();
      target.print();
    } catch {
      // ignore
    } finally {
      onDone?.();
    }
  };

  requestAnimationFrame(() => {
    setTimeout(trigger, 200);
  });
  setTimeout(trigger, 1200);
}

function writeFitAndPrint(
  iframe: HTMLIFrameElement,
  frameWindow: Window,
  html: string,
  onDone?: () => void,
) {
  const frameDoc = frameWindow.document;
  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      prepareThermalFrame(frameWindow, iframe);
      runPrint(frameWindow, onDone);
    });
  });
}

function createIframeHandle(iframe: HTMLIFrameElement, frameWindow: Window): PrintHandle {
  return {
    writeAndPrint: (html: string) => {
      try {
        writeFitAndPrint(iframe, frameWindow, html, () => cleanupIframe(iframe));
      } catch {
        cleanupIframe(iframe);
      }
    },
    close: () => cleanupIframe(iframe),
  };
}

/**
 * Open a print target immediately (must run inside a click handler).
 */
export function openPrintHandle(): PrintHandle | null {
  try {
    const iframe = createThermalIframe();
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      iframe.remove();
      return null;
    }
    return createIframeHandle(iframe, frameWindow);
  } catch {
    return null;
  }
}

export function printDocumentIntoHandle(handle: PrintHandle, doc: PrintDocument): boolean {
  try {
    handle.writeAndPrint(buildPrintHtml(doc));
    return true;
  } catch {
    handle.close();
    return false;
  }
}

function printViaIframe(html: string): boolean {
  const iframe = createThermalIframe();
  const frameWindow = iframe.contentWindow;
  if (!frameWindow) {
    iframe.remove();
    return false;
  }

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    try {
      prepareThermalFrame(frameWindow, iframe);
      runPrint(frameWindow, () => cleanupIframe(iframe));
    } catch {
      cleanupIframe(iframe);
    }
  };

  iframe.onload = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(start);
    });
  };
  iframe.srcdoc = html;
  setTimeout(start, 1500);
  return true;
}

/**
 * Sends a thermal receipt to the printer in portrait orientation.
 */
export function printDocument(doc: PrintDocument): boolean {
  try {
    return printViaIframe(buildPrintHtml(doc));
  } catch {
    return false;
  }
}
