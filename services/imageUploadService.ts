import { getFirebaseStorage } from '@/services/firebase/firebaseClient';
import { ref, uploadBytes, getDownloadURL, deleteObject, uploadBytesResumable, StorageError } from 'firebase/storage';
import { v4 as uuid } from 'uuid';

export type ImageType = 'letterhead' | 'signature' | 'stamp';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB limit
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

interface UploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File, imageType: ImageType): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `${imageType} image exceeds 2MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `${imageType} image must be PNG, JPEG, or WebP format. Found: ${file.type}`,
    };
  }

  return { valid: true };
}

/**
 * Upload image to Firebase Storage
 * @param file - The image file to upload
 * @param firmId - The firm ID (used for organization)
 * @param firmName - The firm name (used for folder name, optional)
 * @param imageType - Type of image (letterhead, signature, or stamp)
 * @returns UploadResult with download URL
 */
export async function uploadFirmImage(
  file: File,
  firmId: string,
  firmName?: string,
  imageType: ImageType = 'letterhead'
): Promise<UploadResult> {
  // Validate file
  const validation = validateImageFile(file, imageType);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const storage = getFirebaseStorage();

  // Use firm name for folder if provided, otherwise use firm ID
  const folderName = firmName ? firmName.replace(/[^a-zA-Z0-9._-]/g, '_') : firmId;
  
  // Generate unique filename with timestamp
  const timestamp = Date.now();
  const extension = file.name.split('.').pop() || 'png';
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `firms/${folderName}/${imageType}/${safeName}-${timestamp}.${extension}`;

  // Create storage reference
  const storageRef = ref(storage, filename);

  try {
    // Upload file
    const snapshot = await uploadBytes(storageRef, file);

    // Get download URL
    const downloadUrl = await getDownloadURL(snapshot.ref);

    return {
      url: downloadUrl,
      fileName: snapshot.metadata.name || filename,
      fileSize: snapshot.metadata.size,
      mimeType: snapshot.metadata.contentType || file.type,
    };
  } catch (error) {
    const storageError = error as StorageError;
    console.error(`Error uploading ${imageType} image:`, storageError);
    throw new Error(`Failed to upload ${imageType} image: ${storageError.message}`);
  }
}

/**
 * Upload image with progress tracking
 * @param file - The image file to upload
 * @param firmId - The firm ID (used for organization)
 * @param imageType - Type of image (letterhead, signature, or stamp)
 * @param onProgress - Callback for progress updates (0-100)
 * @returns UploadResult with download URL
 */
export async function uploadFirmImageWithProgress(
  file: File,
  firmId: string,
  imageType: ImageType,
  onProgress: (progress: number) => void
): Promise<UploadResult> {
  // Validate file
  const validation = validateImageFile(file, imageType);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const storage = getFirebaseStorage();

  // Generate unique filename
  const timestamp = Date.now();
  const extension = file.name.split('.').pop() || 'png';
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `firms/${firmId}/${imageType}/${safeName}-${timestamp}.${extension}`;

  // Create storage reference
  const storageRef = ref(storage, filename);

  try {
    // Upload with progress tracking
    const snapshot = await uploadBytesResumable(storageRef, file);

    // Track progress
    snapshot.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(progress);
      },
      (error) => {
        console.error(`Error uploading ${imageType} image:`, error);
        throw error;
      },
      async () => {
        // Upload complete
        onProgress(100);
      }
    );

    // Wait for upload to complete
    await new Promise<void>((resolve, reject) => {
      snapshot.on(
        'state_changed',
        () => {},
        reject,
        resolve
      );
    });

    // Get download URL
    const downloadUrl = await getDownloadURL(snapshot.ref);

    return {
      url: downloadUrl,
      fileName: snapshot.metadata.name || filename,
      fileSize: snapshot.metadata.size,
      mimeType: snapshot.metadata.contentType || file.type,
    };
  } catch (error) {
    const storageError = error as StorageError;
    console.error(`Error uploading ${imageType} image:`, storageError);
    throw new Error(`Failed to upload ${imageType} image: ${storageError.message}`);
  }
}

/**
 * Delete image from Firebase Storage
 * @param url - The download URL of the image to delete
 * @returns true if deleted successfully
 */
export async function deleteFirmImage(url: string): Promise<boolean> {
  const storage = getFirebaseStorage();

  try {
    // Extract path from URL
    // URL format: https://storage.googleapis.com/bucket/path/to/file
    const path = url.replace(/https?:\/\/[^/]+/, '');

    // Create reference and delete
    const imageRef = ref(storage, path);
    await deleteObject(imageRef);

    return true;
  } catch (error) {
    const storageError = error as StorageError;
    console.error('Error deleting image:', storageError);

    // Don't throw error if file doesn't exist (already deleted)
    if (storageError.code === 'storage/object-not-found') {
      return true;
    }

    throw new Error(`Failed to delete image: ${storageError.message}`);
  }
}

/**
 * Delete all images for a firm
 * @param firmId - The firm ID
 * @param firmName - The firm name (optional, for folder organization)
 * @returns Number of images deleted
 */
export async function deleteFirmImages(firmId: string, firmName?: string): Promise<number> {
  const storage = getFirebaseStorage();
  let deletedCount = 0;

  try {
    // Use firm name for folder if provided, otherwise use firm ID
    const folderName = firmName ? firmName.replace(/[^a-zA-Z0-9._-]/g, '_') : firmId;
    
    // List all images for this firm
    const firmRef = ref(storage, `firms/${folderName}`);
    const listResult = await listAll(firmRef);

    // Delete all images
    const deletePromises = listResult.items.map(async (itemRef) => {
      await deleteObject(itemRef);
      deletedCount++;
    });

    await Promise.all(deletePromises);

    // Also delete subdirectories (letterhead, signature, stamp)
    const subdirs = ['letterhead', 'signature', 'stamp'];
    for (const subdir of subdirs) {
      try {
        const subdirRef = ref(storage, `firms/${folderName}/${subdir}`);
        const subdirResult = await listAll(subdirRef);
        const subdirDeletePromises = subdirResult.items.map(async (itemRef) => {
          await deleteObject(itemRef);
          deletedCount++;
        });
        await Promise.all(subdirDeletePromises);
      } catch (error) {
        // Subdirectory might not exist, ignore
        console.debug(`Subdirectory firms/${folderName}/${subdir} not found`);
      }
    }

    return deletedCount;
  } catch (error) {
    console.error('Error listing firm images:', error);
    return deletedCount;
  }
}

// Import listAll for the deleteFirmImages function
import { listAll } from 'firebase/storage';
