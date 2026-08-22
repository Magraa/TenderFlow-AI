# Firebase Storage Setup Guide

## Overview

This document explains how to set up Firebase Storage for firm branding assets (letterhead, signature, stamp images).

## What Changed?

### Before (Base64 Storage)
- Images stored as Base64 strings in Firestore documents
- 100KB image → ~133KB Base64 string
- 3 images per firm → ~400KB per firm document
- Firestore limit: 1MB per document → Only 2-3 firms possible!

### After (Firebase Storage)
- Images uploaded to Firebase Storage
- Firestore stores only URLs (5KB per firm)
- Unlimited firms possible
- Images served via CDN
- Automatic compression and optimization

## Setup Steps

### Step 1: Enable Firebase Storage

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `auto-tender-pro`
3. Click on **Storage** in the left sidebar
4. Click **Get Started**
5. Choose **Start in production mode** (or test mode for development)
6. Select your region (e.g., `us-central1`)
7. Click **Done**

### Step 2: Configure Storage Rules

1. Go to **Storage** → **Rules** tab
2. Replace the default rules with the rules from `firestore.rules` file
3. Click **Publish**

**Storage Rules Summary:**
- Authenticated users can read/write images
- Max file size: 2MB
- Only image files allowed (PNG, JPEG, WebP)
- Files organized by firm ID and image type

### Step 3: Update Environment Variables

Add these to your `.env` file:

```bash
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=auto-tender-pro.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1024282764045
```

### Step 4: Deploy Storage Rules (Optional)

If you want to deploy rules via Firebase CLI:

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy rules
firebase deploy --only storage
```

## File Structure

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

## Usage

### Upload Image

```typescript
import { uploadFirmImage } from '@/services/imageUploadService';

const result = await uploadFirmImage(file, firmId, 'letterhead');
// result.url = "https://firebasestorage.googleapis.com/..."
// result.fileName = "firms/abc123/letterhead/image.png-1234567890"
// result.fileSize = 102400
// result.mimeType = "image/png"
```

### Delete Image

```typescript
import { deleteFirmImage } from '@/services/imageUploadService';

await deleteFirmImage(imageUrl);
```

### Delete All Images for a Firm

```typescript
import { deleteFirmImages } from '@/services/imageUploadService';

const deletedCount = await deleteFirmImages(firmId);
// Returns number of images deleted
```

## Storage Rules Reference

### Read Rules
```javascript
allow read: if isAuthenticated();
```
- Any authenticated user can read images

### Write Rules
```javascript
allow write: if isAuthenticated() &&
                    isFileSizeValid() &&
                    isImageTypeValid() &&
                    isFileNameValid() &&
                    imageType in ['letterhead', 'signature', 'stamp'];
```
- Must be authenticated
- File size < 2MB
- File type must be image
- File name must be alphanumeric
- Image type must be one of: letterhead, signature, stamp

## Cost Estimation

### Free Tier (Spark Plan)
- 5GB storage
- 1GB downloads per day
- Sufficient for 100+ firms

### Paid Tier (Blaze Plan)
- Pay per usage
- ~$0.026/GB storage
- ~$0.12/GB downloads

### Example Costs
- 100 firms × 3 images × 100KB = 30MB storage
- Monthly cost: ~$0.0008 (negligible)

## Migration from Base64 to Storage

### Step 1: Export Current Data

```typescript
// Run in browser console
const json = await db.exportDatabase();
downloadFile('backup-before-storage.json', json);
```

### Step 2: Upload Images to Storage

```typescript
// For each firm with Base64 images
for (const firm of firms) {
  if (firm.headerImagePath?.startsWith('data:')) {
    // Convert Base64 to file
    const response = await fetch(firm.headerImagePath);
    const blob = await response.blob();
    const file = new File([blob], 'letterhead.png', { type: 'image/png' });
    
    // Upload to storage
    const url = await uploadFirmImage(file, firm.id, 'letterhead');
    
    // Update firm with URL
    await dataService.firms.update(firm.id, { headerImagePath: url });
  }
}
```

### Step 3: Verify

```typescript
// Check that all firms have storage URLs
const firms = await dataService.firms.list();
const hasBase64 = firms.some(f => f.headerImagePath?.startsWith('data:'));
console.log('Has Base64 images:', hasBase64);
```

## Troubleshooting

### Error: "Permission denied"
- Check storage rules are deployed
- Verify user is authenticated
- Check file size and type constraints

### Error: "File not found"
- Verify the URL is correct
- Check if file was deleted
- Ensure storage bucket name is correct

### Images not loading
- Check browser console for CORS errors
- Verify storage bucket is public or images have read permissions
- Check network tab for 403/404 errors

## Security Best Practices

1. **Always validate file size** (max 2MB)
2. **Always validate file type** (images only)
3. **Use Firebase Authentication** (don't allow anonymous uploads)
4. **Organize files by user/firm** (prevents collisions)
5. **Delete old temp files** (use Cloud Functions)
6. **Monitor storage usage** (set up alerts)

## Monitoring

### Check Storage Usage

```bash
# Using Firebase CLI
firebase storage:ls

# Or check in Firebase Console
# Storage → Files → Total size
```

### Set Up Alerts

1. Go to **Firebase Console** → **Usage**
2. Click **Set up billing alerts**
3. Configure alerts for:
   - Storage usage > 80%
   - Downloads > 1GB/day

## Next Steps

1. ✅ Upload images to Firebase Storage
2. ✅ Store URLs in Firestore
3. ✅ Delete old Base64 images
4. ✅ Monitor storage usage
5. ✅ Set up Cloud Functions for auto-cleanup

## Support

For issues:
1. Check Firebase Console → Storage → Logs
2. Check browser console for errors
3. Verify storage rules are correct
4. Ensure Firebase SDK is properly initialized
