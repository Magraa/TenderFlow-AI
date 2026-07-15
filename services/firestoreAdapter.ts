import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  AILocationCache,
  DepartmentProfile,
  DocumentPhraseMapping,
  DocumentVersion,
  Firm,
  HindiMapping,
  LocalBodyType,
  PlaceMapping,
  PurposeMapping,
  Settings,
  Tender,
  TenderDocument,
  TenderItem,
} from '@/types';

import { getFirebaseFirestore } from '@/services/firebase/firebaseClient';
import { normalizeSettingsVersioning } from '@/services/versioningSettings';
import { v4 as uuid } from 'uuid';

type IsoString = string;

function nowIso(): IsoString {
  return new Date().toISOString();
}

/**
 * Remove undefined values from an object to make it Firestore-compatible
 */
function removeUndefinedValues<T extends Record<string, any>>(obj: T): T {
  const result = {} as T;
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key as keyof T] = value;
    }
  }
  return result;
}

type Collections = {
  tenders: Tender;
  firms: Firm;
  documents: TenderDocument;
  departmentProfiles: DepartmentProfile;
  purposeMappings: PurposeMapping;
  itemHindiMappings: HindiMapping;
  vendorHindiMappings: HindiMapping;
  placeMappings: PlaceMapping;
  localBodyTypes: LocalBodyType;
  aiLocationCache: AILocationCache;
  documentPhraseMappings: DocumentPhraseMapping;
};


type CollectionName = keyof Collections;

type FirestoreMeta = {
  createdAt: IsoString;
  updatedAt: IsoString;
};

type WithMeta<T extends { id: string; createdAt: string; updatedAt: string }> = T & FirestoreMeta;

function withTimestamps<T extends { id: string; createdAt: string; updatedAt: string }>(
  entity: T,
  createdAt?: IsoString,
  updatedAt?: IsoString
): WithMeta<T> {
  const created = createdAt || entity.createdAt || nowIso();
  const updated = updatedAt || entity.updatedAt || created;
  return { ...entity, createdAt: created, updatedAt: updated } as WithMeta<T>;
}

function normalizeTenderItemTotals(items: TenderItem[]): TenderItem[] {
  return items.map((item) => ({
    ...item,
    totalAmount: Math.round(item.quantity * item.rate * 100) / 100,
    updatedAt: item.updatedAt || nowIso(),
  }));
}

function collectionPath(name: CollectionName): string {
  // Scope everything under a single app namespace to avoid collisions in shared projects.
  return `tap/${process.env.NEXT_PUBLIC_FIRESTORE_NAMESPACE || 'default'}/${name}`;
}

function settingsDocPath(): string {
  return `tap/${process.env.NEXT_PUBLIC_FIRESTORE_NAMESPACE || 'default'}/settings/default`;
}

function mappingsCollectionPath(type: 'purpose' | 'item' | 'vendor'): string {
  return `tap/${process.env.NEXT_PUBLIC_FIRESTORE_NAMESPACE || 'default'}/${type}HindiMappings`;
}

export class FirestoreDB {
  private firestore = getFirebaseFirestore();

  private col<TName extends CollectionName>(name: TName) {
    return collection(this.firestore, collectionPath(name));
  }

  private docRef<TName extends CollectionName>(name: TName, id: string) {
    return doc(this.firestore, collectionPath(name), id);
  }

  async createEntity<TName extends CollectionName>(
    name: TName,
    data: Omit<Collections[TName], 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Collections[TName]> {
    const createdAt = nowIso();
    const entity = withTimestamps({ ...(data as any), id: uuid(), createdAt, updatedAt: createdAt });

    // Remove undefined values before saving to Firestore
    const cleanData = removeUndefinedValues(entity);

    await setDoc(this.docRef(name, entity.id), {
      ...cleanData,
      _serverUpdatedAt: serverTimestamp(),
      _serverCreatedAt: serverTimestamp(),
    });

    return entity as Collections[TName];
  }

  async getEntity<TName extends CollectionName>(name: TName, id: string): Promise<Collections[TName] | undefined> {
    const snap = await getDoc(this.docRef(name, id));
    if (!snap.exists()) return undefined;
    return snap.data() as Collections[TName];
  }

  async listEntities<TName extends CollectionName>(name: TName): Promise<Collections[TName][]> {
    const q = query(this.col(name), orderBy('updatedAt', 'desc'), limit(500));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Collections[TName]);
  }

