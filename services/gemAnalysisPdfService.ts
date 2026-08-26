import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { GeMAIAnalysis, GeMTender, GeMStarredTender } from '@/types/gem';

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

  const generatedDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const buyerTerms = analysis.buyerAddedTerms || [];
  
  // Intelligent ATC splitting:
  // Estimate height on Page 1: Header + Particulars + Financials + Summaries + Items take ~580px.
  // Page 1 has room for ~5-6 ATC clauses to fill the page cleanly without dead space.
  const page1AtcCount = Math.min(5, buyerTerms.length);
  const atcPage1 = buyerTerms.slice(0, page1AtcCount);
  const atcRemaining = buyerTerms.slice(page1AtcCount);

  // If remaining ATC is over 12 items, split across Page 2 and Page 3
  const page2AtcCount = 12;
  const atcPage2 = atcRemaining.slice(0, page2AtcCount);
  const atcPage3 = atcRemaining.slice(page2AtcCount);

  const totalPages = atcPage3.length > 0 ? 3 : 2;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GeM Bid Analysis - ${tender.bidNumber}</title>
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

    .a4-page {
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      min-height: 297mm;
      padding: 15mm 16mm 14mm 16mm;
      margin: 0 auto 15px auto;
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
    }

    /* Page 1 Header */
    .doc-header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 11px;
    }
    .doc-header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .doc-title {
      font-size: 13.5pt;
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
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px;
      margin-bottom: 11px;
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
    .section {
      margin-bottom: 10px;
    }
    .section-title {
      font-size: 9pt;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
      margin-bottom: 6px;
    }

    /* Table Styling with generous breathing room */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      font-size: 8.5pt;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #e2e8f0;
      padding: 6px 9px 7px 9px;
      text-align: left;
      vertical-align: middle;
      line-height: 1.45;
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

    /* Executive Summaries with generous bottom padding for Hindi descenders */
    .summary-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 3px solid #3b82f6;
      padding: 7px 10px 9px 10px;
      margin-bottom: 6px;
      font-size: 8.5pt;
      line-height: 1.45;
      border-radius: 2px;
    }
    .summary-box.hindi {
      border-left-color: #d97706;
      background-color: #fffbeb;
      padding: 8px 10px 10px 10px;
      line-height: 1.55;
    }
    .summary-label {
      font-weight: 700;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 3px;
      color: #475569;
    }

    /* Item Card */
    .item-card {
      border: 1px solid #e2e8f0;
      padding: 6px 9px 8px 9px;
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
      margin-bottom: 4px;
    }
    .item-specs {
      font-size: 8pt;
      color: #334155;
      white-space: pre-line;
      background: #f8fafc;
      padding: 5px 8px 7px 8px;
      border: 1px solid #e2e8f0;
      border-radius: 3px;
      line-height: 1.42;
      margin-bottom: 4px;
    }

    /* ATC List */
    .atc-list {
      list-style-type: decimal;
      padding-left: 17px;
      font-size: 8pt;
      line-height: 1.42;
      color: #1e293b;
    }
    .atc-list li {
      margin-bottom: 4px;
      padding-bottom: 1px;
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
      padding-top: 5px;
      margin-top: auto;
      font-size: 7.5pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body>

  <!-- ==================== PAGE 1 ==================== -->
  <div class="a4-page">
    <div class="page-content">
      <!-- HEADER -->
      <div class="doc-header">
        <div class="doc-header-top">
          <div>
            <h1 class="doc-title">GeM Tender Intelligence Analysis</h1>
            <div class="doc-subtitle">${analysis.itemTitle || tender.categoryName || 'Government Procurement Requirement'}</div>
          </div>
          <div class="meta-box">
            <div class="meta-bid">BID: ${tender.bidNumber}</div>
            <div>Generated: ${generatedDate}</div>
          </div>
        </div>
      </div>

      <!-- SECTION 1: BID PARTICULARS & ORGANIZATION HIERARCHY -->
      <div class="section">
        <div class="section-title">1. Bid Particulars & Organization Hierarchy</div>
        <table class="data-table">
          <tbody>
            <tr>
              <th>Bid Number</th>
              <td><strong>${tender.bidNumber}</strong></td>
              <th>Bid End Date</th>
              <td><strong>${formatDate(tender.endDate)}</strong></td>
            </tr>
            <tr>
              <th>Ministry / State</th>
              <td>${analysis.ministryName || tender.ministryName || 'N/A'}</td>
              <th>Department</th>
              <td>${analysis.departmentName || tender.departmentName || 'N/A'}</td>
            </tr>
            <tr>
              <th>Organisation</th>
              <td>${analysis.organisationName || 'N/A'}</td>
              <th>Office / Location</th>
              <td>${analysis.officeName || 'N/A'} ${placeDisplay !== 'N/A' ? `(${placeDisplay})` : ''}</td>
            </tr>
            <tr>
              <th>Total Quantity</th>
              <td><strong>${(analysis.totalQuantity || tender.totalQuantity || 1).toLocaleString('en-IN')} Units</strong></td>
              <th>Category</th>
              <td>${tender.categoryName || analysis.itemTitle || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- SECTION 2: FINANCIAL & EMD DETAILS -->
      <div class="section">
        <div class="section-title">2. Financial & Earnest Money Deposit (EMD) Details</div>
        <table class="data-table">
          <tbody>
            <tr>
              <th>Estimated Bid Value</th>
              <td><strong>${estValText}</strong></td>
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
                ? `<tr><th>EMD Advisory / Favour Of</th><td colspan="3">${analysis.emdAmount.advisory}</td></tr>`
                : ''
            }
          </tbody>
        </table>
      </div>

      <!-- SECTION 3: EXECUTIVE SUMMARIES -->
      <div class="section">
        <div class="section-title">3. Executive Summaries</div>
        ${
          analysis.summaryEnglish
            ? `
            <div class="summary-box">
              <div class="summary-label">Executive Summary (English)</div>
              <div>${analysis.summaryEnglish}</div>
            </div>
            `
            : ''
        }
        ${
          analysis.summaryHindi
            ? `
            <div class="summary-box hindi">
              <div class="summary-label">हिंदी सारांश (Hindi Summary)</div>
              <div>${analysis.summaryHindi}</div>
            </div>
            `
            : ''
        }
      </div>

      <!-- SECTION 4: ITEMS & TECHNICAL PARAMETERS -->
      <div class="section">
        <div class="section-title">4. Schedule of Items & Technical Specifications</div>
        ${(analysis.items || [])
          .map(
            (it, idx) => `
          <div class="item-card">
            <div class="item-header">
              <span>${idx + 1}. ${it.name}</span>
              <span>Qty: ${it.quantity} ${it.unit || 'Units'}</span>
            </div>
            ${
              it.specifications
                ? `<div class="item-specs">${
                    typeof it.specifications === 'string'
                      ? it.specifications
                      : JSON.stringify(it.specifications, null, 2)
                  }</div>`
                : ''
            }
            ${
              it.consignees && it.consignees.length > 0
                ? `<div style="margin-top: 3px; font-size: 7.5pt; color: #475569;">
                    <strong>Consignee Destinations:</strong> ${it.consignees
                      .map((c) => `${c.name || 'Consignee'} (${c.address || c.city || 'On File'}) - Qty: ${c.quantity}`)
                      .join('; ')}
                  </div>`
                : ''
            }
          </div>
        `
          )
          .join('')}
      </div>

      <!-- SECTION 5: BUYER ADDED ATC (STARTS ON PAGE 1 TO FILL SPACE CLEANLY) -->
      ${
        atcPage1.length > 0
          ? `
        <div class="section" style="margin-bottom: 0;">
          <div class="section-title">5. Buyer Added Bid Specific Terms & Conditions (ATC)</div>
          <ol class="atc-list">
            ${atcPage1.map((t) => `<li>${t}</li>`).join('')}
          </ol>
        </div>
        `
          : ''
      }
    </div>

    <!-- FOOTER PAGE 1 -->
    <div class="page-footer">
      <div>CONFIDENTIAL - PROPRIETARY BID ANALYSIS REPORT</div>
      <div>GeM BID NO: ${tender.bidNumber} | Page 1 of ${totalPages}</div>
    </div>
  </div>

  <!-- ==================== PAGE 2 ==================== -->
  <div class="a4-page">
    <div class="page-content">
      <!-- RUNNING HEADER -->
      <div class="running-header">
        <div>GeM Bid Intelligence: ${analysis.itemTitle || tender.categoryName || 'Tender Report'}</div>
        <div class="bid-tag">${tender.bidNumber}</div>
      </div>

      <!-- SECTION 5 (CONTINUED ON PAGE 2) -->
      ${
        atcPage2.length > 0
          ? `
        <div class="section">
          <div class="section-title">5. Buyer Added ATC (Continued)</div>
          <ol class="atc-list" start="${page1AtcCount + 1}">
            ${atcPage2.map((t) => `<li>${t}</li>`).join('')}
          </ol>
        </div>
        `
          : ''
      }

      <!-- SECTION 6: ELIGIBILITY CRITERIA & MANDATORY DOCUMENTS -->
      ${
        analysis.eligibilityCriteria
          ? `
        <div class="section">
          <div class="section-title">6. Eligibility Criteria & Compliance Checklist</div>
          <table class="data-table">
            <tbody>
              <tr>
                <th>Annual Turnover</th>
                <td>${analysis.eligibilityCriteria.turnover || 'As per tender terms'}</td>
                <th>Past Experience</th>
                <td>${analysis.eligibilityCriteria.experienceYears ? `${analysis.eligibilityCriteria.experienceYears} Years` : 'Standard GeM Terms'}</td>
              </tr>
              <tr>
                <th>OEM Authorization</th>
                <td colspan="3">${analysis.eligibilityCriteria.oemAuthorizationRequired ? 'Mandatory (OEM Authorization Certificate required)' : 'Not Required'}</td>
              </tr>
              ${
                analysis.eligibilityCriteria.certificatesRequired && analysis.eligibilityCriteria.certificatesRequired.length > 0
                  ? `<tr><th>Mandatory Documents Checklist</th><td colspan="3">${analysis.eligibilityCriteria.certificatesRequired.join('; ')}</td></tr>`
                  : ''
              }
            </tbody>
          </table>
        </div>
        `
          : ''
      }

      <!-- SECTION 7: ATTACHED SPECIFICATION SHEETS & LINKS -->
      <div class="section">
        <div class="section-title">7. Tender Documents & Attached Specification Sheets</div>
        <table class="data-table">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="width: 35%;">Document Name</th>
              <th style="width: 65%;">Official Direct Access URL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Primary GeM Bid Document</strong></td>
              <td><a class="doc-link" href="${tender.pdfUrl}" target="_blank">${tender.pdfUrl}</a></td>
            </tr>
            ${
              analysis.linkedDocuments && analysis.linkedDocuments.length > 0
                ? analysis.linkedDocuments
                    .map(
                      (doc) => `
              <tr>
                <td><strong>${doc.title}</strong></td>
                <td><a class="doc-link" href="${doc.url}" target="_blank">${doc.url}</a></td>
              </tr>
            `
                    )
                    .join('')
                : '<tr><td colspan="2" style="color: #64748b;">No secondary specification PDFs linked in bid document.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- FOOTER PAGE 2 -->
    <div class="page-footer">
      <div>CONFIDENTIAL - PROPRIETARY BID ANALYSIS REPORT</div>
      <div>GeM BID NO: ${tender.bidNumber} | Page 2 of ${totalPages}</div>
    </div>
  </div>

  ${
    atcPage3.length > 0
      ? `
  <!-- ==================== PAGE 3 (IF EXTRA ATC) ==================== -->
  <div class="a4-page">
    <div class="page-content">
      <div class="running-header">
        <div>GeM Bid Intelligence: Additional Terms & Conditions</div>
        <div class="bid-tag">${tender.bidNumber}</div>
      </div>

      <div class="section">
        <div class="section-title">5. Buyer Added ATC (Continued)</div>
        <ol class="atc-list" start="${page1AtcCount + page2AtcCount + 1}">
          ${atcPage3.map((t) => `<li>${t}</li>`).join('')}
        </ol>
      </div>
    </div>

    <div class="page-footer">
      <div>CONFIDENTIAL - PROPRIETARY BID ANALYSIS REPORT</div>
      <div>GeM BID NO: ${tender.bidNumber} | Page 3 of 3</div>
    </div>
  </div>
  `
      : ''
  }

</body>
</html>
  `.trim();
}

/**
 * Client-side PDF Generation with Perfect A4 Discrete Page Capture
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

    await new Promise((resolve) => setTimeout(resolve, 300));
    const fonts = (doc as any).fonts;
    if (fonts?.ready) {
      await fonts.ready.catch(() => undefined);
    }

    const pageElements = Array.from(doc.querySelectorAll<HTMLElement>('.a4-page'));
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    if (pageElements.length > 0) {
      for (let i = 0; i < pageElements.length; i++) {
        if (i > 0) pdf.addPage();
        const canvas = await html2canvas(pageElements[i], {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          windowWidth: 794,
        });
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
      }
    } else {
      const canvas = await html2canvas(doc.body, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 794,
      });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
    }

    return pdf.output('blob');
  } finally {
    document.body.removeChild(iframe);
  }
}
