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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

  const lineRows = doc.lines
    .map(
      (line) => `
      <tr>
        <td>
          <div class="item-name">${escapeHtml(line.name)}</div>
          ${line.note ? `<div class="item-note">${escapeHtml(line.note)}</div>` : ""}
        </td>
        <td class="num">${escapeHtml(line.quantityLabel)}</td>
        <td class="num">${escapeHtml(formatCurrency(line.unitPrice))}</td>
        <td class="num">${escapeHtml(formatCurrency(line.lineTotal))}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(doc.title)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #111;
    }
    body {
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      padding: 24px;
      direction: rtl;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      max-width: 720px;
      margin: 0 auto;
    }
    h1 {
      margin: 0 0 4px;
      font-size: 22px;
      text-align: center;
    }
    .subtitle {
      margin: 0 0 16px;
      text-align: center;
      color: #555;
      font-size: 13px;
    }
    .meta {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 16px;
      background: #f8fafc;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 4px 0;
      font-size: 13px;
    }
    .meta-label { color: #666; }
    .meta-value { font-weight: 600; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    th, td {
      border-bottom: 1px solid #e5e7eb;
      padding: 10px 8px;
      text-align: right;
      font-size: 13px;
      vertical-align: top;
    }
    th {
      background: #f1f5f9;
      font-weight: 700;
    }
    .num { white-space: nowrap; }
    .item-name { font-weight: 600; }
    .item-note { color: #666; font-size: 11px; margin-top: 2px; }
    .total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 2px solid #111;
      padding-top: 12px;
      font-size: 18px;
      font-weight: 700;
    }
    .footer {
      margin-top: 20px;
      text-align: center;
      color: #777;
      font-size: 12px;
    }
    @media print {
      body { padding: 12px; }
      .sheet { max-width: none; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <h1>${escapeHtml(doc.title)}</h1>
    ${doc.subtitle ? `<p class="subtitle">${escapeHtml(doc.subtitle)}</p>` : ""}
    <div class="meta">${metaRows}</div>
    <table>
      <thead>
        <tr>
          <th>الصنف</th>
          <th>الكمية</th>
          <th>السعر</th>
          <th>الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${lineRows}
      </tbody>
    </table>
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
  }, 2000);
}

function createSizedIframe(): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("title", "print-frame");
  // Chrome prints blank pages from 0×0 iframes — keep a real size off-screen.
  iframe.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    "width:1024px",
    "height:1400px",
    "border:0",
    "opacity:0",
    "pointer-events:none",
    "z-index:-1",
  ].join(";");
  document.body.appendChild(iframe);
  return iframe;
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

  // Allow layout/paint before opening the dialog.
  requestAnimationFrame(() => {
    setTimeout(trigger, 200);
  });
  setTimeout(trigger, 1200);
}

/**
 * Open a print target immediately (must run inside a click handler).
 * Use this before async work, then call printDocumentIntoHandle afterward.
 */
export function openPrintHandle(): PrintHandle | null {
  // Prefer a real window opened in the user gesture — survives async waits.
  try {
    const printWindow = window.open("", "_blank", "width=820,height=900");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(
        `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8" /><title>جاري التحضير</title></head><body style="font-family:sans-serif;padding:24px;direction:rtl;color:#333"><p>جاري تجهيز الفاتورة للطباعة...</p></body></html>`,
      );
      printWindow.document.close();

      return {
        writeAndPrint: (html: string) => {
          try {
            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
            runPrint(printWindow, () => {
              setTimeout(() => {
                try {
                  printWindow.close();
                } catch {
                  // ignore
                }
              }, 1000);
            });
          } catch {
            try {
              printWindow.close();
            } catch {
              // ignore
            }
          }
        },
        close: () => {
          try {
            printWindow.close();
          } catch {
            // ignore
          }
        },
      };
    }
  } catch {
    // Fall through to iframe.
  }

  // No popup permission — use a hidden iframe created during the click.
  try {
    const iframe = createSizedIframe();
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      iframe.remove();
      return null;
    }

    return {
      writeAndPrint: (html: string) => {
        try {
          const frameDoc = frameWindow.document;
          frameDoc.open();
          frameDoc.write(html);
          frameDoc.close();
          runPrint(frameWindow, () => cleanupIframe(iframe));
        } catch {
          cleanupIframe(iframe);
        }
      },
      close: () => cleanupIframe(iframe),
    };
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

/**
 * Chrome prints blank pages from 0×0 iframes.
 * Keep a real layout size, just move it off-screen.
 */
function printViaIframe(html: string): boolean {
  const iframe = createSizedIframe();
  const frameWindow = iframe.contentWindow;
  if (!frameWindow) {
    iframe.remove();
    return false;
  }

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    runPrint(frameWindow, () => cleanupIframe(iframe));
  };

  iframe.onload = () => start();
  iframe.srcdoc = html;
  // Safety if onload never fires.
  setTimeout(start, 1200);
  return true;
}

/**
 * Opens the browser print dialog for an invoice/receipt.
 * Uses a hidden iframe so popup blockers never interfere.
 */
export function printDocument(doc: PrintDocument): boolean {
  const html = buildPrintHtml(doc);

  try {
    return printViaIframe(html);
  } catch {
    return false;
  }
}
