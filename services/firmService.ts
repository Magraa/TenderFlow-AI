import { Firm } from '@/types';
import { dataService } from './dataService';
import { layoutEngine } from './layoutEngine';

export interface LetterheadRenderOptions {
  showLetterheadBackground?: boolean;
  showSafeMarginGuide?: boolean;
  includeSignature?: boolean;
  includeStamp?: boolean;
  showPageBoundaryGuide?: boolean;
  showPrintBleedMargin?: boolean;
}

export interface LetterheadRenderResponse {
  html: string;
  dimensions: {
    widthMm: number;
    heightMm: number;
    headerSpacingPx: number;
    footerSpacingPx: number;
    pageMarginPx: number;
  };
}

const DEFAULT_FIRM_VALUES: Pick<
  Firm,
  | 'fitLetterheadMode'
  | 'headerSpacing'
  | 'footerSpacing'
  | 'pageMargin'
  | 'signatureOffsetX'
  | 'signatureOffsetY'
  | 'signatureScale'
  | 'signatureRotateDeg'
  | 'stampOffsetX'
  | 'stampOffsetY'
  | 'stampScale'
  | 'stampMode'
  | 'aiPromptQuotation'
  | 'aiPromptBill'
  | 'firmStyleProfile'
> = {
  fitLetterheadMode: 'contain',
  headerSpacing: 170,
  footerSpacing: 120,
  pageMargin: 40,
  signatureOffsetX: 16,
  signatureOffsetY: 16,
  signatureScale: 1,
  signatureRotateDeg: 0,
  stampOffsetX: 140,
  stampOffsetY: 16,
  stampScale: 1,
  stampMode: 'image',
  aiPromptQuotation: '',
  aiPromptBill: '',
  firmStyleProfile: 'govt_formal',
};

function applyFirmDefaults(data: Omit<Firm, 'id' | 'createdAt' | 'updatedAt'>): Omit<Firm, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    ...DEFAULT_FIRM_VALUES,
    ...data,
    headerSpacing: Math.max(0, data.headerSpacing),
    footerSpacing: Math.max(0, data.footerSpacing),
    pageMargin: Math.max(0, data.pageMargin),
  };
}

async function getFirm(id: string): Promise<Firm | null> {
  return (await dataService.firms.get(id)) || null;
}

async function listFirms(): Promise<Firm[]> {
  return dataService.firms.list();
}

async function createFirm(data: Omit<Firm, 'id' | 'createdAt' | 'updatedAt'>): Promise<Firm> {
  return dataService.firms.create(applyFirmDefaults(data));
}

async function updateFirm(id: string, data: Partial<Firm>): Promise<Firm | null> {
  return (await dataService.firms.update(id, data)) || null;
}

async function deleteFirm(id: string): Promise<boolean> {
  const tenders = await dataService.tenders.list();
  const linkedTenders = tenders.filter(
    (tender) => tender.mainFirmId === id || (tender.alternateFirms || []).includes(id)
  );
  if (linkedTenders.length > 0) {
    throw new Error(`Cannot delete firm because ${linkedTenders.length} tender(s) are using it.`);
  }
  return dataService.firms.delete(id);
}

function validateFirmComplete(firm: Partial<Firm>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!firm.name?.trim()) errors.push('Firm name is required.');
  if (!firm.headerImagePath?.trim()) errors.push('Letterhead image is required.');
  if ((firm.headerSpacing ?? 0) < 0) errors.push('Header spacing must be zero or greater.');
  if ((firm.footerSpacing ?? 0) < 0) errors.push('Footer spacing must be zero or greater.');
  if ((firm.pageMargin ?? 0) < 0) errors.push('Page margins must be zero or greater.');
  return { valid: errors.length === 0, errors };
}

async function duplicateFirm(sourceFirmId: string, newName: string): Promise<Firm> {
  const source = await getFirm(sourceFirmId);
  if (!source) throw new Error('Source firm not found.');
  const { id, createdAt, updatedAt, ...clone } = source;
  return createFirm({ ...clone, name: newName });
}

async function duplicateFirmStyle(sourceFirmId: string, targetFirmId: string): Promise<Firm | null> {
  const source = await getFirm(sourceFirmId);
  const target = await getFirm(targetFirmId);
  if (!source || !target) return null;
  return updateFirm(targetFirmId, {
    fitLetterheadMode: source.fitLetterheadMode,
    headerSpacing: source.headerSpacing,
    footerSpacing: source.footerSpacing,
    pageMargin: source.pageMargin,
    signatureOffsetX: source.signatureOffsetX,
    signatureOffsetY: source.signatureOffsetY,
    signatureScale: source.signatureScale,
    signatureRotateDeg: source.signatureRotateDeg,
    stampOffsetX: source.stampOffsetX,
    stampOffsetY: source.stampOffsetY,
    stampScale: source.stampScale,
    stampMode: source.stampMode,
    aiPromptQuotation: source.aiPromptQuotation,
    aiPromptBill: source.aiPromptBill,
    firmStyleProfile: source.firmStyleProfile,
  });
}

async function getFirmDefaultLanguage(firmId: string): Promise<'hindi' | 'english'> {
  return (await getFirm(firmId))?.defaultLanguage || 'english';
}

function renderLetterheadPreview(
  firm: Firm,
  options: LetterheadRenderOptions = {}
): LetterheadRenderResponse {
  const sampleItemsTable = layoutEngine.generateItemsTablePages(
    [
      {
        id: 'preview-item',
        tenderId: 'preview',
        productName: 'Sample Product',
        description: 'Quality controlled sample item',
        quantity: 10,
        rate: 250,
        gstPercent: 18,
        totalAmount: 2500,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    'english'
  )[0]?.html;

  const content = `
    <div class="doc-body">
      <h2>Sample Quotation</h2>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
      ${sampleItemsTable || ''}
      <p><strong>Prepared For Alignment Check</strong></p>
    </div>
  `;

  const layout = layoutEngine.applyLetterheadLayout(content, firm, {
    showLetterheadBackground: options.showLetterheadBackground !== false,
    showSafeMarginGuide: options.showSafeMarginGuide === true,
    includeSignature: options.includeSignature === true,
    includeStamp: options.includeStamp === true,
    showPageBoundaryGuide: options.showPageBoundaryGuide === true,
    showPrintBleedMargin: options.showPrintBleedMargin === true,
    lockHeaderPosition: true,
  });

  return {
    html: layoutEngine.wrapInA4Page(layout, `${firm.name} Preview`),
    dimensions: {
      widthMm: 210,
      heightMm: 297,
      headerSpacingPx: firm.headerSpacing,
      footerSpacingPx: firm.footerSpacing,
      pageMarginPx: firm.pageMargin,
    },
  };
}

export const firmService = {
  getFirm,
  listFirms,
  createFirm,
  updateFirm,
  deleteFirm,
  validateFirmComplete,
  duplicateFirm,
  duplicateFirmStyle,
  getFirmDefaultLanguage,
  renderLetterheadPreview,
};
