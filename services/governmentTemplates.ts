import { Firm, TenderItem } from '@/types';
import { aiContextGenerator } from './aiContextGenerator';
import { consolidatePurposesByCategory, getHindiItemName, getHindiVendorName } from './mappingService';

/**
 * Government Document Template Generator
 * Generates structured, deterministic government documents.
 * AI only fills contextual lines, not entire document structure.
 */

interface VigyaptiContext {
  placeName: string;
  districtName: string;
  departmentName: string;
  tenderNumber: string;
  publishDate: string;
  submissionDate: string;
  openingDate: string;
  items: TenderItem[];
  language: 'hindi' | 'english';
}

interface SupplyAadeshContext {
  placeName: string;
  districtName: string;
  departmentName: string;
  tenderNumber: string;
  orderDate: string;
  firm: Firm;
  items: TenderItem[];
  language: 'hindi' | 'english';
}

function escapeHTML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeOfficePlace(value: string): string {
  return value.trim() || 'सेवड़ा';
}

function normalizeDistrict(value: string): string {
  return value.trim() || 'दतिया';
}

function formatTenderAmount(item: TenderItem): string {
  const amount = item.estimatedAmount || item.totalAmount || item.quantity * item.rate;
  return Math.round(amount).toLocaleString('en-IN');
}

function isMunicipalCorporation(departmentName: string): boolean {
  const normalized = departmentName.trim().toLowerCase();
  return (
    normalized === 'municipal corporation' ||
    normalized.includes('नगर निगम') ||
    normalized.includes('नगर परिषद')
  );
}

