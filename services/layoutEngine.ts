import { Firm, Language, TenderItem } from '@/types';

export interface LayoutOptions {
  showLetterheadBackground?: boolean;
  includeSignature?: boolean;
  includeStamp?: boolean;
  footerNotes?: string;
  showSafeMarginGuide?: boolean;
  showPageBoundaryGuide?: boolean;
  showPrintBleedMargin?: boolean;
  lockHeaderPosition?: boolean;
  headerSafeZonePx?: number;
}

export interface ItemTablePage {
  html: string;
  subtotal: number;
  gstTotal: number;
  grandTotal: number;
  isLastPage: boolean;
}

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const CSS_PX_PER_MM = 96 / 25.4;
const A4_WIDTH_PX = A4_WIDTH_MM * CSS_PX_PER_MM;
const LEGACY_FIRM_PREVIEW_WIDTH_PX = 424;
const DEFAULT_ROWS_PER_PAGE = 14;

function escapeHTML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (items.length === 0) return [[]];
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    result.push(items.slice(index, index + chunkSize));
  }
  return result;
}

export function snapToGrid(value: number, gridSize = 4): number {
  if (gridSize <= 1) return value;
  return Math.round(value / gridSize) * gridSize;
}

export function detectHeaderHeightPlaceholder(_headerImagePath?: string): number {
  // Placeholder: future enhancement for image-driven header height detection.
  return 140;
}

export function resolveFirmLayoutMetrics(firm: Firm, options: LayoutOptions = {}) {
  const headerSafeZonePx = Math.max(0, options.headerSafeZonePx ?? 120);
  const detectedHeaderHeight = detectHeaderHeightPlaceholder(firm.headerImagePath);
  // Firm controls are set in the rendered manage-firms A4 preview. Scale from
  // that measured preview width into the actual CSS A4 page used by final preview/PDF.
  const referenceWidth = Math.max(1, firm.layoutReferenceWidth ?? LEGACY_FIRM_PREVIEW_WIDTH_PX);
  const previewToA4Scale = A4_WIDTH_PX / referenceWidth;
  const resolvedHeaderSpacing = (firm.headerSpacing ?? firm.contentStartY ?? 170) * previewToA4Scale;
  const resolvedFooterSpacing = (firm.footerSpacing ?? 120) * previewToA4Scale;
  const resolvedPageMargin = (firm.pageMargin ?? firm.pagePaddingLeft ?? 40) * previewToA4Scale;
  const signatureOffsetX = (firm.signatureOffsetX ?? 16) * previewToA4Scale;
  const signatureOffsetY = (firm.signatureOffsetY ?? 16) * previewToA4Scale;
  const signatureScale = firm.signatureScale ?? 1;
  const signatureRotateDeg = firm.signatureRotateDeg ?? 0;
  const stampOffsetX = (firm.stampOffsetX ?? 140) * previewToA4Scale;
  const stampOffsetY = (firm.stampOffsetY ?? 16) * previewToA4Scale;
  const stampScale = firm.stampScale ?? 1;

  const snappedContentStart = snapToGrid(resolvedHeaderSpacing, 4);
  const contentStartY = options.lockHeaderPosition === false
    ? Math.max(0, snappedContentStart)
    : Math.max(detectedHeaderHeight + 8, snappedContentStart);

  return {
    contentStartY,
    pageMargin: Math.max(0, snapToGrid(resolvedPageMargin, 4)),
    footerReserve: Math.max(0, snapToGrid(resolvedFooterSpacing, 4)),
    headerSafeZonePx,
    signatureOffsetX: Math.max(0, snapToGrid(signatureOffsetX, 2)),
    signatureOffsetY: Math.max(0, snapToGrid(signatureOffsetY, 2)),
    signatureScale: Math.max(0.1, Math.round(signatureScale * 100) / 100),
    signatureRotateDeg: Math.round(signatureRotateDeg),
    stampOffsetX: Math.max(0, snapToGrid(stampOffsetX, 2)),
    stampOffsetY: Math.max(0, snapToGrid(stampOffsetY, 2)),
    stampScale: Math.max(0.1, Math.round(stampScale * 100) / 100),
  };
}

