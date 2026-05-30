export type Language = 'hindi' | 'english';
export type GSTRate = 0 | 5 | 9 | 12 | 18;
export type LetterheadFitMode = 'contain' | 'cover' | 'stretch';
export type FirmStyleProfile = 'govt_formal' | 'minimal_business' | 'bilingual' | 'table_heavy';
export type TenderStatus = 'draft' | 'final';
export type TenderDocType =
  | 'vigyapti'
  | 'quotation_main'
  | 'quotation_alt_1'
  | 'quotation_alt_2'
  | 'supply_aadesh'
  | 'firm_bill';

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenderItem extends BaseEntity {
  tenderId: string;
  productName: string;
  description?: string;
  category?: string;
  quantity: number;
  unit?: string;
  rate: number;
  gstPercent: GSTRate;
  estimatedAmount?: number;
  totalAmount: number;
}

export interface DepartmentProfile extends BaseEntity {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactPerson: string;
  email: string;
  phone: string;
  headerStyle: 'standard' | 'govt' | 'custom';
  defaultLanguage: Language;
}

export interface Tender extends BaseEntity {
  title: string;
  tenderNumber: string;
  departmentProfileId: string;
  mainFirmId: string;
  alternateFirms?: string[];
  items: TenderItem[];
  language: Language;
  status: TenderStatus;
  description?: string;
  notes?: string;
  version: number;
  parentTenderId?: string;
  // New fields for government tender workflow
  tenderType?: string;
  placeName?: string;
  districtName?: string;
  publishDate?: string;
  submissionDate?: string;
  openingDate?: string;
  estimatedBudget?: number;
}

export interface Firm extends BaseEntity {
  name: string;
  headerImagePath: string;
  signatureImagePath?: string;
  stampImagePath?: string;
  defaultLanguage: Language;
  fitLetterheadMode: LetterheadFitMode;
  /**
   * New simplified layout controls (used by preview + PDF layout).
   * Values are px.
   */
  headerSpacing: number;
  footerSpacing: number;
  pageMargin: number;

  /**
   * Legacy layout fields kept for backward compatibility with older stored data.
   * Do not expose in UI.
   */
  contentStartY?: number;
  pagePaddingLeft?: number;

  /**
   * Optional positioning controls (px), measured from the bottom-right corner of the page.
   */
  signatureOffsetX?: number;
  signatureOffsetY?: number;
  signatureScale?: number;
  signatureRotateDeg?: number;
  stampOffsetX?: number;
  stampOffsetY?: number;
  stampScale?: number;
  stampMode?: 'image' | 'generic';
  aiPromptQuotation: string;
  aiPromptBill?: string;
  firmStyleProfile: FirmStyleProfile;
  // New fields for firm details
  firmCity?: string;
  firmAddress?: string;
  gstNumber?: string;
  mobileNumber?: string;
  contactPerson?: string;
}

export interface DocumentVersion extends BaseEntity {
  documentId: string;
  versionNumber: number;
  contentHTML: string;
  changeNote?: string;
}

export interface TenderDocument extends BaseEntity {
  tenderId: string;
  docType: TenderDocType;
  contentHTML: string;
  pdfPath?: string;
  lastModified?: string;
  currentVersion: number;
  versions: DocumentVersion[];
  showLetterheadBackground: boolean;
  showSafeMarginGuide: boolean;
  lockHeaderPosition: boolean;
  includeSignature: boolean;
  includeStamp: boolean;
  footerNotes?: string;
  overflowWarning?: string;
}

export interface Settings extends BaseEntity {
  organizationName: string;
  departmentAddress: string;
  contactPerson: string;
  email: string;
  phone: string;
  defaultLanguage: Language;
  headerSafeZonePx: number;
  tenderNumberPrefix: string;
}

export interface PriceVariation {
  type: 'main' | 'alt_1' | 'alt_2';
  multiplier: number;
  finalPrice: number;
}