async function generateMunicipalCorporationVigyapti(context: VigyaptiContext): Promise<string> {
  const place = normalizeOfficePlace(context.placeName);
  const district = normalizeDistrict(context.districtName);
  const purpose = await consolidatePurposesByCategory(context.items, context.language);
  const submissionDate = context.submissionDate || '................';
  const openingDate = context.openingDate || 'उसी दिन';

  const itemsRowsPromises = context.items.length > 0
    ? context.items.map(async (item, index) => {
        const itemName = context.language === 'hindi' 
          ? await getHindiItemName(item.productName)
          : item.productName;
        return `
        <tr>
          <td class="mc-vigyapti-center mc-vigyapti-serial">${index + 1}.</td>
          <td class="mc-vigyapti-item"><strong>${escapeHTML(itemName)}</strong></td>
          <td class="mc-vigyapti-amount">${formatTenderAmount(item)}</td>
        </tr>
      `;
      })
    : [
        `
        <tr>
          <td class="mc-vigyapti-center mc-vigyapti-serial">1.</td>
          <td class="mc-vigyapti-item"><strong>सामग्री</strong></td>
          <td class="mc-vigyapti-amount">0</td>
        </tr>
      `
      ];

  const itemsRows = (await Promise.all(itemsRowsPromises)).join('');

  return `
    <div class="mc-vigyapti-doc">
      <style>
        .mc-vigyapti-doc {
          width: 100%;
          min-height: 100%;
          padding: 10px 18px 0;
          color: #111;
          font-family: "Noto Sans Devanagari", "Mangal", "Kokila", Arial, sans-serif;
          font-size: 15px;
          line-height: 1.62;
        }

        .mc-vigyapti-heading {
          margin: 0;
          text-align: center;
          font-size: 31px;
          font-weight: 500;
          line-height: 1.25;
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        .mc-vigyapti-meta {
          display: flex;
          justify-content: space-between;
          margin-top: 10px;
          font-size: 18px;
        }

        .mc-vigyapti-title {
          margin: 4px 0 12px;
          text-align: center;
          font-size: 21px;
          font-weight: 500;
        }

        .mc-vigyapti-doc p {
          margin: 0 0 9px;
          text-align: justify;
        }

        .mc-vigyapti-table {
          width: 100%;
          margin: 16px 0 34px;
          border-collapse: collapse;
          table-layout: fixed;
          font-family: Arial, "Noto Sans Devanagari", sans-serif;
          font-size: 14px;
          line-height: 1.2;
        }

        .mc-vigyapti-table th,
        .mc-vigyapti-table td {
          border: 1px solid #8a8a8a;
          padding: 4px 6px;
          vertical-align: middle;
        }

        .mc-vigyapti-table th {
          text-align: center;
          font-weight: 700;
        }

        .mc-vigyapti-center {
          text-align: center;
        }

        .mc-vigyapti-serial {
          width: 32px;
          font-weight: 700;
        }

        .mc-vigyapti-amount {
          width: 95px;
          text-align: right;
          font-size: 16px;
        }

        .mc-vigyapti-terms-title {
          margin-top: 2px;
          font-size: 18px;
        }

        .mc-vigyapti-terms {
          margin: 2px 0 0 40px;
          padding-left: 24px;
          line-height: 1.75;
        }

        .mc-vigyapti-footer {
          margin-top: 46px;
          text-align: right;
          font-weight: 700;
          line-height: 1.35;
          font-size: 16px;
        }
      </style>

      <h1 class="mc-vigyapti-heading">कार्यालय नगर परिषद ${escapeHTML(place)} जिला ${escapeHTML(district)}</h1>

      <div class="mc-vigyapti-meta">
        <div>क्रमांक ............</div>
        <div>दिनांक ............</div>
      </div>

      <div class="mc-vigyapti-title">विज्ञप्ति</div>

      <p>एतद् द्वारा सर्व संबंधित वाणिज्य कर विभाग में पंजीकृत फर्मों को सूचित किया जाता है कि नगर परिषद ${escapeHTML(place)} द्वारा ${escapeHTML(purpose)} क्रय किया जाना प्रस्तावित है।</p>

      <p>जिस हेतु इच्छुक फर्में अपने सीलबंद कोटेशन फर्म के लेटरहेड पर, अधोहस्ताक्षरकर्ता के कार्यालय में दिनांक ${escapeHTML(submissionDate)} को दोपहर 03:00 बजे तक प्रस्तुत कर सकते हैं।</p>

      <p>प्राप्त कोटेशन ${escapeHTML(openingDate)} दोपहर 03:30 बजे को कोटेशन प्रस्तुतकर्ताओं की उपस्थिति में खोले जाएंगे।</p>

      <table class="mc-vigyapti-table">
        <thead>
          <tr>
            <th style="width: 32px;">क्र</th>
            <th>नाम सामग्री</th>
            <th style="width: 95px;">अनुमानित<br />राशि</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div class="mc-vigyapti-terms-title">शर्तें :-</div>
      <ol class="mc-vigyapti-terms">
        <li>सशर्त व काट-छांट कोटेशन मान्य नहीं की जावेगी।</li>
        <li>सामग्री की मात्रा आवश्यकता अनुसार कम या अधिक की जा सकती है।</li>
        <li>सामग्री की FOR नगर परिषद ${escapeHTML(place)} को देना होगी।</li>
        <li>दरों को स्वीकार अथवा अस्वीकार करने का अधिकार नगर पालिका प्रशासन के पास सुरक्षित रहेगा।</li>
        <li>जी.एस.टी. कर पृथक से देय होगा।</li>
        <li>कार्य का अन्य विवरण एवं अन्य शर्तें कार्यालय में देखी जा सकती हैं।</li>
      </ol>

      <div class="mc-vigyapti-footer">
        <div>मुख्य नगर पालिका अधिकारी</div>
        <div>नगर परिषद ${escapeHTML(place)}</div>
      </div>
    </div>
  `;
}