  async updateEntity<TName extends CollectionName>(
    name: TName,
    id: string,
    data: Partial<Omit<Collections[TName], 'id' | 'createdAt'>>
  ): Promise<Collections[TName] | undefined> {
    const ref = this.docRef(name, id);
    const existing = await getDoc(ref);
    if (!existing.exists()) return undefined;

    const updatedAt = nowIso();
    const merged = { ...(existing.data() as any), ...(data as any), id, updatedAt };

    // Remove undefined values before updating Firestore
    const cleanData = removeUndefinedValues({ ...(data as any), updatedAt, _serverUpdatedAt: serverTimestamp() });

    await updateDoc(ref, cleanData as any);
    return merged as Collections[TName];
  }

  async deleteEntity<TName extends CollectionName>(name: TName, id: string): Promise<boolean> {
    const ref = this.docRef(name, id);
    const existing = await getDoc(ref);
    if (!existing.exists()) return false;
    await deleteDoc(ref);
    return true;
  }

  // Tenders
  async createTender(data: Omit<Tender, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tender> {
    const normalized: Omit<Tender, 'id' | 'createdAt' | 'updatedAt'> = {
      ...data,
      items: normalizeTenderItemTotals(data.items || []),
      version: Math.max(1, data.version || 1),
      alternateFirms: (data.alternateFirms || []).slice(0, 2),
    };
    return this.createEntity('tenders', normalized);
  }

  getTender(id: string): Promise<Tender | undefined> {
    return this.getEntity('tenders', id);
  }

  listTenders(): Promise<Tender[]> {
    return this.listEntities('tenders');
  }

  updateTender(id: string, data: Partial<Omit<Tender, 'id' | 'createdAt'>>): Promise<Tender | undefined> {
    if (data.items) data.items = normalizeTenderItemTotals(data.items);
    return this.updateEntity('tenders', id, data as any);
  }

  deleteTender(id: string): Promise<boolean> {
    return this.deleteEntity('tenders', id);
  }

  // Firms
  createFirm(data: Omit<Firm, 'id' | 'createdAt' | 'updatedAt'>): Promise<Firm> {
    return this.createEntity('firms', data);
  }
  getFirm(id: string): Promise<Firm | undefined> {
    return this.getEntity('firms', id);
  }
  listFirms(): Promise<Firm[]> {
    return this.listEntities('firms');
  }
  updateFirm(id: string, data: Partial<Omit<Firm, 'id' | 'createdAt'>>): Promise<Firm | undefined> {
    return this.updateEntity('firms', id, data as any);
  }
  deleteFirm(id: string): Promise<boolean> {
    return this.deleteEntity('firms', id);
  }

  // Documents
  createDocument(data: Omit<TenderDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<TenderDocument> {
    return this.createEntity('documents', data);
  }
  getDocument(id: string): Promise<TenderDocument | undefined> {
    return this.getEntity('documents', id);
  }
  async listDocumentsByTender(tenderId: string): Promise<TenderDocument[]> {
    const q = query(this.col('documents'), where('tenderId', '==', tenderId), orderBy('updatedAt', 'desc'), limit(200));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as TenderDocument);
  }
  updateDocument(
    id: string,
    data: Partial<Omit<TenderDocument, 'id' | 'createdAt'>>
  ): Promise<TenderDocument | undefined> {
    return this.updateEntity('documents', id, data as any);
  }
  deleteDocument(id: string): Promise<boolean> {
    return this.deleteEntity('documents', id);
  }

  // Settings (singleton doc)
  async getSettings(): Promise<Settings> {
    const ref = doc(this.firestore, settingsDocPath());
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      // Minimal safe defaults; the local adapter has richer defaults seeded in schema.
      const createdAt = nowIso();
      const defaults: Settings = normalizeSettingsVersioning({
        id: 'default',
        organizationName: 'Organization',
        departmentAddress: '',
        contactPerson: '',
        email: '',
        phone: '',
        defaultLanguage: 'english',
        headerSafeZonePx: 160,
        tenderNumberPrefix: 'TEND-',
        enableLocationAIAutofill: false,
        createdAt,
        updatedAt: createdAt,
      });
      await setDoc(ref, { ...defaults, _serverUpdatedAt: serverTimestamp(), _serverCreatedAt: serverTimestamp() });
      return defaults;
    }
    return normalizeSettingsVersioning(snap.data() as Settings);
  }

