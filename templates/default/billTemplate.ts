import { Bill, CustomTemplate, Firm } from '@/types';
import { numberToWords } from '@/lib/numberToWords';

/**
 * Reference Bill Template — matches the shared image exactly:
 *  - Invoice No. top-left, Date top-right
 *  - Centered recipient block (bold, multi-line)
 *  - Table: dark header (#2d2d2d bg, white text), 5 columns
 *  - Always 12 visible rows total (items + empty filler rows)
 *  - Filler rows shrink if any item text wraps to multiple lines
 *  - Bank details + tax breakdown in footer
 *  - Rs. in words row
 *  - Proprietor / Signature block
 */
export function getSampleBillTemplate(): string {
  return `<div class="bill-template-root" style="width:100%;box-sizing:border-box;padding:0;font-family:Arial,sans-serif;color:#000;background:transparent;font-size:13px;">

  <!-- Invoice No. & Date Row -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;">
    <div style="font-size:15px;font-weight:bold;">Invoice No. {{invoiceNumber}}</div>
    <div style="font-size:13px;font-weight:bold;">Date : {{invoiceDate}}</div>
  </div>

  <!-- Recipient Centered Header -->
  <div style="text-align:center;font-weight:bold;font-size:15px;line-height:1.55;margin-bottom:22px;">
    {{recipientHeaderHTML}}
  </div>

  <!-- Main Items Table -->
  <table style="width:100%;border-collapse:collapse;border:1.5px solid #444;font-size:13px;">
    <thead>
      <tr style="background:#2d2d2d;color:#fff;text-align:center;font-weight:bold;">
        <th style="width:7%;border-right:1px solid #555;padding:7px 4px;border-bottom:1px solid #555;">S.No.</th>
        <th style="width:46%;border-right:1px solid #555;padding:7px 8px;text-align:center;border-bottom:1px solid #555;">Description of Goods</th>
        <th style="width:14%;border-right:1px solid #555;padding:7px 4px;border-bottom:1px solid #555;">Quantity</th>
        <th style="width:15%;border-right:1px solid #555;padding:7px 4px;border-bottom:1px solid #555;">Price</th>
        <th style="width:18%;padding:7px 4px;border-bottom:1px solid #555;">Amount</th>
      </tr>
    </thead>
    <tbody style="background:#f5f5f0;">
      {{itemRows}}
    </tbody>
    <tfoot>
      <!-- Bank Details + Total row -->
      <tr style="border-top:1.5px solid #444;">
        <td colspan="3" style="border-right:1.5px solid #444;border-bottom:1.5px solid #444;text-align:center;font-weight:bold;padding:6px;background:#fff;">Bank Details</td>
        <td style="border-right:1.5px solid #444;border-bottom:1.5px solid #444;text-align:right;padding:6px 8px;font-weight:bold;background:#fff;">Total</td>
        <td style="border-bottom:1.5px solid #444;text-align:right;padding:6px 8px;background:#fff;">Rs. {{subtotal}}</td>
      </tr>
      <!-- Bank block (left, rowspan 4) + Tax rows (right) -->
      <tr>
        <td colspan="3" rowspan="4" style="border-right:1.5px solid #444;border-bottom:1.5px solid #444;vertical-align:top;padding:10px 12px;background:#fff;line-height:1.7;">
          <div><strong>Bank Name/Branch :</strong> {{bankName}}/ {{bankBranch}}</div>
          <div><strong>IFSC Code :</strong> {{ifscCode}}</div>
          <div><strong>Account Number :</strong> {{accountNumber}}</div>
          <div><strong>PAN :</strong> {{panNumber}}</div>
        </td>
        <td style="border-right:1.5px solid #444;border-bottom:1px solid #ccc;text-align:right;padding:6px 8px;font-weight:bold;background:#fff;">SGST {{sgstPercent}}%</td>
        <td style="border-bottom:1px solid #ccc;text-align:right;padding:6px 8px;background:#fff;">Rs. {{sgstAmount}}</td>
      </tr>
      <tr>
        <td style="border-right:1.5px solid #444;border-bottom:1px solid #ccc;text-align:right;padding:6px 8px;font-weight:bold;background:#fff;">CGST {{cgstPercent}}%</td>
        <td style="border-bottom:1px solid #ccc;text-align:right;padding:6px 8px;background:#fff;">Rs. {{cgstAmount}}</td>
      </tr>
      <tr>
        <td style="border-right:1.5px solid #444;border-bottom:1px solid #ccc;text-align:right;padding:6px 8px;font-weight:bold;background:#fff;">IGST</td>
        <td style="border-bottom:1px solid #ccc;text-align:right;padding:6px 8px;background:#fff;">{{igstAmount}}</td>
      </tr>
      <tr style="border-bottom:1.5px solid #444;">
        <td style="border-right:1.5px solid #444;text-align:right;padding:6px 8px;font-weight:bold;background:#e8e8e0;">Grand Total</td>
        <td style="text-align:right;padding:6px 8px;font-weight:bold;background:#e8e8e0;">Rs. {{grandTotal}}</td>
      </tr>
      <!-- Amount in Words -->
      <tr>
        <td style="border-right:1.5px solid #444;padding:7px 10px;font-weight:bold;background:#fff;white-space:nowrap;width:13%;">Rs. in words</td>
        <td colspan="4" style="padding:7px 12px;font-style:italic;background:#fff;">{{amountInWords}}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Proprietor / Signature block -->
  <div style="margin-top:25px;display:flex;justify-content:flex-end;">
    <div style="text-align:right;font-weight:bold;font-size:13px;display:inline-block;">
      <div>FOR: {{firmName}}</div>
      <div style="min-height:50px;margin:4px 0;display:flex;justify-content:flex-end;align-items:center;">
        {{signatureHTML}}
      </div>
      <div>PROPRIETOR</div>
    </div>
  </div>

</div>`;
}