async function generateMunicipalCorporationSupplyAadesh(context: SupplyAadeshContext): Promise<string> {
  const place = normalizeOfficePlace(context.placeName);
  const district = normalizeDistrict(context.districtName);

  const subject = await aiContextGenerator.generateSupplyAadeshSubjectWithPurpose(context.items, context.language);
  const body = await aiContextGenerator.generateSupplyAadeshBody(context.firm.name, context.items, context.language);

  // Get Hindi names for firm information when language is Hindi
  const firmName = context.language === 'hindi' ? await getHindiVendorName(context.firm.name) : context.firm.name;
  const firmCity = context.firm.firmCity ? (context.language === 'hindi' ? await getHindiVendorName(context.firm.firmCity) : context.firm.firmCity) : null;
  const firmAddress = context.firm.firmAddress ? (context.language === 'hindi' ? await getHindiVendorName(context.firm.firmAddress) : context.firm.firmAddress) : null;

  const rowsPromises = context.items.length > 0
    ? context.items.map(async (item) => {
        const itemName = context.language === 'hindi'
          ? await getHindiItemName(item.productName)
          : item.productName;
        const qtyUnit = `${item.quantity} ${item.unit || ''}`.trim();
        return `
          <tr>
            <td class="mc-sa-cell mc-sa-item">${escapeHTML(itemName)}</td>
            <td class="mc-sa-cell mc-sa-qty">${escapeHTML(qtyUnit)}</td>
            <td class="mc-sa-cell mc-sa-rate">Rs.</td>
          </tr>
        `;
      })
    : [
        `
        <tr>
          <td class="mc-sa-cell mc-sa-item">सामग्री</td>
          <td class="mc-sa-cell mc-sa-qty">0</td>
          <td class="mc-sa-cell mc-sa-rate">Rs.</td>
        </tr>
      `
      ];

  const rows = (await Promise.all(rowsPromises)).join('');

  return `
    <div class="mc-sa-doc">
      <style>
        .mc-sa-doc {
          width: 100%;
          min-height: 100%;
          padding: 10px 18px 0;
          color: #111;
          font-family: "Noto Sans Devanagari", "Mangal", "Kokila", Arial, sans-serif;
          font-size: 16px;
          line-height: 1.65;
        }

        .mc-sa-heading {
          margin: 0;
          text-align: center;
          font-size: 30px;
          font-weight: 500;
          line-height: 1.25;
        }

        .mc-sa-meta {
          display: flex;
          justify-content: space-between;
          margin-top: 10px;
          font-size: 18px;
        }

        .mc-sa-title {
          margin: 14px 0 18px;
          text-align: center;
          font-size: 22px;
          font-weight: 600;
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        .mc-sa-doc p {
          margin: 0 0 10px;
        }

        .mc-sa-to {
          margin-top: 18px;
        }

        .mc-sa-firm-name {
          margin-left: 20px;
          font-weight: 700;
        }

        .mc-sa-firm-subline {
          margin-left: 60px;
        }

        .mc-sa-subject {
          margin-top: 18px;
          font-weight: 700;
        }

        .mc-sa-body {
          margin-top: 10px;
          text-align: justify;
          white-space: pre-line;
        }

        .mc-sa-table {
          margin-top: 22px;
          width: 100%;
          border-collapse: collapse;
          font-size: 15px;
        }

        .mc-sa-cell {
          border: 1px solid #000;
          padding: 7px 8px;
          vertical-align: top;
        }

        .mc-sa-item {
          width: 62%;
        }

        .mc-sa-qty {
          width: 18%;
          text-align: center;
          white-space: nowrap;
        }

        .mc-sa-rate {
          width: 20%;
          text-align: left;
          white-space: nowrap;
        }

        .mc-sa-sign {
          margin-top: 44px;
          text-align: right;
          font-size: 16px;
          font-weight: 600;
        }
      </style>

      <h1 class="mc-sa-heading">कार्यालय नगर परिषद ${escapeHTML(place)} जिला ${escapeHTML(district)}</h1>

      <div class="mc-sa-meta">
        <div>क्रमांक ............</div>
        <div>दिनांक ............</div>
      </div>

      <div class="mc-sa-title">सप्लाई आदेश</div>

      <div class="mc-sa-to">
        <p><strong>प्रति,</strong></p>
        <p class="mc-sa-firm-name">${escapeHTML(firmName)}</p>
        ${firmCity ? `<p class="mc-sa-firm-subline">${escapeHTML(firmCity)}</p>` : ''}
        ${firmAddress ? `<p class="mc-sa-firm-subline">${escapeHTML(firmAddress)}</p>` : ''}
      </div>

      <p class="mc-sa-subject">${escapeHTML(subject)}</p>

      <p class="mc-sa-body">${escapeHTML(body)}</p>

      <table class="mc-sa-table">
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="mc-sa-sign">
        <div>मुख्य नगर पालिका अधिकारी</div>
        <div>नगर परिषद ${escapeHTML(place)}</div>
      </div>
    </div>
  `;
}

