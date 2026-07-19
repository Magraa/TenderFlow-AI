import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const collectionsToMigrate = [
  'tenders',
  'firms',
  'documents',
  'departmentProfiles',
  'purposeHindiMappings',
  'itemHindiMappings',
  'vendorHindiMappings',
  'placeMappings',
  'localBodyTypes',
  'aiLocationCache',
  'documentPhraseMappings',
  'customTemplates',
  'bills',
  'settings',
];

export async function GET() {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  log('🚀 Starting Firestore Migration via Next.js Route...');
  log(`Firebase Project: ${firebaseConfig.projectId}`);

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    return NextResponse.json({ error: 'Missing Firebase Config' }, { status: 500 });
  }

  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const namespace = process.env.NEXT_PUBLIC_FIRESTORE_NAMESPACE || 'default';
    const oldBasePath = `tap/${namespace}`;

    let totalMigrated = 0;
    let totalDeleted = 0;

    for (const colName of collectionsToMigrate) {
      const oldColPath = `${oldBasePath}/${colName}`;
      const newColPath = colName;

      log(`\n📂 Checking: ${oldColPath} -> ${newColPath}...`);

      try {
        const oldColRef = collection(db, oldColPath);
        const snapshot = await getDocs(oldColRef);

        if (snapshot.empty) {
          log(`   (No documents in ${oldColPath})`);
          continue;
        }

        log(`   Found ${snapshot.docs.length} document(s).`);

        for (const docSnap of snapshot.docs) {
          const docId = docSnap.id;
          const data = docSnap.data();

          // Copy to top level
          const newDocRef = doc(db, newColPath, docId);
          await setDoc(newDocRef, data, { merge: true });
          log(`   ✅ Copied [${docId}] to '${newColPath}'`);
          totalMigrated++;

          // Copy versions subcollection if documents
          if (colName === 'documents') {
            const oldVersionsPath = `${oldColPath}/${docId}/versions`;
            const newVersionsPath = `${newColPath}/${docId}/versions`;
            try {
              const vSnap = await getDocs(collection(db, oldVersionsPath));
              for (const vDoc of vSnap.docs) {
                await setDoc(doc(db, newVersionsPath, vDoc.id), vDoc.data(), { merge: true });
                log(`      ↳ Copied version [${vDoc.id}]`);
                await deleteDoc(doc(db, oldVersionsPath, vDoc.id));
              }
            } catch (vErr) {}
          }

          // Delete old doc from tap/default
          const oldDocRef = doc(db, oldColPath, docId);
          await deleteDoc(oldDocRef);
          log(`   🗑️ Deleted old document [${docId}] from '${oldColPath}'`);
          totalDeleted++;
        }
      } catch (colErr: any) {
        log(`   ❌ Error migrating ${oldColPath}: ${colErr?.message || colErr}`);
      }
    }

    log(`\n==================================================`);
    log(`🎉 Migration Completed! Migrated: ${totalMigrated}, Deleted: ${totalDeleted}`);
    log(`==================================================\n`);

    return NextResponse.json({ success: true, totalMigrated, totalDeleted, logs });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Migration failed' }, { status: 500 });
  }
}