// ─── Estimate how many "line-equivalents" an item row takes ─────────────────
// We use a rough char-per-line constant based on the ~46% width column at 13px Arial.
// Tune CHARS_PER_LINE if your printed column is narrower/wider.
const ITEM_COL_CHARS = 46; // approximate chars that fit in the description column per line

function estimateItemLines(item: { productName: string; description?: string }): number {
  const nameLines = Math.ceil((item.productName?.length || 1) / ITEM_COL_CHARS);
  const descLines = item.description?.trim()
    ? Math.ceil(item.description.trim().length / ITEM_COL_CHARS)
    : 0;
  return Math.max(1, nameLines + (descLines > 0 ? descLines + 0.3 : 0)); // +0.3 gap
}

// ─── A4 dimensions in CSS pixels (96dpi, 1mm = 3.7795px) ─────────────────────
const A4_HEIGHT_CSS_PX = 297 * (96 / 25.4); // ≈ 1122.5px

/**
 * Fixed pixel heights of the non-row content that sits above/below the tbody.
 * Measured empirically from the reference template at font-size 13px / Arial.
 *   • Above tbody:  Invoice row (35) + gap (18) + recipient 3-lines (72) + gap (22) + thead (30) = 177
 *   • Below tbody:  Bank+Tax footer (130) + Rs-in-words (30) + proprietor (105) = 265
 */
const FIXED_ABOVE_TABLE_PX = 177;
const FIXED_BELOW_TABLE_PX = 265;
const FILLER_ROW_HEIGHT_PX = 26; // height of one empty filler row (px)

export interface BillLayoutMetrics {
  contentStartY: number;  // scaled padding-top on the A4 page (px)
  footerReserve: number;  // scaled padding-bottom on the A4 page (px)
  pageMargin: number;     // scaled left/right padding (px)
}

