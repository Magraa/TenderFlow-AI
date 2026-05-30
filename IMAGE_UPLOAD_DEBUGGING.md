# Letterhead Image Not Showing in Preview - Debugging Guide

## 🐛 **Problem**

User uploaded letterhead image to Firebase Storage, but it's not showing in the preview tab.

## 🔍 **Root Cause Analysis**

### **Possible Issues:**

1. **Firebase Storage URL not being stored correctly**
2. **CORS issues preventing image loading**
3. **Preview component not re-rendering**
4. **Storage rules blocking access**
5. **URL format issue (Base64 vs Firebase URL)**

## ✅ **Fixes Applied**

### **1. Added Debug Logging**

```typescript
// In handleUpload function
console.log(`Uploading ${imageType} image for firm ${firmId}...`);
const result = await uploadFirmImage(file, firmId, imageType);
console.log(`Upload successful! URL:`, result.url);
```

### **2. Added Visual Debug Indicator**

```typescript
// In PreviewFrame component
{showLetterheadBackground && formData.headerImagePath ? (
  <>
    <div
      className="absolute inset-0 bg-top bg-no-repeat"
      style={{ backgroundImage: `url(${formData.headerImagePath})`, ...fitStyle }}
    />
    {/* Debug: Show URL in preview */}
    <div className="absolute bottom-2 left-2 z-50 rounded bg-black/70 px-2 py-1 text-[10px] font-mono text-white">
      <span className="truncate max-w-[200px]">{formData.headerImagePath}</span>
    </div>
  </>
) : showLetterheadBackground && !formData.headerImagePath ? (
  <div className="absolute inset-0 flex items-center justify-center rounded-md bg-slate-100">
    <p className="text-sm text-slate-500">No letterhead uploaded</p>
  </div>
) : null}
```

### **3. Added Console Logging**

```typescript
// Debug: Log letterhead URL
useEffect(() => {
  if (formData.headerImagePath) {
    console.log('Preview letterhead URL:', formData.headerImagePath);
    console.log('Is Firebase URL:', formData.headerImagePath.startsWith('https://firebasestorage.googleapis.com/'));
  }
}, [formData.headerImagePath]);
```

### **4. Added Success Message**

```typescript
// Show success message after upload
setSuccess(`${imageType} image uploaded successfully!`);
setTimeout(() => setSuccess(''), 3000);
```

### **5. Added Error Handling**

```typescript
// Better error handling with console logging
} catch (uploadError) {
  const message = uploadError instanceof Error ? uploadError.message : 'Upload failed.';
  setError(message);
  console.error('Upload error:', uploadError);
  setFormData((prev) => ({ ...prev, [`${field}Loading`]: false }));
}
```

## 🧪 **How to Debug**

### **Step 1: Check Browser Console**

1. Open browser DevTools (F12)
2. Go to Console tab
3. Upload an image
4. Look for these logs:
   ```
   Uploading letterhead image for firm temp-1234567890...
   Upload successful! URL: https://firebasestorage.googleapis.com/...
   Preview letterhead URL: https://firebasestorage.googleapis.com/...
   Is Firebase URL: true
   ```

### **Step 2: Check Preview Component**

1. Look at the preview tab
2. You should see:
   - The letterhead image (if upload successful)
   - A small black box at bottom-left showing the URL
   - Or "No letterhead uploaded" message (if no image)

### **Step 3: Check Firebase Console**

1. Go to Firebase Console → Storage
2. Navigate to `firms/{firmId}/letterhead/`
3. Verify the file exists
4. Click on the file to get the download URL
5. Compare with the URL shown in preview

### **Step 4: Test Image URL**

1. Copy the URL from the preview debug box
2. Paste it in a new browser tab
3. Verify the image loads
4. If it doesn't load, check:
   - CORS settings
   - Storage rules
   - File permissions

## 🛠️ **Common Issues & Solutions**

### **Issue 1: "No letterhead uploaded" message**

**Cause:** Image URL not being stored

**Solution:**
1. Check browser console for upload errors
2. Verify Firebase Storage is enabled
3. Check `.env` file has correct Storage bucket

### **Issue 2: Image shows "No letterhead uploaded" but URL is visible**

**Cause:** CORS or network issue

**Solution:**
1. Check browser Network tab for 403/404 errors
2. Verify Storage rules allow read access
3. Check CORS settings in Firebase Console

### **Issue 3: Upload succeeds but image doesn't show**

**Cause:** Preview component not re-rendering

**Solution:**
1. Check console for "Preview letterhead URL" log
2. Verify URL starts with `https://firebasestorage.googleapis.com/`
3. Check if `showLetterheadBackground` checkbox is checked

### **Issue 4: "Permission denied" error**

**Cause:** Storage rules blocking access

**Solution:**
1. Deploy storage rules to Firebase Console
2. Check rules allow authenticated users to read
3. Verify user is logged in

## 📋 **Testing Checklist**

- [ ] Firebase Storage enabled in Firebase Console
- [ ] Storage rules deployed
- [ ] `.env` file has correct Storage bucket
- [ ] Upload succeeds (check console logs)
- [ ] URL starts with `https://firebasestorage.googleapis.com/`
- [ ] Preview shows debug URL
- [ ] Image loads in new browser tab
- [ ] `showLetterheadBackground` checkbox is checked

## 🎯 **Quick Test**

1. Navigate to `/test-image` page
2. Click "Upload Test Image"
3. Verify image uploads and displays
4. Check console for logs

## 📝 **Expected Behavior**

### **After Upload:**

```
Console logs:
- "Uploading letterhead image for firm temp-123..."
- "Upload successful! URL: https://firebasestorage.googleapis.com/..."
- "Preview letterhead URL: https://firebasestorage.googleapis.com/..."
- "Is Firebase URL: true"

UI:
- Success message: "letterhead image uploaded successfully!"
- Preview shows letterhead image
- Preview shows debug URL at bottom-left
```

### **If Upload Fails:**

```
Console logs:
- "Uploading letterhead image for firm temp-123..."
- "Upload error: [error message]"

UI:
- Error message: "[error message]"
- No success message
- Preview shows "No letterhead uploaded"
```

## 🚀 **Next Steps**

1. Test the upload with the `/test-image` page
2. Check browser console for logs
3. Verify Firebase Storage has the file
4. Check Storage rules are correct
5. If still not working, share console logs