/**
 * Generate items table HTML for government documents
 */
async function generateItemsTable(items: TenderItem[], language: 'hindi' | 'english'): Promise<string> {
  const headers =
    language === 'hindi'
      ? ['क्र.', 'सामग्री का नाम', 'विवरण', 'मात्रा', 'इकाई', 'दर (₹)', 'अनुमानित राशि (₹)']
      : ['Sr.', 'Item Name', 'Description', 'Quantity', 'Unit', 'Rate (₹)', 'Estimated Amount (₹)'];

  let tableHTML = `
    <table class="govt-items-table" style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 2px solid #000;">
      <thead>
        <tr style="background-color: #f0f0f0;">
          ${headers
            .map((h) => `<th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">${escapeHTML(h)}</th>`)
            .join('')}
        </tr>
      </thead>
      <tbody>
  `;

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    // Get Hindi name when language is Hindi
    const itemName = language === 'hindi' 
      ? await getHindiItemName(item.productName)
      : item.productName;
    
    const estimatedAmount = item.estimatedAmount || item.quantity * item.rate;
    tableHTML += `
      <tr>
        <td style="border: 1px solid #000; padding: 8px; text-align: center;">${index + 1}</td>
        <td style="border: 1px solid #000; padding: 8px;">${escapeHTML(itemName)}</td>
        <td style="border: 1px solid #000; padding: 8px;">${escapeHTML(item.description || '-')}</td>
        <td style="border: 1px solid #000; padding: 8px; text-align: center;">${item.quantity}</td>
        <td style="border: 1px solid #000; padding: 8px; text-align: center;">${escapeHTML(item.unit || 'Nos')}</td>
        <td style="border: 1px solid #000; padding: 8px; text-align: right;">₹${item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="border: 1px solid #000; padding: 8px; text-align: right;">₹${estimatedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  }

  const totalAmount = items.reduce((sum, item) => {
    const amt = item.estimatedAmount || item.quantity * item.rate;
    return sum + amt;
  }, 0);

  tableHTML += `
      <tr style="font-weight: bold; background-color: #f9f9f9;">
        <td colspan="6" style="border: 1px solid #000; padding: 8px; text-align: right;">${
          language === 'hindi' ? 'कुल अनुमानित राशि' : 'Total Estimated Amount'
        }</td>
        <td style="border: 1px solid #000; padding: 8px; text-align: right;">₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    </tbody>
  </table>
  `;

  return tableHTML;
}

/**
 * Generate Vigyapti (विज्ञप्ति) - Tender Notice
 */