export function compileBillHTML(
  bill: Bill,
  firm?: Firm,
  customTemplate?: CustomTemplate,
  layout?: BillLayoutMetrics
): string {
  const rawTemplate = customTemplate?.content || getSampleBillTemplate();

  // ── Dynamic row count from available space ────────────────────────────────
  let TARGET_ROWS: number;
  if (layout) {
    const availableHeight =
      A4_HEIGHT_CSS_PX
      - layout.contentStartY
      - layout.footerReserve
      - FIXED_ABOVE_TABLE_PX
      - FIXED_BELOW_TABLE_PX;
    TARGET_ROWS = Math.max(6, Math.floor(availableHeight / FILLER_ROW_HEIGHT_PX));
  } else {
    // No letterhead — standard A4 with 40px top/bottom padding
    const availableHeight = A4_HEIGHT_CSS_PX - 40 - 40 - FIXED_ABOVE_TABLE_PX - FIXED_BELOW_TABLE_PX;
    TARGET_ROWS = Math.max(6, Math.floor(availableHeight / FILLER_ROW_HEIGHT_PX));
  }

  // Count how many row-units real items consume (multi-line items count more)
  let usedLineUnits = 0;
  for (const item of bill.items) {
    usedLineUnits += estimateItemLines(item);
  }

  // Filler rows = budget minus already-used line units
  const fillerRows = Math.max(0, TARGET_ROWS - Math.ceil(usedLineUnits));

  const rows: string[] = [];

  // Render actual item rows
  bill.items.forEach((item, i) => {
    const qtyText = `${item.quantity.toFixed(1)} ${item.unit || 'nos'}`;
    const priceText = `Rs. ${item.rate.toLocaleString('en-IN', { minimumFractionDigits: 1 })}`;
    const amountText = `Rs. ${(item.quantity * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 1 })}`;

    const descHTML = item.description?.trim()
      ? `<div style="margin-top:2px;font-size:11.5px;color:#374151;line-height:1.35;">${item.description}</div>`
      : '';

    rows.push(`
      <tr style="border-bottom:1px solid #bbb;">
        <td style="border-right:1px solid #bbb;text-align:center;padding:5px 3px;vertical-align:top;">${i + 1}.</td>
        <td style="border-right:1px solid #bbb;text-align:left;padding:5px 8px;vertical-align:top;">
          <div>${item.productName}</div>${descHTML}
        </td>
        <td style="border-right:1px solid #bbb;text-align:center;padding:5px 3px;vertical-align:top;">${qtyText}</td>
        <td style="border-right:1px solid #bbb;text-align:right;padding:5px 6px;vertical-align:top;">${priceText}</td>
        <td style="text-align:right;padding:5px 6px;vertical-align:top;">${amountText}</td>
      </tr>`);
  });

  // Render filler rows (numbered, empty)
  for (let f = 0; f < fillerRows; f++) {
    const rowNum = bill.items.length + f + 1;
    rows.push(`
      <tr style="border-bottom:1px solid #bbb;height:${FILLER_ROW_HEIGHT_PX}px;">
        <td style="border-right:1px solid #bbb;text-align:center;padding:4px 3px;color:#777;">${rowNum}.</td>
        <td style="border-right:1px solid #bbb;padding:4px 8px;"></td>
        <td style="border-right:1px solid #bbb;padding:4px 3px;"></td>
        <td style="border-right:1px solid #bbb;padding:4px 6px;"></td>
        <td style="padding:4px 6px;"></td>
      </tr>`);
  }

  const itemRowsHTML = rows.join('');

  // ── Tax & totals ──────────────────────────────────────────────────────────
  const subtotal = bill.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const sgstAmount = bill.sgstPercent ? (subtotal * bill.sgstPercent) / 100 : 0;
  const cgstAmount = bill.cgstPercent ? (subtotal * bill.cgstPercent) / 100 : 0;
  const igstAmount = bill.igstPercent ? (subtotal * bill.igstPercent) / 100 : 0;
  const grandTotal = subtotal + sgstAmount + cgstAmount + igstAmount;
  const words = bill.amountInWords || numberToWords(grandTotal);

  const signatureHTML =
    bill.includeSignature !== false && firm?.signatureImagePath
      ? `<img src="${firm.signatureImagePath}" alt="Signature" style="max-height:55px;width:auto;object-fit:contain;" />`
      : '';

  const recipientLines = bill.recipientAddress?.trim()
    ? bill.recipientAddress.split('\n').map((l) => l.trim()).filter(Boolean)
    : [bill.recipientDesignation, bill.recipientDepartment, bill.recipientDistrict].filter(Boolean);

  const recipientHeaderHTML = recipientLines.map((line) => `<div>${line}</div>`).join('');

  const formattedDate = bill.invoiceDate?.trim() ? bill.invoiceDate : '_____________';

  return rawTemplate
    .replace(/\{\{invoiceNumber\}\}/g, bill.invoiceNumber || '')
    .replace(/\{\{invoiceDate\}\}/g, formattedDate)
    .replace(/\{\{recipientHeaderHTML\}\}/g, recipientHeaderHTML)
    .replace(/\{\{recipientDesignation\}\}/g, recipientLines[0] || bill.recipientDesignation || '')
    .replace(/\{\{recipientDepartment\}\}/g, recipientLines[1] || bill.recipientDepartment || '')
    .replace(/\{\{recipientDistrict\}\}/g, recipientLines[2] || bill.recipientDistrict || '')
    .replace(/\{\{firmName\}\}/g, firm?.name || 'FIRM NAME')
    .replace(/\{\{bankName\}\}/g, firm?.bankName || 'State Bank of India')
    .replace(/\{\{bankBranch\}\}/g, firm?.bankBranch || 'Main Branch')
    .replace(/\{\{ifscCode\}\}/g, firm?.ifscCode || 'SBIN000000')
    .replace(/\{\{accountNumber\}\}/g, firm?.accountNumber || '00000000000')
    .replace(/\{\{panNumber\}\}/g, firm?.panNumber || 'XXXXX0000X')
    .replace(/\{\{itemRows\}\}/g, itemRowsHTML)
    .replace(/\{\{subtotal\}\}/g, subtotal.toLocaleString('en-IN', { minimumFractionDigits: 1 }))
    .replace(/\{\{sgstPercent\}\}/g, (bill.sgstPercent || 0).toFixed(1))
    .replace(/\{\{sgstAmount\}\}/g, sgstAmount > 0 ? sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 1 }) : '0.0')
    .replace(/\{\{cgstPercent\}\}/g, (bill.cgstPercent || 0).toFixed(1))
    .replace(/\{\{cgstAmount\}\}/g, cgstAmount > 0 ? cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 1 }) : '0.0')
    .replace(/\{\{igstPercent\}\}/g, (bill.igstPercent || 0).toFixed(1))
    .replace(/\{\{igstAmount\}\}/g, igstAmount > 0 ? `Rs. ${igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 1 })}` : '')
    .replace(/\{\{grandTotal\}\}/g, grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 1 }))
    .replace(/\{\{amountInWords\}\}/g, words)
    .replace(/\{\{signatureHTML\}\}/g, signatureHTML);
}
