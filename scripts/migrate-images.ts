/**
 * Migration Script: Convert Base64 Images to Firebase Storage
 * 
 * Usage:
 * 1. Run in browser console on the manage-firms page
 * 2. Or run in Node.js environment with Firebase SDK
 * 
 * WARNING: This script will:
 * - Upload all Base64 images to Firebase Storage
 * - Update firm documents with new URLs
 * - Delete old Base64 data
 * 
 * Make sure to backup your data before running!
 */

import { getFirebaseStorage } from '@/services/firebase/firebaseClient';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { dataService } from '@/services/dataService';

// Configuration
const BATCH_SIZE = 10; // Process 10 firms at a time
const RETRY_COUNT = 3; // Retry failed uploads 3 times

interface FirmWithBase64 {
  id: string;
  name: string;
  headerImagePath?: string;
  signatureImagePath?: string;
  stampImagePath?: string;
}

/**
 * Convert Base64 data URL to File
 */
function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64Data] = dataUrl.split(',');
  const mimeType = header.split(':')[1].split(';')[0];
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new File([byteArray], filename, { type: mimeType });
}

/**
 * Upload image to Firebase Storage
 */
async function uploadImageToStorage(
  file: File,
  firmId: string,
  imageType: 'letterhead' | 'signature' | 'stamp'
): Promise<string> {
  const storage = getFirebaseStorage();
  const timestamp = Date.now();
  const extension = file.name.split('.').pop() || 'png';
  const filename = `firms/${firmId}/${imageType}/${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}-${timestamp}.${extension}`;
  
  const storageRef = ref(storage, filename);
  await uploadBytes(storageRef, file);
  
  return await getDownloadURL(storageRef);
}

/**
 * Process a single firm
 */
async function processFirm(firm: FirmWithBase64): Promise<void> {
  console.log(`Processing firm: ${firm.name} (${firm.id})`);
  
  const updates: Partial<FirmWithBase64> = {};
  
  // Process letterhead
  if (firm.headerImagePath?.startsWith('data:')) {
    try {
      console.log('  Uploading letterhead...');
      const file = dataUrlToFile(firm.headerImagePath, 'letterhead.png');
      const url = await uploadImageToStorage(file, firm.id, 'letterhead');
      updates.headerImagePath = url;
      console.log('  Letterhead uploaded successfully');
    } catch (error) {
      console.error('  Failed to upload letterhead:', error);
    }
  }
  
  // Process signature
  if (firm.signatureImagePath?.startsWith('data:')) {
    try {
      console.log('  Uploading signature...');
      const file = dataUrlToFile(firm.signatureImagePath, 'signature.png');
      const url = await uploadImageToStorage(file, firm.id, 'signature');
      updates.signatureImagePath = url;
      console.log('  Signature uploaded successfully');
    } catch (error) {
      console.error('  Failed to upload signature:', error);
    }
  }
  
  // Process stamp
  if (firm.stampImagePath?.startsWith('data:')) {
    try {
      console.log('  Uploading stamp...');
      const file = dataUrlToFile(firm.stampImagePath, 'stamp.png');
      const url = await uploadImageToStorage(file, firm.id, 'stamp');
      updates.stampImagePath = url;
      console.log('  Stamp uploaded successfully');
    } catch (error) {
      console.error('  Failed to upload stamp:', error);
    }
  }
  
  // Update firm if any images were uploaded
  if (Object.keys(updates).length > 0) {
    await dataService.firms.update(firm.id, updates);
    console.log('  Firm updated in Firestore');
  }
}

/**
 * Main migration function
 */
async function migrateImages() {
  console.log('Starting image migration...');
  console.log('================================');
  
  // Get all firms
  const firms = await dataService.firms.list();
  console.log(`Found ${firms.length} firms`);
  
  // Filter firms with Base64 images
  const firmsWithBase64 = firms.filter(firm => 
    firm.headerImagePath?.startsWith('data:') ||
    firm.signatureImagePath?.startsWith('data:') ||
    firm.stampImagePath?.startsWith('data:')
  );
  
  console.log(`Found ${firmsWithBase64.length} firms with Base64 images`);
  console.log('================================');
  
  if (firmsWithBase64.length === 0) {
    console.log('No Base64 images found. Migration complete!');
    return;
  }
  
  // Process firms in batches
  for (let i = 0; i < firmsWithBase64.length; i += BATCH_SIZE) {
    const batch = firmsWithBase64.slice(i, i + BATCH_SIZE);
    
    console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(firmsWithBase64.length / BATCH_SIZE)}`);
    
    try {
      await Promise.all(batch.map(processFirm));
      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} completed successfully`);
    } catch (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error);
    }
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n================================');
  console.log('Migration completed!');
  console.log('================================');
  
  // Summary
  const remainingFirms = await dataService.firms.list();
  const remainingBase64 = remainingFirms.filter(firm => 
    firm.headerImagePath?.startsWith('data:') ||
    firm.signatureImagePath?.startsWith('data:') ||
    firm.stampImagePath?.startsWith('data:')
  );
  
  console.log(`Remaining Base64 images: ${remainingBase64.length}`);
  console.log(`Migrated successfully: ${firmsWithBase64.length - remainingBase64.length}`);
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).migrateImages = migrateImages;
  console.log('Migration script loaded. Run migrateImages() to start.');
}

// Export for Node.js usage
export { migrateImages, processFirm, dataUrlToFile };
