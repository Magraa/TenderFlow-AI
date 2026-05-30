import { DepartmentProfile, DocumentVersion, Firm, Settings, Tender, TenderDocument } from '@/types';

export interface Database {
  tenders: Tender[];
  firms: Firm[];
  documents: TenderDocument[];
  settings: Settings[];
  departmentProfiles: DepartmentProfile[];
  documentVersions: DocumentVersion[];
}

export const defaultDatabase: Database = {
  tenders: [],
  firms: [],
  documents: [],
  settings: [],
  departmentProfiles: [],
  documentVersions: [],
};

export const defaultSettings: Settings = {
  id: 'default-settings',
  organizationName: 'Government Department',
  departmentAddress: '123 Government Road, City, State 12345',
  contactPerson: 'Department Head',
  email: 'contact@govt.in',
  phone: '+91-XXXXXXXXXX',
  defaultLanguage: 'english',
  headerSafeZonePx: 120,
  tenderNumberPrefix: 'TEND',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const sampleFirms: Firm[] = [
  {
    id: 'firm-1',
    name: 'ABC Supplies Ltd.',
    headerImagePath: '/letterheads/abc-letterhead.jpg',
    signatureImagePath: '/signatures/abc-signature.png',
    stampImagePath: '/stamps/abc-stamp.png',
    defaultLanguage: 'english',
    fitLetterheadMode: 'contain',
    headerSpacing: 170,
    footerSpacing: 120,
    pageMargin: 40,
    // Legacy fields (kept for older exports/imports).
    contentStartY: 170,
    pagePaddingLeft: 40,
    signatureOffsetX: 16,
    signatureOffsetY: 16,
    signatureScale: 1,
    signatureRotateDeg: 0,
    stampOffsetX: 140,
    stampOffsetY: 16,
    stampScale: 1,
    stampMode: 'image',
    aiPromptQuotation: 'Write concise government procurement quotation in formal English.',
    aiPromptBill: '',
    firmStyleProfile: 'govt_formal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const sampleDepartmentProfile: DepartmentProfile = {
  id: 'dept-1',
  name: 'Municipal Corporation',
  address: '123 Government Road',
  city: 'New Delhi',
  state: 'Delhi',
  pincode: '110001',
  contactPerson: 'Department Head',
  email: 'municipal-corporation@govt.in',
  phone: '+91-11-XXXXX',
  headerStyle: 'govt',
  defaultLanguage: 'english',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
