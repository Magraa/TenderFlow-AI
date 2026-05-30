import { Firm, Tender, TenderDocType, TenderDocument } from '@/types';
import { aiDraftService, DraftResponse } from './aiDraftService';
import { dataService } from './dataService';

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

async function saveDocumentVersion(documentId: string, contentHTML: string, changeNote: string): Promise<number> {
  const existing = await dataService.documentVersions.listByDocument(documentId);
  const nextVersion = existing.length > 0 ? Math.max(...existing.map((entry) => entry.versionNumber)) + 1 : 1;
  await dataService.documentVersions.create({
    documentId,
    versionNumber: nextVersion,
    contentHTML,
    changeNote,
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
    const nextVersion = await saveDocumentVersion(existing.id, existing.contentHTML, 'Auto version before regeneration');
    const updated = await dataService.documents.update(existing.id, {
      ...defaults,
      showLetterheadBackground: usesLetterhead ? defaults.showLetterheadBackground : false,
      includeSignature: usesLetterhead ? defaults.includeSignature : false,
      includeStamp: usesLetterhead ? defaults.includeStamp : false,
      contentHTML: draft.html,
      overflowWarning: draft.metadata.overflowWarning || '',
      currentVersion: nextVersion,
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
  await saveDocumentVersion(created.id, created.contentHTML, 'Initial generated version');
  return { document: created, draft };
}

async function updateDocumentContent(
  documentId: string,
  contentHTML: string,
  changeNote = 'Manual editor update'
): Promise<TenderDocument | null> {
  const existing = await dataService.documents.get(documentId);
  if (!existing) return null;
  const nextVersion = await saveDocumentVersion(documentId, existing.contentHTML, changeNote);
  return (
    (await dataService.documents.update(documentId, {
      contentHTML,
      currentVersion: nextVersion,
      lastModified: new Date().toISOString(),
    })) || null
  );
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

export const documentService = {
  documentUsesLetterhead,
  generateAndPersistDocument,
  updateDocumentContent,
  duplicateDocumentLayout,
  getDocumentHistory,
};
