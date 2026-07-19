import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Load environment variables from .env or .env.local if running in Node
function loadEnv() {
  const envPaths = ['.env.local', '.env'];
  for (const envPath of envPaths) {
    const fullPath = path.resolve(process.cwd(), envPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.substring(0, eqIdx).trim();
            const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      }
    }
  }
}

loadEnv();

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

export async function migrateFirestoreStructure(deleteOld = true) {
  console.log('🚀 Starting Firestore Structure Migration...');
  console.log(`Target Firebase Project: ${firebaseConfig.projectId}`);

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('Missing Firebase configuration in environment variables.');
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  
  try {
    const userCredential = await signInAnonymously(auth);
    console.log(`🔑 Authenticated anonymously as UID: ${userCredential.user.uid}`);
  } catch (authErr: any) {
    console.warn(`⚠️ Anonymous auth failed (${authErr?.message || authErr}). Continuing attempt...`);
  }

  const db = getFirestore(app);

  const namespace = process.env.NEXT_PUBLIC_FIRESTORE_NAMESPACE || 'default';
  const oldBasePath = `tap/${namespace}`;

  let totalMigrated = 0;
  let totalDeleted = 0;

  for (const colName of collectionsToMigrate) {
    const oldColPath = `${oldBasePath}/${colName}`;
    const newColPath = colName;

    console.log(`\n📂 Checking collection: ${oldColPath} -> ${newColPath}...`);

    try {
      const oldColRef = collection(db, oldColPath);
      const snapshot = await getDocs(oldColRef);

      if (snapshot.empty) {
        console.log(`   (No documents found in ${oldColPath})`);
        continue;
      }

      console.log(`   Found ${snapshot.docs.length} document(s) to migrate.`);

      for (const docSnap of snapshot.docs) {
        const docId = docSnap.id;
        const data = docSnap.data();

        // 1. Copy document to top-level root collection
        const newDocRef = doc(db, newColPath, docId);
        await setDoc(newDocRef, data, { merge: true });
        console.log(`   ✅ Copied document [${docId}] to root collection '${newColPath}'`);
        totalMigrated++;

        // 2. Handle subcollections if documents collection (e.g. version history)
        if (colName === 'documents') {
          const oldVersionsPath = `${oldColPath}/${docId}/versions`;
          const newVersionsPath = `${newColPath}/${docId}/versions`;
          try {
            const versionsSnap = await getDocs(collection(db, oldVersionsPath));
            for (const vSnap of versionsSnap.docs) {
              await setDoc(doc(db, newVersionsPath, vSnap.id), vSnap.data(), { merge: true });
              console.log(`      ↳ Copied version document [${vSnap.id}]`);
              if (deleteOld) {
                await deleteDoc(doc(db, oldVersionsPath, vSnap.id));
              }
            }
          } catch (vErr) {
            // Ignore if subcollection doesn't exist
          }
        }

        // 3. Delete old document from tap/default if requested
        if (deleteOld) {
          const oldDocRef = doc(db, oldColPath, docId);
          await deleteDoc(oldDocRef);
          console.log(`   🗑️ Deleted old document [${docId}] from '${oldColPath}'`);
          totalDeleted++;
        }
      }
    } catch (err: any) {
      console.error(`   ❌ Error migrating ${oldColPath}:`, err?.message || err);
    }
  }

  console.log('\n==================================================');
  console.log(`🎉 Migration Completed Successfully!`);
  console.log(`   Total Documents Migrated to Root: ${totalMigrated}`);
  if (deleteOld) {
    console.log(`   Total Old Documents Deleted: ${totalDeleted}`);
  }
  console.log('==================================================\n');
}

// Auto-run if executed directly via Node
if (require.main === module) {
  migrateFirestoreStructure(true).catch((err) => {
    console.error('Fatal error during migration:', err);
    process.exit(1);
  });
}
