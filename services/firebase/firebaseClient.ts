import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Firestore, connectFirestoreEmulator, enableIndexedDbPersistence, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, connectStorageEmulator, getStorage } from 'firebase/storage';

type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
};

function readFirebaseClientConfig(): FirebaseClientConfig {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '';
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '';
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '';
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '';

  if (!apiKey || !authDomain || !projectId || !appId) {
    throw new Error(
      'Missing Firebase env. Set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID.'
    );
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket: storageBucket || undefined,
    messagingSenderId: messagingSenderId || undefined,
    appId,
  };
}

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApp();
  return initializeApp(readFirebaseClientConfig());
}

let firestoreSingleton: Firestore | null = null;
let storageSingleton: FirebaseStorage | null = null;
let persistenceEnabled = false;

export function getFirebaseFirestore(): Firestore {
  if (firestoreSingleton) return firestoreSingleton;

  const app = getFirebaseApp();
  const firestore = getFirestore(app);

  // Optional emulator support (local dev)
  const emulatorHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || '';
  if (emulatorHost) {
    const [host, portRaw] = emulatorHost.split(':');
    const port = Number(portRaw || '8080');
    if (host && Number.isFinite(port)) {
      connectFirestoreEmulator(firestore, host, port);
    }
  }

  // Offline persistence (browser only; best-effort)
  if (typeof window !== 'undefined' && !persistenceEnabled) {
    persistenceEnabled = true;
    enableIndexedDbPersistence(firestore).catch(() => {
      // Ignore: either multiple tabs, unsupported browser, or already enabled elsewhere.
    });
  }

  firestoreSingleton = firestore;
  return firestoreSingleton;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (storageSingleton) return storageSingleton;

  const app = getFirebaseApp();
  const storage = getStorage(app);

  // Optional emulator support (local dev)
  const emulatorHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || '';
  if (emulatorHost) {
    const [host, portRaw] = emulatorHost.split(':');
    const port = Number(portRaw || '9199'); // Default Firebase Storage emulator port
    if (host && Number.isFinite(port)) {
      connectStorageEmulator(storage, host, port);
    }
  }

  storageSingleton = storage;
  return storageSingleton;
}