  async updateSettings(data: Partial<Omit<Settings, 'id' | 'createdAt'>>): Promise<Settings> {
    const ref = doc(this.firestore, settingsDocPath());
    return runTransaction(this.firestore, async (tx) => {
      const snap = await tx.get(ref);
      const base = snap.exists() ? normalizeSettingsVersioning(snap.data() as Settings) : await this.getSettings();
      const updated: Settings = normalizeSettingsVersioning({ ...base, ...data, id: 'default', updatedAt: nowIso() });
      tx.set(ref, { ...updated, _serverUpdatedAt: serverTimestamp() }, { merge: true });
      return updated;
    });
  }

  // Department profiles
  createDepartmentProfile(data: Omit<DepartmentProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<DepartmentProfile> {
    return this.createEntity('departmentProfiles', data);
  }
  getDepartmentProfile(id: string): Promise<DepartmentProfile | undefined> {
    return this.getEntity('departmentProfiles', id);
  }
  listDepartmentProfiles(): Promise<DepartmentProfile[]> {
    return this.listEntities('departmentProfiles');
  }
  updateDepartmentProfile(
    id: string,
    data: Partial<Omit<DepartmentProfile, 'id' | 'createdAt'>>
  ): Promise<DepartmentProfile | undefined> {
    return this.updateEntity('departmentProfiles', id, data as any);
  }
  deleteDepartmentProfile(id: string): Promise<boolean> {
    return this.deleteEntity('departmentProfiles', id);
  }

  // Tender items are embedded in Tender; keep API parity with local adapter for callers.
  async createTenderItem(data: Omit<TenderItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<TenderItem> {
    const tender = await this.getTender(data.tenderId);
    if (!tender) throw new Error('Parent tender not found for item');

    const createdAt = nowIso();
    const item: TenderItem = {
      ...data,
      id: uuid(),
      createdAt,
      updatedAt: createdAt,
      totalAmount: Math.round(data.quantity * data.rate * 100) / 100,
    };

    await this.updateTender(tender.id, { items: [...(tender.items || []), item] });
    return item;
  }

  async getTenderItem(id: string): Promise<TenderItem | undefined> {
    // Not indexed as separate docs; scan recent tenders (bounded) for parity.
    const tenders = await this.listTenders();
    for (const tender of tenders) {
      const item = (tender.items || []).find((entry) => entry.id === id);
      if (item) return item;
    }
    return undefined;
  }

  async listTenderItems(tenderId: string): Promise<TenderItem[]> {
    const tender = await this.getTender(tenderId);
    return tender?.items || [];
  }

  async updateTenderItem(id: string, data: Partial<Omit<TenderItem, 'id' | 'createdAt'>>): Promise<TenderItem | undefined> {
    const tenders = await this.listTenders();
    for (const tender of tenders) {
      const index = (tender.items || []).findIndex((item) => item.id === id);
      if (index !== -1) {
        const items = [...tender.items];
        const merged: TenderItem = {
          ...items[index],
          ...data,
          id,
          updatedAt: nowIso(),
        };
        merged.totalAmount = Math.round(merged.quantity * merged.rate * 100) / 100;
        items[index] = merged;
        await this.updateTender(tender.id, { items });
        return merged;
      }
    }
    return undefined;
  }

  async deleteTenderItem(id: string): Promise<boolean> {
    const tenders = await this.listTenders();
    for (const tender of tenders) {
      const existing = tender.items || [];
      const next = existing.filter((item) => item.id !== id);
      if (next.length !== existing.length) {
        await this.updateTender(tender.id, { items: next });
        return true;
      }
    }
    return false;
  }

  // Document versions as subcollection: documents/{documentId}/versions
  private versionsCollection(documentId: string) {
    return collection(this.firestore, `${collectionPath('documents')}/${documentId}/versions`);
  }

  async createDocumentVersion(data: Omit<DocumentVersion, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentVersion> {
    const createdAt = nowIso();
    const version: DocumentVersion = { ...data, id: uuid(), createdAt, updatedAt: createdAt };
    const ref = doc(this.versionsCollection(data.documentId), version.id);
    await setDoc(ref, { ...version, _serverUpdatedAt: serverTimestamp(), _serverCreatedAt: serverTimestamp() });
    return version;
  }

  async getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
    const q = query(this.versionsCollection(documentId), orderBy('versionNumber', 'desc'), limit(200));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as DocumentVersion);
  }

  async deleteDocumentVersions(documentId: string): Promise<boolean> {
    const versions = await this.getDocumentVersions(documentId);
    if (versions.length === 0) return false;
    const batch = writeBatch(this.firestore);
    for (const version of versions) {
      batch.delete(doc(this.versionsCollection(documentId), version.id));
    }
    await batch.commit();
    return true;
  }

  async deleteDocumentVersion(documentId: string, versionId: string): Promise<boolean> {
    const ref = doc(this.versionsCollection(documentId), versionId);
    const existing = await getDoc(ref);
    if (!existing.exists()) return false;
    await deleteDoc(ref);
    return true;
  }

  async updateDocumentVersion(
    documentId: string,
    versionId: string,
    data: Partial<Omit<DocumentVersion, 'id' | 'createdAt' | 'documentId'>>
  ): Promise<DocumentVersion | undefined> {
    const ref = doc(this.versionsCollection(documentId), versionId);
    const existing = await getDoc(ref);
    if (!existing.exists()) return undefined;
    const updated: DocumentVersion = {
      ...(existing.data() as DocumentVersion),
      ...data,
      id: versionId,
      documentId,
      updatedAt: nowIso(),
    };
    await updateDoc(ref, removeUndefinedValues({ ...data, updatedAt: updated.updatedAt, _serverUpdatedAt: serverTimestamp() }));
    return updated;
  }

  // Backup helpers
  async exportDatabase(): Promise<string> {
    const [tenders, firms, documents, departmentProfiles, settings] = await Promise.all([
      this.listTenders(),
      this.listFirms(),
      this.listEntities('documents'),
      this.listDepartmentProfiles(),
      this.getSettings(),
    ]);

    const versionsByDoc: Record<string, DocumentVersion[]> = {};
    for (const document of documents) {
      versionsByDoc[document.id] = await this.getDocumentVersions(document.id);
    }

    return JSON.stringify(
      {
        tenders,
        firms,
        documents,
        departmentProfiles,
        settings: [settings],
        documentVersions: Object.values(versionsByDoc).flat(),
      },
      null,
      2
    );
  }

  async importDatabase(data: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(data) as {
        tenders?: Tender[];
        firms?: Firm[];
        documents?: TenderDocument[];
        departmentProfiles?: DepartmentProfile[];
        settings?: Settings[];
        documentVersions?: DocumentVersion[];
      };

      const batch = writeBatch(this.firestore);

      for (const tender of parsed.tenders || []) batch.set(this.docRef('tenders', tender.id), tender as any);
      for (const firm of parsed.firms || []) batch.set(this.docRef('firms', firm.id), firm as any);
      for (const document of parsed.documents || []) batch.set(this.docRef('documents', document.id), document as any);
      for (const profile of parsed.departmentProfiles || [])
        batch.set(this.docRef('departmentProfiles', profile.id), profile as any);

      const settings = (parsed.settings || [])[0];
      if (settings) batch.set(doc(this.firestore, settingsDocPath()), { ...settings, id: 'default' } as any);

      await batch.commit();

      // Versions are subcollections; write them after the main batch.
      const versions = parsed.documentVersions || [];
      for (const version of versions) {
        const ref = doc(this.versionsCollection(version.documentId), version.id);
        await setDoc(ref, version as any);
      }

      return true;
    } catch {
      return false;
    }
  }

