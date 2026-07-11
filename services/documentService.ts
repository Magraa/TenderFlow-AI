import { DocumentVersion, Firm, Tender, TenderDocType, TenderDocument } from '@/types';
import { aiDraftService, DraftResponse } from './aiDraftService';
import { dataService } from './dataService';
import {
  compressContent,
  createLineDiff,
  defaultVersioningSettings,
  normalizeVersioningSettings,
  paginateVersions,
} from './versioningSettings';

export interface GenerateDocumentRequest {
  tender: Tender;
  mainFirm: Firm;
  targetFirm?: Firm;
  docType: TenderDocType;
  language: 'hindi' | 'english';
  showLetterheadBackground?: boolean;
  showSafeMarginGuide?: boolean;
  lockHeaderPosition?: boolean;
  includeSignature?: boolean;
  includeStamp?: boolean;
  showPageBoundaryGuide?: boolean;
  showPrintBleedMargin?: boolean;
  forceTemplateFallback?: boolean;
}

function documentUsesLetterhead(docType: TenderDocType): boolean {
  return aiDraftService.docUsesLetterhead(docType);
}

function ensureDocumentDefaults(
  existing: TenderDocument | null,
  docType: TenderDocType,
  firm?: Firm
): Omit<TenderDocument, 'id' | 'createdAt' | 'updatedAt' | 'contentHTML' | 'tenderId'> {
  const defaultLetterhead = documentUsesLetterhead(docType);
  return {
    docType,
    pdfPath: existing?.pdfPath,
    lastModified: existing?.lastModified,
    currentVersion: existing?.currentVersion || 1,
    versions: existing?.versions || [],
    showLetterheadBackground: existing?.showLetterheadBackground ?? defaultLetterhead,
    showSafeMarginGuide: existing?.showSafeMarginGuide ?? false,
    lockHeaderPosition: existing?.lockHeaderPosition ?? true,
    includeSignature: defaultLetterhead
      ? (existing?.includeSignature ?? Boolean(firm?.signatureImagePath))
      : false,
    includeStamp: defaultLetterhead
      ? (existing?.includeStamp ?? Boolean(firm?.stampImagePath))
      : false,
    footerNotes: existing?.footerNotes || '',
    overflowWarning: existing?.overflowWarning || '',
  };
}

async function getVersioningSettings() {
  try {
    const settings = await dataService.settings.get();
    return normalizeVersioningSettings(settings.versioningSettings);
  } catch (error) {
    console.warn('Unable to read versioning settings; using defaults.', error);
    return defaultVersioningSettings;
  }
}

function sortVersionsAscending(versions: DocumentVersion[]): DocumentVersion[] {
  return [...versions].sort((left, right) => {
    if (left.versionNumber !== right.versionNumber) return left.versionNumber - right.versionNumber;
    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  });
}

async function cleanupOldVersions(
  documentId: string,
  maxVersions: number,
  versionRetentionDays: number
): Promise<DocumentVersion[]> {
  const versions = sortVersionsAscending(await dataService.documentVersions.listByDocument(documentId));
  const cutoff = Date.now() - versionRetentionDays * 24 * 60 * 60 * 1000;
  let kept = versions.filter((version) => new Date(version.createdAt).getTime() >= cutoff);

  if (maxVersions <= 0) {
    kept = [];
  }
  if (kept.length > maxVersions) {
    kept = kept.slice(kept.length - maxVersions);
  }

  const keepIds = new Set(kept.map((version) => version.id));
  await Promise.all(
    versions
      .filter((version) => !keepIds.has(version.id))
      .map((version) => dataService.documentVersions.delete(documentId, version.id))
  );

  const renumbered = await Promise.all(
    kept.map((version, index) => {
      const nextVersionNumber = index + 1;
      if (version.versionNumber === nextVersionNumber) return Promise.resolve(version);
      return dataService.documentVersions.update(documentId, version.id, { versionNumber: nextVersionNumber });
    })
  );

  return renumbered.filter((version): version is DocumentVersion => Boolean(version));
}

async function createVersionWithSettings(
  documentId: string,
  contentHTML: string,
  changeNote = 'Auto-saved version'
): Promise<number | null> {
  const settings = await getVersioningSettings();
  if (!settings.enabled) {
    console.info(`Versioning disabled; skipped version for document ${documentId}.`);
    return null;
  }
  if (settings.changeNotesRequired && !changeNote.trim()) {
    throw new Error('Change notes are required before saving a document version.');
  }

  const existing = sortVersionsAscending(await dataService.documentVersions.listByDocument(documentId));
  const latest = existing[existing.length - 1];
  if (latest?.contentHTML === contentHTML) {
    return latest.versionNumber;
  }

  const cleanupLimit = Math.max(0, settings.maxVersions - 1);
  const cleaned = await cleanupOldVersions(documentId, cleanupLimit, settings.versionRetentionDays);
  const nextVersion = cleaned.length > 0 ? Math.max(...cleaned.map((entry) => entry.versionNumber)) + 1 : 1;
  const previousContent = cleaned[cleaned.length - 1]?.contentHTML || '';
  const shouldCompress = cleaned.some((version) => {
    const ageMs = Date.now() - new Date(version.createdAt).getTime();
    return ageMs > settings.versionRetentionDays * 24 * 60 * 60 * 1000;
  });

  await dataService.documentVersions.create({
    documentId,
    versionNumber: nextVersion,
    contentHTML: shouldCompress ? compressContent(contentHTML) : contentHTML,
    changeNote,
    contentDiff: settings.enableVersionComparison ? createLineDiff(previousContent, contentHTML) : undefined,
    isCompressed: shouldCompress,
  });
  return nextVersion;
}

