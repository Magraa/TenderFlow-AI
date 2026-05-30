import { Firm, Language, Tender, TenderDocType, TenderItem } from '@/types';
import { aiFormatter } from './aiFormatter';
import { layoutEngine } from './layoutEngine';
import { templateLoader } from './templateLoader';
import { governmentTemplates } from './governmentTemplates';
import { dataService } from './dataService';

const GLOBAL_SYSTEM_PROMPT =
  'You write procurement documents in structured HTML with precise headings and concise government formatting.';

const DOC_TYPE_PROMPTS: Record<TenderDocType, string> = {
  vigyapti: 'Generate a public tender notification.',
  quotation_main: 'Generate a quotation for the main firm.',
  quotation_alt_1: 'Generate alternate quotation A.',
  quotation_alt_2: 'Generate alternate quotation B.',
  supply_aadesh: 'Generate a formal supply order.',
  firm_bill: 'Generate a tax bill/invoice format with GST breakdown.',
};

const STYLE_PROFILE_HINTS: Record<Firm['firmStyleProfile'], string> = {
  govt_formal: 'Use strict official structure, numbered sections, and formal tone.',
  minimal_business: 'Use short sections and concise commercial language.',
  bilingual: 'Prefer bilingual terms where practical.',
  table_heavy: 'Prefer structured tables for most sections.',
};

export interface AdvancedDraftRequest {
  tender: Tender;
  mainFirm: Firm;
  targetFirm?: Firm;
  docType: TenderDocType;
  language?: Language;
  items: TenderItem[];
  priceMultiplier?: number;
  showLetterheadBackground?: boolean;
  includeSignature?: boolean;
  includeStamp?: boolean;
  showSafeMarginGuide?: boolean;
  lockHeaderPosition?: boolean;
  showPageBoundaryGuide?: boolean;
  showPrintBleedMargin?: boolean;
  forceTemplateFallback?: boolean;
}

export interface DraftResponse {
  title: string;
  content: string;
  html: string;
  metadata: {
    itemCount: number;
    baseAmount: number;
    taxAmount: number;
    totalAmount: number;
    language: Language;
    firmId: string;
    usedTemplateFallback: boolean;
    promptStack: string;
    overflowWarning?: string;
  };
}

function docUsesLetterhead(docType: TenderDocType): boolean {
  return (
    docType === 'quotation_main' ||
    docType === 'quotation_alt_1' ||
    docType === 'quotation_alt_2' ||
    docType === 'supply_aadesh' ||
    docType === 'firm_bill'
  );
}

function getFirmPromptByDocType(firm: Firm, docType: TenderDocType): string {
  if (docType === 'quotation_main' || docType === 'quotation_alt_1' || docType === 'quotation_alt_2') {
    return firm.aiPromptQuotation || '';
  }
  // Supply order and vigyapti-specific firm prompts were removed to reduce prompt complexity.
  // We reuse the quotation instructions (if provided) for these doc types.
  if (docType === 'supply_aadesh' || docType === 'vigyapti') return firm.aiPromptQuotation || '';
  if (docType === 'firm_bill') {
    return firm.aiPromptBill || '';
  }
  return '';
}

function buildPromptStack(firm: Firm, docType: TenderDocType): string {
  const parts = [
    GLOBAL_SYSTEM_PROMPT,
    STYLE_PROFILE_HINTS[firm.firmStyleProfile],
    DOC_TYPE_PROMPTS[docType],
    getFirmPromptByDocType(firm, docType),
  ].filter(Boolean);

  return parts.join('\n');
}

function adjustItems(items: TenderItem[], multiplier = 1): TenderItem[] {
  return items.map((item) => {
    const rate = Math.round(item.rate * multiplier * 100) / 100;
    return {
      ...item,
      rate,
      totalAmount: Math.round(item.quantity * rate * 100) / 100,
    };
  });
}