export function calculateItemAmounts(item: TenderItem): { subtotal: number; gstAmount: number; total: number } {
  const subtotal = Math.round(item.quantity * item.rate * 100) / 100;
  const gstAmount = Math.round(((subtotal * item.gstPercent) / 100) * 100) / 100;
  const total = Math.round((subtotal + gstAmount) * 100) / 100;
  return { subtotal, gstAmount, total };
}

function getLetterheadBackgroundStyle(firm: Firm): string {
  if (firm.fitLetterheadMode === 'stretch') {
    return 'background-size: 100% 100%;';
  }
  if (firm.fitLetterheadMode === 'cover') {
    return 'background-size: cover;';
  }
  return 'background-size: contain;';
}

export function generateFirmLayoutCSS(firm: Firm, options: LayoutOptions = {}): string {
  const metrics = resolveFirmLayoutMetrics(firm, options);

  return `
    :root {
      --page-width: ${A4_WIDTH_MM}mm;
      --page-height: ${A4_HEIGHT_MM}mm;
      --content-start-y: ${metrics.contentStartY}px;
      --content-left: ${metrics.pageMargin}px;
      --content-right: ${metrics.pageMargin}px;
      --content-bottom: ${metrics.footerReserve}px;
      --safe-zone-height: ${metrics.headerSafeZonePx}px;
      --signature-offset-x: ${metrics.signatureOffsetX}px;
      --signature-offset-y: ${metrics.signatureOffsetY}px;
      --signature-scale: ${metrics.signatureScale};
      --signature-rotate: ${metrics.signatureRotateDeg}deg;
      --stamp-offset-x: ${metrics.stampOffsetX}px;
      --stamp-offset-y: ${metrics.stampOffsetY}px;
      --stamp-scale: ${metrics.stampScale};
      --bleed: 6px;
    }

    * {
      box-sizing: border-box;
    }

    .a4-page {
      position: relative !important;
      width: var(--page-width) !important;
      min-height: var(--page-height) !important;
      margin: 0 auto 8px auto !important;
      background: #fff !important;
      page-break-after: always !important;
      break-after: page !important;
      overflow: hidden !important;
    }

    .letterhead-layer {
      position: absolute;
      inset: 0;
      z-index: 1;
      background-image: url('${firm.headerImagePath}');
      background-repeat: no-repeat;
      background-position: top center;
      ${getLetterheadBackgroundStyle(firm)}
    }

    .content-layer {
      position: absolute !important;
      top: var(--content-start-y) !important;
      left: var(--content-left) !important;
      right: var(--content-right) !important;
      bottom: var(--content-bottom) !important;
      z-index: 3 !important;
      overflow: hidden !important;
      font-size: 12px;
      line-height: 1.45;
      color: #0f172a;
    }

    .signature-layer {
      position: absolute;
      right: var(--signature-offset-x);
      bottom: var(--signature-offset-y);
      z-index: 4;
      transform-origin: bottom right;
      transform: rotate(var(--signature-rotate)) scale(var(--signature-scale));
    }

    .stamp-layer {
      position: absolute;
      right: var(--stamp-offset-x);
      bottom: var(--stamp-offset-y);
      z-index: 4;
      transform-origin: bottom right;
      transform: scale(var(--stamp-scale));
    }

    .signature-image {
      max-width: 180px;
      max-height: 72px;
      object-fit: contain;
      display: block;
    }

    .stamp-image {
      max-width: 96px;
      max-height: 96px;
      object-fit: contain;
      display: block;
      opacity: 0.95;
    }

    .stamp-generic {
      font-size: 12px;
      line-height: 1.15;
      font-weight: 800;
      letter-spacing: 0.02em;
      color: rgba(15, 23, 42, 0.92);
      text-transform: uppercase;
      text-align: right;
      padding: 6px 8px;
      border: none;
      background: transparent;
      width: fit-content;
    }

    .stamp-generic-line1 {
      white-space: nowrap;
    }

    .safe-zone-guide {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: var(--safe-zone-height);
      border-bottom: 2px dashed rgba(249, 115, 22, 0.8);
      background: rgba(249, 115, 22, 0.08);
      z-index: 2;
      pointer-events: none;
    }

    .page-boundary-guide {
      position: absolute;
      inset: 1px;
      border: 1px dashed rgba(15, 23, 42, 0.35);
      z-index: 5;
      pointer-events: none;
    }

    .print-bleed-guide {
      position: absolute;
      top: var(--bleed);
      left: var(--bleed);
      right: var(--bleed);
      bottom: var(--bleed);
      border: 1px dotted rgba(2, 132, 199, 0.5);
      z-index: 5;
      pointer-events: none;
    }

    .doc-body {
      width: 100%;
      max-width: 100%;
      margin: 0;
      padding: 0;
      overflow-wrap: break-word;
      word-break: break-word;
    }

    .doc-body table,
    .doc-body .items-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-top: 10px;
      margin-bottom: 10px;
    }

    .doc-body th,
    .doc-body td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      vertical-align: top;
    }

    .doc-body th {
      background: #f8fafc;
      text-align: left;
      font-weight: 700;
    }

    .numeric {
      text-align: right;
      white-space: nowrap;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .page-boundary-guide,
      .print-bleed-guide,
      .safe-zone-guide {
        display: none !important;
      }
    }
  `;
}

