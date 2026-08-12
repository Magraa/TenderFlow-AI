import { db as localDb } from '@/services/storageService';
import type { SyncedCollectionName } from '@/services/localDb/indexedDb';

export type DataBackend = 'local' | 'firestore';

function resolveBackend(): DataBackend {
  const raw = (process.env.NEXT_PUBLIC_DATA_BACKEND || 'local').toLowerCase();
  if (raw === 'firestore') return 'firestore';
  return 'local';
}

let syncedCollectionsCache: Set<SyncedCollectionName> | null = null;

function getSyncedCollections(): Set<SyncedCollectionName> {
  if (!syncedCollectionsCache) {
    const raw = process.env.NEXT_PUBLIC_SYNC_COLLECTIONS || '';
    syncedCollectionsCache = new Set(
      raw
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean) as SyncedCollectionName[]
    );
  }
  return syncedCollectionsCache;
}

function isCollectionSynced(name: SyncedCollectionName): boolean {
  return typeof window !== 'undefined' && getSyncedCollections().has(name);
}

let syncedAdaptersPromise: Promise<typeof import('@/services/localDb/syncedAdapters')> | null = null;

function getSyncedAdapters() {
  if (!syncedAdaptersPromise) {
    syncedAdaptersPromise = import('@/services/localDb/syncedAdapters');
  }
  return syncedAdaptersPromise;
}

let firestoreDbPromise: Promise<any> | null = null;

type LocalAdapter = typeof localDb;
type ExposedKeys =
  | 'createTender'
  | 'getTender'
  | 'listTenders'
  | 'updateTender'
  | 'deleteTender'
  | 'createFirm'
  | 'getFirm'
  | 'listFirms'
  | 'updateFirm'
  | 'deleteFirm'
  | 'createDocument'
  | 'getDocument'
  | 'listDocumentsByTender'
  | 'updateDocument'
  | 'deleteDocument'
  | 'getSettings'
  | 'updateSettings'
  | 'createDepartmentProfile'
  | 'getDepartmentProfile'
  | 'listDepartmentProfiles'
  | 'updateDepartmentProfile'
  | 'deleteDepartmentProfile'
  | 'createTenderItem'
  | 'getTenderItem'
  | 'listTenderItems'
  | 'updateTenderItem'
  | 'deleteTenderItem'
  | 'createDocumentVersion'
  | 'getDocumentVersions'
  | 'deleteDocumentVersions'
  | 'deleteDocumentVersion'
  | 'updateDocumentVersion'
  | 'exportDatabase'
  | 'importDatabase'
  | 'clearDatabase'
  | 'createPurposeMapping'
  | 'getPurposeByCategory'
  | 'listPurposeMappings'
  | 'updatePurposeMapping'
  | 'deletePurposeMapping'
  | 'createItemHindiMapping'
  | 'getItemHindiMapping'
  | 'listItemHindiMappings'
  | 'updateItemHindiMapping'
  | 'deleteItemHindiMapping'
  | 'createVendorHindiMapping'
  | 'getVendorHindiMapping'
  | 'listVendorHindiMappings'
  | 'updateVendorHindiMapping'
  | 'deleteVendorHindiMapping'
  | 'createPlaceMapping'
  | 'listPlaceMappings'
  | 'updatePlaceMapping'
  | 'deletePlaceMapping'
  | 'createLocalBodyType'
  | 'listLocalBodyTypes'
  | 'updateLocalBodyType'
  | 'getAILocationCache'
  | 'setAILocationCache'
  | 'createDocumentPhraseMapping'
  | 'getDocumentPhraseMappingByCategory'
  | 'findDocumentPhraseMappingByKeyword'
  | 'listDocumentPhraseMappings'
  | 'updateDocumentPhraseMapping'
  | 'deleteDocumentPhraseMapping'
  | 'createCustomTemplate'
  | 'getCustomTemplate'
  | 'listCustomTemplates'
  | 'updateCustomTemplate'
  | 'deleteCustomTemplate'
  | 'createBill'
  | 'getBill'
  | 'listBills'
  | 'updateBill'
  | 'deleteBill';


type DbAdapter = {
  [K in ExposedKeys]: LocalAdapter[K] extends (...args: infer A) => infer R ? (...args: A) => Promise<Awaited<R>> : never;
};

