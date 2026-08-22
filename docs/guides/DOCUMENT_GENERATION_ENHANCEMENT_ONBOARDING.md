# Document Generation Enhancement - Onboarding Guide for New Users

## Introduction

Welcome to the Document Generation Enhancement feature! This guide will help you get started with the new professional document generation capabilities in the Magra Automation system.

This enhancement introduces three key improvements:

1. **Procurement Purpose Library** - Use professional government language instead of raw item names
2. **Hindi Transliteration** - Display Hindi phonetic names for better readability
3. **Estimated Amount Field** - Standardized budget planning at tender level

## Quick Start: Your First Tender with Enhanced Features

### Step 1: Create a New Tender

1. Navigate to `/tenders/new`
2. Fill in the basic tender information:
   - Tender Title
   - Department (e.g., "Municipal Corporation")
   - Language (Hindi or English)
   - Place Name and District (required for government documents)

3. Click **"Next: Add Items"**

### Step 2: Add Items with Categories

When adding items, you'll now see:

- **Category field** - Select the appropriate category for each item
  - Example: "fire_fighting", "water_supply", "electrical", "construction"
  - Categories help the system use professional procurement purposes

- **Estimated Amount field** (at tender level)
  - Select from predefined options: 95,000, 98,000, 1,98,000
  - Or select "Custom" for free text input

### Step 3: Use Master Dictionaries

The system automatically uses mappings from Master Dictionaries:

- **Purpose Library**: Maps categories to professional purposes
  - Example: "fire_fighting" → "अग्निशमन एवं जल आपूर्ति कार्य हेतु आवश्यक सामग्री"
  
- **Item Hindi Mappings**: Shows Hindi names for items
  - Example: "Cement" → "सीमेंट"
  
- **Vendor Hindi Mappings**: Shows Hindi names for vendors
  - Example: "ABC Suppliers" → "एबीसी सप्लायर्स"

### Step 4: Generate Professional Documents

When you generate a Vigyapti or Supply Aadesh:

- **Vigyapti**: Uses professional procurement purpose in the narrative
  - Example: "नगर परिषद सेवड़ा द्वारा अग्निशमन एवं जल आपूर्ति कार्य हेतु आवश्यक सामग्री क्रय किया जाना प्रस्तावित है।"
  
- **Supply Aadesh**: Uses professional procurement purpose in the subject
  - Example: "विषय:- अग्निशमन एवं जल आपूर्ति कार्य हेतु आवश्यक सामग्री सप्लाई करने बावत ।"

## Master Dictionaries Interface

### Accessing Master Dictionaries

1. Navigate to the **Master Dictionaries** page
2. You'll see three tabs:
   - **Purpose Library**
   - **Item Hindi Mappings**
   - **Vendor Hindi Mappings**

### Managing Purpose Mappings

**Purpose Library** maps procurement categories to professional procurement purposes.

#### Add a New Purpose Mapping

1. Click **"Add Mapping"** in Purpose Library tab
2. Fill in:
   - **Category**: e.g., "fire_fighting"
   - **Professional Purpose**: e.g., "अग्निशमन एवं जल आपूर्ति कार्य हेतु आवश्यक सामग्री"
   - **Language**: Hindi or English
3. Click **"Save"**

#### Edit an Existing Mapping

1. Find the mapping in the table
2. Click **"Edit"** button
3. Modify the professional purpose
4. Click **"Save"**

#### Delete a Mapping

1. Find the mapping in the table
2. Click **"Delete"** button
3. Confirm deletion

### Managing Hindi Mappings

**Item Hindi Mappings** and **Vendor Hindi Mappings** work similarly.

#### Add a New Hindi Mapping

1. Click **"Add Mapping"** in the appropriate tab
2. Fill in:
   - **English Name**: e.g., "Cement"
   - **Hindi Name**: e.g., "सीमेंट"
3. Click **"Save"**

#### Bulk Import/Export

1. Click **"Import"** or **"Export"** button
2. Upload/download JSON file with mappings
3. Import validates format before applying

## Understanding the Features

### Procurement Purpose Library

**What is it?**
A reusable database that maps procurement categories to professional procurement purposes.

**Why use it?**
- Professional government language instead of raw item names
- Consistent terminology across all tenders
- Easier for Hindi-speaking officials to read

**How it works:**
1. When you add an item with a category (e.g., "fire_fighting")
2. System checks Purpose Library for a matching category
3. If found, uses the professional purpose in documents
4. If not found, uses temporary purpose: "संबंधित कार्य हेतु आवश्यक सामग्री"

### Hindi Transliteration

