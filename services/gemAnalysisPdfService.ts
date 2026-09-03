import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { GeMAIAnalysis, GeMTender, GeMStarredTender } from '@/types/gem';

function escapeHtml(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getEstVal(analysis?: GeMAIAnalysis | null): string {
  if (!analysis) return 'Undisclosed';
  if (analysis.estimatedBidValue?.isEstimatedProvided && analysis.estimatedBidValue.amount) {
    return `₹ ${analysis.estimatedBidValue.amount.toLocaleString('en-IN')}`;
  }
  const emdVal = analysis.emdAmount?.amount || 0;
  if (emdVal > 0) {
    return `₹ ${(emdVal * 100).toLocaleString('en-IN')} (Calculated from 1% EMD)`;
  }
  return analysis.estimatedBidValue?.rawText || 'Undisclosed by Buyer';
}

function formatDate(isoStr?: string): string {
  if (!isoStr) return 'N/A';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

/**
 * Builds the HTML template with modular semantic blocks inside an offscreen staging area.
 * The dynamic pagination engine in generateAndDownloadTenderPdf measures rendered block
 * heights and dynamically distributes them across discrete A4 pages, stamping running headers
 * and accurate "Page X of Y" footers without any data truncation.
 */
export function buildTenderAnalysisHtml(
  tender: GeMTender | GeMStarredTender,
  analysis: GeMAIAnalysis
): string {
  const estValText = getEstVal(analysis);
  const placeDisplay =
    analysis.placeDisplay ||
    (analysis.townName && analysis.districtName
      ? `${analysis.townName} (${analysis.districtName})`
      : analysis.townName || analysis.districtName || 'N/A');

  const buyerTerms = analysis.buyerAddedTerms || [];
  const items = analysis.items || [];
  const extraObservations = analysis.extraObservations || [];
  const validLinkedDocs = (analysis.linkedDocuments || []).filter(
    (d) => d.url && d.url.startsWith('http')
  );

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GeM Bid Analysis - ${escapeHtml(tender.bidNumber)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 8.8pt;
      line-height: 1.48;
      color: #0f172a;
      background: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }

    #pages-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
    }

    .a4-page {
      width: 794px;
      height: 1123px;
      max-height: 1123px;
      min-height: 1123px;
      padding: 48px 54px 42px 54px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
    }

    .page-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .page-body {
      display: flex;
      flex-direction: column;
    }

    /* Page 1 Header */
    .doc-header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .doc-header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .doc-title {
      font-size: 13pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      text-transform: uppercase;
    }
    .doc-subtitle {
      font-size: 8.5pt;
      color: #475569;
      font-weight: 600;
      margin-top: 1px;
    }
    .meta-box {
      text-align: right;
      font-size: 8pt;
      color: #475569;
    }
    .meta-bid {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 9.5pt;
      font-weight: 700;
      color: #1e40af;
    }

    /* Running Header for Page 2+ */
    .running-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 6px;
      margin-bottom: 10px;
      font-size: 8pt;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .running-header .bid-tag {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #1e40af;
      font-weight: 700;
    }

    /* Section Styling */
    .section-block {
      margin-bottom: 8px;
    }
    .section-title-block {
      margin-top: 4px;
      margin-bottom: 6px;
    }
    .section-title {
      font-size: 9pt;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
    }

    /* Table Styling */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4px;
      font-size: 8.5pt;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #e2e8f0;
      padding: 5px 8px 5px 8px;
      text-align: left;
      vertical-align: middle;
      line-height: 1.42;
    }
    table.data-table th {
      background-color: #f8fafc;
      font-weight: 600;
      color: #334155;
      width: 25%;
    }
    table.data-table td {
      color: #0f172a;
    }

    /* Executive Summaries */
    .summary-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 3px solid #3b82f6;
      padding: 6px 9px 7px 9px;
      margin-bottom: 6px;
      font-size: 8.3pt;
      line-height: 1.42;
      border-radius: 2px;
    }
    .summary-box.hindi {
      border-left-color: #d97706;
      background-color: #fffbeb;
      padding: 7px 9px 8px 9px;
      line-height: 1.55;
    }
    .summary-label {
      font-weight: 700;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 2px;
      color: #475569;
    }

    /* Item Card */
    .item-card {
      border: 1px solid #e2e8f0;
      padding: 6px 9px 7px 9px;
      border-radius: 4px;
      margin-bottom: 6px;
      background: #ffffff;
    }
    .item-header {
      font-weight: 700;
      font-size: 8.5pt;
      color: #0f172a;
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    .item-specs {
      font-size: 8pt;
      color: #334155;
      white-space: pre-line;
      background: #f8fafc;
      padding: 5px 8px 6px 8px;
      border: 1px solid #e2e8f0;
      border-radius: 3px;
      line-height: 1.4;
      margin-bottom: 3px;
    }

    /* ATC Item */
    .atc-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      font-size: 8pt;
      line-height: 1.4;
      color: #1e293b;
      margin-bottom: 4px;
      padding-bottom: 1px;
    }
    .atc-num {
      font-weight: 700;
      color: #475569;
      min-width: 18px;
      text-align: right;
    }
    .atc-text {
      flex: 1;
    }

    /* Observation Card */
    .obs-card {
      display: flex;
      align-items: flex-start;
      gap: 7px;
      background: #faf5ff;
      border: 1px solid #e9d5ff;
      border-radius: 4px;
      padding: 5px 8px 6px 8px;
      margin-bottom: 5px;
      font-size: 8pt;
      line-height: 1.42;
      color: #3b0764;
    }
    .obs-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 17px;
      height: 17px;
      border-radius: 50%;
      background: #e9d5ff;
      color: #6b21a8;
      font-weight: 700;
      font-size: 7.5pt;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .obs-text {
      flex: 1;
      white-space: pre-line;
    }

    .doc-link {
      color: #1d4ed8;
      text-decoration: none;
      word-break: break-all;
      font-size: 8pt;
    }

    /* Page Footer */
    .page-footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 4px;
      margin-top: auto;
      font-size: 7.5pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    #staging-area {
      position: absolute;
      left: -9999px;
      top: 0;
      width: 686px; /* 794px - 54px - 54px */
      visibility: hidden;
    }
  </style>