  async clearDatabase(): Promise<void> {
    // Best-effort: delete up to current query limits.
    const [tenders, firms, documents, profiles] = await Promise.all([
      this.listTenders(),
      this.listFirms(),
      this.listEntities('documents'),
      this.listDepartmentProfiles(),
    ]);

    const batch = writeBatch(this.firestore);
    for (const tender of tenders) batch.delete(this.docRef('tenders', tender.id));
    for (const firm of firms) batch.delete(this.docRef('firms', firm.id));
    for (const document of documents) batch.delete(this.docRef('documents', document.id));
    for (const profile of profiles) batch.delete(this.docRef('departmentProfiles', profile.id));
    batch.delete(doc(this.firestore, settingsDocPath()));
    await batch.commit();

    for (const document of documents) {
      await this.deleteDocumentVersions(document.id);
    }
  }

  // Purpose Mappings
  async createPurposeMapping(data: Omit<PurposeMapping, 'id' | 'createdAt' | 'updatedAt'>): Promise<PurposeMapping> {
    const createdAt = nowIso();
    const mapping: PurposeMapping = {
      ...data,
      id: uuid(),
      createdAt,
      updatedAt: createdAt,
    };
    const ref = doc(this.firestore, mappingsCollectionPath('purpose'), mapping.id);
    await setDoc(ref, removeUndefinedValues({ ...mapping, _serverUpdatedAt: serverTimestamp(), _serverCreatedAt: serverTimestamp() }));
    return mapping;
  }

