import { Firm, Language, Tender, TenderDocType, TenderItem } from '@/types';
import { aiFormatter } from './aiFormatter';
import { layoutEngine } from './layoutEngine';
import { governmentTemplates } from '../templates/hindi/governmentTemplates';
import { dataService } from './dataService';
import { generateAIDraft, getProviderDisplayName } from './aiClient';
import { toHindiUnit } from '../lib/unitUtils';

const GLOBAL_SYSTEM_PROMPT =
  'You write procurement documents in structured HTML with precise headings and concise government formatting.';

// AI Configuration from environment
const AI_PROVIDER = (process.env.NEXT_PUBLIC_AI_PROVIDER || 'mock').toLowerCase() as any;
const AI_API_KEY = process.env.NEXT_PUBLIC_AI_API_KEY || '';
const AI_MODEL = process.env.NEXT_PUBLIC_AI_MODEL || 'mock-1.0';

console.log(`AI Provider: ${getProviderDisplayName(AI_PROVIDER)}`);
console.log(`AI Model: ${AI_MODEL}`);

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
  customTemplateId?: string;
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

async function buildContentPages(
  request: AdvancedDraftRequest,
  language: Language,
  adjustedItems: TenderItem[],
  totals: { totalAmount: number },
  departmentName: string,
  firm: Firm
): Promise<{ pages: string[]; fallbackUsed: boolean }> {
  // Use structured government templates for Vigyapti, Supply Aadesh, and Quotations
  if (
    request.docType === 'vigyapti' ||
    request.docType === 'supply_aadesh' ||
    request.docType === 'quotation_main' ||
    request.docType === 'quotation_alt_1' ||
    request.docType === 'quotation_alt_2'
  ) {
    try {
      // Resolve place and district names according to document language.
      // Tender stores placeName/districtName as entered (often in Hindi).
      // For English documents we look up the English name from PlaceMappings.
      const rawPlaceName = request.tender.placeName || '';
      const rawDistrictName = request.tender.districtName || '';

      let placeName = rawPlaceName;
      let districtName = rawDistrictName;

      if (rawPlaceName) {
        try {
          const placeMappings = await dataService.placeMappings.list();
          const matchedPlace = placeMappings.find(
            (pm) =>
              pm.englishName.toLowerCase() === rawPlaceName.toLowerCase() ||
              pm.hindiName === rawPlaceName ||
              (pm.hindiName && pm.hindiName.trim() === rawPlaceName.trim())
          );
          if (matchedPlace) {
            placeName = language === 'hindi'
              ? (matchedPlace.hindiName || rawPlaceName)
              : (matchedPlace.englishName || rawPlaceName);
            const rawDist = rawDistrictName || matchedPlace.districtName;
            districtName = language === 'hindi'
              ? (matchedPlace.districtHindiName || rawDist)
              : (matchedPlace.districtName || rawDist);
          }
        } catch {
          // If lookup fails, fall through with raw values
        }
      }

      if (request.docType === 'vigyapti') {
        const html = await governmentTemplates.generateVigyapti({
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
        const targetFirm = request.targetFirm || request.mainFirm;
        const html = await governmentTemplates.generateSupplyAadesh({
          placeName,
          districtName,
          departmentName,
          tenderNumber: request.tender.tenderNumber,
          orderDate: new Date().toLocaleDateString(language === 'hindi' ? 'hi-IN' : 'en-IN'),
          firm: targetFirm,
          items: adjustedItems,
          language,
        });
        return { pages: [html], fallbackUsed: false };
      }

      if (
        request.docType === 'quotation_main' ||
        request.docType === 'quotation_alt_1' ||
        request.docType === 'quotation_alt_2'
      ) {
        // Resolve subject using the phrase pack
        let subject = '';
        if (adjustedItems.length > 0) {
          const firstItem = adjustedItems[0].productName;
          const mappings = await dataService.documentPhraseMappings.list();
          // Find mapping containing the keyword
          const matchedPack = mappings.find(m =>
            m.keywords.some(k => firstItem.toLowerCase().includes(k.toLowerCase()))
          );
          if (matchedPack) {
            if (request.docType === 'quotation_main') {
              subject = language === 'hindi'
                ? matchedPack.phrases.quotationMain?.hindi || matchedPack.phrases.quotation.purchaseLine
                : matchedPack.phrases.quotationMain?.english || matchedPack.phrases.quotation.purchaseLine;
            } else if (request.docType === 'quotation_alt_1') {
              subject = language === 'hindi'
                ? matchedPack.phrases.quotationAltHindi?.subject || matchedPack.phrases.quotation.purchaseLine
                : matchedPack.phrases.quotationAltEnglish?.subject || matchedPack.phrases.quotation.purchaseLine;
            } else if (request.docType === 'quotation_alt_2') {
              subject = language === 'hindi'
                ? matchedPack.phrases.quotationAltHindi?.subject || matchedPack.phrases.quotation.purchaseLine
                : matchedPack.phrases.quotationAltEnglish?.subject || matchedPack.phrases.quotation.purchaseLine;
            }
          }
        }
        if (!subject) {
          subject = language === 'hindi' ? 'आवश्यक सामग्री के दर प्रस्तुत करने' : 'Submission of rates for items';
        }

        // Resolve item names based on document type (main, alt1, alt2)
        const quotationItems = await Promise.all(
          adjustedItems.map(async (item) => {
            const rawName = item.productName.trim();
            const mappings = await dataService.itemHindiMappings.list();
            const matchedMapping = mappings.find(m =>
              m.hindiName.trim() === rawName || m.englishName.toLowerCase().trim() === rawName.toLowerCase()
            );

            let productName = rawName;
            if (matchedMapping) {
              if (language === 'hindi') {
                if (request.docType === 'quotation_main' || request.docType === 'supply_aadesh') {
                  productName = matchedMapping.hindiName;
                } else if (request.docType === 'quotation_alt_1') {
                  productName = matchedMapping.altHindiName || matchedMapping.hindiName;
                } else if (request.docType === 'quotation_alt_2') {
                  productName = matchedMapping.altHindiName2 || matchedMapping.altHindiName || matchedMapping.hindiName;
                }
              } else {
                if (request.docType === 'quotation_main' || request.docType === 'supply_aadesh') {
                  productName = matchedMapping.englishName;
                } else if (request.docType === 'quotation_alt_1') {
                  productName = matchedMapping.altEnglishName1 || matchedMapping.englishName;
                } else if (request.docType === 'quotation_alt_2') {
                  productName = matchedMapping.altEnglishName2 || matchedMapping.altEnglishName1 || matchedMapping.englishName;
                }
              }
            }

            return {
              productName,
              rate: item.rate,
              unit: item.unit,
            };
          })
        );

        const targetFirm = request.targetFirm || request.mainFirm;
        const customTemplateId = request.customTemplateId || targetFirm.customQuotationTemplateId;

        if (customTemplateId) {
          const customTpl = await dataService.customTemplates.get(customTemplateId);
          if (customTpl) {
            // Resolve item names based on custom template's docType and language
            const customQuotationItems = await Promise.all(
              adjustedItems.map(async (item) => {
                const rawName = item.productName.trim();
                const mappings = await dataService.itemHindiMappings.list();
                const matchedMapping = mappings.find(m =>
                  m.hindiName.trim() === rawName || m.englishName.toLowerCase().trim() === rawName.toLowerCase()
                );

                let productName = rawName;
                let description = item.description || '';

                if (matchedMapping) {
                  if (customTpl.language === 'hindi') {
                    if (request.docType === 'quotation_alt_1') {
                      productName = matchedMapping.altHindiName || matchedMapping.hindiName;
                    } else if (request.docType === 'quotation_alt_2') {
                      productName = matchedMapping.altHindiName2 || matchedMapping.altHindiName || matchedMapping.hindiName;
                    } else {
                      productName = matchedMapping.hindiName;
                    }
                    description = matchedMapping.hindiDescription || item.description || '';
                  } else {
                    if (request.docType === 'quotation_alt_1') {
                      productName = matchedMapping.altEnglishName1 || matchedMapping.englishName;
                    } else if (request.docType === 'quotation_alt_2') {
                      productName = matchedMapping.altEnglishName2 || matchedMapping.altEnglishName1 || matchedMapping.englishName;
                    } else {
                      productName = matchedMapping.englishName;
                    }
                    description = matchedMapping.englishDescription || item.description || '';
                  }
                }

                return {
                  productName,
                  description,
                  quantity: item.quantity,
                  rate: item.rate,
                  unit: item.unit,
                };
              })
            );

            const escapeHTML = (str: string) =>
              str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');

            const itemsListHTML = customQuotationItems.map((item, idx) => {
              const rateText = customTpl.language === 'hindi'
                ? `Rs. ${item.rate.toLocaleString('en-IN')} प्रति ${toHindiUnit(item.unit)}`
                : `Rs. ${item.rate.toLocaleString('en-IN')} per ${item.unit || 'Nos'}`;
              
              const specLabel = customTpl.language === 'hindi' ? 'स्पेसिफिकेशन:-' : 'Specification:';
              const specHTML = item.description 
                ? `<div style="font-size: 15px; color: #334155; margin-top: 4px; line-height: 1.5; font-weight: normal; max-width: 70%; text-align: left;">
                     <strong style="color: #0f172a; text-decoration: underline;">${specLabel}</strong> ${escapeHTML(item.description)}
                   </div>`
                : '';

              return `
                <div style="margin-bottom: 24px; font-family: sans-serif;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="font-size: 16px; font-weight: bold; color: #0f172a; flex: 1; text-align: left;">
                      ${idx + 1}. ${escapeHTML(item.productName)}
                    </div>
                    <div style="text-align: right; min-width: 220px; font-weight: bold; font-size: 16px; color: #0f172a; margin-left: 20px;">
                      ${escapeHTML(rateText)}
                    </div>
                  </div>
                  ${specHTML}
                </div>
              `;
            }).join('');

            const itemRowsHTML = customQuotationItems.map((item, idx) => {
              const quantity = item.quantity || 1;
              const unit = item.unit
                ? (customTpl.language === 'hindi' ? toHindiUnit(item.unit) : item.unit)
                : (customTpl.language === 'hindi' ? 'नग' : 'piece');
              const descriptionHTML = item.description
                ? `<div style="margin-top: 4px; font-weight: normal; line-height: 1.55;">Specification: - ${escapeHTML(item.description)}</div>`
                : '';

              return `
                <tr>
                  <td style="border: 1px solid #111; padding: 4px 8px; text-align: center; vertical-align: top; width: 70px; font-weight: bold;">${idx + 1}.</td>
                  <td style="border: 1px solid #111; padding: 4px 8px; vertical-align: top;">
                    <div style="font-weight: bold;">${escapeHTML(item.productName)}</div>
                    ${descriptionHTML}
                  </td>
                  <td style="border: 1px solid #111; padding: 4px 8px; text-align: left; vertical-align: middle; width: 105px;">${quantity} ${escapeHTML(unit)}</td>
                  <td style="border: 1px solid #111; padding: 4px 8px; text-align: left; vertical-align: middle; width: 150px;">Rs. ${item.rate.toLocaleString('en-IN')}</td>
                </tr>
              `;
            }).join('');

            let resolvedFirmName = targetFirm.name;
            if (customTpl.language === 'hindi' && targetFirm.vendorHindiName) {
              resolvedFirmName = targetFirm.vendorHindiName;
            }

            const compiledContent = customTpl.content
              .replace(/\{\{tenderNumber\}\}/g, escapeHTML(request.tender.tenderNumber || ''))
              .replace(/\{\{placeName\}\}/g, escapeHTML(placeName))
              .replace(/\{\{districtName\}\}/g, escapeHTML(districtName))
              .replace(/\{\{subject\}\}/g, escapeHTML(subject))
              .replace(/\{\{firmName\}\}/g, escapeHTML(resolvedFirmName))
              .replace(/\{\{itemRows\}\}/g, itemRowsHTML)
              .replace(/\{\{items\}\}/g, itemsListHTML);

            const activeFont = customTpl.fontFamily || 'Noto Sans Devanagari';
            const html = `
              <div class="custom-template-wrapper" style="width: 100%;">
                <style>
                  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;700&family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&display=swap');
                  
                  .custom-template-wrapper,
                  .custom-template-wrapper *,
                  .quotation-body,
                  .quotation-body * {
                    font-family: '${activeFont}', sans-serif !important;
                  }
                </style>
                ${compiledContent}
              </div>
            `;

            return { pages: [html], fallbackUsed: false };
          }
        }

        const html = await governmentTemplates.generateQuotation({
          tenderNumber: request.tender.tenderNumber,
          placeName,
          districtName,
          items: quotationItems,
          subject,
          firmName: targetFirm.name,
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
  
  // Use real AI if configured, otherwise use mock/simulated
  let aiHTML = '';
  let aiUsed = false;
  
  if (!request.forceTemplateFallback && AI_PROVIDER !== 'mock') {
    try {
      const promptStack = buildPromptStack(firm, request.docType);
      const aiResponse = await generateAIDraft(
        { provider: AI_PROVIDER, apiKey: AI_API_KEY, model: AI_MODEL },
        {
          systemPrompt: GLOBAL_SYSTEM_PROMPT,
          userPrompt: promptStack,
          temperature: 0.7,
          maxTokens: 4000,
        }
      );
      aiHTML = aiResponse.content;
      aiUsed = true;
      console.log(`AI Provider: ${aiResponse.provider}, Model: ${aiResponse.model}`);
    } catch (error) {
      console.error('AI generation failed, using fallback:', error);
      aiUsed = false;
    }
  }
  
  // If AI failed or is disabled, use simulated draft
  if (!aiUsed || aiFormatter.isAIResponseInvalid(aiHTML)) {
    fallbackUsed = true;
    aiHTML = simulateAIDraftHTML(request, language, primaryTable, totals);
    console.log('Using fallback template');
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

  const { pages, fallbackUsed } = await buildContentPages(request, language, adjustedItems, totals, departmentName, firm);
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
