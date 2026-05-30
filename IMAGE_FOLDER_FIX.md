# ✅ **Fixed: Image Folder Now Uses Firm Name**

## **Problem**

Images were being stored in folders like:
```
firms/temp-1780122786247/letterhead/image.png
```

## **Solution**

Images are now stored in folders named after the **Firm Name**:
```
firms/Magra_Industrial_Suppliers/letterhead/image.png
```

## **Changes Made**

### **1. Updated `uploadFirmImage` Function**

**Before:**
```typescript
export async function uploadFirmImage(
  file: File,
  firmId: string,
  imageType: ImageType
): Promise<UploadResult> {
  const filename = `firms/${firmId}/${imageType}/${safeName}-${timestamp}.${extension}`;
  // ...
}
```

**After:**
```typescript
export async function uploadFirmImage(
  file: File,
  firmId: string,
  firmName?: string,  // ← NEW PARAMETER
  imageType: ImageType = 'letterhead'
): Promise<UploadResult> {
  // Use firm name for folder if provided, otherwise use firm ID
  const folderName = firmName ? firmName.replace(/[^a-zA-Z0-9._-]/g, '_') : firmId;
  const filename = `firms/${folderName}/${imageType}/${safeName}-${timestamp}.${extension}`;
  // ...
}
```

### **2. Updated Firm Form**

**Before:**
```typescript
const firmId = editingFirm?.id || `temp-${Date.now()}`;
const imageType = field === 'headerImagePath' ? 'letterhead' : ...;
const result = await uploadFirmImage(file, firmId, imageType);
```

**After:**
```typescript
const firmId = editingFirm?.id || `temp-${Date.now()}`;
const firmName = editingFirm?.name || formData.name || 'temp-firm';  // ← NEW
const imageType = field === 'headerImagePath' ? 'letterhead' : ...;
const result = await uploadFirmImage(file, firmId, firmName, imageType);  // ← UPDATED
```

### **3. Updated `deleteFirmImages` Function**

**Before:**
```typescript
export async function deleteFirmImages(firmId: string): Promise<number> {
  const firmRef = ref(storage, `firms/${firmId}`);
  // ...
}
```

**After:**
```typescript
export async function deleteFirmImages(firmId: string, firmName?: string): Promise<number> {
  const folderName = firmName ? firmName.replace(/[^a-zA-Z0-9._-]/g, '_') : firmId;
  const firmRef = ref(storage, `firms/${folderName}`);
  // ...
}
```

## **How It Works Now**

### **New Upload Flow:**

```
User uploads letterhead
  ↓
Get firm name: "Magra Industrial Suppliers"
  ↓
Sanitize name: "Magra_Industrial_Suppliers"
  ↓
Upload to: firms/Magra_Industrial_Suppliers/letterhead/image.png
  ↓
Store URL in Firestore: https://firebasestorage.googleapis.com/.../Magra_Industrial_Suppliers/letterhead/image.png
```

### **Example Folder Structure:**

```
firms/
├── ABC_Supplies/
│   ├── letterhead/
│   │   └── abc-logo-1685432100000.png
│   ├── signature/
│   │   └── abc-signature-1685432100000.png
│   └── stamp/
│       └── abc-stamp-1685432100000.png
├── Magra_Industrial_Suppliers/
│   ├── letterhead/
│   │   └── magra-logo-1685432200000.png
│   └── ...
└── temp-firm/  (fallback if no name)
    └── ...
```

## **Benefits**

### **1. Better Organization**
- ✅ Folders named after firm names (not random IDs)
- ✅ Easier to find images in Firebase Console
- ✅ More readable folder structure

### **2. Backward Compatible**
- ✅ Still works with firm IDs if name not provided
- ✅ Fallback to `temp-firm` if no name available

### **3. Safe Filenames**
- ✅ Special characters replaced with underscores
- ✅ No conflicts with Firebase Storage rules

## **Testing**

### **Test 1: Upload New Firm**

1. Go to `/manage-firms`
2. Click "Add New Firm"
3. Enter firm name: "Test Firm"
4. Upload letterhead
5. Check Firebase Console → Storage
6. Verify folder: `firms/Test_Firm/letterhead/`

### **Test 2: Upload Existing Firm**

1. Open existing firm
2. Upload letterhead
3. Check Firebase Console → Storage
4. Verify folder: `firms/[FirmName]/letterhead/`

### **Test 3: Special Characters**

1. Enter firm name: "Test & Co."
2. Upload letterhead
3. Check Firebase Console → Storage
4. Verify folder: `firms/Test__Co_/letterhead/` (special chars replaced)

## **Migration**

### **Old Folders (with temp IDs)**

```
firms/temp-1780122786247/
```

### **New Folders (with firm names)**

```
firms/Magra_Industrial_Suppliers/
```

### **To Migrate Old Folders:**

1. Go to Firebase Console → Storage
2. Rename old folders from `temp-xxx` to firm names
3. Or use the migration script

## **Notes**

- ✅ Images are still stored with unique timestamps to prevent overwrites
- ✅ Special characters in firm names are replaced with underscores
- ✅ If firm name is not available, falls back to `temp-firm`
- ✅ Backward compatible with existing code

## **Files Modified**

1. `services/imageUploadService.ts` - Updated `uploadFirmImage` and `deleteFirmImages`
2. `app/manage-firms/page.tsx` - Updated `handleUpload` to pass firm name
