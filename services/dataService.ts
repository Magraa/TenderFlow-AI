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
  CustomTemplate,
  Bill,
} from '@/types';

import { db } from '@/services/db';

export const dataService = {
  tenders: {
    create: (data: Omit<Tender, 'id' | 'createdAt' | 'updatedAt'>) => db.createTender(data),
    get: (id: string) => db.getTender(id),
    list: () => db.listTenders(),
    update: (id: string, data: Partial<Omit<Tender, 'id' | 'createdAt'>>) => db.updateTender(id, data),
    delete: (id: string) => db.deleteTender(id),
  },

  firms: {
    create: (data: Omit<Firm, 'id' | 'createdAt' | 'updatedAt'>) => db.createFirm(data),
    get: (id: string) => db.getFirm(id),
    list: () => db.listFirms(),
    update: (id: string, data: Partial<Omit<Firm, 'id' | 'createdAt'>>) => db.updateFirm(id, data),
    delete: (id: string) => db.deleteFirm(id),
  },

  documents: {
    create: (data: Omit<TenderDocument, 'id' | 'createdAt' | 'updatedAt'>) => db.createDocument(data),
    get: (id: string) => db.getDocument(id),
    listByTender: (tenderId: string) => db.listDocumentsByTender(tenderId),
    update: (id: string, data: Partial<Omit<TenderDocument, 'id' | 'createdAt'>>) => db.updateDocument(id, data),
    delete: (id: string) => db.deleteDocument(id),
  },

  settings: {
    get: () => db.getSettings(),
    update: (data: Partial<Omit<Settings, 'id' | 'createdAt'>>) => db.updateSettings(data),
  },

  departmentProfiles: {
    create: (data: Omit<DepartmentProfile, 'id' | 'createdAt' | 'updatedAt'>) => db.createDepartmentProfile(data),
    get: (id: string) => db.getDepartmentProfile(id),
    list: () => db.listDepartmentProfiles(),
    update: (id: string, data: Partial<Omit<DepartmentProfile, 'id' | 'createdAt'>>) =>
      db.updateDepartmentProfile(id, data),
    delete: (id: string) => db.deleteDepartmentProfile(id),
  },

  tenderItems: {
    create: (data: Omit<TenderItem, 'id' | 'createdAt' | 'updatedAt'>) => db.createTenderItem(data),
    get: (id: string) => db.getTenderItem(id),
    listByTender: (tenderId: string) => db.listTenderItems(tenderId),
    update: (id: string, data: Partial<Omit<TenderItem, 'id' | 'createdAt'>>) => db.updateTenderItem(id, data),
    delete: (id: string) => db.deleteTenderItem(id),
  },

  documentVersions: {
    create: (data: Omit<DocumentVersion, 'id' | 'createdAt' | 'updatedAt'>) => db.createDocumentVersion(data),
    listByDocument: (documentId: string) => db.getDocumentVersions(documentId),
    deleteByDocument: (documentId: string) => db.deleteDocumentVersions(documentId),
    delete: (documentId: string, versionId: string) => db.deleteDocumentVersion(documentId, versionId),
    update: (
      documentId: string,
      versionId: string,
      data: Partial<Omit<DocumentVersion, 'id' | 'createdAt' | 'documentId'>>
    ) => db.updateDocumentVersion(documentId, versionId, data),
  },

  // Purpose Mappings
  purposeMappings: {
    create: (data: Omit<PurposeMapping, 'id' | 'createdAt' | 'updatedAt'>) => db.createPurposeMapping(data),
    get: (category: string, language: 'hindi' | 'english') => db.getPurposeByCategory(category, language),
    list: () => db.listPurposeMappings(),
    update: (id: string, data: Partial<Omit<PurposeMapping, 'id' | 'createdAt'>>) =>
      db.updatePurposeMapping(id, data),
    delete: (id: string) => db.deletePurposeMapping(id),
  },

  // Item Hindi Mappings
  itemHindiMappings: {
    create: (data: Omit<HindiMapping, 'id' | 'createdAt' | 'updatedAt'>) => db.createItemHindiMapping(data),
    get: (englishName: string) => db.getItemHindiMapping(englishName),
    list: () => db.listItemHindiMappings(),
    update: (id: string, data: Partial<Omit<HindiMapping, 'id' | 'createdAt'>>) =>
      db.updateItemHindiMapping(id, data),
    delete: (id: string) => db.deleteItemHindiMapping(id),
  },

  // Vendor Hindi Mappings
  vendorHindiMappings: {
    create: (data: Omit<HindiMapping, 'id' | 'createdAt' | 'updatedAt'>) => db.createVendorHindiMapping(data),
    get: (englishName: string) => db.getVendorHindiMapping(englishName),
    list: () => db.listVendorHindiMappings(),
    update: (id: string, data: Partial<Omit<HindiMapping, 'id' | 'createdAt'>>) =>
      db.updateVendorHindiMapping(id, data),
    delete: (id: string) => db.deleteVendorHindiMapping(id),
  },

  placeMappings: {
    create: (data: Omit<PlaceMapping, 'id' | 'createdAt' | 'updatedAt'>) => db.createPlaceMapping(data),
    list: () => db.listPlaceMappings(),
    update: (id: string, data: Partial<Omit<PlaceMapping, 'id' | 'createdAt'>>) =>
      db.updatePlaceMapping(id, data),
    delete: (id: string) => db.deletePlaceMapping(id),
  },

  localBodyTypes: {
    create: (data: Omit<LocalBodyType, 'id' | 'createdAt' | 'updatedAt'>) => db.createLocalBodyType(data),
    list: () => db.listLocalBodyTypes(),
    update: (id: string, data: Partial<Omit<LocalBodyType, 'id' | 'createdAt'>>) =>
      db.updateLocalBodyType(id, data),
  },

  aiLocationCache: {
    get: (query: string) => db.getAILocationCache(query),
    set: (data: Omit<AILocationCache, 'id' | 'createdAt' | 'updatedAt'>) => db.setAILocationCache(data),
  },

  backup: {
    export: () => db.exportDatabase(),
    import: (data: string) => db.importDatabase(data),
    clear: () => db.clearDatabase(),
  },

  // Document Phrase Mappings
  documentPhraseMappings: {
    create: (data: Omit<DocumentPhraseMapping, 'id' | 'createdAt' | 'updatedAt'>) =>
      db.createDocumentPhraseMapping(data),
    getByCategory: (categoryId: string) => db.getDocumentPhraseMappingByCategory(categoryId),
    findByKeyword: (keyword: string) => db.findDocumentPhraseMappingByKeyword(keyword),
    list: () => db.listDocumentPhraseMappings(),
    update: (id: string, data: Partial<Omit<DocumentPhraseMapping, 'id' | 'createdAt'>>) =>
      db.updateDocumentPhraseMapping(id, data),
    delete: (id: string) => db.deleteDocumentPhraseMapping(id),
  },

  // Custom Templates
  customTemplates: {
    create: (data: Omit<CustomTemplate, 'id' | 'createdAt' | 'updatedAt'>) => db.createCustomTemplate(data),
    get: (id: string) => db.getCustomTemplate(id),
    list: () => db.listCustomTemplates(),
    update: (id: string, data: Partial<Omit<CustomTemplate, 'id' | 'createdAt'>>) =>
      db.updateCustomTemplate(id, data),
    delete: (id: string) => db.deleteCustomTemplate(id),
  },

  // Bills
  bills: {
    create: (data: Omit<Bill, 'id' | 'createdAt' | 'updatedAt'>) => db.createBill(data),
    get: (id: string) => db.getBill(id),
    list: () => db.listBills(),
    update: (id: string, data: Partial<Omit<Bill, 'id' | 'createdAt'>>) => db.updateBill(id, data),
    delete: (id: string) => db.deleteBill(id),
  },
};