</head>
<body>

  <!-- ==================== RENDERED PAGES CONTAINER ==================== -->
  <div id="pages-container"></div>

  <!-- ==================== STAGING AREA (MODULAR CONTENT BLOCKS) ==================== -->
  <div id="staging-area">

    <!-- BLOCK: SECTION 1 - BID PARTICULARS -->
    <div class="pdf-block section-block">
      <div class="section-title-block">
        <div class="section-title">1. Bid Particulars &amp; Organization Hierarchy</div>
      </div>
      <table class="data-table">
        <tbody>
          <tr>
            <th>Bid Number</th>
            <td><strong>${escapeHtml(tender.bidNumber)}</strong></td>
            <th>Bid End Date</th>
            <td><strong>${formatDate(tender.endDate)}</strong></td>
          </tr>
          <tr>
            <th>Ministry / State</th>
            <td>${escapeHtml(analysis.ministryName || tender.ministryName || 'N/A')}</td>
            <th>Department</th>
            <td>${escapeHtml(analysis.departmentName || tender.departmentName || 'N/A')}</td>
          </tr>
          <tr>
            <th>Organisation</th>
            <td>${escapeHtml(analysis.organisationName || 'N/A')}</td>
            <th>Office / Location</th>
            <td>${escapeHtml(analysis.officeName || 'N/A')} ${placeDisplay !== 'N/A' ? `(${escapeHtml(placeDisplay)})` : ''}</td>
          </tr>
          <tr>
            <th>Total Quantity</th>
            <td><strong>${(analysis.totalQuantity || tender.totalQuantity || 1).toLocaleString('en-IN')} Units</strong></td>
            <th>Category</th>
            <td>${escapeHtml(tender.categoryName || analysis.itemTitle || 'N/A')}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- BLOCK: SECTION 2 - FINANCIALS & EMD -->
    <div class="pdf-block section-block">
      <div class="section-title-block">
        <div class="section-title">2. Financial &amp; Earnest Money Deposit (EMD) Details</div>
      </div>
      <table class="data-table">
        <tbody>
          <tr>
            <th>Estimated Bid Value</th>
            <td><strong>${escapeHtml(estValText)}</strong></td>
            <th>EMD Requirement</th>
            <td><strong>${analysis.emdAmount?.required ? `₹ ${analysis.emdAmount.amount?.toLocaleString('en-IN')}` : 'Nil / Not Required'}</strong></td>
          </tr>
          <tr>
            <th>EMD Exemption</th>
            <td>${analysis.emdAmount?.exemptionAllowed ? 'Allowed for MSE / Verified Startups' : 'Not Allowed'}</td>
            <th>ePBG / Security Deposit</th>
            <td>${analysis.emdAmount?.pbgPercentage ? `${analysis.emdAmount.pbgPercentage}% of Contract Value` : 'As per GeM GTC Rules'}</td>
          </tr>
          ${
            analysis.emdAmount?.advisory
              ? `<tr><th>EMD Advisory / Favour Of</th><td colspan="3">${escapeHtml(analysis.emdAmount.advisory)}</td></tr>`
              : ''
          }
        </tbody>
      </table>
    </div>

    <!-- BLOCK: SECTION 3 - SUMMARIES -->
    ${
      analysis.summaryEnglish || analysis.summaryHindi
        ? `
      <div class="pdf-block section-block">
        <div class="section-title-block">
          <div class="section-title">3. Executive Summaries</div>
        </div>
        ${
          analysis.summaryEnglish
            ? `
          <div class="summary-box">
            <div class="summary-label">Executive Summary (English)</div>
            <div>${escapeHtml(analysis.summaryEnglish)}</div>
          </div>
          `
            : ''
        }
        ${
          analysis.summaryHindi
            ? `
          <div class="summary-box hindi">
            <div class="summary-label">हिंदी सारांश (Hindi Summary)</div>
            <div>${escapeHtml(analysis.summaryHindi)}</div>
          </div>
          `
            : ''
        }
      </div>
      `
        : ''
    }

    <!-- SECTION 4: SCHEDULE OF ITEMS & TECHNICAL SPECIFICATIONS -->
    ${
      items.length > 0
        ? `
      <div class="pdf-block section-title-block" data-section-header="items">
        <div class="section-title">4. Schedule of Items &amp; Technical Specifications (${items.length} Item${items.length > 1 ? 's' : ''})</div>
      </div>
      ${items
        .map(
          (it, idx) => `
        <div class="pdf-block item-card" data-section="items">
          <div class="item-header">
            <span>${idx + 1}. ${escapeHtml(it.name)}</span>
            <span>Qty: ${(it.quantity || 1).toLocaleString('en-IN')} ${escapeHtml(it.unit || 'Units')}</span>
          </div>
          ${
            it.specifications
              ? `<div class="item-specs">${escapeHtml(
                  typeof it.specifications === 'string'
                    ? it.specifications
                    : JSON.stringify(it.specifications, null, 2)
                )}</div>`
              : ''
          }
          ${
            it.consignees && it.consignees.length > 0
              ? `<div style="margin-top: 3px; font-size: 7.5pt; color: #475569;">
                  <strong>Consignee Destinations:</strong> ${it.consignees
                    .map((c) => `${escapeHtml(c.name || 'Consignee')} (${escapeHtml(c.address || c.city || 'On File')}) - Qty: ${c.quantity || 1}`)
                    .join('; ')}
                </div>`
              : ''
          }
        </div>
      `
        )
        .join('')}
      `
        : ''
    }

    <!-- SECTION 5: BUYER ADDED ATC -->
    ${
      buyerTerms.length > 0
        ? `
      <div class="pdf-block section-title-block" data-section-header="atc">
        <div class="section-title">5. Buyer Added Bid Specific Terms &amp; Conditions (ATC) (${buyerTerms.length} Clause${buyerTerms.length > 1 ? 's' : ''})</div>
      </div>
      ${buyerTerms
        .map(
          (t, idx) => `
        <div class="pdf-block atc-item" data-section="atc">
          <span class="atc-num">${idx + 1}.</span>
          <span class="atc-text">${escapeHtml(t)}</span>
        </div>
      `
        )
        .join('')}
      `
        : ''
    }

    <!-- SECTION 6: ELIGIBILITY CRITERIA & COMPLIANCE CHECKLIST -->
    ${
      analysis.eligibilityCriteria
        ? `
      <div class="pdf-block section-block" data-section="eligibility">
        <div class="section-title-block">
          <div class="section-title">6. Eligibility Criteria &amp; Compliance Checklist</div>
        </div>
        <table class="data-table">
          <tbody>
            <tr>
              <th>Annual Turnover</th>
              <td>${escapeHtml(analysis.eligibilityCriteria.turnover || 'As per tender terms')}</td>
              <th>Past Experience</th>
              <td>${analysis.eligibilityCriteria.experienceYears ? `${analysis.eligibilityCriteria.experienceYears} Years` : 'Standard GeM Terms'}</td>
            </tr>
            <tr>
              <th>OEM Authorization</th>
              <td colspan="3">${analysis.eligibilityCriteria.oemAuthorizationRequired ? 'Mandatory (OEM Authorization Certificate required)' : 'Not Required'}</td>
            </tr>
            ${
              analysis.eligibilityCriteria.certificatesRequired &&
              analysis.eligibilityCriteria.certificatesRequired.length > 0
                ? `<tr><th>Mandatory Documents Checklist</th><td colspan="3">${escapeHtml(analysis.eligibilityCriteria.certificatesRequired.join('; '))}</td></tr>`
                : ''
            }
          </tbody>
        </table>
      </div>
      `
        : ''
    }

    <!-- SECTION 7: TENDER DOCUMENTS & ATTACHED SPECIFICATION SHEETS -->
    <div class="pdf-block section-block" data-section="docs">
      <div class="section-title-block">
        <div class="section-title">7. Tender Documents &amp; Attached Specification Sheets</div>
      </div>
      <table class="data-table">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="width: 35%;">Document Name &amp; Overview</th>
            <th style="width: 65%;">Official Direct Access URL</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Primary GeM Bid Document</strong></td>
            <td><a class="doc-link" href="${tender.pdfUrl}" target="_blank">${escapeHtml(tender.pdfUrl)}</a></td>
          </tr>
          ${
            validLinkedDocs.length > 0
              ? validLinkedDocs
                  .map(
                    (doc) => `
            <tr>
              <td>
                <strong>${escapeHtml(doc.title)}</strong>
                ${doc.description ? `<div style="font-size: 7.5pt; color: #475569; margin-top: 2px;">${escapeHtml(doc.description)}</div>` : ''}
              </td>
              <td><a class="doc-link" href="${doc.url}" target="_blank">${escapeHtml(doc.url)}</a></td>
            </tr>
          `
                  )
                  .join('')
              : '<tr><td colspan="2" style="color: #64748b;">No secondary specification PDFs linked in bid document.</td></tr>'
          }
        </tbody>
      </table>
    </div>

    <!-- SECTION 8: SPECIAL OBSERVATIONS & EXTRA AI INSIGHTS -->
    ${
      extraObservations.length > 0
        ? `
      <div class="pdf-block section-title-block" data-section-header="observations">
        <div class="section-title">8. Special Observations &amp; Extra Tender Insights (${extraObservations.length} Note${extraObservations.length > 1 ? 's' : ''})</div>
      </div>
      ${extraObservations
        .map(
          (obs, idx) => `
        <div class="pdf-block obs-card" data-section="observations">
          <span class="obs-num">${idx + 1}</span>
          <div class="obs-text">${escapeHtml(obs)}</div>
        </div>
      `
        )
        .join('')}
      `
        : ''
    }

  </div>

