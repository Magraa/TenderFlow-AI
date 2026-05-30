# Firebase Storage - Quick Reference

## 🚀 Quick Start

### 1. Enable Storage in Firebase Console
```
Firebase Console → Storage → Get Started
→ Start in production mode
→ Select region (e.g., us-central1)
→ Done
```

### 2. Deploy Storage Rules
```
Firebase Console → Storage → Rules
→ Paste contents of storage.rules
→ Publish
```

### 3. Update .env
```bash
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
```

### 4. Upload Image
```typescript
import { uploadFirmImage } from '@/services/imageUploadService';

const url = await uploadFirmImage(file, firmId, 'letterhead');
```

### 5. Delete Image
```typescript
import { deleteFirmImage } from '@/services/imageUploadService';

await deleteFirmImage(imageUrl);
```

---

## 📋 API Reference

### `uploadFirmImage(file, firmId, imageType)`

Uploads an image to Firebase Storage.

**Parameters:**
- `file` (File): The image file to upload
- `firmId` (string): The firm ID (for organization)
- `imageType` ('letterhead' | 'signature' | 'stamp'): Type of image

**Returns:**
```typescript
{
  url: string;           // Download URL
  fileName: string;      // Storage path
  fileSize: number;      // Size in bytes
  mimeType: string;      // MIME type
}
```

**Example:**
```typescript
const result = await uploadFirmImage(file, 'abc123', 'letterhead');
console.log(result.url); // "https://firebasestorage.googleapis.com/..."
```

---

### `uploadFirmImageWithProgress(file, firmId, imageType, onProgress)`

Uploads with progress tracking.

**Parameters:**
- `file` (File): The image file to upload
- `firmId` (string): The firm ID
- `imageType` (string): Type of image
- `onProgress` (function): Callback with progress (0-100)

**Returns:** Same as `uploadFirmImage`

**Example:**
```typescript
await uploadFirmImageWithProgress(file, 'abc123', 'signature', (progress) => {
  console.log(`Upload progress: ${progress}%`);
});
```

---

### `deleteFirmImage(url)`

Deletes an image from Firebase Storage.

**Parameters:**
- `url` (string): The download URL of the image

**Returns:** `Promise<boolean>` - true if deleted

**Example:**
```typescript
await deleteFirmImage('https://firebasestorage.googleapis.com/...');
```

---

### `deleteFirmImages(firmId)`

Deletes all images for a firm.

**Parameters:**
- `firmId` (string): The firm ID

**Returns:** `Promise<number>` - Number of images deleted

**Example:**
```typescript
const count = await deleteFirmImages('abc123');
console.log(`Deleted ${count} images`);
```

---

### `validateImageFile(file, imageType)`

Validates an image file before upload.

**Parameters:**
- `file` (File): The image file to validate
- `imageType` (string): Type of image

**Returns:**
```typescript
{
  valid: boolean;
  error?: string; // Error message if invalid
}
```

**Example:**
```typescript
const validation = validateImageFile(file, 'letterhead');
if (!validation.valid) {
  console.error(validation.error);
}
```

---

## 📁 File Structure

```
firms/
├── {firmId}/
│   ├── letterhead/
│   │   └── {filename}-{timestamp}.png
│   ├── signature/
│   │   └── {filename}-{timestamp}.png
│   └── stamp/
│       └── {filename}-{timestamp}.png
└── temp/
    └── {userId}/
        └── {filename}-{timestamp}.png
```

---

## 🔒 Security Rules

### Storage Rules Summary

```javascript
// Read: Any authenticated user
allow read: if isAuthenticated();

// Write: Authenticated + valid file
allow write: if isAuthenticated() &&
                    isFileSizeValid() &&    // < 2MB
                    isImageTypeValid() &&   // image/*
                    isFileNameValid() &&    // alphanumeric
                    imageType in ['letterhead', 'signature', 'stamp'];
```

---

## 🛠️ Common Tasks

### Upload Multiple Images

```typescript
const letterheadUrl = await uploadFirmImage(letterheadFile, firmId, 'letterhead');
const signatureUrl = await uploadFirmImage(signatureFile, firmId, 'signature');
const stampUrl = await uploadFirmImage(stampFile, firmId, 'stamp');
```

### Delete All Images for a Firm

```typescript
const count = await deleteFirmImages(firmId);
console.log(`Deleted ${count} images`);
```

### Check if Image is Base64

```typescript
function isBase64(url: string): boolean {
  return url.startsWith('data:');
}

if (isBase64(firm.headerImagePath)) {
  // Need to migrate to storage
}
```

### Convert Base64 to File

```typescript
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
```

---

## 📊 Error Handling

### Common Errors

```typescript
try {
  const url = await uploadFirmImage(file, firmId, 'letterhead');
} catch (error) {
  if (error instanceof Error) {
    switch (error.message) {
      case 'File exceeds 2MB limit':
        // Show user-friendly message
        break;
      case 'File must be PNG, JPEG, or WebP':
        // Show file type error
        break;
      default:
        console.error('Upload failed:', error);
    }
  }
}
```

---

## 🧪 Testing

### Test Upload

```typescript
// In browser console
const file = new File(['test'], 'test.png', { type: 'image/png' });
const url = await uploadFirmImage(file, 'test-id', 'letterhead');
console.log('URL:', url);
```

### Test Delete

```typescript
await deleteFirmImage('https://firebasestorage.../test.png');
console.log('Deleted');
```

---

## 📝 Migration

### Using the UI

```
1. Navigate to /migrate-images
2. Click "Start Migration"
3. Wait for completion
4. Verify all firms have storage URLs
```

### Using the Script

```bash
# Run in browser console
migrateImages()

# Or use Node.js
node scripts/migrate-images.js
```

---

## 🎯 Best Practices

### 1. Always Validate Files

```typescript
const validation = validateImageFile(file, 'letterhead');
if (!validation.valid) {
  alert(validation.error);
  return;
}
```

### 2. Show Upload Progress

```typescript
await uploadFirmImageWithProgress(file, firmId, 'letterhead', (progress) => {
  setProgress(progress);
});
```

### 3. Delete Old Images

```typescript
// Before uploading new image
if (firm.headerImagePath) {
  await deleteFirmImage(firm.headerImagePath);
}
```

### 4. Handle Errors Gracefully

```typescript
try {
  await uploadFirmImage(file, firmId, 'letterhead');
} catch (error) {
  setError('Failed to upload image. Please try again.');
}
```

---

## 📚 Additional Resources

- **Setup Guide**: `FIREBASE_STORAGE_SETUP.md`
- **Implementation Summary**: `FIREBASE_STORAGE_IMPLEMENTATION_SUMMARY.md`
- **Firebase Docs**: https://firebase.google.com/docs/storage
- **Storage Rules**: https://firebase.google.com/docs/storage/security
