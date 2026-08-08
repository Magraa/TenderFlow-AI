'use client';

/**
 * Lets the user pick a local folder (via the File System Access API, Chrome/Edge only)
 * that PDFs get written into directly, instead of always landing in the browser's
 * global Downloads folder. The folder handle is device/browser-specific — it cannot be
 * synced through Firestore Settings, so it's persisted locally in IndexedDB.
 */

const DB_NAME = 'pdf-download-folder';
const STORE_NAME = 'handles';
const HANDLE_KEY = 'folder';

function isSupported(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function';
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStoredHandle(): Promise<any | null> {
  if (!isSupported()) return null;
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function setStoredHandle(handle: any | null): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    if (handle) tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    else tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Opens the browser's folder picker (must be called from a user gesture, e.g. a button click). */
async function chooseFolder(): Promise<any | null> {
  if (!isSupported()) return null;
  const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
  await setStoredHandle(handle);
  return handle;
}

async function clearFolder(): Promise<void> {
  await setStoredHandle(null);
}

/** Returns the saved folder handle only if permission is already granted (no prompt). */
async function getActiveFolder(): Promise<any | null> {
  const handle = await getStoredHandle();
  if (!handle) return null;
  try {
    const permission = await handle.queryPermission({ mode: 'readwrite' });
    return permission === 'granted' ? handle : null;
  } catch {
    return null;
  }
}

/** Re-requests permission for the saved folder — must be called from a user gesture. */
async function requestFolderPermission(): Promise<any | null> {
  const handle = await getStoredHandle();
  if (!handle) return null;
  try {
    const permission = await handle.requestPermission({ mode: 'readwrite' });
    return permission === 'granted' ? handle : null;
  } catch {
    return null;
  }
}

async function saveBlobToFolder(handle: any, filename: string, blob: Blob): Promise<void> {
  const fileHandle = await handle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export const pdfDownloadFolder = {
  isSupported,
  chooseFolder,
  clearFolder,
  getStoredHandle,
  getActiveFolder,
  requestFolderPermission,
  saveBlobToFolder,
};