export async function generateVigyapti(context: VigyaptiContext): Promise<string> {
  const { placeName, districtName, departmentName, tenderNumber, publishDate, submissionDate, openingDate, items, language } = context;

  if (language === 'hindi' && isMunicipalCorporation(departmentName)) {
    return generateMunicipalCorporationVigyapti(context);
  }

  const officePlace = normalizeOfficePlace(placeName);
  const district = normalizeDistrict(districtName);

  const aiIntro = await aiContextGenerator.generateVigyaptiIntroWithPurpose(officePlace, district, items, language);
  const itemsTable = await generateItemsTable(items, language);

  const termsHindi = `
    <div style="margin-top: 20px;">
      <h3 style="font-weight: bold; margin-bottom: 10px;">शर्तें एवं नियम:</h3>
      <ol style="line-height: 1.8; padding-left: 20px;">
        <li>दरों में जी.एस.टी. सम्मिलित होना चाहिए।</li>
        <li>सामग्री की गुणवत्ता मानक के अनुरूप होनी चाहिए।</li>
        <li>सामग्री की आपूर्ति निर्धारित समय-सीमा में की जानी चाहिए।</li>
        <li>भुगतान सामग्री की आपूर्ति एवं जांच के पश्चात किया जायेगा।</li>
        <li>विभाग को बिना कारण बताये किसी भी निविदा को स्वीकार या अस्वीकार करने का अधिकार सुरक्षित है।</li>
        <li>न्यूनतम दर वाली फर्म को कार्य आदेश दिया जायेगा।</li>
      </ol>
    </div>
  `;

  const termsEnglish = `
    <div style="margin-top: 20px;">
      <h3 style="font-weight: bold; margin-bottom: 10px;">Terms and Conditions:</h3>
      <ol style="line-height: 1.8; padding-left: 20px;">
        <li>Rates should be inclusive of GST.</li>
        <li>Material quality must meet standards.</li>
        <li>Supply must be completed within the specified timeframe.</li>
        <li>Payment will be made after supply and inspection of materials.</li>
        <li>The department reserves the right to accept or reject any tender without assigning reasons.</li>
        <li>Work order will be issued to the firm with the lowest rate.</li>
      </ol>
    </div>
  `;

  const terms = language === 'hindi' ? termsHindi : termsEnglish;

  const html = `
    <div class="govt-document vigyapti" style="font-family: 'Noto Sans Devanagari', Arial, sans-serif; padding: 40px; line-height: 1.6;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 5px;">
          ${language === 'hindi' ? 'कार्यालय' : 'Office'}
        </h2>
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">
          ${escapeHTML(departmentName)} ${escapeHTML(officePlace)}
        </h2>
        <h3 style="font-size: 16px; font-weight: bold;">
          ${language === 'hindi' ? 'जिला' : 'District'} ${escapeHTML(district)}
        </h3>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <h1 style="font-size: 22px; font-weight: bold; text-decoration: underline;">
          ${language === 'hindi' ? 'विज्ञप्ति' : 'TENDER NOTICE'}
        </h1>
      </div>

      <div style="margin-bottom: 20px;">
        <p><strong>${language === 'hindi' ? 'निविदा संख्या' : 'Tender No.'}:</strong> ${escapeHTML(tenderNumber || '')}</p>
        <p><strong>${language === 'hindi' ? 'प्रकाशन तिथि' : 'Publication Date'}:</strong> ${escapeHTML(publishDate || '')}</p>
        <p><strong>${language === 'hindi' ? 'जमा करने की अंतिम तिथि' : 'Last Date of Submission'}:</strong> ${escapeHTML(submissionDate || '')}</p>
        <p><strong>${language === 'hindi' ? 'निविदा खोलने की तिथि' : 'Tender Opening Date'}:</strong> ${escapeHTML(openingDate || '')}</p>
      </div>

      <div style="margin: 20px 0; text-align: justify;">
        <p style="text-indent: 40px;">${escapeHTML(aiIntro)}</p>
      </div>

      <div style="margin: 30px 0;">
        <h3 style="font-weight: bold; margin-bottom: 15px;">
          ${language === 'hindi' ? 'सामग्री का विवरण:' : 'Item Details:'}
        </h3>
        ${itemsTable}
      </div>

      ${terms}

      <div style="margin-top: 50px; text-align: right;">
        <p style="font-weight: bold;">
          ${language === 'hindi' ? 'मुख्य नगर पालिका अधिकारी' : 'Chief Municipal Officer'}
        </p>
        <p style="font-weight: bold;">
          ${escapeHTML(departmentName)} ${escapeHTML(officePlace)}
        </p>
      </div>
    </div>
  `;

  return html;
}

/**
 * Generate Supply Aadesh (सप्लाई आदेश) - Supply Order
 */
