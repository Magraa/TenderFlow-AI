import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { numberToWords } from '../lib/numberToWords';

// Load environment variables from .env or .env.local
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

// Command line arguments support
const defaultJsonFile = 'scripts/data/Shivlink_bill_data.json';
const defaultFirmId = 'fb578d09-09b5-4683-ba15-f566a312b3b2';

const argFile = process.argv[2] || defaultJsonFile;
const argFirmId = process.argv[3] || defaultFirmId;

/**
 * Generate a unique signature key for a bill to filter out exact duplicates
 * (Same Invoice Number + Same Recipient + Same Items + Same Date)
 */
function getBillDedupeKey(b: any): string {
  const inv = String(b.Invoice_no || '').trim().toLowerCase();
  const recipient = (Array.isArray(b.receiver_name) ? b.receiver_name : [])
    .map((s: any) => String(s).trim())
    .join('\n')
    .toLowerCase();

  const items = (Array.isArray(b.items) ? b.items : [])
    .map(
      (i: any[]) =>
        `${String(i[0] || '').trim().toLowerCase()}:${String(i[1] || '').trim()}:${String(i[2] || '').trim().toLowerCase()}:${String(i[3] || '').trim()}`
    )
    .join(';');

  const rawDate = String(b.Date || '').trim();
  const dateKey = rawDate.includes('..') ? '' : rawDate.toLowerCase();

  return `${inv}::${recipient}::${items}::${dateKey}`;
}