async function getAdapter(): Promise<LocalAdapter | import('@/services/firestoreAdapter').FirestoreDB> {
  if (typeof window === 'undefined') return localDb;
  if (resolveBackend() !== 'firestore') return localDb;
  if (!firestoreDbPromise) {
    firestoreDbPromise = import('@/services/firestoreAdapter').then((mod) => new mod.FirestoreDB());
  }
  return firestoreDbPromise;
}

// Promise-first facade. Keep firebase out of the local-only bundle path via dynamic import.
export const db: DbAdapter = {
  // Tenders (routed through the IndexedDB + outbox sync engine when 'tenders' is in NEXT_PUBLIC_SYNC_COLLECTIONS)
  createTender: async (...args) => (isCollectionSynced('tenders') ? (await getSyncedAdapters()).syncedTendersAdapter.create(...args) : (await getAdapter()).createTender(...args)),
  getTender: async (...args) => (isCollectionSynced('tenders') ? (await getSyncedAdapters()).syncedTendersAdapter.get(...args) : (await getAdapter()).getTender(...args)),
  listTenders: async (...args) => (isCollectionSynced('tenders') ? (await getSyncedAdapters()).syncedTendersAdapter.list(...args) : (await getAdapter()).listTenders(...args)),
  updateTender: async (...args) => (isCollectionSynced('tenders') ? (await getSyncedAdapters()).syncedTendersAdapter.update(...args) : (await getAdapter()).updateTender(...args)),
  deleteTender: async (...args) => (isCollectionSynced('tenders') ? (await getSyncedAdapters()).syncedTendersAdapter.delete(...args) : (await getAdapter()).deleteTender(...args)),

  // Firms
  createFirm: async (...args) => (isCollectionSynced('firms') ? (await getSyncedAdapters()).syncedFirmsAdapter.create(...args) : (await getAdapter()).createFirm(...args)),
  getFirm: async (...args) => (isCollectionSynced('firms') ? (await getSyncedAdapters()).syncedFirmsAdapter.get(...args) : (await getAdapter()).getFirm(...args)),
  listFirms: async (...args) => (isCollectionSynced('firms') ? (await getSyncedAdapters()).syncedFirmsAdapter.list(...args) : (await getAdapter()).listFirms(...args)),
  updateFirm: async (...args) => (isCollectionSynced('firms') ? (await getSyncedAdapters()).syncedFirmsAdapter.update(...args) : (await getAdapter()).updateFirm(...args)),
  deleteFirm: async (...args) => (isCollectionSynced('firms') ? (await getSyncedAdapters()).syncedFirmsAdapter.delete(...args) : (await getAdapter()).deleteFirm(...args)),

  // Documents
  createDocument: async (...args) => (isCollectionSynced('documents') ? (await getSyncedAdapters()).syncedDocumentsAdapter.create(...args) : (await getAdapter()).createDocument(...args)),
  getDocument: async (...args) => (isCollectionSynced('documents') ? (await getSyncedAdapters()).syncedDocumentsAdapter.get(...args) : (await getAdapter()).getDocument(...args)),
  listDocumentsByTender: async (...args) => (isCollectionSynced('documents') ? (await getSyncedAdapters()).syncedDocumentsAdapter.listByTender(...args) : (await getAdapter()).listDocumentsByTender(...args)),
  updateDocument: async (...args) => (isCollectionSynced('documents') ? (await getSyncedAdapters()).syncedDocumentsAdapter.update(...args) : (await getAdapter()).updateDocument(...args)),
  deleteDocument: async (...args) => (isCollectionSynced('documents') ? (await getSyncedAdapters()).syncedDocumentsAdapter.delete(...args) : (await getAdapter()).deleteDocument(...args)),

  // Settings
  getSettings: async (...args) => (await getAdapter()).getSettings(...args),
  updateSettings: async (...args) => (await getAdapter()).updateSettings(...args),

  // Department profiles
  createDepartmentProfile: async (...args) => (isCollectionSynced('departmentProfiles') ? (await getSyncedAdapters()).syncedDepartmentProfilesAdapter.create(...args) : (await getAdapter()).createDepartmentProfile(...args)),
  getDepartmentProfile: async (...args) => (isCollectionSynced('departmentProfiles') ? (await getSyncedAdapters()).syncedDepartmentProfilesAdapter.get(...args) : (await getAdapter()).getDepartmentProfile(...args)),
  listDepartmentProfiles: async (...args) => (isCollectionSynced('departmentProfiles') ? (await getSyncedAdapters()).syncedDepartmentProfilesAdapter.list(...args) : (await getAdapter()).listDepartmentProfiles(...args)),
  updateDepartmentProfile: async (...args) => (isCollectionSynced('departmentProfiles') ? (await getSyncedAdapters()).syncedDepartmentProfilesAdapter.update(...args) : (await getAdapter()).updateDepartmentProfile(...args)),
  deleteDepartmentProfile: async (...args) => (isCollectionSynced('departmentProfiles') ? (await getSyncedAdapters()).syncedDepartmentProfilesAdapter.delete(...args) : (await getAdapter()).deleteDepartmentProfile(...args)),

  // Tender items (embedded in the parent tender doc; synced whenever 'tenders' is)
  createTenderItem: async (...args) => (isCollectionSynced('tenders') ? (await getSyncedAdapters()).syncedTenderItemsAdapter.create(...args) : (await getAdapter()).createTenderItem(...args)),
  getTenderItem: async (...args) => (isCollectionSynced('tenders') ? (await getSyncedAdapters()).syncedTenderItemsAdapter.get(...args) : (await getAdapter()).getTenderItem(...args)),
  listTenderItems: async (...args) => (isCollectionSynced('tenders') ? (await getSyncedAdapters()).syncedTenderItemsAdapter.list(...args) : (await getAdapter()).listTenderItems(...args)),
  updateTenderItem: async (...args) => (isCollectionSynced('tenders') ? (await getSyncedAdapters()).syncedTenderItemsAdapter.update(...args) : (await getAdapter()).updateTenderItem(...args)),
  deleteTenderItem: async (...args) => (isCollectionSynced('tenders') ? (await getSyncedAdapters()).syncedTenderItemsAdapter.delete(...args) : (await getAdapter()).deleteTenderItem(...args)),

  // Document versions
  createDocumentVersion: async (...args) => (await getAdapter()).createDocumentVersion(...args),
  getDocumentVersions: async (...args) => (await getAdapter()).getDocumentVersions(...args),
  deleteDocumentVersions: async (...args) => (await getAdapter()).deleteDocumentVersions(...args),
  deleteDocumentVersion: async (...args) => (await getAdapter()).deleteDocumentVersion(...args),
  updateDocumentVersion: async (...args) => (await getAdapter()).updateDocumentVersion(...args),

  // Backup
  exportDatabase: async (...args) => (await getAdapter()).exportDatabase(...args),
  importDatabase: async (...args) => (await getAdapter()).importDatabase(...args),
  clearDatabase: async (...args) => (await getAdapter()).clearDatabase(...args),

  // Purpose Mappings
  createPurposeMapping: async (...args) => (await getAdapter()).createPurposeMapping(...args),
  getPurposeByCategory: async (...args) => (await getAdapter()).getPurposeByCategory(...args),
  listPurposeMappings: async (...args) => (await getAdapter()).listPurposeMappings(...args),
  updatePurposeMapping: async (...args) => (await getAdapter()).updatePurposeMapping(...args),
  deletePurposeMapping: async (...args) => (await getAdapter()).deletePurposeMapping(...args),

  // Item Hindi Mappings
  createItemHindiMapping: async (...args) => (await getAdapter()).createItemHindiMapping(...args),
  getItemHindiMapping: async (...args) => (await getAdapter()).getItemHindiMapping(...args),
  listItemHindiMappings: async (...args) => (await getAdapter()).listItemHindiMappings(...args),
  updateItemHindiMapping: async (...args) => (await getAdapter()).updateItemHindiMapping(...args),
  deleteItemHindiMapping: async (...args) => (await getAdapter()).deleteItemHindiMapping(...args),

  // Vendor Hindi Mappings
  createVendorHindiMapping: async (...args) => (await getAdapter()).createVendorHindiMapping(...args),
  getVendorHindiMapping: async (...args) => (await getAdapter()).getVendorHindiMapping(...args),
  listVendorHindiMappings: async (...args) => (await getAdapter()).listVendorHindiMappings(...args),
  updateVendorHindiMapping: async (...args) => (await getAdapter()).updateVendorHindiMapping(...args),
  deleteVendorHindiMapping: async (...args) => (await getAdapter()).deleteVendorHindiMapping(...args),

  // Location helpers
  createPlaceMapping: async (...args) => (await getAdapter()).createPlaceMapping(...args),
  listPlaceMappings: async (...args) => (await getAdapter()).listPlaceMappings(...args),
  updatePlaceMapping: async (...args) => (await getAdapter()).updatePlaceMapping(...args),
  deletePlaceMapping: async (...args) => (await getAdapter()).deletePlaceMapping(...args),
  createLocalBodyType: async (...args) => (await getAdapter()).createLocalBodyType(...args),
  listLocalBodyTypes: async (...args) => (await getAdapter()).listLocalBodyTypes(...args),
  updateLocalBodyType: async (...args) => (await getAdapter()).updateLocalBodyType(...args),
  getAILocationCache: async (...args) => (await getAdapter()).getAILocationCache(...args),
  setAILocationCache: async (...args) => (await getAdapter()).setAILocationCache(...args),

  // Document Phrase Mappings
  createDocumentPhraseMapping: async (...args) => (await getAdapter()).createDocumentPhraseMapping(...args),
  getDocumentPhraseMappingByCategory: async (...args) => (await getAdapter()).getDocumentPhraseMappingByCategory(...args),
  findDocumentPhraseMappingByKeyword: async (...args) => (await getAdapter()).findDocumentPhraseMappingByKeyword(...args),
  listDocumentPhraseMappings: async (...args) => (await getAdapter()).listDocumentPhraseMappings(...args),
  updateDocumentPhraseMapping: async (...args) => (await getAdapter()).updateDocumentPhraseMapping(...args),
  deleteDocumentPhraseMapping: async (...args) => (await getAdapter()).deleteDocumentPhraseMapping(...args),

  // Custom Templates
  createCustomTemplate: async (...args) => (isCollectionSynced('customTemplates') ? (await getSyncedAdapters()).syncedCustomTemplatesAdapter.create(...args) : (await getAdapter()).createCustomTemplate(...args)),
  getCustomTemplate: async (...args) => (isCollectionSynced('customTemplates') ? (await getSyncedAdapters()).syncedCustomTemplatesAdapter.get(...args) : (await getAdapter()).getCustomTemplate(...args)),
  listCustomTemplates: async (...args) => (isCollectionSynced('customTemplates') ? (await getSyncedAdapters()).syncedCustomTemplatesAdapter.list(...args) : (await getAdapter()).listCustomTemplates(...args)),
  updateCustomTemplate: async (...args) => (isCollectionSynced('customTemplates') ? (await getSyncedAdapters()).syncedCustomTemplatesAdapter.update(...args) : (await getAdapter()).updateCustomTemplate(...args)),
  deleteCustomTemplate: async (...args) => (isCollectionSynced('customTemplates') ? (await getSyncedAdapters()).syncedCustomTemplatesAdapter.delete(...args) : (await getAdapter()).deleteCustomTemplate(...args)),

  // Bills
  createBill: async (...args) => (isCollectionSynced('bills') ? (await getSyncedAdapters()).syncedBillsAdapter.create(...args) : (await getAdapter()).createBill(...args)),
  getBill: async (...args) => (isCollectionSynced('bills') ? (await getSyncedAdapters()).syncedBillsAdapter.get(...args) : (await getAdapter()).getBill(...args)),
  listBills: async (...args) => (isCollectionSynced('bills') ? (await getSyncedAdapters()).syncedBillsAdapter.list(...args) : (await getAdapter()).listBills(...args)),
  updateBill: async (...args) => (isCollectionSynced('bills') ? (await getSyncedAdapters()).syncedBillsAdapter.update(...args) : (await getAdapter()).updateBill(...args)),
  deleteBill: async (...args) => (isCollectionSynced('bills') ? (await getSyncedAdapters()).syncedBillsAdapter.delete(...args) : (await getAdapter()).deleteBill(...args)),
};

