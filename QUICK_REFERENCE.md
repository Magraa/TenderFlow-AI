# Quick Reference Card - Tender Automation System

## 🚀 Quick Start

### Create a Tender (3 Steps)
```
1. /tenders/new
2. Fill: Title, Department, Language, Place, District
3. Add Items: Name, Category, Quantity, Unit, Rate, GST
4. Select Firms: Main + Alternates
5. Click "Create Tender"
```

### Generate Documents
```
1. Open tender detail page
2. Click "Generate Document" button
3. Select: Vigyapti or Supply Aadesh
4. Download PDF or Print
```

## 📁 File Structure

### New Files (Phase 1)
```
services/
├── aiContextGenerator.ts       # AI context generation
├── departmentTemplates.ts      # Department template mapping
└── governmentTemplates.ts      # Vigyapti & Supply Aadesh

components/forms/
└── professionalTenderForm.tsx  # 3-step tender creation

Documentation/
├── REDESIGN_IMPLEMENTATION.md  # Technical details
├── USER_GUIDE.md              # User documentation
├── BEFORE_AFTER_COMPARISON.md # Visual comparison
├── ROADMAP.md                 # Future plans
├── ARCHITECTURE.md            # System architecture
├── IMPLEMENTATION_SUMMARY.md  # This summary
└── QUICK_REFERENCE.md         # This file
```

### Modified Files
```
types/index.ts                 # Enhanced types
services/aiDraftService.ts     # Integrated gov templates
app/tenders/new/page.tsx       # Uses new form
```

## 🎯 Key Features

### Step-Based Workflow
```
Step 1: Tender Info
├── Title, Department, Language
├── Place, District (conditional)
└── Dates (Publish, Submission, Opening)

Step 2: Items
├── Name, Description, Category
├── Quantity, Unit, Rate, GST
└── Real-time totals

Step 3: Firms
├── Main Firm (required)
├── Alternate Firm A (optional)
└── Alternate Firm B (optional)
```

### Document Types
```
Vigyapti (विज्ञप्ति)
├── Public tender notice
├── No firm letterhead
├── AI-generated intro
└── Government format

Supply Aadesh (सप्लाई आदेश)
├── Firm-specific order
├── Firm letterhead
├── AI-generated subject & body
└── Complete vendor details
```

## 🔧 Services

### AI Context Generator
```typescript
// Generate contextual phrases
aiContextGenerator.generateTenderPurpose(items)
// → "प्रकाश/विद्युत कार्य हेतु..."

aiContextGenerator.generateVigyaptiIntro(place, district, items)
// → Full intro paragraph

aiContextGenerator.generateSupplyAadeshSubject(items)
// → "विषय:- प्रकाश व्यवस्था हेतु..."
```

### Department Templates
```typescript
// Get template for department
getDepartmentTemplate('नगर परिषद', 'vigyapti')
// → 'nagar-parishad-vigyapti-v1'

// Check if department has templates
hasDepartmentTemplates('नगर परिषद')
// → true
```

### Government Templates
```typescript
// Generate Vigyapti
governmentTemplates.generateVigyapti({
  placeName: 'सेवड़ा',
  districtName: 'दतिया',
  items: [...],
  language: 'hindi'
})
// → Structured HTML

// Generate Supply Aadesh
governmentTemplates.generateSupplyAadesh({
  firm: {...},
  items: [...],
  language: 'hindi'
})
// → Structured HTML
```

## 📊 Data Models

### Tender (Enhanced)
```typescript
{
  title: string
  tenderNumber: string
  departmentProfileId: string
  mainFirmId: string
  items: TenderItem[]
  language: 'hindi' | 'english'
  
  // NEW FIELDS
  tenderType?: string
  placeName?: string
  districtName?: string
  publishDate?: string
  submissionDate?: string
  openingDate?: string
  estimatedBudget?: number
}
```

### TenderItem (Enhanced)
```typescript
{
  productName: string
  description?: string
  quantity: number
  rate: number
  gstPercent: GSTRate
  
  // NEW FIELDS
  category?: string
  unit?: string
  estimatedAmount?: number
}
```

### Firm (Enhanced)
```typescript
{
  name: string
  headerImagePath: string
  defaultLanguage: Language
  
  // NEW FIELDS
  firmCity?: string
  firmAddress?: string
  gstNumber?: string
  mobileNumber?: string
  contactPerson?: string
}
```

## 🎨 UI Components

### Professional Tender Form
```tsx
<ProfessionalTenderForm />
// Features:
// - 3-step workflow
// - Progress indicator
// - Conditional fields
// - Real-time calculations
// - Firm detail cards
```

### Step Components
```tsx
// Step 1: Tender Information
<Input name="title" />
<Select name="department" />
<Input name="placeName" /> // conditional

// Step 2: Item Management
<MultiProductItemManager />
<GrandTotalPanel />

// Step 3: Firm Selection
<FirmSelector type="main" />
<FirmDetailCard />
```

## 🔍 Common Patterns