  async getPurposeByCategory(category: string, language: 'hindi' | 'english'): Promise<PurposeMapping | undefined> {
    const q = query(
      collection(this.firestore, mappingsCollectionPath('purpose')),
      where('category', '==', category),
      where('language', '==', language)
    );
    const snap = await getDocs(q);
    if (snap.empty) return undefined;
    return snap.docs[0].data() as PurposeMapping;
  }

  async listPurposeMappings(): Promise<PurposeMapping[]> {
    const q = query(collection(this.firestore, mappingsCollectionPath('purpose')), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as PurposeMapping);
  }

  async updatePurposeMapping(
    id: string,
    data: Partial<Omit<PurposeMapping, 'id' | 'createdAt'>>
  ): Promise<PurposeMapping | undefined> {
    const ref = doc(this.firestore, mappingsCollectionPath('purpose'), id);
    const existing = await getDoc(ref);
    if (!existing.exists()) return undefined;
    const merged = { ...(existing.data() as any), ...(data as any), id, updatedAt: nowIso() };
    await updateDoc(ref, removeUndefinedValues({ ...data, updatedAt: serverTimestamp() }));
    return merged as PurposeMapping;
  }

  async deletePurposeMapping(id: string): Promise<boolean> {
    const ref = doc(this.firestore, mappingsCollectionPath('purpose'), id);
    const existing = await getDoc(ref);
    if (!existing.exists()) return false;
    await deleteDoc(ref);
    return true;
  }

  // Item Hindi Mappings
  async createItemHindiMapping(data: Omit<HindiMapping, 'id' | 'createdAt' | 'updatedAt'>): Promise<HindiMapping> {
    const createdAt = nowIso();
    const mapping: HindiMapping = {
      ...data,
      id: uuid(),
      createdAt,
      updatedAt: createdAt,
    };
    const ref = doc(this.firestore, mappingsCollectionPath('item'), mapping.id);
    await setDoc(ref, removeUndefinedValues({ ...mapping, _serverUpdatedAt: serverTimestamp(), _serverCreatedAt: serverTimestamp() }));
    return mapping;
  }