export async function generateSupplyAadesh(context: SupplyAadeshContext): Promise<string> {
  const { placeName, districtName, departmentName, firm, items, language } = context;

  if (language === 'hindi' && isMunicipalCorporation(departmentName)) {
    return generateMunicipalCorporationSupplyAadesh(context);
  }

  const officePlace = normalizeOfficePlace(placeName);
  const district = normalizeDistrict(districtName);

  const aiSubject = await aiContextGenerator.generateSupplyAadeshSubjectWithPurpose(items, language);
  const aiBody = await aiContextGenerator.generateSupplyAadeshBody(firm.name, items, language);
  const itemsTable = await generateItemsTable(items, language);

  const totalAmount = items.reduce((sum, item) => {
    const amt = item.estimatedAmount || item.quantity * item.rate;
    return sum + amt;
  }, 0);

  const html = `
    <div class="govt-document supply-aadesh" style="font-family: 'Noto Sans Devanagari', Arial, sans-serif; padding: 40px; line-height: 1.6;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 5px;">
          ${language === 'hindi' ? 'कार्यालय' : 'Office'}
        </h2>
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">
          ${escapeHTML(departmentName)} ${escapeHTML(officePlace)}
        </h2>
        <h3 style="font-size: 16px; font-weight: bold;">
          ${language === 'hindi' ? 'जिला' : 'District'} ${escapeHTML(district)}
        </h3>
      </div>

      <div style="margin-bottom: 20px;">
        <p><strong>${language === 'hindi' ? 'आदेश संख्या' : 'Order No.'}:</strong></p>
        <p><strong>${language === 'hindi' ? 'दिनांक' : 'Date'}:</strong></p>
      </div>

      <div style="margin: 20px 0;">
        <p><strong>${language === 'hindi' ? 'प्रति,' : 'To,'}</strong></p>
        <p style="margin-left: 20px; font-weight: bold;">${escapeHTML(language === 'hindi' ? await getHindiVendorName(firm.name) : firm.name)}</p>
        ${firm.firmCity ? `<p style="margin-left: 20px;">${escapeHTML(language === 'hindi' ? await getHindiVendorName(firm.firmCity) : firm.firmCity)}</p>` : ''}
        ${firm.firmAddress ? `<p style="margin-left: 20px;">${escapeHTML(language === 'hindi' ? await getHindiVendorName(firm.firmAddress) : firm.firmAddress)}</p>` : ''}
        ${firm.gstNumber ? `<p style="margin-left: 20px;"><strong>${language === 'hindi' ? 'जी.एस.टी. नंबर' : 'GST No.'}:</strong> ${escapeHTML(firm.gstNumber)}</p>` : ''}
        ${firm.mobileNumber ? `<p style="margin-left: 20px;"><strong>${language === 'hindi' ? 'मोबाइल' : 'Mobile'}:</strong> ${escapeHTML(firm.mobileNumber)}</p>` : ''}
      </div>

      <div style="margin: 20px 0;">
        <p style="font-weight: bold; text-decoration: underline;">${escapeHTML(aiSubject)}</p>
      </div>

      <div style="margin: 20px 0; text-align: justify;">
        <p style="white-space: pre-line;">${escapeHTML(aiBody)}</p>
      </div>

      <div style="margin: 30px 0;">
        <h3 style="font-weight: bold; margin-bottom: 15px;">
          ${language === 'hindi' ? 'सामग्री का विवरण:' : 'Item Details:'}
        </h3>
        ${itemsTable}
      </div>

      <div style="margin: 20px 0;">
        <p style="font-size: 16px; font-weight: bold;">
          ${language === 'hindi' ? 'कुल राशि' : 'Total Amount'}: ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div style="margin: 30px 0;">
        <p style="font-weight: bold;">${language === 'hindi' ? 'निर्देश:' : 'Instructions:'}</p>
        <ol style="line-height: 1.8; padding-left: 20px;">
          <li>${language === 'hindi' ? 'सामग्री की आपूर्ति 7 दिवस के भीतर करें।' : 'Supply materials within 7 days.'}</li>
          <li>${language === 'hindi' ? 'सामग्री की गुणवत्ता मानक के अनुरूप होनी चाहिए।' : 'Material quality must meet standards.'}</li>
          <li>${language === 'hindi' ? 'बिल की प्रति के साथ सामग्री की आपूर्ति करें।' : 'Supply materials with bill copy.'}</li>
          <li>${language === 'hindi' ? 'भुगतान सामग्री की जांच के पश्चात किया जायेगा।' : 'Payment will be made after inspection.'}</li>
        </ol>
      </div>

      <div style="margin-top: 50px; text-align: right;">
        <p style="font-weight: bold;">
          ${language === 'hindi' ? 'मुख्य नगर पालिका अधिकारी' : 'Chief Municipal Officer'}
        </p>
        <p style="font-weight: bold;">
          ${escapeHTML(departmentName)} ${escapeHTML(officePlace)}
        </p>
      </div>
    </div>
  `;

  return html;
}

export const governmentTemplates = {
  generateVigyapti,
  generateSupplyAadesh,
  generateItemsTable,
};

