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

/** Common POS roll widths: 80mm (default) or 58mm */
const THERMAL_WIDTH_MM = 80;
const THERMAL_CONTENT_PX = 280; // ~80mm printable at 96dpi
const CSS_PX_PER_MM = 96 / 25.4;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Thermal receipt HTML sized for 80mm roll printers.
 * Page height is fitted to content at print time (see fitPageToContent).
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
  <style id="thermal-base">
    * { box-sizing: border-box; }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff;
      color: #000;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      overflow: hidden !important;
    }
    body {
      font-family: Tahoma, "Segoe UI", Arial, sans-serif;
      font-size: 12px;
      line-height: 1.3;
      width: ${THERMAL_CONTENT_PX}px;
      direction: rtl;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt {
      width: 100%;
      padding: 4px 4px 6px;
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
  iframe.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    `width:${THERMAL_CONTENT_PX + 16}px`,
    "height:1px",
    "border:0",
    "opacity:0",
    "pointer-events:none",
    "z-index:-1",
  ].join(";");
  document.body.appendChild(iframe);
  return iframe;
}

/**
 * Measure receipt height and lock @page size to content.
 * Page height must stay >= width — if height < width, Chrome/Edge
 * treat the page as landscape and rotate the receipt.
 */
function fitPageToContent(frameWindow: Window, iframe: HTMLIFrameElement) {
  const frameDoc = frameWindow.document;
  const receipt = frameDoc.getElementById("receipt");
  if (!receipt) return;

  const heightPx = Math.ceil(
    Math.max(receipt.scrollHeight, receipt.getBoundingClientRect().height),
  );
  const contentHeightMm = Math.max(1, Math.ceil(heightPx / CSS_PX_PER_MM) + 2);
  // Keep portrait: second @page length must be >= first (width).
  const pageHeightMm = Math.max(contentHeightMm, THERMAL_WIDTH_MM + 1);

  iframe.style.height = `${heightPx}px`;
  iframe.style.width = `${THERMAL_CONTENT_PX + 16}px`;

  frameDoc.getElementById("thermal-page-fit")?.remove();
  const style = frameDoc.createElement("style");
  style.id = "thermal-page-fit";
  style.textContent = `
    @page {
      size: ${THERMAL_WIDTH_MM}mm ${pageHeightMm}mm;
      margin: 0;
    }
    @media print {
      html, body {
        width: ${THERMAL_WIDTH_MM}mm !important;
        height: auto !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
      .receipt {
        padding: 2mm !important;
      }
    }
  `;
  frameDoc.head.appendChild(style);
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

  // Double rAF so fonts/layout are ready before measuring.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fitPageToContent(frameWindow, iframe);
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
      fitPageToContent(frameWindow, iframe);
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
 * Sends a thermal receipt sized exactly to its content.
 */
export function printDocument(doc: PrintDocument): boolean {
  try {
    return printViaIframe(buildPrintHtml(doc));
  } catch {
    return false;
  }
}