**What is it?**
Automatic conversion of English text to Hindi phonetic script.

**Why use it?**
- Better readability for Hindi-speaking officials
- More professional appearance
- Consistent formatting

**How it works:**
1. System checks Hindi Mapping dictionary first
2. If found, uses the saved mapping
3. If not found, calls AI API once to generate Hindi name
4. Saves the mapping for future use

### Estimated Amount Field

**What is it?**
A field at the tender level to specify the total estimated budget.

**Why use it?**
- Standardized budget planning
- Clear display in Vigyapti documents
- Better financial tracking

**How it works:**
1. Select from predefined options or enter custom amount
2. Stored at tender level (not per item)
3. Displayed in Vigyapti document header

## Common Workflows

### Workflow 1: Setting Up Purpose Mappings

**Scenario**: You want to use professional purposes for fire fighting items.

1. Go to **Master Dictionaries** → **Purpose Library**
2. Click **"Add Mapping"**
3. Enter:
   - Category: `fire_fighting`
   - Professional Purpose: `अग्निशमन एवं जल आपूर्ति कार्य हेतु आवश्यक सामग्री`
   - Language: `Hindi`
4. Save
5. When creating a tender, add items with category `fire_fighting`
6. Generated documents will use the professional purpose

### Workflow 2: Setting Up Hindi Mappings

**Scenario**: You want to display Hindi names for common items.

1. Go to **Master Dictionaries** → **Item Hindi Mappings**
2. Click **"Add Mapping"**
3. Enter:
   - English Name: `Cement`
   - Hindi Name: `सीमेंट`
4. Save
5. When creating a tender, add items with this name
6. Generated documents in Hindi will show `सीमेंट`

### Workflow 3: Creating a Tender with Enhanced Features

**Scenario**: You want to create a tender with professional purposes and Hindi names.

1. Navigate to `/tenders/new`
2. Fill in basic information
3. Add items with categories:
   - Item: `Fire Hose`, Category: `fire_fighting`
   - Item: `Cement`, Category: `construction`
4. Set Estimated Amount: `95,000`
5. Select firms
6. Create tender
7. Generate Vigyapti - uses professional purposes
8. Generate Supply Aadesh - uses professional purposes

## Troubleshooting

### Issue: Professional purpose not showing in documents

**Possible causes:**
1. Item category doesn't match any Purpose Library mapping
2. Purpose Library mapping exists but language doesn't match document language

**Solutions:**
1. Check that item category matches exactly (case-sensitive)
2. Add missing mapping to Purpose Library
3. Ensure language matches (Hindi/English)

### Issue: Hindi names not showing

**Possible causes:**
1. Hindi mapping doesn't exist for the item/vendor
2. Document language is English, not Hindi

**Solutions:**
1. Add missing mapping to Item Hindi or Vendor Hindi Mappings
2. Switch document language to Hindi
3. Wait for AI transliteration (first-time only)

### Issue: Estimated amount not displaying

**Possible causes:**
1. Estimated amount field is empty
2. Document template doesn't support estimated amount

**Solutions:**
1. Fill in the Estimated Amount field when creating tender
2. Check that you're using a recent template version

## Best Practices

### For Purpose Mappings

1. **Use consistent categories**: Always use the same category names (e.g., `fire_fighting`, not `firefighting` or `Fire Fighting`)
2. **Add language-specific mappings**: Create separate mappings for Hindi and English
3. **Review regularly**: Update mappings as needed for new procurement types

### For Hindi Mappings

1. **Add common items first**: Start with frequently used items
2. **Use standard Hindi**: Follow government Hindi conventions
3. **Bulk import**: Use JSON import for large sets of mappings

### For Estimated Amount

1. **Set early**: Enter estimated amount when creating tender
2. **Use predefined options**: Easier and ensures consistency
3. **Review before generation**: Ensure amount is correct in Vigyapti

## Next Steps

After completing this onboarding:

1. **Explore Master Dictionaries**: Add mappings for your common items and vendors
2. **Try different categories**: Test purpose mappings with various item categories
3. **Generate test documents**: Create test tenders and verify professional purposes
4. **Review documentation**: Check `USER_GUIDE.md` for general tender creation

## Support

For technical questions:
- Check `REDESIGN_IMPLEMENTATION.md` for technical details
- Review `ARCHITECTURE.md` for system design
- Contact system administrator for access issues

---

**Version**: 1.0.0  
**Last Updated**: 2026-05-30  
**Related Features**: Document Generation Enhancement  
**Requirements Covered**: 1.1-1.6, 2.1-2.4, 4.1-4.4, 7.1-7.4
