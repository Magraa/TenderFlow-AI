import { v4 as uuid } from 'uuid';
import { BaseEntity } from '@/types';
import { getSyncDb, SyncedCollectionName } from '@/services/localDb/indexedDb';
import { enqueueOutbox } from '@/services/sync/collectionSync';

function nowIso(): string {
  return new Date().toISOString();
}

export interface SyncedAdapterOptions<T extends BaseEntity> {
  // Lets a collection normalize the optimistic local write (e.g. tenders' item totals);
  // most collections don't need one and just get the plain spread + id/timestamps.
  normalizeCreate?: (data: any, entity: T) => T;
  normalizeUpdate?: (current: T, data: any, updated: T) => T;
}

// Generic IndexedDB + outbox adapter shared by every synced collection. See
// services/sync/collectionSync.ts for the Firestore-facing pull/push side.
export function createSyncedAdapter<T extends BaseEntity>(
  collectionName: SyncedCollectionName,
  options: SyncedAdapterOptions<T> = {}
) {
  return {
    async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
      const id = uuid();
      const createdAt = nowIso();
      let entity = { ...(data as any), id, createdAt, updatedAt: createdAt } as T;
      if (options.normalizeCreate) entity = options.normalizeCreate(data, entity);

      const db = await getSyncDb();
      await (db.put as any)(collectionName, entity);
      await enqueueOutbox(collectionName, 'create', id, data);

      return entity;
    },

    async get(id: string): Promise<T | undefined> {
      const db = await getSyncDb();
      return (await (db.get as any)(collectionName, id)) as T | undefined;
    },

    async list(): Promise<T[]> {
      const db = await getSyncDb();
      const all = (await (db.getAll as any)(collectionName)) as T[];
      return all.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    },

    async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T | undefined> {
      const db = await getSyncDb();
      const current = (await (db.get as any)(collectionName, id)) as T | undefined;
      if (!current) return undefined;

      let updated = { ...current, ...data, updatedAt: nowIso() } as T;
      if (options.normalizeUpdate) updated = options.normalizeUpdate(current, data, updated);

      await (db.put as any)(collectionName, updated);
      await enqueueOutbox(collectionName, 'update', id, data);

      return updated;
    },

    async delete(id: string): Promise<boolean> {
      const db = await getSyncDb();
      const current = await (db.get as any)(collectionName, id);
      if (!current) return false;

      await (db.delete as any)(collectionName, id);
      await enqueueOutbox(collectionName, 'delete', id, null);

      return true;
    },
  };
}