  async getItemHindiMapping(englishName: string): Promise<HindiMapping | undefined> {
    const q = query(
      collection(this.firestore, mappingsCollectionPath('item')),
      where('englishName', '==', englishName)
    );
    const snap = await getDocs(q);
    if (snap.empty) return undefined;
    return snap.docs[0].data() as HindiMapping;
  }

  async listItemHindiMappings(): Promise<HindiMapping[]> {
    const q = query(collection(this.firestore, mappingsCollectionPath('item')), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as HindiMapping);
  }

  async updateItemHindiMapping(
    id: string,
    data: Partial<Omit<HindiMapping, 'id' | 'createdAt'>>
  ): Promise<HindiMapping | undefined> {
    const ref = doc(this.firestore, mappingsCollectionPath('item'), id);
    const existing = await getDoc(ref);
    if (!existing.exists()) return undefined;
    const merged = { ...(existing.data() as any), ...(data as any), id, updatedAt: nowIso() };
    await updateDoc(ref, removeUndefinedValues({ ...data, updatedAt: serverTimestamp() }));
    return merged as HindiMapping;
  }

  async deleteItemHindiMapping(id: string): Promise<boolean> {
    const ref = doc(this.firestore, mappingsCollectionPath('item'), id);
    const existing = await getDoc(ref);
    if (!existing.exists()) return false;
    await deleteDoc(ref);
    return true;
  }

  // Vendor Hindi Mappings
  async createVendorHindiMapping(data: Omit<HindiMapping, 'id' | 'createdAt' | 'updatedAt'>): Promise<HindiMapping> {
    const createdAt = nowIso();
    const mapping: HindiMapping = {
      ...data,
      id: uuid(),
      createdAt,
      updatedAt: createdAt,
    };
    const ref = doc(this.firestore, mappingsCollectionPath('vendor'), mapping.id);
    await setDoc(ref, removeUndefinedValues({ ...mapping, _serverUpdatedAt: serverTimestamp(), _serverCreatedAt: serverTimestamp() }));
    return mapping;
  }

  async getVendorHindiMapping(englishName: string): Promise<HindiMapping | undefined> {
    const q = query(
      collection(this.firestore, mappingsCollectionPath('vendor')),
      where('englishName', '==', englishName)
    );
    const snap = await getDocs(q);
    if (snap.empty) return undefined;
    return snap.docs[0].data() as HindiMapping;
  }

  async listVendorHindiMappings(): Promise<HindiMapping[]> {
    const q = query(collection(this.firestore, mappingsCollectionPath('vendor')), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as HindiMapping);
  }

  async updateVendorHindiMapping(
    id: string,
    data: Partial<Omit<HindiMapping, 'id' | 'createdAt'>>
  ): Promise<HindiMapping | undefined> {
    const ref = doc(this.firestore, mappingsCollectionPath('vendor'), id);
    const existing = await getDoc(ref);
    if (!existing.exists()) return undefined;
    const merged = { ...(existing.data() as any), ...(data as any), id, updatedAt: nowIso() };
    await updateDoc(ref, removeUndefinedValues({ ...data, updatedAt: serverTimestamp() }));
    return merged as HindiMapping;
  }

  async deleteVendorHindiMapping(id: string): Promise<boolean> {
    const ref = doc(this.firestore, mappingsCollectionPath('vendor'), id);
    const existing = await getDoc(ref);
    if (!existing.exists()) return false;
    await deleteDoc(ref);
    return true;
  }

  createPlaceMapping(data: Omit<PlaceMapping, 'id' | 'createdAt' | 'updatedAt'>): Promise<PlaceMapping> {
    return this.createEntity('placeMappings', data);
  }

  listPlaceMappings(): Promise<PlaceMapping[]> {
    return this.listEntities('placeMappings');
  }

  updatePlaceMapping(
    id: string,
    data: Partial<Omit<PlaceMapping, 'id' | 'createdAt'>>
  ): Promise<PlaceMapping | undefined> {
    return this.updateEntity('placeMappings', id, data as any);
  }

