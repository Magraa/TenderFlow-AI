import { collection, DocumentChange, DocumentData, onSnapshot } from 'firebase/firestore';
import { getFirebaseFirestore } from '@/services/firebase/firebaseClient';
import { FirestoreDB } from '@/services/firestoreAdapter';
import { getSyncDb, OutboxEntry, SyncedCollectionName } from '@/services/localDb/indexedDb';
import { isOnline, onOnlineStatusChange } from './onlineStatus';

const ALL_COLLECTIONS: SyncedCollectionName[] = ['tenders', 'firms', 'documents', 'departmentProfiles', 'customTemplates', 'bills'];

type EntityMethods = {
  create: (db: FirestoreDB, data: any, presetId: string) => Promise<any>;
  update: (db: FirestoreDB, id: string, data: any) => Promise<any>;
  delete: (db: FirestoreDB, id: string) => Promise<any>;
};

const ENTITY_METHODS: Record<SyncedCollectionName, EntityMethods> = {
  tenders: {
    create: (db, data, id) => db.createTender(data, id),
    update: (db, id, data) => db.updateTender(id, data),
    delete: (db, id) => db.deleteTender(id),
  },
  firms: {
    create: (db, data, id) => db.createFirm(data, id),
    update: (db, id, data) => db.updateFirm(id, data),
    delete: (db, id) => db.deleteFirm(id),
  },
  documents: {
    create: (db, data, id) => db.createDocument(data, id),
    update: (db, id, data) => db.updateDocument(id, data),
    delete: (db, id) => db.deleteDocument(id),
  },
  departmentProfiles: {
    create: (db, data, id) => db.createDepartmentProfile(data, id),
    update: (db, id, data) => db.updateDepartmentProfile(id, data),
    delete: (db, id) => db.deleteDepartmentProfile(id),
  },
  customTemplates: {
    create: (db, data, id) => db.createCustomTemplate(data, id),
    update: (db, id, data) => db.updateCustomTemplate(id, data),
    delete: (db, id) => db.deleteCustomTemplate(id),
  },
  bills: {
    create: (db, data, id) => db.createBill(data, id),
    update: (db, id, data) => db.updateBill(id, data),
    delete: (db, id) => db.deleteBill(id),
  },
};

const started = new Set<SyncedCollectionName>();
let firestoreDb: FirestoreDB | null = null;
let flushing = false;
let onlineListenerRegistered = false;

function getFirestoreDb(): FirestoreDB {
  if (!firestoreDb) firestoreDb = new FirestoreDB();
  return firestoreDb;
}

async function hasPendingOutboxEntry(collectionName: SyncedCollectionName, entityId: string): Promise<boolean> {
  const db = await getSyncDb();
  const entries = await db.getAllFromIndex('outbox', 'entityId', entityId);
  return entries.some((entry) => entry.collection === collectionName);
}

// Skips ids with an unflushed outbox entry so a remote change can't clobber an unsent local edit.
async function applyRemoteChanges(collectionName: SyncedCollectionName, changes: DocumentChange<DocumentData>[]): Promise<void> {
  const db = await getSyncDb();
  for (const change of changes) {
    const id = change.doc.id;
    if (await hasPendingOutboxEntry(collectionName, id)) continue;

    if (change.type === 'removed') {
      await db.delete(collectionName, id);
    } else {
      await db.put(collectionName, change.doc.data() as any);
    }
  }
}

export function startCollectionSync(collectionName: SyncedCollectionName): void {
  if (started.has(collectionName) || typeof window === 'undefined') return;
  started.add(collectionName);

  const firestore = getFirebaseFirestore();
  onSnapshot(
    collection(firestore, collectionName),
    (snapshot) => {
      applyRemoteChanges(collectionName, snapshot.docChanges()).catch((error) => {
        console.error(`Failed to apply remote ${collectionName} changes`, error);
      });
    },
    (error) => {
      console.error(`${collectionName} sync listener error`, error);
    }
  );
}

export function startAllSyncedCollections(collections: SyncedCollectionName[] = ALL_COLLECTIONS): void {
  if (typeof window === 'undefined') return;

  for (const name of collections) {
    startCollectionSync(name);
  }

  flushOutbox().catch((error) => console.error('Initial outbox flush failed', error));
  if (!onlineListenerRegistered) {
    onlineListenerRegistered = true;
    onOnlineStatusChange((online) => {
      if (online) {
        flushOutbox().catch((error) => console.error('Outbox flush on reconnect failed', error));
      }
    });
  }
}

export async function enqueueOutbox(
  collectionName: SyncedCollectionName,
  op: OutboxEntry['op'],
  entityId: string,
  payload: any
): Promise<void> {
  const db = await getSyncDb();
  await db.add('outbox', {
    entityId,
    collection: collectionName,
    op,
    payload,
    createdAt: new Date().toISOString(),
  });
  void flushOutbox();
}

async function applyOutboxEntry(entry: OutboxEntry): Promise<void> {
  const adapter = getFirestoreDb();
  const methods = ENTITY_METHODS[entry.collection];
  switch (entry.op) {
    case 'create':
      await methods.create(adapter, entry.payload, entry.entityId);
      return;
    case 'update':
      await methods.update(adapter, entry.entityId, entry.payload);
      return;
    case 'delete':
      await methods.delete(adapter, entry.entityId);
      return;
  }
}

// Drains outbox entries in FIFO order across all collections; stops at the first failure
// so per-entity order (e.g. create before update) is preserved for retry.
export async function flushOutbox(): Promise<void> {
  if (flushing || !isOnline()) return;
  flushing = true;
  try {
    const db = await getSyncDb();
    while (true) {
      const entries = await db.getAll('outbox');
      if (entries.length === 0) break;

      const entry = entries[0];
      try {
        await applyOutboxEntry(entry);
        if (entry.id !== undefined) {
          await db.delete('outbox', entry.id);
        }
      } catch (error) {
        console.error('Failed to flush outbox entry', entry, error);
        break;
      }
    }
  } finally {
    flushing = false;
  }
}
