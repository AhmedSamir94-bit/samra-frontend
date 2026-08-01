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

/** Paper width vs safe printable width (thermal printers clip ~3–6mm each side) */
const THERMAL_WIDTH_MM = 80;
const THERMAL_SAFE_WIDTH_MM = 62;
const PRINT_ROOT_ID = "pos-thermal-print-root";
const PRINT_STYLE_ID = "pos-thermal-print-style";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildReceiptMarkup(doc: PrintDocument) {
  const metaRows = doc.meta
    .map(
      (row) => `
      <div class="pos-meta-row">
        <span class="pos-meta-label">${escapeHtml(row.label)}</span>
        <span class="pos-meta-value">${escapeHtml(row.value)}</span>
      </div>`,
    )
    .join("");

  const lineBlocks = doc.lines
    .map(
      (line) => `
      <div class="pos-item">
        <div class="pos-item-name">${escapeHtml(line.name)}</div>
        ${line.note ? `<div class="pos-item-note">${escapeHtml(line.note)}</div>` : ""}
        <div class="pos-item-row">
          <span>${escapeHtml(line.quantityLabel)} × ${escapeHtml(formatCurrency(line.unitPrice))}</span>
          <span class="pos-item-total">${escapeHtml(formatCurrency(line.lineTotal))}</span>
        </div>
      </div>`,
    )
    .join("");

  return `
    <div class="pos-receipt" dir="rtl">
      <h1 class="pos-store-title">${escapeHtml(doc.title)}</h1>
      ${doc.subtitle ? `<p class="pos-subtitle">${escapeHtml(doc.subtitle)}</p>` : ""}
      <hr class="pos-divider" />
      <div class="pos-meta">${metaRows}</div>
      <hr class="pos-divider" />
      <div class="pos-items">${lineBlocks}</div>
      <hr class="pos-divider" />
      <div class="pos-total">
        <span>${escapeHtml(doc.totalLabel || "الإجمالي")}</span>
        <span>${escapeHtml(formatCurrency(doc.total))}</span>
      </div>
      ${
        doc.footerNote
          ? `<p class="pos-footer">${escapeHtml(doc.footerNote)}</p>`
          : `<p class="pos-footer">شكراً لتعاملكم معنا</p>
      <p class="pos-footer-phone" dir="ltr">01007557530</p>`
      }
    </div>
  `;
}

function ensurePrintAssets() {
  let style = document.getElementById(PRINT_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = PRINT_STYLE_ID;
    style.textContent = `
      #${PRINT_ROOT_ID} {
        display: none;
      }

      @page {
        size: portrait;
        margin: 0;
      }

      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          width: ${THERMAL_WIDTH_MM}mm !important;
          height: auto !important;
        }

        /* Hide the app UI — print only the receipt in this same page */
        body > *:not(#${PRINT_ROOT_ID}) {
          display: none !important;
        }

        #${PRINT_ROOT_ID} {
          display: block !important;
          position: static !important;
          width: ${THERMAL_WIDTH_MM}mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          color: #000 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        #${PRINT_ROOT_ID} .pos-receipt {
          width: ${THERMAL_SAFE_WIDTH_MM}mm;
          max-width: ${THERMAL_SAFE_WIDTH_MM}mm;
          margin: 0 auto;
          padding: 2mm 0;
          font-family: Tahoma, "Segoe UI", Arial, sans-serif;
          font-size: 11px;
          line-height: 1.3;
          direction: rtl;
          overflow: hidden;
        }

        #${PRINT_ROOT_ID} .pos-store-title {
          margin: 0 0 2px;
          font-size: 14px;
          font-weight: 700;
          text-align: center;
          overflow-wrap: anywhere;
        }

        #${PRINT_ROOT_ID} .pos-subtitle {
          margin: 0 0 6px;
          text-align: center;
          font-size: 10px;
          overflow-wrap: anywhere;
        }

        #${PRINT_ROOT_ID} .pos-divider {
          border: 0;
          border-top: 1px dashed #000;
          margin: 6px 0;
        }

        #${PRINT_ROOT_ID} .pos-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 6px;
          font-size: 10px;
          margin: 1px 0;
        }

        #${PRINT_ROOT_ID} .pos-meta-label {
          opacity: 0.8;
          flex: 0 1 auto;
          min-width: 0;
        }

        #${PRINT_ROOT_ID} .pos-meta-value {
          font-weight: 700;
          flex: 1 1 auto;
          min-width: 0;
          text-align: start;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        #${PRINT_ROOT_ID} .pos-item {
          margin: 5px 0;
        }

        #${PRINT_ROOT_ID} .pos-item-name {
          font-weight: 700;
          font-size: 11px;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        #${PRINT_ROOT_ID} .pos-item-note {
          font-size: 9px;
          opacity: 0.75;
          margin-top: 1px;
          overflow-wrap: anywhere;
        }

        #${PRINT_ROOT_ID} .pos-item-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 6px;
          font-size: 10px;
          margin-top: 2px;
        }

        #${PRINT_ROOT_ID} .pos-item-row > span:first-child {
          flex: 1 1 auto;
          min-width: 0;
          overflow-wrap: anywhere;
        }

        #${PRINT_ROOT_ID} .pos-item-total {
          font-weight: 700;
          flex: 0 0 auto;
          white-space: nowrap;
        }

        #${PRINT_ROOT_ID} .pos-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
          padding-top: 2px;
        }

        #${PRINT_ROOT_ID} .pos-total > span {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        #${PRINT_ROOT_ID} .pos-footer {
          margin: 8px 0 0;
          text-align: center;
          font-size: 10px;
          overflow-wrap: anywhere;
        }

        #${PRINT_ROOT_ID} .pos-footer-phone {
          margin: 4px 0 0;
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          direction: ltr;
          unicode-bidi: isolate;
        }
      }
    `;
    document.head.appendChild(style);
  }

  let root = document.getElementById(PRINT_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = PRINT_ROOT_ID;
    root.setAttribute("aria-hidden", "true");
    document.body.appendChild(root);
  }

  return root;
}

function cleanupPrintRoot() {
  const root = document.getElementById(PRINT_ROOT_ID);
  if (root) {
    root.innerHTML = "";
  }
}

/**
 * Print from the current page only — no new tab/window/iframe.
 * The system print dialog may still appear (browser security).
 */
export function printDocument(doc: PrintDocument): boolean {
  try {
    const root = ensurePrintAssets();
    root.innerHTML = buildReceiptMarkup(doc);

    const finish = () => {
      cleanupPrintRoot();
      window.removeEventListener("afterprint", finish);
    };

    window.addEventListener("afterprint", finish);

    // Let the DOM paint the receipt node before printing.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          window.print();
        } catch {
          finish();
        }
        // Fallback cleanup if afterprint never fires.
        setTimeout(finish, 2000);
      });
    });

    return true;
  } catch {
    cleanupPrintRoot();
    return false;
  }
}