</body>
</html>
  `.trim();
}

/**
 * Client-side Dynamic Multi-Page Engine:
 * Measures actual rendered element heights in an offscreen iframe, dynamically distributes
 * all blocks into discrete A4 pages without clipping, stamps running headers/footers, and downloads the PDF.
 */
export async function generateAndDownloadTenderPdf(
  tender: GeMTender | GeMStarredTender,
  analysis: GeMAIAnalysis
): Promise<Blob> {
  const html = buildTenderAnalysisHtml(tender, analysis);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '794px'; // A4 96dpi equivalent width
  iframe.style.height = '1123px';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error('Failed to load document for PDF rendering.'));
      iframe.srcdoc = html;
    });

    const doc = iframe.contentDocument;
    if (!doc?.body) throw new Error('Unable to access document content for PDF rendering.');

    // Wait for fonts & DOM layout
    await new Promise((resolve) => setTimeout(resolve, 200));
    const fonts = (doc as any).fonts;
    if (fonts?.ready) {
      await fonts.ready.catch(() => undefined);
    }

    const staging = doc.getElementById('staging-area');
    const pagesContainer = doc.getElementById('pages-container');
    if (!staging || !pagesContainer) {
      throw new Error('PDF layout staging container missing.');
    }

    const blocks = Array.from(staging.querySelectorAll<HTMLElement>('.pdf-block'));
    const generatedDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    // Height limits in pixels (Page height 1123px - paddings 90px - footer 24px - headers)
    const MAX_PAGE_1_BODY_HEIGHT = 880;
    const MAX_PAGE_N_BODY_HEIGHT = 925;

    const pages: HTMLElement[] = [];

    function createNewPage(pageNum: number): HTMLElement {
      const pageEl = doc!.createElement('div');
      pageEl.className = 'a4-page';
      pageEl.dataset.pageNumber = String(pageNum);

      let headerHtml = '';
      if (pageNum === 1) {
        headerHtml = `
          <div class="doc-header">
            <div class="doc-header-top">
              <div>
                <h1 class="doc-title">GeM Tender Intelligence Analysis</h1>
                <div class="doc-subtitle">${escapeHtml(analysis.itemTitle || tender.categoryName || 'Government Procurement Requirement')}</div>
              </div>
              <div class="meta-box">
                <div class="meta-bid">BID: ${escapeHtml(tender.bidNumber || 'N/A')}</div>
                <div>Generated: ${generatedDate}</div>
              </div>
            </div>
          </div>
        `;
      } else {
        headerHtml = `
          <div class="running-header">
            <div>GeM Bid Intelligence: ${escapeHtml(analysis.itemTitle || tender.categoryName || 'Tender Report')}</div>
            <div class="bid-tag">${escapeHtml(tender.bidNumber || '')}</div>
          </div>
        `;
      }

      pageEl.innerHTML = `
        <div class="page-content">
          ${headerHtml}
          <div class="page-body"></div>
        </div>
        <div class="page-footer">
          <div>CONFIDENTIAL - PROPRIETARY BID ANALYSIS REPORT</div>
          <div class="footer-page-num">GeM BID NO: ${escapeHtml(tender.bidNumber || '')} | Page ${pageNum} of <span class="total-pages-placeholder">1</span></div>
        </div>
      `;

      pagesContainer!.appendChild(pageEl);
      pages.push(pageEl);
      return pageEl;
    }

    let currentPage = createNewPage(1);
    let pageIndex = 1;
    let pageBody = currentPage.querySelector<HTMLElement>('.page-body')!;

    // Distribute modular blocks into pages dynamically
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const isHeaderBlock = block.classList.contains('section-title-block');
      const maxAllowedHeight = pageIndex === 1 ? MAX_PAGE_1_BODY_HEIGHT : MAX_PAGE_N_BODY_HEIGHT;

      // Orphan Prevention: If this is a standalone section title header, verify header + 1st item fit
      if (isHeaderBlock && i + 1 < blocks.length && pageBody.children.length > 0) {
        const nextBlock = blocks[i + 1];
        pageBody.appendChild(block);
        pageBody.appendChild(nextBlock);
        const combinedHeight = pageBody.offsetHeight;
        pageBody.removeChild(nextBlock);
        pageBody.removeChild(block);

        if (combinedHeight > maxAllowedHeight) {
          // Break to fresh page first so section title and its first item stay together
          currentPage = createNewPage(++pageIndex);
          pageBody = currentPage.querySelector<HTMLElement>('.page-body')!;
          pageBody.appendChild(block);
          continue;
        }
      }

      pageBody.appendChild(block);
      const currentHeight = pageBody.offsetHeight;

      // If adding this block caused an overflow and this is not the only block on the page, move to next page
      if (currentHeight > maxAllowedHeight && pageBody.children.length > 1) {
        pageBody.removeChild(block);
        currentPage = createNewPage(++pageIndex);
        pageBody = currentPage.querySelector<HTMLElement>('.page-body')!;
        pageBody.appendChild(block);
      }
    }

    // Update total pages in all footers
    const totalPages = pages.length;
    pagesContainer.querySelectorAll('.total-pages-placeholder').forEach((el) => {
      el.textContent = String(totalPages);
    });

    // Remove staging area before canvas capture
    staging.remove();

    // Render pages with html2canvas and compile into jsPDF
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();
      const canvas = await html2canvas(pages[i], {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 794,
      });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
    }

    return pdf.output('blob');
  } finally {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}
