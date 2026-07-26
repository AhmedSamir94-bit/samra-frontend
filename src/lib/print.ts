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
    body {
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      color: #111;
      background: #fff;
      direction: rtl;
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
      body { padding: 0; }
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

export function printDocument(doc: PrintDocument): boolean {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=820,height=900");

  if (!printWindow) {
    return false;
  }

  const html = buildPrintHtml(doc);
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  const triggerPrint = () => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch {
      // Ignore print errors from closed windows.
    }
  };

  // Some browsers need a short delay after document.write.
  if (printWindow.document.readyState === "complete") {
    setTimeout(triggerPrint, 150);
  } else {
    printWindow.onload = () => setTimeout(triggerPrint, 50);
    setTimeout(triggerPrint, 300);
  }

  return true;
}