  deletePlaceMapping(id: string): Promise<boolean> {
    return this.deleteEntity('placeMappings', id);
  }

  createLocalBodyType(data: Omit<LocalBodyType, 'id' | 'createdAt' | 'updatedAt'>): Promise<LocalBodyType> {
    return this.createEntity('localBodyTypes', data);
  }

  listLocalBodyTypes(): Promise<LocalBodyType[]> {
    return this.listEntities('localBodyTypes');
  }

  updateLocalBodyType(
    id: string,
    data: Partial<Omit<LocalBodyType, 'id' | 'createdAt'>>
  ): Promise<LocalBodyType | undefined> {
    return this.updateEntity('localBodyTypes', id, data as any);
  }

  async getAILocationCache(queryText: string): Promise<AILocationCache | undefined> {
    const normalized = queryText.trim().toLowerCase();
    const q = query(collection(this.firestore, collectionPath('aiLocationCache')), where('query', '==', normalized), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return undefined;
    return snap.docs[0].data() as AILocationCache;
  }

  async setAILocationCache(data: Omit<AILocationCache, 'id' | 'createdAt' | 'updatedAt'>): Promise<AILocationCache> {
    const existing = await this.getAILocationCache(data.query);
    if (existing) {
      const updated = await this.updateEntity('aiLocationCache', existing.id, {
        ...data,
        query: data.query.trim().toLowerCase(),
      } as any);
      return updated || existing;
    }
    return this.createEntity('aiLocationCache', { ...data, query: data.query.trim().toLowerCase() });
  }

  // Index configuration for purposeMappings collection
  getPurposeMappingsIndexes(): Array<{ fields: string[]; order: 'ASCENDING' | 'DESCENDING' }> {
    return [
      { fields: ['category', 'language'], order: 'ASCENDING' },
      { fields: ['createdAt'], order: 'ASCENDING' },
    ];
  }

  // Index configuration for vendorHindiMappings collection
  getVendorHindiMappingsIndexes(): Array<{ fields: string[]; order: 'ASCENDING' | 'DESCENDING' }> {
    return [
      { fields: ['englishName', 'type'], order: 'ASCENDING' },
      { fields: ['createdAt'], order: 'ASCENDING' },
    ];
  }

  // ─── Document Phrase Mappings ─────────────────────────────────────────────

  async createDocumentPhraseMapping(
    data: Omit<DocumentPhraseMapping, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<DocumentPhraseMapping> {
    return this.createEntity('documentPhraseMappings', data);
  }

  async getDocumentPhraseMappingByCategory(categoryId: string): Promise<DocumentPhraseMapping | undefined> {
    const q = query(
      collection(this.firestore, collectionPath('documentPhraseMappings')),
      where('categoryId', '==', categoryId),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return undefined;
    return snap.docs[0].data() as DocumentPhraseMapping;
  }

  async findDocumentPhraseMappingByKeyword(keyword: string): Promise<DocumentPhraseMapping | undefined> {
    // Firestore array-contains query for keyword matching
    const normalizedKeyword = keyword.trim().toLowerCase();
    // Try categoryId match first (exact)
    const byCat = await this.getDocumentPhraseMappingByCategory(normalizedKeyword);
    if (byCat) return byCat;
    // Then try keyword array-contains
    const q = query(
      collection(this.firestore, collectionPath('documentPhraseMappings')),
      where('keywords', 'array-contains', normalizedKeyword),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return undefined;
    return snap.docs[0].data() as DocumentPhraseMapping;
  }

  async listDocumentPhraseMappings(): Promise<DocumentPhraseMapping[]> {
    return this.listEntities('documentPhraseMappings');
  }

  async updateDocumentPhraseMapping(
    id: string,
    data: Partial<Omit<DocumentPhraseMapping, 'id' | 'createdAt'>>
  ): Promise<DocumentPhraseMapping | undefined> {
    return this.updateEntity('documentPhraseMappings', id, data as any);
  }

  async deleteDocumentPhraseMapping(id: string): Promise<boolean> {
    return this.deleteEntity('documentPhraseMappings', id);
  }
}

