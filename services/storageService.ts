import {
  DepartmentProfile,
  DocumentVersion,
  Firm,
  FirmStyleProfile,
  GSTRate,
  LetterheadFitMode,
  Settings,
  Tender,
  TenderDocType,
  TenderDocument,
  TenderItem,
} from '@/types';
import {
  Database,
  defaultDatabase,
  defaultSettings,
  sampleDepartmentProfile,
  sampleFirms,
} from '@/data/schema';
import { v4 as uuid } from 'uuid';

const DB_KEY = 'tender-automation-db';
const GST_SLABS: GSTRate[] = [0, 5, 9, 12, 18];
const DOC_TYPES: TenderDocType[] = [
  'vigyapti',
  'quotation_main',
  'quotation_alt_1',
  'quotation_alt_2',
  'supply_aadesh',
  'firm_bill',
];
const FIRM_STYLE_PROFILES: FirmStyleProfile[] = [
  'govt_formal',
  'minimal_business',
  'bilingual',
  'table_heavy',
];
const LETTERHEAD_FIT_MODES: LetterheadFitMode[] = ['contain', 'cover', 'stretch'];

function nowIso(): string {
  return new Date().toISOString();
}

function toSafeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toSafeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toSafeBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function toSafeStampMode(value: unknown): 'image' | 'generic' {
  return value === 'generic' ? 'generic' : 'image';
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function toSafeLanguage(value: unknown): 'hindi' | 'english' {
  return value === 'hindi' ? 'hindi' : 'english';
}

function toSafeGST(value: unknown): GSTRate {
  const numeric = toSafeNumber(value, 18) as GSTRate;
  return GST_SLABS.includes(numeric) ? numeric : 18;
}

function toSafeDocType(value: unknown): TenderDocType {
  return DOC_TYPES.includes(value as TenderDocType) ? (value as TenderDocType) : 'quotation_main';
}

function toSafeFirmStyle(value: unknown): FirmStyleProfile {
  return FIRM_STYLE_PROFILES.includes(value as FirmStyleProfile)
    ? (value as FirmStyleProfile)
    : 'govt_formal';
}

function toSafeFitMode(value: unknown): LetterheadFitMode {
  return LETTERHEAD_FIT_MODES.includes(value as LetterheadFitMode)
    ? (value as LetterheadFitMode)
    : 'contain';
}

function normalizeTenderItem(item: Partial<TenderItem>, tenderId: string): TenderItem {
  const quantity = Math.max(0, toSafeNumber(item.quantity, 1));
  const rate = Math.max(0, toSafeNumber(item.rate, 0));
  return {
    id: toSafeString(item.id, uuid()),
    tenderId,
    productName: toSafeString(item.productName || item.description, 'Untitled Item'),
    description: toSafeString(item.description, ''),
    quantity,
    rate,
    gstPercent: toSafeGST(item.gstPercent),
    totalAmount: Math.round(quantity * rate * 100) / 100,
    createdAt: toSafeString(item.createdAt, nowIso()),
    updatedAt: toSafeString(item.updatedAt, nowIso()),
  };
}

function normalizeFirm(
  firm: Partial<Firm> & {
    marginTopPx?: number;
    marginLeftPx?: number;
    letterStartMarginTop?: number;
    letterStartMarginLeft?: number;
    headerSpacing?: number;
    footerSpacing?: number;
    pageMargin?: number;
    contentStartY?: number;
    pagePaddingLeft?: number;
    signatureOffsetX?: number;
    signatureOffsetY?: number;
    signatureScale?: number;
    signatureRotateDeg?: number;
    stampOffsetX?: number;
    stampOffsetY?: number;
    stampScale?: number;
    stampMode?: unknown;
    fitLetterheadMode?: string;
    firmStyleProfile?: string;
  }
): Firm {
  // Migration path:
  // 1) Prefer new simplified fields when present.
  // 2) Fallback to old contentStartY/pagePaddingLeft (and older aliases) when missing.
  const legacyContentStartY = Math.max(
    0,
    toSafeNumber(firm.contentStartY ?? firm.letterStartMarginTop ?? firm.marginTopPx, 170)
  );
  const legacyPaddingLeft = Math.max(
    0,
    toSafeNumber(firm.pagePaddingLeft ?? firm.letterStartMarginLeft ?? firm.marginLeftPx, 40)
  );

  const headerSpacing = clampNumber(toSafeNumber(firm.headerSpacing, legacyContentStartY), 80, 300);
  const footerSpacing = clampNumber(toSafeNumber(firm.footerSpacing, 120), 40, 220);
  const pageMargin = clampNumber(toSafeNumber(firm.pageMargin, legacyPaddingLeft), 20, 100);

  const signatureOffsetX = clampNumber(toSafeNumber(firm.signatureOffsetX, 16), 0, 240);
  const signatureOffsetY = clampNumber(toSafeNumber(firm.signatureOffsetY, 16), 0, 240);
  const signatureScale = clampNumber(toSafeNumber(firm.signatureScale, 1), 0.4, 2.2);
  const signatureRotateDeg = clampNumber(toSafeNumber(firm.signatureRotateDeg, 0), -45, 45);
  const stampOffsetX = clampNumber(toSafeNumber(firm.stampOffsetX, 140), 0, 320);
  const stampOffsetY = clampNumber(toSafeNumber(firm.stampOffsetY, 16), 0, 240);
  const stampScale = clampNumber(toSafeNumber(firm.stampScale, 1), 0.4, 2.2);
  const stampMode = toSafeStampMode(firm.stampMode);

  return {
    id: toSafeString(firm.id, uuid()),
    name: toSafeString(firm.name, 'Untitled Firm'),
    headerImagePath: toSafeString(firm.headerImagePath, ''),
    signatureImagePath: toSafeString(firm.signatureImagePath, ''),
    stampImagePath: toSafeString(firm.stampImagePath, ''),
    defaultLanguage: toSafeLanguage(firm.defaultLanguage),
    fitLetterheadMode: toSafeFitMode(firm.fitLetterheadMode),
    headerSpacing,
    footerSpacing,
    pageMargin,
    // Keep legacy fields populated so older exports or modules that still read them won't break.
    contentStartY: legacyContentStartY,
    pagePaddingLeft: legacyPaddingLeft,
    signatureOffsetX,
    signatureOffsetY,
    signatureScale,
    signatureRotateDeg,
    stampOffsetX,
    stampOffsetY,
    stampScale,
    stampMode,
    aiPromptQuotation: toSafeString(firm.aiPromptQuotation, ''),
    aiPromptBill: toSafeString(firm.aiPromptBill, ''),
    firmStyleProfile: toSafeFirmStyle(firm.firmStyleProfile),
    createdAt: toSafeString(firm.createdAt, nowIso()),
    updatedAt: toSafeString(firm.updatedAt, nowIso()),
  };
}

function normalizeTender(raw: Partial<Tender> & { status?: string }): Tender {
  const id = toSafeString(raw.id, uuid());
  const status = raw.status === 'draft' ? 'draft' : 'final';
  const items = Array.isArray(raw.items) ? raw.items : [];

  return {
    id,
    title: toSafeString(raw.title, 'Untitled Tender'),
    tenderNumber: toSafeString(raw.tenderNumber, `TEND-${Date.now()}`),
    departmentProfileId: toSafeString(raw.departmentProfileId, 'dept-1'),
    mainFirmId: toSafeString(raw.mainFirmId, ''),
    alternateFirms: Array.isArray(raw.alternateFirms)
      ? raw.alternateFirms.filter((value): value is string => typeof value === 'string').slice(0, 2)
      : [],
    items: items.map((item) => normalizeTenderItem((item as Partial<TenderItem>) || {}, id)),
    language: toSafeLanguage(raw.language),
    status,
    description: toSafeString(raw.description, ''),
    notes: toSafeString(raw.notes, ''),
    version: Math.max(1, toSafeNumber(raw.version, 1)),
    parentTenderId: toSafeString(raw.parentTenderId, ''),
    createdAt: toSafeString(raw.createdAt, nowIso()),
    updatedAt: toSafeString(raw.updatedAt, nowIso()),
  };
}

function normalizeDocument(
  raw: Partial<TenderDocument> & { includeLogo?: boolean; showSafeMarginGuide?: boolean; lockHeaderPosition?: boolean },
  tenderIdFallback = ''
): TenderDocument {
  return {
    id: toSafeString(raw.id, uuid()),
    tenderId: toSafeString(raw.tenderId, tenderIdFallback),
    docType: toSafeDocType(raw.docType),
    contentHTML: toSafeString(raw.contentHTML, ''),
    pdfPath: toSafeString(raw.pdfPath, ''),
    lastModified: toSafeString(raw.lastModified, ''),
    currentVersion: Math.max(1, toSafeNumber(raw.currentVersion, 1)),
    versions: Array.isArray(raw.versions) ? raw.versions : [],
    showLetterheadBackground: toSafeBoolean(raw.showLetterheadBackground ?? raw.includeLogo, true),
    showSafeMarginGuide: toSafeBoolean(raw.showSafeMarginGuide, false),
    lockHeaderPosition: toSafeBoolean(raw.lockHeaderPosition, true),
    includeSignature: toSafeBoolean(raw.includeSignature, false),
    includeStamp: toSafeBoolean(raw.includeStamp, false),
    footerNotes: toSafeString(raw.footerNotes, ''),
    overflowWarning: toSafeString(raw.overflowWarning, ''),
    createdAt: toSafeString(raw.createdAt, nowIso()),
    updatedAt: toSafeString(raw.updatedAt, nowIso()),
  };
}

function normalizeSettings(raw: Partial<Settings> | undefined): Settings {
  if (!raw) return { ...defaultSettings };
  return {
    ...defaultSettings,
    ...raw,
    defaultLanguage: toSafeLanguage(raw.defaultLanguage),
    createdAt: toSafeString(raw.createdAt, defaultSettings.createdAt),
    updatedAt: toSafeString(raw.updatedAt, nowIso()),
  };
}

function normalizeDatabase(raw: unknown): Database {
  const parsed = (raw || {}) as Partial<Database>;
  const tenders = Array.isArray(parsed.tenders)
    ? parsed.tenders.map((tender) => normalizeTender(tender as Tender))
    : [];
  const firms = Array.isArray(parsed.firms)
    ? parsed.firms.map((firm) =>
        normalizeFirm(
          firm as Partial<Firm> & {
            marginTopPx?: number;
            marginLeftPx?: number;
            letterStartMarginTop?: number;
            letterStartMarginLeft?: number;
            contentStartY?: number;
            pagePaddingLeft?: number;
            fitLetterheadMode?: string;
            firmStyleProfile?: string;
          }
        )
      )
    : [];
  const documents = Array.isArray(parsed.documents)
    ? parsed.documents.map((document) => normalizeDocument(document as TenderDocument))
    : [];

  return {
    tenders,
    firms: firms.length > 0 ? firms : [...sampleFirms],
    documents,
    settings: [normalizeSettings(Array.isArray(parsed.settings) ? parsed.settings[0] : undefined)],
    departmentProfiles:
      Array.isArray(parsed.departmentProfiles) && parsed.departmentProfiles.length > 0
        ? parsed.departmentProfiles
        : [sampleDepartmentProfile],
    documentVersions: Array.isArray(parsed.documentVersions) ? parsed.documentVersions : [],
  };
}

class LocalStorageDB {
  private db: Database;

  constructor() {
    this.db = this.loadDatabase();
  }

  private loadDatabase(): Database {
    if (typeof window === 'undefined') {
      return { ...defaultDatabase };
    }

    try {
      const stored = localStorage.getItem(DB_KEY);
      if (!stored) {
        const initial: Database = {
          ...defaultDatabase,
          settings: [{ ...defaultSettings }],
          firms: [...sampleFirms],
          departmentProfiles: [sampleDepartmentProfile],
        };
        this.saveToStorage(initial);
        return initial;
      }
      const normalized = normalizeDatabase(JSON.parse(stored));
      this.saveToStorage(normalized);
      return normalized;
    } catch {
      const fallback: Database = {
        ...defaultDatabase,
        settings: [{ ...defaultSettings }],
        firms: [...sampleFirms],
        departmentProfiles: [sampleDepartmentProfile],
      };
      this.saveToStorage(fallback);
      return fallback;
    }
  }

  private saveToStorage(db: Database): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    this.db = db;
  }

  getDatabase(): Database {
    return this.db;
  }

  createTender(data: Omit<Tender, 'id' | 'createdAt' | 'updatedAt'>): Tender {
    const tenderId = uuid();
    const createdAt = nowIso();
    const tender: Tender = {
      ...data,
      id: tenderId,
      items: (data.items || []).map((item) => normalizeTenderItem(item, tenderId)),
      status: data.status === 'draft' ? 'draft' : 'final',
      createdAt,
      updatedAt: createdAt,
    };
    this.db.tenders.push(tender);
    this.saveToStorage(this.db);
    return tender;
  }

  getTender(id: string): Tender | undefined {
    return this.db.tenders.find((tender) => tender.id === id);
  }

  listTenders(): Tender[] {
    return [...this.db.tenders].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  }

  updateTender(id: string, data: Partial<Omit<Tender, 'id' | 'createdAt'>>): Tender | undefined {
    const index = this.db.tenders.findIndex((tender) => tender.id === id);
    if (index === -1) return undefined;

    const current = this.db.tenders[index];
    const items = Array.isArray(data.items)
      ? data.items.map((item) => normalizeTenderItem(item, id))
      : current.items;

    const updated: Tender = {
      ...current,
      ...data,
      items,
      status: data.status ? (data.status === 'draft' ? 'draft' : 'final') : current.status,
      updatedAt: nowIso(),
    };

    this.db.tenders[index] = updated;
    this.saveToStorage(this.db);
    return updated;
  }

  deleteTender(id: string): boolean {
    const index = this.db.tenders.findIndex((tender) => tender.id === id);
    if (index === -1) return false;

    this.db.tenders.splice(index, 1);
    this.db.documents = this.db.documents.filter((document) => document.tenderId !== id);
    this.saveToStorage(this.db);
    return true;
  }

  createFirm(data: Omit<Firm, 'id' | 'createdAt' | 'updatedAt'>): Firm {
    const createdAt = nowIso();
    const firm: Firm = {
      ...normalizeFirm(data),
      id: uuid(),
      createdAt,
      updatedAt: createdAt,
    };
    this.db.firms.push(firm);
    this.saveToStorage(this.db);
    return firm;
  }

  getFirm(id: string): Firm | undefined {
    return this.db.firms.find((firm) => firm.id === id);
  }

  listFirms(): Firm[] {
    return [...this.db.firms];
  }

  updateFirm(id: string, data: Partial<Omit<Firm, 'id' | 'createdAt'>>): Firm | undefined {
    const index = this.db.firms.findIndex((firm) => firm.id === id);
    if (index === -1) return undefined;

    const updated = normalizeFirm({
      ...this.db.firms[index],
      ...data,
      id,
      updatedAt: nowIso(),
    });
    this.db.firms[index] = updated;
    this.saveToStorage(this.db);
    return updated;
  }

  deleteFirm(id: string): boolean {
    const index = this.db.firms.findIndex((firm) => firm.id === id);
    if (index === -1) return false;
    this.db.firms.splice(index, 1);
    this.saveToStorage(this.db);
    return true;
  }

  createDocument(data: Omit<TenderDocument, 'id' | 'createdAt' | 'updatedAt'>): TenderDocument {
    const createdAt = nowIso();
    const document: TenderDocument = {
      ...normalizeDocument(data),
      id: uuid(),
      createdAt,
      updatedAt: createdAt,
    };
    this.db.documents.push(document);
    this.saveToStorage(this.db);
    return document;
  }

  getDocument(id: string): TenderDocument | undefined {
    return this.db.documents.find((document) => document.id === id);
  }

  listDocumentsByTender(tenderId: string): TenderDocument[] {
    return this.db.documents.filter((document) => document.tenderId === tenderId);
  }

  updateDocument(id: string, data: Partial<Omit<TenderDocument, 'id' | 'createdAt'>>): TenderDocument | undefined {
    const index = this.db.documents.findIndex((document) => document.id === id);
    if (index === -1) return undefined;
    const updated = normalizeDocument({
      ...this.db.documents[index],
      ...data,
      id,
      updatedAt: nowIso(),
    });
    this.db.documents[index] = updated;
    this.saveToStorage(this.db);
    return updated;
  }

  deleteDocument(id: string): boolean {
    const index = this.db.documents.findIndex((document) => document.id === id);
    if (index === -1) return false;
    this.db.documents.splice(index, 1);
    this.saveToStorage(this.db);
    return true;
  }

  getSettings(): Settings {
    return this.db.settings[0] || defaultSettings;
  }

  updateSettings(data: Partial<Omit<Settings, 'id' | 'createdAt'>>): Settings {
    const current = this.db.settings[0] || defaultSettings;
    const updated: Settings = {
      ...current,
      ...data,
      updatedAt: nowIso(),
    };
    this.db.settings[0] = updated;
    this.saveToStorage(this.db);
    return updated;
  }

  createDepartmentProfile(data: Omit<DepartmentProfile, 'id' | 'createdAt' | 'updatedAt'>): DepartmentProfile {
    const createdAt = nowIso();
    const profile: DepartmentProfile = {
      ...data,
      id: uuid(),
      createdAt,
      updatedAt: createdAt,
    };
    this.db.departmentProfiles.push(profile);
    this.saveToStorage(this.db);
    return profile;
  }

  getDepartmentProfile(id: string): DepartmentProfile | undefined {
    return this.db.departmentProfiles.find((profile) => profile.id === id);
  }

  listDepartmentProfiles(): DepartmentProfile[] {
    return [...this.db.departmentProfiles].sort((left, right) => left.name.localeCompare(right.name));
  }

  updateDepartmentProfile(
    id: string,
    data: Partial<Omit<DepartmentProfile, 'id' | 'createdAt'>>
  ): DepartmentProfile | undefined {
    const index = this.db.departmentProfiles.findIndex((profile) => profile.id === id);
    if (index === -1) return undefined;

    const updated: DepartmentProfile = {
      ...this.db.departmentProfiles[index],
      ...data,
      updatedAt: nowIso(),
    };
    this.db.departmentProfiles[index] = updated;
    this.saveToStorage(this.db);
    return updated;
  }

  deleteDepartmentProfile(id: string): boolean {
    const index = this.db.departmentProfiles.findIndex((profile) => profile.id === id);
    if (index === -1) return false;
    this.db.departmentProfiles.splice(index, 1);
    this.saveToStorage(this.db);
    return true;
  }

  createTenderItem(data: Omit<TenderItem, 'id' | 'createdAt' | 'updatedAt'>): TenderItem {
    const tender = this.db.tenders.find((entry) => entry.id === data.tenderId);
    if (!tender) throw new Error('Parent tender not found for item');
    const item = normalizeTenderItem({ ...data, id: uuid(), createdAt: nowIso(), updatedAt: nowIso() }, data.tenderId);
    tender.items.push(item);
    tender.updatedAt = nowIso();
    this.saveToStorage(this.db);
    return item;
  }

  getTenderItem(id: string): TenderItem | undefined {
    for (const tender of this.db.tenders) {
      const item = tender.items.find((entry) => entry.id === id);
      if (item) return item;
    }
    return undefined;
  }

  listTenderItems(tenderId: string): TenderItem[] {
    return this.db.tenders.find((entry) => entry.id === tenderId)?.items || [];
  }

  updateTenderItem(id: string, data: Partial<Omit<TenderItem, 'id' | 'createdAt'>>): TenderItem | undefined {
    for (const tender of this.db.tenders) {
      const index = tender.items.findIndex((item) => item.id === id);
      if (index !== -1) {
        const updated = normalizeTenderItem({ ...tender.items[index], ...data, updatedAt: nowIso() }, tender.id);
        tender.items[index] = updated;
        tender.updatedAt = nowIso();
        this.saveToStorage(this.db);
        return updated;
      }
    }
    return undefined;
  }

  deleteTenderItem(id: string): boolean {
    for (const tender of this.db.tenders) {
      const index = tender.items.findIndex((item) => item.id === id);
      if (index !== -1) {
        tender.items.splice(index, 1);
        tender.updatedAt = nowIso();
        this.saveToStorage(this.db);
        return true;
      }
    }
    return false;
  }

  createDocumentVersion(data: Omit<DocumentVersion, 'id' | 'createdAt' | 'updatedAt'>): DocumentVersion {
    const createdAt = nowIso();
    const version: DocumentVersion = {
      ...data,
      id: uuid(),
      createdAt,
      updatedAt: createdAt,
    };
    this.db.documentVersions.push(version);
    this.saveToStorage(this.db);
    return version;
  }

  getDocumentVersions(documentId: string): DocumentVersion[] {
    return this.db.documentVersions
      .filter((version) => version.documentId === documentId)
      .sort((left, right) => right.versionNumber - left.versionNumber);
  }

  deleteDocumentVersions(documentId: string): boolean {
    const initial = this.db.documentVersions.length;
    this.db.documentVersions = this.db.documentVersions.filter((version) => version.documentId !== documentId);
    if (this.db.documentVersions.length < initial) {
      this.saveToStorage(this.db);
      return true;
    }
    return false;
  }

  exportDatabase(): string {
    return JSON.stringify(this.db, null, 2);
  }

  importDatabase(data: string): boolean {
    try {
      const imported = normalizeDatabase(JSON.parse(data));
      this.saveToStorage(imported);
      return true;
    } catch {
      return false;
    }
  }

  clearDatabase(): void {
    const initial: Database = {
      ...defaultDatabase,
      settings: [{ ...defaultSettings }],
      firms: [...sampleFirms],
      departmentProfiles: [sampleDepartmentProfile],
    };
    this.saveToStorage(initial);
  }
}

export const db = new LocalStorageDB();
