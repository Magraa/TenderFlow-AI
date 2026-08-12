import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { Bill, CustomTemplate, DepartmentProfile, Firm, Tender, TenderDocument } from '@/types';

export type SyncedCollectionName = 'tenders' | 'firms' | 'documents' | 'departmentProfiles' | 'customTemplates' | 'bills';

export type OutboxOp = 'create' | 'update' | 'delete';

export interface OutboxEntry {
  id?: number;
  entityId: string;
  collection: SyncedCollectionName;
  op: OutboxOp;
  payload: any;
  createdAt: string;
}

interface LocalSyncDBSchema extends DBSchema {
  tenders: { key: string; value: Tender };
  firms: { key: string; value: Firm };
  documents: { key: string; value: TenderDocument };
  departmentProfiles: { key: string; value: DepartmentProfile };
  customTemplates: { key: string; value: CustomTemplate };
  bills: { key: string; value: Bill };
  outbox: {
    key: number;
    value: OutboxEntry;
    indexes: { entityId: string };
  };
}

const DB_NAME = 'magra-sync-db';
const DB_VERSION = 2;

const ENTITY_STORES: SyncedCollectionName[] = ['tenders', 'firms', 'documents', 'departmentProfiles', 'customTemplates', 'bills'];

let dbPromise: Promise<IDBPDatabase<LocalSyncDBSchema>> | null = null;

export function getSyncDb(): Promise<IDBPDatabase<LocalSyncDBSchema>> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in the browser.');
  }

  if (!dbPromise) {
    dbPromise = openDB<LocalSyncDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        for (const store of ENTITY_STORES) {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        }
        if (!db.objectStoreNames.contains('outbox')) {
          const outbox = db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
          outbox.createIndex('entityId', 'entityId');
        }
      },
    });
  }

  return dbPromise;
}
