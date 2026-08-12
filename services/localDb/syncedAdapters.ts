import { v4 as uuid } from 'uuid';
import { Bill, CustomTemplate, DepartmentProfile, Firm, Tender, TenderDocument, TenderItem } from '@/types';
import { createSyncedAdapter } from '@/services/localDb/createSyncedAdapter';

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeItems(items: TenderItem[] | undefined, tenderId: string): TenderItem[] {
  return (items || []).map((item) => ({
    ...item,
    id: item.id || uuid(),
    tenderId,
    unit: item.unit || 'piece',
    totalAmount: Math.round(item.quantity * item.rate * 100) / 100,
    createdAt: item.createdAt || nowIso(),
    updatedAt: nowIso(),
  }));
}

export const syncedTendersAdapter = createSyncedAdapter<Tender>('tenders', {
  normalizeCreate: (data, entity) => ({
    ...entity,
    items: normalizeItems(data.items, entity.id),
    status: data.status === 'draft' ? 'draft' : 'final',
    version: Math.max(1, data.version || 1),
    alternateFirms: (data.alternateFirms || []).slice(0, 2),
  }),
  normalizeUpdate: (current, data, updated) => ({
    ...updated,
    items: data.items ? normalizeItems(data.items, current.id) : current.items,
    status: data.status ? (data.status === 'draft' ? 'draft' : 'final') : current.status,
  }),
});

export const syncedFirmsAdapter = createSyncedAdapter<Firm>('firms');
export const syncedDepartmentProfilesAdapter = createSyncedAdapter<DepartmentProfile>('departmentProfiles');
export const syncedCustomTemplatesAdapter = createSyncedAdapter<CustomTemplate>('customTemplates');
export const syncedBillsAdapter = createSyncedAdapter<Bill>('bills');

const documentsAdapter = createSyncedAdapter<TenderDocument>('documents');
export const syncedDocumentsAdapter = {
  ...documentsAdapter,
  async listByTender(tenderId: string): Promise<TenderDocument[]> {
    const all = await documentsAdapter.list();
    return all.filter((document) => document.tenderId === tenderId);
  },
};

// Tender items aren't a real Firestore collection — they're the `items` array embedded in
// a tender doc (see FirestoreDB.createTenderItem/etc. in firestoreAdapter.ts, which this
// mirrors). These wrap the synced tenders adapter instead of getting their own IndexedDB store.
export const syncedTenderItemsAdapter = {
  async create(data: Omit<TenderItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<TenderItem> {
    const tender = await syncedTendersAdapter.get(data.tenderId);
    if (!tender) throw new Error('Parent tender not found for item');

    const createdAt = nowIso();
    const item: TenderItem = {
      ...data,
      id: uuid(),
      createdAt,
      updatedAt: createdAt,
      unit: data.unit || 'piece',
      totalAmount: Math.round(data.quantity * data.rate * 100) / 100,
    };

    await syncedTendersAdapter.update(tender.id, { items: [...(tender.items || []), item] });
    return item;
  },

  async get(id: string): Promise<TenderItem | undefined> {
    const tenders = await syncedTendersAdapter.list();
    for (const tender of tenders) {
      const item = (tender.items || []).find((entry) => entry.id === id);
      if (item) return item;
    }
    return undefined;
  },

  async list(tenderId: string): Promise<TenderItem[]> {
    const tender = await syncedTendersAdapter.get(tenderId);
    return tender?.items || [];
  },

  async update(id: string, data: Partial<Omit<TenderItem, 'id' | 'createdAt'>>): Promise<TenderItem | undefined> {
    const tenders = await syncedTendersAdapter.list();
    for (const tender of tenders) {
      const index = (tender.items || []).findIndex((item) => item.id === id);
      if (index === -1) continue;

      const items = [...tender.items];
      const merged: TenderItem = { ...items[index], ...data, id, updatedAt: nowIso() };
      merged.totalAmount = Math.round(merged.quantity * merged.rate * 100) / 100;
      items[index] = merged;

      await syncedTendersAdapter.update(tender.id, { items });
      return merged;
    }
    return undefined;
  },

  async delete(id: string): Promise<boolean> {
    const tenders = await syncedTendersAdapter.list();
    for (const tender of tenders) {
      const existing = tender.items || [];
      const next = existing.filter((item) => item.id !== id);
      if (next.length === existing.length) continue;

      await syncedTendersAdapter.update(tender.id, { items: next });
      return true;
    }
    return false;
  },
};
