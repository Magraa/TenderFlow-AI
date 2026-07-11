# Tender Automation System - User Guide

## Quick Start Guide

### Creating a New Tender

#### Step 1: Navigate to Create Tender
1. Go to `/tenders/new`
2. You'll see a professional 3-step workflow

#### Step 2: Fill Tender Information
**Required Fields**:
- **Tender Title**: Descriptive name (e.g., "Supply of Electrical Materials")
- **Department**: Select from dropdown (e.g., "Municipal Corporation", "नगर परिषद")
- **Language**: Hindi or English

**Required Fields** (always visible):
- **Place Name**: City/town name (e.g., "सेवड़ा") - Required for government document headers
- **District**: District name (e.g., "दतिया") - Required for government document headers

**Optional Fields**:
- **Tender Type**: Open/Limited/Single/Emergency (default: Open Tender)
- **Dates**: Publish, Submission, Opening dates

**Auto-Generated**:
- Tender Number (displayed in header)
- Status badge (Draft/Final)

Click **"Next: Add Items"** to proceed.

#### Step 3: Add Items
1. Click **"Add Item"** button
2. Fill item details:
   - Product Name *
   - Description
   - Category (for AI context)
   - Quantity *
   - Unit (Nos, Kg, Meter, etc.)
   - Rate *
   - GST % *

3. View real-time totals:
   - Subtotal
   - GST Total
   - Grand Total

4. Add multiple items as needed

Click **"Next: Select Firms"** to proceed.

#### Step 4: Select Firms
**Main Firm** (Required):
- Select from dropdown
- View firm details: City, GST, Contact

**Alternate Firms** (Optional):
- Select up to 2 alternate firms
- Useful for comparison quotes

**Actions**:
- **Save as Draft**: Save without finalizing
- **Create Tender**: Finalize and create

### Document Generation

After creating a tender, you'll be redirected to the tender detail page where you can:

- **Generate Document**: Creates the document using the structured template
- **Download PDF**: Downloads the document as a PDF file
- **Print**: Prints the document directly
- Office header
- Vendor details (firm name, city, GST, mobile)
- AI-generated subject line
- AI-generated body paragraph
- Items table
- Total amount
- Instructions
- Official footer

**Use Case**: Firm-specific supply order

#### 3. Other Documents
- Quotation Main
- Quotation Alt A/B
- Firm Bill

## Key Features

### AI Context Generation
The system intelligently generates contextual phrases based on your items:

**Example 1**: Electrical Items
- Items: "Aluminium Armoured Cable", "LED Street Light"
- Generated Context: "प्रकाश/विद्युत कार्य हेतु एल्युमिनियम आर्मर्ड केबल"

**Example 2**: Water Supply Items
- Items: "Hand Pump Materials", "PVC Pipes"
- Generated Context: "जल आपूर्ति कार्य हेतु हैंडपंप सामग्री"

**Example 3**: Construction Items
- Items: "Cement", "Steel Rods"
- Generated Context: "निर्माण कार्य हेतु सीमेंट एवं अन्य सामग्री"

### Department-Based Templates
Different departments get different template styles:

- **नगर परिषद** (Municipal Council): Standard municipal format
- **नगर निगम** (Municipal Corporation): Corporation format
- **PWD**: Public Works Department format
- **जल निगम**: Water Corporation format
- And more...

### Professional Formatting
All documents include:
- ✅ Proper Hindi typography
- ✅ Government-style headers
- ✅ Professional tables with borders
- ✅ Structured sections
- ✅ Official footers
- ✅ Print-ready layout

## Tips & Best Practices

### For Better AI Context Generation
1. **Use descriptive item names**: "Aluminium Armoured Cable" instead of "Cable"
2. **Add categories**: Helps AI understand the work type
3. **Group similar items**: Electrical items together, water supply items together

### For Professional Documents
1. **Fill place and district names**: Required for proper Vigyapti format
2. **Add firm details**: City, GST, mobile for better Supply Aadesh
3. **Set proper dates**: Publish, submission, opening dates
4. **Review before finalizing**: Use Draft status first

### For Multiple Firms
1. **Main Firm**: The selected/winning firm
2. **Alternate Firms**: For comparison or backup options
3. **Each firm gets**: Separate quotations and documents

## Common Workflows

### Workflow 1: Standard Tender Process
1. Create tender with all details
2. Generate Vigyapti for public announcement
3. Receive quotes from firms
4. Select winning firm
5. Generate Supply Aadesh for selected firm
6. Generate Firm Bill for payment

### Workflow 2: Quick Purchase
1. Create tender with minimal details
2. Save as Draft
3. Add items later
4. Select firm
5. Generate Supply Aadesh directly

### Workflow 3: Comparison Quotes
1. Create tender
2. Select main firm + 2 alternate firms
3. Generate quotations for all three
4. Compare prices
5. Generate Supply Aadesh for best quote

## Document Customization

### Language Selection
- **Hindi**: Full Hindi government format
- **English**: English government format
- **Bilingual**: Mix of both (future feature)

### Template Versions
- Each department has versioned templates (v1, v2, v3)
- Future updates won't break existing documents
- Easy to switch between versions

### AI Regeneration
- Regenerate intro paragraph only
- Regenerate subject line only
- Keep document structure intact
- No full document regeneration needed

## Troubleshooting