export function syncLetterheadLayoutHTML(
  contentHTML: string,
  firm: Firm,
  options: LayoutOptions = {}
): string {
  if (!contentHTML || !contentHTML.includes('--content-start-y')) return contentHTML;

  const metrics = resolveFirmLayoutMetrics(firm, options);
  const replacements: Array<[RegExp, string]> = [
    [/--content-start-y:\s*[^;]+;/, `--content-start-y: ${metrics.contentStartY}px;`],
    [/--content-left:\s*[^;]+;/, `--content-left: ${metrics.pageMargin}px;`],
    [/--content-right:\s*[^;]+;/, `--content-right: ${metrics.pageMargin}px;`],
    [/--content-bottom:\s*[^;]+;/, `--content-bottom: ${metrics.footerReserve}px;`],
    [/--safe-zone-height:\s*[^;]+;/, `--safe-zone-height: ${metrics.headerSafeZonePx}px;`],
    [/--signature-offset-x:\s*[^;]+;/, `--signature-offset-x: ${metrics.signatureOffsetX}px;`],
    [/--signature-offset-y:\s*[^;]+;/, `--signature-offset-y: ${metrics.signatureOffsetY}px;`],
    [/--signature-scale:\s*[^;]+;/, `--signature-scale: ${metrics.signatureScale};`],
    [/--signature-rotate:\s*[^;]+;/, `--signature-rotate: ${metrics.signatureRotateDeg}deg;`],
    [/--stamp-offset-x:\s*[^;]+;/, `--stamp-offset-x: ${metrics.stampOffsetX}px;`],
    [/--stamp-offset-y:\s*[^;]+;/, `--stamp-offset-y: ${metrics.stampOffsetY}px;`],
    [/--stamp-scale:\s*[^;]+;/, `--stamp-scale: ${metrics.stampScale};`],
  ];

  let synced = contentHTML;
  for (const [pattern, replacement] of replacements) {
    synced = synced.replace(pattern, replacement);
  }

  if (firm.headerImagePath) {
    synced = synced.replace(/background-image:\s*url\((['"]?).*?\1\);/, `background-image: url('${firm.headerImagePath}');`);
  }

  return synced;
}

function renderGuides(options: LayoutOptions): string {
  const safeZone = options.showSafeMarginGuide ? '<div class="safe-zone-guide"></div>' : '';
  const boundary = options.showPageBoundaryGuide ? '<div class="page-boundary-guide"></div>' : '';
  const bleed = options.showPrintBleedMargin ? '<div class="print-bleed-guide"></div>' : '';
  return `${safeZone}${boundary}${bleed}`;
}

function renderSignatureLayer(firm: Firm, options: LayoutOptions): string {
  const signatureHTML =
    options.includeSignature && firm.signatureImagePath
      ? `<div class="signature-layer"><img class="signature-image" src="${firm.signatureImagePath}" alt="Signature" /></div>`
      : '';

  const stampShouldRender = options.includeStamp === true || firm.stampMode === 'generic';
  const firmNameOneLine = (firm.name || '').trim().replace(/\s+/g, ' ').toUpperCase();
  const stampHTML = stampShouldRender
    ? firm.stampMode === 'generic'
      ? `<div class="stamp-layer"><div class="stamp-generic"><div class="stamp-generic-line1">FOR ${escapeHTML(
          firmNameOneLine
        )}</div><div>PROPRIETOR</div></div></div>`
      : firm.stampImagePath
        ? `<div class="stamp-layer"><img class="stamp-image" src="${firm.stampImagePath}" alt="Stamp" /></div>`
        : ''
    : '';

  if (!signatureHTML && !stampHTML) return '';
  return `${signatureHTML}${stampHTML}`;
}

function renderSinglePage(contentHTML: string, firm: Firm, options: LayoutOptions): string {
  const letterheadHTML =
    options.showLetterheadBackground === false
      ? ''
      : '<div class="letterhead-layer"></div>';

  return `
    <section class="a4-page">
      ${letterheadHTML}
      ${renderGuides(options)}
      <main class="content-layer">
        ${contentHTML}
        ${
          options.footerNotes
            ? `<p style="margin-top: 12px; color: #475569; font-size: 11px;">${escapeHTML(options.footerNotes).replace(/\n/g, '<br/>')}</p>`
            : ''
        }
      </main>
      ${renderSignatureLayer(firm, options)}
    </section>
  `;
}

export function applyLetterheadLayoutPages(
  contentPages: string[],
  firm: Firm,
  options: LayoutOptions = {}
): string {
  const css = generateFirmLayoutCSS(firm, options);
  const pages = contentPages.length > 0 ? contentPages : ['<div class="doc-body"><p>No content.</p></div>'];
  return `
    <style>${css}</style>
    ${pages.map((page) => renderSinglePage(page, firm, options)).join('\n')}
  `;
}

export function applyLetterheadLayout(
  contentHTML: string,
  firm: Firm,
  options: LayoutOptions = {}
): string {
  return applyLetterheadLayoutPages([contentHTML], firm, options);
}

export function applyPlainA4LayoutPages(
  contentPages: string[],
  options: Pick<LayoutOptions, 'showPageBoundaryGuide' | 'showPrintBleedMargin'> = {}
): string {
  const pages = contentPages.length > 0 ? contentPages : ['<div><p>No content.</p></div>'];
  const boundary = options.showPageBoundaryGuide ? '<div class="plain-page-boundary-guide"></div>' : '';
  const bleed = options.showPrintBleedMargin ? '<div class="plain-print-bleed-guide"></div>' : '';

  return `
    <style>
      * { box-sizing: border-box; }
      .a4-page {
        position: relative;
        width: ${A4_WIDTH_MM}mm;
        min-height: ${A4_HEIGHT_MM}mm;
        margin: 0 auto 8px auto;
        background: #fff;
        page-break-after: always;
        break-after: page;
        overflow: hidden;
      }
      .plain-content-layer {
        position: absolute;
        inset: 18px 22px 18px 22px;
        z-index: 2;
        overflow: hidden;
      }
      .plain-page-boundary-guide {
        position: absolute;
        inset: 1px;
        border: 1px dashed rgba(15, 23, 42, 0.35);
        z-index: 5;
        pointer-events: none;
      }
      .plain-print-bleed-guide {
        position: absolute;
        inset: 6px;
        border: 1px dotted rgba(2, 132, 199, 0.5);
        z-index: 5;
        pointer-events: none;
      }
    </style>
    ${pages.map((page) => `
      <section class="a4-page">
        ${boundary}
        ${bleed}
        <main class="plain-content-layer">${page}</main>
      </section>
    `).join('\n')}
  `;
}

function buildHeaders(language: Language): string[] {
  return language === 'hindi'
    ? ['क्र.सं.', 'उत्पाद', 'विवरण', 'मात्रा', 'दर', 'GST', 'कर', 'कुल']
    : ['S.No.', 'Product Name', 'Description', 'Qty', 'Rate', 'GST', 'Tax', 'Total'];
}

export function generateItemsTablePages(
  items: TenderItem[],
  language: Language = 'english',
  rowsPerPage = DEFAULT_ROWS_PER_PAGE
): ItemTablePage[] {
  if (items.length === 0) {
    return [
      {
        html: `<table class="items-table"><tbody><tr><td>${language === 'hindi' ? 'कोई आइटम नहीं।' : 'No items.'}</td></tr></tbody></table>`,
        subtotal: 0,
        gstTotal: 0,
        grandTotal: 0,
        isLastPage: true,
      },
    ];
  }

  const headers = buildHeaders(language);
  const chunks = chunkArray(items, rowsPerPage);
  const subtotal = items.reduce((sum, item) => sum + calculateItemAmounts(item).subtotal, 0);
  const gstTotal = items.reduce((sum, item) => sum + calculateItemAmounts(item).gstAmount, 0);
  const grandTotal = subtotal + gstTotal;

  return chunks.map((chunk, pageIndex) => {
    const bodyRows = chunk
      .map((item, index) => {
        const absoluteIndex = pageIndex * rowsPerPage + index + 1;
        const amounts = calculateItemAmounts(item);
        return `
          <tr>
            <td>${absoluteIndex}</td>
            <td>${escapeHTML(item.productName)}</td>
            <td>${escapeHTML(item.description || '')}</td>
            <td class="numeric">${item.quantity}</td>
            <td class="numeric">${formatCurrency(item.rate)}</td>
            <td class="numeric">${item.gstPercent}%</td>
            <td class="numeric">${formatCurrency(amounts.gstAmount)}</td>
            <td class="numeric">${formatCurrency(amounts.total)}</td>
          </tr>
        `;
      })
      .join('');

    const isLastPage = pageIndex === chunks.length - 1;
    const footerRows = isLastPage
      ? `
        <tr>
          <td colspan="7" class="numeric"><strong>${language === 'hindi' ? 'उप-योग' : 'Subtotal'}</strong></td>
          <td class="numeric"><strong>${formatCurrency(subtotal)}</strong></td>
        </tr>
        <tr>
          <td colspan="7" class="numeric"><strong>${language === 'hindi' ? 'GST कुल' : 'GST Total'}</strong></td>
          <td class="numeric"><strong>${formatCurrency(gstTotal)}</strong></td>
        </tr>
        <tr>
          <td colspan="7" class="numeric"><strong>${language === 'hindi' ? 'कुल योग' : 'Grand Total'}</strong></td>
          <td class="numeric"><strong>${formatCurrency(grandTotal)}</strong></td>
        </tr>
      `
      : '';

    return {
      html: `
        <table class="items-table">
          <thead>
            <tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${bodyRows}
            ${footerRows}
          </tbody>
        </table>
      `,
      subtotal,
      gstTotal,
      grandTotal,
      isLastPage,
    };
  });
}

export function wrapInA4Page(content: string, title: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHTML(title)}</title>
        <style>
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background: #e2e8f0;
            font-family: Arial, Helvetica, sans-serif;
          }
          @media print {
            body {
              background: #fff;
            }
          }
        </style>
      </head>
      <body>${content}</body>
    </html>
  `;
}

export const layoutEngine = {
  applyLetterheadLayout,
  applyLetterheadLayoutPages,
  applyPlainA4LayoutPages,
  calculateItemAmounts,
  detectHeaderHeightPlaceholder,
  generateFirmLayoutCSS,
  generateItemsTablePages,
  resolveFirmLayoutMetrics,
  snapToGrid,
  syncLetterheadLayoutHTML,
  wrapInA4Page,
};