function calculateTotals(items: TenderItem[]): { baseAmount: number; taxAmount: number; totalAmount: number } {
  const baseAmount = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const taxAmount = items.reduce((sum, item) => sum + ((item.quantity * item.rate) * item.gstPercent) / 100, 0);
  return {
    baseAmount: Math.round(baseAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round((baseAmount + taxAmount) * 100) / 100,
  };
}

function buildContext(request: AdvancedDraftRequest, language: Language, itemsTableHTML: string, totalAmount: number) {
  return {
    tenderTitle: request.tender.title,
    tenderNumber: request.tender.tenderNumber,
    departmentName: request.tender.departmentProfileId,
    dateLabel: new Date().toLocaleDateString(language === 'hindi' ? 'hi-IN' : 'en-IN'),
    itemsTableHTML,
    totalAmountLabel: `Rs. ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  };
}

function simulateAIDraftHTML(
  request: AdvancedDraftRequest,
  language: Language,
  itemsTableHTML: string,
  totals: { totalAmount: number }
): string {
  const heading =
    request.docType === 'firm_bill'
      ? language === 'hindi'
        ? 'कर बिल'
        : 'Tax Bill'
      : request.docType === 'supply_aadesh'
        ? language === 'hindi'
          ? 'आपूर्ति आदेश'
          : 'Supply Order'
        : request.docType === 'vigyapti'
          ? language === 'hindi'
            ? 'निविदा सूचना'
            : 'Tender Notice'
          : language === 'hindi'
            ? 'मूल्य उद्धरण'
            : 'Quotation';

  return `
    <div class="doc-body">
      <h2>${heading}</h2>
      <p><strong>${language === 'hindi' ? 'निविदा संख्या' : 'Tender Number'}:</strong> ${request.tender.tenderNumber}</p>
      <p><strong>${language === 'hindi' ? 'तारीख' : 'Date'}:</strong> ${new Date().toLocaleDateString(language === 'hindi' ? 'hi-IN' : 'en-IN')}</p>
      ${itemsTableHTML}
      <p><strong>${language === 'hindi' ? 'कुल राशि' : 'Total Amount'}:</strong> Rs. ${totals.totalAmount.toLocaleString('en-IN')}</p>
    </div>
  `;
}

function getTitleByDocType(docType: TenderDocType, language: Language): string {
  const englishTitles: Record<TenderDocType, string> = {
    vigyapti: 'Vigyapti',
    quotation_main: 'Quotation - Main',
    quotation_alt_1: 'Quotation - Alternate A',
    quotation_alt_2: 'Quotation - Alternate B',
    supply_aadesh: 'Supply Aadesh',
    firm_bill: 'Main Firm Bill',
  };
  const hindiTitles: Record<TenderDocType, string> = {
    vigyapti: 'विज्ञप्ति',
    quotation_main: 'मुख्य उद्धरण',
    quotation_alt_1: 'वैकल्पिक उद्धरण A',
    quotation_alt_2: 'वैकल्पिक उद्धरण B',
    supply_aadesh: 'आपूर्ति आदेश',
    firm_bill: 'मुख्य फर्म बिल',
  };
  return language === 'hindi' ? hindiTitles[docType] : englishTitles[docType];
}

function buildContentPages(
  request: AdvancedDraftRequest,
  language: Language,
  adjustedItems: TenderItem[],
  totals: { totalAmount: number },
  departmentName: string
): { pages: string[]; fallbackUsed: boolean } {
  // Use structured government templates for Vigyapti and Supply Aadesh
  if (request.docType === 'vigyapti' || request.docType === 'supply_aadesh') {
    try {
      const placeName = request.tender.placeName || '';
      const districtName = request.tender.districtName || '';

      if (request.docType === 'vigyapti') {
        const html = governmentTemplates.generateVigyapti({
          placeName,
          districtName,
          departmentName,
          tenderNumber: request.tender.tenderNumber,
          publishDate: request.tender.publishDate || new Date().toLocaleDateString(language === 'hindi' ? 'hi-IN' : 'en-IN'),
          submissionDate: request.tender.submissionDate || '',
          openingDate: request.tender.openingDate || '',
          items: adjustedItems,
          language,
        });
        return { pages: [html], fallbackUsed: false };
      }

      if (request.docType === 'supply_aadesh') {
        const firm = request.targetFirm || request.mainFirm;
        const html = governmentTemplates.generateSupplyAadesh({
          placeName,
          districtName,
          departmentName,
          tenderNumber: request.tender.tenderNumber,
          orderDate: new Date().toLocaleDateString(language === 'hindi' ? 'hi-IN' : 'en-IN'),
          firm,
          items: adjustedItems,
          language,
        });
        return { pages: [html], fallbackUsed: false };
      }
    } catch (error) {
      console.error('Error generating government template:', error);
      // Fall through to default generation
    }
  }

  const itemTablePages = layoutEngine.generateItemsTablePages(adjustedItems, language);
  const shouldUseMultiPage = request.docType === 'firm_bill' && itemTablePages.length > 1;
  const title = getTitleByDocType(request.docType, language);

  let fallbackUsed = false;

  if (shouldUseMultiPage) {
    const pages = itemTablePages.map((tablePage, index) =>
      aiFormatter.sanitizeAIHTML(`
        <div class="doc-body">
          <h2>${title}${itemTablePages.length > 1 ? ` - Page ${index + 1}` : ''}</h2>
          <p><strong>${language === 'hindi' ? 'निविदा संख्या' : 'Tender Number'}:</strong> ${request.tender.tenderNumber}</p>
          ${tablePage.html}
          ${
            tablePage.isLastPage
              ? `<p><strong>${language === 'hindi' ? 'कुल राशि' : 'Total Amount'}:</strong> Rs. ${totals.totalAmount.toLocaleString('en-IN')}</p>`
              : ''
          }
        </div>
      `)
    );

    return { pages, fallbackUsed };
  }

  const primaryTable = itemTablePages[0]?.html || '<table class="items-table"><tbody></tbody></table>';
  const aiHTML = request.forceTemplateFallback
    ? ''
    : simulateAIDraftHTML(request, language, primaryTable, totals);

  if (aiFormatter.isAIResponseInvalid(aiHTML)) {
    fallbackUsed = true;
    const context = buildContext(request, language, primaryTable, totals.totalAmount);
    const fallback = templateLoader.loadDefaultTemplate(request.docType, language, context);
    return { pages: [aiFormatter.sanitizeAIHTML(fallback)], fallbackUsed };
  }

  return { pages: [aiFormatter.sanitizeAIHTML(aiHTML)], fallbackUsed };
}

export async function generateDraft(request: AdvancedDraftRequest): Promise<DraftResponse> {
  const firm = request.targetFirm || request.mainFirm;
  const language = request.language || firm.defaultLanguage;
  const adjustedItems = adjustItems(request.items, request.priceMultiplier ?? 1);
  const totals = calculateTotals(adjustedItems);
  const title = getTitleByDocType(request.docType, language);
  const promptStack = buildPromptStack(firm, request.docType);

  const department =
    request.docType === 'vigyapti' || request.docType === 'supply_aadesh'
      ? await dataService.departmentProfiles.get(request.tender.departmentProfileId)
      : null;
  const departmentName = department?.name || 'Government Department';

  const { pages, fallbackUsed } = buildContentPages(request, language, adjustedItems, totals, departmentName);
  const includeLetterhead = docUsesLetterhead(request.docType);
  const layered = includeLetterhead
    ? layoutEngine.applyLetterheadLayoutPages(pages, firm, {
        showLetterheadBackground: request.showLetterheadBackground !== false,
        includeSignature: request.includeSignature === true,
        includeStamp: request.includeStamp === true,
        showSafeMarginGuide: request.showSafeMarginGuide === true,
        showPageBoundaryGuide: request.showPageBoundaryGuide === true,
        showPrintBleedMargin: request.showPrintBleedMargin === true,
        lockHeaderPosition: request.lockHeaderPosition !== false,
      })
    : layoutEngine.applyPlainA4LayoutPages(pages, {
        showPageBoundaryGuide: request.showPageBoundaryGuide === true,
        showPrintBleedMargin: request.showPrintBleedMargin === true,
      });

  const html = layoutEngine.wrapInA4Page(layered, title);
  const overflowWarning =
    pages.length > 1
      ? `Content spans ${pages.length} page(s).`
      : aiFormatter.detectOverflowWarning(html);

  return {
    title,
    content: pages.join('\n'),
    html,
    metadata: {
      itemCount: adjustedItems.length,
      baseAmount: totals.baseAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      language,
      firmId: firm.id,
      usedTemplateFallback: fallbackUsed,
      promptStack,
      overflowWarning,
    },
  };
}

export const aiDraftService = {
  generateDraft,
  docUsesLetterhead,
};