async function generateAndPersistDocument(request: GenerateDocumentRequest): Promise<{
  document: TenderDocument;
  draft: DraftResponse;
}> {
  const existing =
    (await dataService.documents.listByTender(request.tender.id)).find((document) => document.docType === request.docType) ||
    null;
  const targetFirm = request.targetFirm || request.mainFirm;
  const defaults = ensureDocumentDefaults(existing, request.docType, targetFirm);

  const usesLetterhead = documentUsesLetterhead(request.docType);

  const draft = await aiDraftService.generateDraft({
    tender: request.tender,
    mainFirm: request.mainFirm,
    targetFirm,
    docType: request.docType,
    language: request.language,
    items: request.tender.items,
    showLetterheadBackground: usesLetterhead
      ? (request.showLetterheadBackground ?? defaults.showLetterheadBackground)
      : false,
    showSafeMarginGuide: request.showSafeMarginGuide ?? defaults.showSafeMarginGuide,
    lockHeaderPosition: request.lockHeaderPosition ?? defaults.lockHeaderPosition,
    includeSignature: usesLetterhead ? (request.includeSignature ?? defaults.includeSignature) : false,
    includeStamp: usesLetterhead ? (request.includeStamp ?? defaults.includeStamp) : false,
    showPageBoundaryGuide: request.showPageBoundaryGuide,
    showPrintBleedMargin: request.showPrintBleedMargin,
    forceTemplateFallback: request.forceTemplateFallback,
  });

  if (existing) {
    const nextVersion = await createVersionWithSettings(existing.id, existing.contentHTML, 'Auto version before regeneration');
    const updated = await dataService.documents.update(existing.id, {
      ...defaults,
      showLetterheadBackground: usesLetterhead ? defaults.showLetterheadBackground : false,
      includeSignature: usesLetterhead ? defaults.includeSignature : false,
      includeStamp: usesLetterhead ? defaults.includeStamp : false,
      contentHTML: draft.html,
      overflowWarning: draft.metadata.overflowWarning || '',
      currentVersion: nextVersion ?? existing.currentVersion,
      lastModified: new Date().toISOString(),
    });
    if (!updated) throw new Error('Failed to update document');
    return { document: updated, draft };
  }

  const created = await dataService.documents.create({
    tenderId: request.tender.id,
    ...defaults,
    showLetterheadBackground: usesLetterhead ? defaults.showLetterheadBackground : false,
    includeSignature: usesLetterhead ? defaults.includeSignature : false,
    includeStamp: usesLetterhead ? defaults.includeStamp : false,
    contentHTML: draft.html,
    overflowWarning: draft.metadata.overflowWarning || '',
  });
  const nextVersion = await createVersionWithSettings(created.id, created.contentHTML, 'Initial generated version');
  if (nextVersion !== null && nextVersion !== created.currentVersion) {
    const updated = await dataService.documents.update(created.id, { currentVersion: nextVersion });
    if (updated) return { document: updated, draft };
  }
  return { document: created, draft };
}

async function updateDocumentContent(
  documentId: string,
  contentHTML: string,
  changeNote = 'Manual editor update'
): Promise<TenderDocument | null> {
  const existing = await dataService.documents.get(documentId);
  if (!existing) return null;
  if (existing.contentHTML === contentHTML) return existing;
  const nextVersion = await createVersionWithSettings(documentId, existing.contentHTML, changeNote);
  return (
    (await dataService.documents.update(documentId, {
      contentHTML,
      currentVersion: nextVersion ?? existing.currentVersion,
      lastModified: new Date().toISOString(),
    })) || null
  );
}

async function manuallySaveVersion(documentId: string, contentHTML: string, changeNote = 'Manual saved version'): Promise<number | null> {
  return createVersionWithSettings(documentId, contentHTML, changeNote);
}

async function duplicateDocumentLayout(sourceDocumentId: string): Promise<number> {
  const source = await dataService.documents.get(sourceDocumentId);
  if (!source) return 0;
  const tenderDocuments = await dataService.documents.listByTender(source.tenderId);
  let updatedCount = 0;
  for (const document of tenderDocuments) {
    if (document.id === source.id) continue;
    const updated = await dataService.documents.update(document.id, {
      showLetterheadBackground: source.showLetterheadBackground,
      showSafeMarginGuide: source.showSafeMarginGuide,
      lockHeaderPosition: source.lockHeaderPosition,
      includeSignature: source.includeSignature,
      includeStamp: source.includeStamp,
      footerNotes: source.footerNotes,
    });
    if (updated) updatedCount += 1;
  }
  return updatedCount;
}

function getDocumentHistory(documentId: string): ReturnType<typeof dataService.documentVersions.listByDocument> {
  return dataService.documentVersions.listByDocument(documentId);
}

async function getPaginatedDocumentHistory(documentId: string, page = 1, pageSize = 20) {
  const versions = await dataService.documentVersions.listByDocument(documentId);
  return paginateVersions(versions, page, pageSize);
}

export const documentService = {
  documentUsesLetterhead,
  generateAndPersistDocument,
  updateDocumentContent,
  manuallySaveVersion,
  duplicateDocumentLayout,
  getDocumentHistory,
  getPaginatedDocumentHistory,
  createVersionWithSettings,
  cleanupOldVersions,
  getVersioningSettings,
};