### Creating a Tender
```typescript
// 1. Collect form data
const formData = {
  title: 'Supply of Electrical Materials',
  departmentProfileId: 'dept-1',
  language: 'hindi',
  placeName: 'सेवड़ा',
  districtName: 'दतिया',
  // ...
}

// 2. Add items
const items = [
  {
    productName: 'Aluminium Armoured Cable',
    category: 'Electrical',
    quantity: 100,
    unit: 'Meter',
    rate: 500,
    gstPercent: 18
  }
]

// 3. Create tender
const tender = await dataService.tenders.create({
  ...formData,
  items,
  tenderNumber: await tenderUtility.generateTenderNumber()
})
```

### Generating a Document
```typescript
// 1. Get tender and firm
const tender = await dataService.tenders.get(tenderId)
const firm = await dataService.firms.get(tender.mainFirmId)

// 2. Generate document
const result = await documentService.generateAndPersistDocument({
  tender,
  mainFirm: firm,
  targetFirm: firm,
  docType: 'vigyapti',
  language: 'hindi'
})

// 3. Document is saved automatically
// Access via: dataService.documents.listByTender(tenderId)
```

## 🐛 Troubleshooting

### Issue: Place/District fields not showing
```
Solution: Select department with "नगर परिषद" or "Municipal"
```

### Issue: AI context is generic
```
Solution: Add descriptive item names and categories
```

### Issue: Firm details missing in Supply Aadesh
```
Solution: Edit firm and add city, GST, mobile
```

### Issue: Document formatting issues
```
Solution: Use "Generate with Default Template" button
```

## 📝 Best Practices

### For Better AI Context
```
✅ DO: "Aluminium Armoured Cable"
❌ DON'T: "Cable"

✅ DO: Add category "Electrical"
❌ DON'T: Leave category empty

✅ DO: Group similar items
❌ DON'T: Mix unrelated items
```

### For Professional Documents
```
✅ DO: Fill place and district
✅ DO: Add firm details (city, GST, mobile)
✅ DO: Set proper dates
✅ DO: Review before finalizing
```

### For Code Quality
```
✅ DO: Use TypeScript types
✅ DO: Follow service pattern
✅ DO: Write modular code
✅ DO: Add comments
```

## 🎯 Testing Checklist

### Tender Creation
- [ ] Create नगर परिषद tender
- [ ] Verify place/district fields appear
- [ ] Add items with categories
- [ ] Select main + alternate firms
- [ ] Check totals calculation
- [ ] Save as draft
- [ ] Create final tender

### Document Generation
- [ ] Generate Vigyapti
- [ ] Check AI-generated intro
- [ ] Verify items table
- [ ] Check terms & conditions
- [ ] Generate Supply Aadesh
- [ ] Check firm details
- [ ] Check AI-generated subject
- [ ] Verify formatting

### Edge Cases
- [ ] Empty items list
- [ ] Very long item names
- [ ] Multiple pages
- [ ] Hindi special characters
- [ ] Missing firm details
- [ ] Different departments

## 📚 Documentation Links

### For Users
- **USER_GUIDE.md** - Complete user guide
- **BEFORE_AFTER_COMPARISON.md** - Visual improvements

### For Developers
- **REDESIGN_IMPLEMENTATION.md** - Technical details
- **ARCHITECTURE.md** - System architecture
- **ROADMAP.md** - Future plans

### For Management
- **IMPLEMENTATION_SUMMARY.md** - Executive summary
- **ROADMAP.md** - Timeline and priorities

## 🔗 Important URLs

```
/tenders/new          → Create new tender
/tenders/[id]         → Tender detail & document editor
/dashboard            → Dashboard (existing)
/manage-firms         → Firm management (existing)
/settings             → Settings (existing)
```

## 🎊 Quick Wins

### What Works Now
✅ Professional 3-step tender creation
✅ Structured Vigyapti generation
✅ Structured Supply Aadesh generation
✅ AI-assisted contextual content
✅ Department-based templates
✅ Real-time calculations
✅ Firm detail previews

### What's Coming Next
🔄 Enhanced item manager
🔄 Document editor redesign
🔄 Firm management enhancement
🔄 Template versioning
🔄 Real AI integration

## 💡 Pro Tips

1. **Use categories**: Helps AI generate better context
2. **Fill firm details**: Makes Supply Aadesh professional
3. **Set dates**: Important for government compliance
4. **Review before final**: Use draft status first
5. **Test with samples**: Create test tenders to explore

## 📞 Need Help?

1. Check **USER_GUIDE.md** for detailed instructions
2. Review **BEFORE_AFTER_COMPARISON.md** for examples
3. Read **REDESIGN_IMPLEMENTATION.md** for technical details
4. Test with sample data
5. Check code comments

---

**Version**: 1.0.0
**Status**: Phase 1 Complete ✅
**Last Updated**: May 28, 2026

**Quick Tip**: Start by creating a test tender for "नगर परिषद" with electrical items to see all features in action!
