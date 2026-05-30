import { DocumentVersion, Tender } from '@/types';
import { dataService } from './dataService';

export async function generateTenderNumber(prefix = 'TEND'): Promise<string> {
  const count = (await dataService.tenders.list()).length + 1;
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${prefix}-${year}${month}-${String(count).padStart(3, '0')}`;
}

export async function duplicateTender(sourceTenderId: string, newTitle?: string): Promise<Tender | null> {
  const source = await dataService.tenders.get(sourceTenderId);
  if (!source) return null;

  return dataService.tenders.create({
    title: newTitle || `${source.title} (Copy)`,
    tenderNumber: await generateTenderNumber(),
    departmentProfileId: source.departmentProfileId,
    mainFirmId: source.mainFirmId,
    alternateFirms: [...(source.alternateFirms || [])],
    items: source.items.map((item) => ({
      ...item,
      id: `${item.id}-copy-${Date.now()}`,
      tenderId: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    language: source.language,
    status: 'draft',
    description: source.description,
    notes: source.notes,
    version: 1,
    parentTenderId: sourceTenderId,
  });
}

export async function saveDocumentVersion(
  documentId: string,
  contentHTML: string,
  changeNote?: string
): Promise<DocumentVersion> {
  const existingVersions = await dataService.documentVersions.listByDocument(documentId);
  const nextVersion =
    existingVersions.length > 0 ? Math.max(...existingVersions.map((v) => v.versionNumber)) + 1 : 1;

  await dataService.documents.update(documentId, {
    contentHTML,
    currentVersion: nextVersion,
  });

  return dataService.documentVersions.create({
    documentId,
    versionNumber: nextVersion,
    contentHTML,
    changeNote: changeNote || 'Auto-saved version',
  });
}

export async function restoreDocumentVersion(documentId: string, versionNumber: number): Promise<boolean> {
  const versions = await dataService.documentVersions.listByDocument(documentId);
  const target = versions.find((v) => v.versionNumber === versionNumber);
  if (!target) return false;

  await dataService.documents.update(documentId, {
    contentHTML: target.contentHTML,
    currentVersion: target.versionNumber,
    lastModified: new Date().toISOString(),
  });

  return true;
}

export function getDocumentHistory(documentId: string): Promise<DocumentVersion[]> {
  return dataService.documentVersions.listByDocument(documentId);
}

export interface TenderSummary {
  id: string;
  title: string;
  tenderNumber: string;
  totalItems: number;
  baseAmount: number;
  totalAmount: number;
  totalGST: number;
  grandTotal: number;
  status: 'draft' | 'final';
  createdAt: string;
  updatedAt: string;
}

export function getTenderSummary(tender: Tender): TenderSummary {
  const baseAmount = tender.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const totalGST = tender.items.reduce(
    (sum, item) => sum + ((item.quantity * item.rate) * item.gstPercent) / 100,
    0
  );
  const grandTotal = baseAmount + totalGST;

  return {
    id: tender.id,
    title: tender.title,
    tenderNumber: tender.tenderNumber,
    totalItems: tender.items.length,
    baseAmount,
    totalAmount: baseAmount,
    totalGST,
    grandTotal,
    status: tender.status,
    createdAt: tender.createdAt,
    updatedAt: tender.updatedAt,
  };
}

export async function prepareTenderExport(tenderId: string): Promise<{
  tender: Tender;
  summary: TenderSummary;
  firm: Awaited<ReturnType<typeof dataService.firms.get>>;
  items: Tender['items'];
  documents: Awaited<ReturnType<typeof dataService.documents.listByTender>>;
} | null> {
  const tender = await dataService.tenders.get(tenderId);
  if (!tender) return null;

  return {
    tender,
    summary: getTenderSummary(tender),
    firm: await dataService.firms.get(tender.mainFirmId),
    items: tender.items,
    documents: await dataService.documents.listByTender(tenderId),
  };
}

export const tenderUtility = {
  generateTenderNumber,
  duplicateTender,
  saveDocumentVersion,
  restoreDocumentVersion,
  getDocumentHistory,
  getTenderSummary,
  prepareTenderExport,
};