async function importBillsScript() {
  console.log('🚀 Starting Deduplicated Bills Import...');
  console.log(`Target Firebase Project: ${firebaseConfig.projectId}`);
  console.log(`Target Data File: ${argFile}`);
  console.log(`Target Firm ID: ${argFirmId}`);

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('Missing Firebase configuration in environment variables.');
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);

  try {
    const userCredential = await signInAnonymously(auth);
    console.log(`🔑 Authenticated anonymously as UID: ${userCredential.user.uid}`);
  } catch (authErr: any) {
    console.warn(`⚠️ Anonymous auth note (${authErr?.message || authErr}). Continuing...`);
  }

  const db = getFirestore(app);

  // Read data
  const jsonPath = path.resolve(process.cwd(), argFile);
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Data file not found at ${jsonPath}`);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const jsonBills: any[] = JSON.parse(rawData);
  console.log(`📄 Read ${jsonBills.length} total bill records from JSON.`);

  // 1. Deduplicate Bills
  const seenBillKeys = new Set<string>();
  const uniqueBills: any[] = [];

  jsonBills.forEach((b) => {
    const key = getBillDedupeKey(b);
    if (!seenBillKeys.has(key)) {
      seenBillKeys.add(key);
      uniqueBills.push(b);
    }
  });

  const duplicateCount = jsonBills.length - uniqueBills.length;
  console.log(`🔍 Deduplication results: ${duplicateCount} exact duplicate bills skipped. ${uniqueBills.length} unique bills remain for import.`);

  // 2. Process Item Mappings (Raw Name Only)
  const itemOccurrences = new Map<string, number>();
  uniqueBills.forEach((b) => {
    if (Array.isArray(b.items)) {
      b.items.forEach((itemRow: any[]) => {
        const rawName = itemRow && itemRow[0] ? String(itemRow[0]).trim() : '';
        if (rawName) {
          itemOccurrences.set(rawName, (itemOccurrences.get(rawName) || 0) + 1);
        }
      });
    }
  });

  console.log(`\n📦 Found ${itemOccurrences.size} unique raw item names.`);

  // Fetch existing item mappings to prevent overwriting
  const existingMappingsSnap = await getDocs(collection(db, 'itemHindiMappings'));
  const existingRawNames = new Set<string>();
  existingMappingsSnap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.rawName) existingRawNames.add(data.rawName.toLowerCase().trim());
  });

  let newMappingsCreated = 0;
  const now = new Date().toISOString();

  for (const [rawName, usageCount] of itemOccurrences.entries()) {
    const lowerName = rawName.toLowerCase().trim();
    if (!existingRawNames.has(lowerName)) {
      const docId = uuid();
      const mappingDoc = {
        id: docId,
        rawName: rawName,
        rawDescription: '',
        englishName: '',
        hindiName: '',
        englishDescription: '',
        hindiDescription: '',
        altHindiName: '',
        altHindiName2: '',
        altEnglishName1: '',
        altEnglishName2: '',
        type: 'item',
        usageCount: usageCount,
        isAutoGenerated: false,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'itemHindiMappings', docId), mappingDoc);
      existingRawNames.add(lowerName);
      newMappingsCreated++;
    }
  }
  console.log(`✅ Stored ${newMappingsCreated} new raw item mappings in 'itemHindiMappings' collection.`);

  // 3. Process and import Unique Bills
  let billsImported = 0;

  for (const b of uniqueBills) {
    const rawDate = (b.Date || '').trim();
    const invoiceDate = (rawDate.includes('..') || rawDate === '') ? '' : rawDate;

    const receiverNameArr = Array.isArray(b.receiver_name)
      ? b.receiver_name.map((s: any) => String(s).trim())
      : [];

    const recipientDesignation = receiverNameArr[0] || '';
    const recipientDepartment = receiverNameArr[1] || '';
    const recipientDistrict = receiverNameArr[2] || '';
    const recipientAddress = receiverNameArr.join('\n');

    const billItems: any[] = [];
    let subtotal = 0;

    if (Array.isArray(b.items)) {
      b.items.forEach((itemRow: any[]) => {
        if (!itemRow || itemRow.length === 0) return;
        const productName = String(itemRow[0] || '').trim();
        const quantity = parseFloat(String(itemRow[1] || '0')) || 0;
        const unit = String(itemRow[2] || 'pcs').trim();
        const rate = parseFloat(String(itemRow[3] || '0')) || 0;
        const amount = Math.round(quantity * rate * 100) / 100;

        subtotal += amount;

        billItems.push({
          id: uuid(),
          productName,
          description: '',
          quantity,
          unit,
          rate,
          amount,
        });
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;

    const gstVal = typeof b.gst === 'number' ? b.gst : parseFloat(String(b.gst || '9.0')) || 9.0;
    const sgstPercent = gstVal;
    const cgstPercent = gstVal;
    const igstPercent = 0;

    const sgstAmount = Math.round((subtotal * sgstPercent / 100) * 100) / 100;
    const cgstAmount = Math.round((subtotal * cgstPercent / 100) * 100) / 100;
    const igstAmount = 0;

    const grandTotal = Math.round((subtotal + sgstAmount + cgstAmount + igstAmount) * 100) / 100;
    const amountInWords = numberToWords(grandTotal);

    const billId = uuid();
    const billDoc = {
      id: billId,
      invoiceNumber: String(b.Invoice_no || ''),
      invoiceDate,
      firmId: argFirmId,
      recipientAddress,
      recipientDesignation,
      recipientDepartment,
      recipientDistrict,
      items: billItems,
      sgstPercent,
      cgstPercent,
      igstPercent,
      totalAmount: subtotal,
      sgstAmount,
      cgstAmount,
      igstAmount,
      grandTotal,
      amountInWords,
      status: 'final',
      showLetterheadBackground: true,
      includeSignature: true,
      includeStamp: true,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'bills', billId), billDoc);
    billsImported++;
  }

  console.log(`\n🎉 Successfully imported ${billsImported} deduplicated bills into Firestore collection 'bills'.`);
  console.log(`Summary:`);
  console.log(` - Firm ID: ${argFirmId}`);
  console.log(` - Item Mappings Added: ${newMappingsCreated} (Raw names only, English/Hindi blank)`);
  console.log(` - Duplicates Filtered: ${duplicateCount}`);
  console.log(` - Total Unique Bills Created: ${billsImported}`);
}

importBillsScript().catch((err) => {
  console.error('❌ Error during import:', err);
  process.exit(1);
});