### Issue: Place/District fields not showing
**Solution**: Select a department that includes "नगर परिषद" or "Municipal"

### Issue: AI context seems generic
**Solution**: Add more descriptive item names and categories

### Issue: Firm details not showing in Supply Aadesh
**Solution**: Edit firm profile and add city, GST, mobile number

### Issue: Document formatting looks off
**Solution**: Use the "Generate with Default Template" option

### Issue: Can't proceed to next step
**Solution**: Fill all required fields (marked with *)

## Advanced Features

### Template Selection
- Choose between department-specific templates
- Fall back to default templates if needed
- Version control for templates

### Document History
- Every edit creates a new version
- View version history
- Restore previous versions

### Layout Controls
- Show/hide letterhead
- Include/exclude signature
- Include/exclude stamp
- Safe margin guides
- Print bleed margins

### Bulk Operations
- Duplicate document layout to all documents
- Apply settings to multiple documents
- Batch generate documents

## Master Dictionaries

### Purpose Library

The Purpose Library is a reusable database that maps procurement categories to professional procurement purposes. This ensures tender documents use formal government language instead of raw item names.

#### How to Use Purpose Library

1. **Access Master Dictionaries**:
   - Navigate to the Master Dictionaries interface
   - Select "Purpose Library" tab

2. **Add New Mapping**:
   - Click "Add Mapping" button
   - Enter the procurement category (e.g., "fire_fighting", "water_supply", "chemicals")
   - Enter the professional procurement purpose in Hindi or English
   - Click "Save"

3. **Example Mappings**:
   - Category: "fire_fighting"
     Purpose: "अग्निशमन एवं जल आपूर्ति कार्य हेतु आवश्यक सामग्री"
   - Category: "water_supply"
     Purpose: "जल आपूर्ति कार्य हेतु आवश्यक सामग्री"
   - Category: "electrical_items"
     Purpose: "प्रकाश/विद्युत कार्य हेतु आवश्यक सामग्री"

4. **Edit/Delete Mappings**:
   - Find the mapping in the list
   - Click "Edit" to modify
   - Click "Delete" to remove

5. **Automatic Usage**:
   - When creating a tender, the system automatically checks the Purpose Library
   - If a mapping exists for an item's category, it uses the professional purpose
   - If no mapping exists, it uses a temporary purpose automatically

#### Benefits of Purpose Library

- **Consistency**: All items in the same category use the same professional purpose
- **Professional Documents**: Documents use formal government language
- **Time-Saving**: No need to manually enter professional purposes for each tender
- **Reusability**: Mappings can be shared across all tenders and departments

### Hindi Transliteration

Hindi Transliteration converts English item names and vendor names to Hindi phonetic script, making documents more readable for Hindi-speaking officials.

#### How to Use Hindi Transliteration

1. **Access Master Dictionaries**:
   - Navigate to the Master Dictionaries interface
   - Select "Item Hindi Mapping" or "Vendor Hindi Mapping" tab

2. **Item Hindi Mapping**:
   - Add mappings for common items (e.g., "Aluminium Armoured Cable" → "अल्युमीनियम आर्मर्ड केबल")
   - The system automatically calls AI transliteration once for unknown items
   - Saved mappings are reused automatically

3. **Vendor Hindi Mapping**:
   - Add mappings for vendor names and locations
   - Firm names, cities, and addresses can be transliterated
   - Example: "Municipal Corporation" → "नगर निगम"

4. **Automatic Usage in Documents**:
   - When language is set to Hindi, the system uses Hindi names
   - Item tables display Hindi names
   - Supplier information shows Hindi names
   - When language is English, English names are used

#### Example Transliterations

**Items**:
- "Aluminium Armoured Cable" → "अल्युमीनियम आर्मर्ड केबल"
- "LED Street Light" → "एलईडी स्ट्रीट लाइट"
- "PVC Pipes" → "पीवीसी पाइप्स"
- "Hand Pump" → "हैंड पंप"

**Vendors**:
- "Municipal Corporation" → "नगर निगम"
- "Government Store" → "सरकारी स्टोर"
- "District Office" → "जिला कार्यालय"

#### Benefits of Hindi Transliteration

- **Better Readability**: Hindi-speaking officials can easily read the documents
- **Professional Appearance**: Documents appear more formal and professional
- **Consistency**: Same items always use the same Hindi name
- **Time-Saving**: AI generates Hindi names automatically, no manual entry needed

## Keyboard Shortcuts

### In Item Manager
- **Tab**: Move to next field
- **Enter**: Add new row
- **Ctrl+D**: Duplicate row (future)
- **Ctrl+↑/↓**: Reorder rows (future)

### In Document Editor
- **Ctrl+S**: Save
- **Ctrl+P**: Print
- **Ctrl+Z**: Undo
- **Ctrl+Y**: Redo

## Support & Resources

### Documentation
- `REDESIGN_IMPLEMENTATION.md`: Technical implementation details
- `overview.md`: System overview
- This file: User guide

### Sample Data
- Sample departments included
- Sample firms included
- Create test tenders to explore

### Future Updates
- More department templates
- Enhanced AI generation
- Better document editor
- Export to Word format
- Bulk tender creation

---

**Version**: 1.0.0
**Last Updated**: 2026-05-28
**Need Help?**: Check the implementation documentation or create a test tender to explore features.
