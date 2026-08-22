# System Architecture - Tender Automation Platform

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  Tender Creation │  │  Tender Detail   │  │  Dashboard   │ │
│  │  (3-Step Form)   │  │  (Doc Editor)    │  │              │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  Document        │  │  AI Context      │  │  Department  │ │
│  │  Service         │  │  Generator       │  │  Templates   │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  Government      │  │  AI Draft        │  │  Layout      │ │
│  │  Templates       │  │  Service         │  │  Engine      │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  Data Service    │  │  Storage Service │  │  Local       │ │
│  │  (CRUD)          │  │  (Persistence)   │  │  Storage     │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Document Generation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOCUMENT GENERATION FLOW                     │
└─────────────────────────────────────────────────────────────────┘

1. USER INPUT
   ┌──────────────────────────────────────────┐
   │ User creates tender with:                │
   │ - Title, Department, Language            │
   │ - Place, District (if applicable)        │
   │ - Items (with category, unit)            │
   │ - Firms (main + alternates)              │
   └──────────────────────────────────────────┘
                    │
                    ▼
2. DEPARTMENT DETECTION
   ┌──────────────────────────────────────────┐
   │ Department Templates Service             │
   │ - Identifies department type             │
   │ - Selects appropriate template version   │
   │ - Returns template identifier            │
   └──────────────────────────────────────────┘
                    │
                    ▼
3. AI CONTEXT GENERATION
   ┌──────────────────────────────────────────┐
   │ AI Context Generator                     │
   │ - Analyzes items (names, categories)     │
   │ - Detects work type                      │
   │ - Generates contextual phrases           │
   │   • Intro paragraph                      │
   │   • Subject line                         │
   │   • Body paragraph                       │
   └──────────────────────────────────────────┘
                    │
                    ▼
4. TEMPLATE SELECTION
   ┌──────────────────────────────────────────┐
   │ Government Templates Service             │
   │ - Loads structured template              │
   │ - For Vigyapti or Supply Aadesh          │
   │ - Deterministic structure                │
   └──────────────────────────────────────────┘
                    │
                    ▼
5. CONTENT ASSEMBLY
   ┌──────────────────────────────────────────┐
   │ Template + AI Context = Document         │
   │                                          │
   │ Template provides:                       │
   │ - Header structure                       │
   │ - Section layout                         │
   │ - Table format                           │
   │ - Footer format                          │
   │                                          │
   │ AI provides:                             │
   │ - Contextual intro                       │
   │ - Subject line                           │
   │ - Body paragraph                         │
   └──────────────────────────────────────────┘
                    │
                    ▼
6. LAYOUT ENGINE
   ┌──────────────────────────────────────────┐
   │ Layout Engine                            │
   │ - Applies letterhead (if applicable)     │
   │ - Adds signature/stamp (if applicable)   │
   │ - Wraps in A4 page                       │
   │ - Applies margins and spacing            │
   └──────────────────────────────────────────┘
                    │
                    ▼
7. FINAL DOCUMENT
   ┌──────────────────────────────────────────┐
   │ Professional Government Document         │
   │ - Structured format                      │
   │ - Contextual content                     │
   │ - Print-ready                            │
   │ - Government-compliant                   │
   └──────────────────────────────────────────┘
```

## Service Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SERVICE LAYER                            │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ aiContextGenerator.ts                                        │
├──────────────────────────────────────────────────────────────┤
│ • generateTenderPurpose(items)                               │
│   → Analyzes items, returns contextual phrase                │
│                                                              │
│ • generateVigyaptiIntro(place, district, items)              │
│   → Returns intro paragraph for Vigyapti                     │
│                                                              │
│ • generateSupplyAadeshSubject(items)                         │
│   → Returns subject line for Supply Aadesh                   │
│                                                              │
│ • generateSupplyAadeshBody(firmName, items)                  │
│   → Returns body paragraph for Supply Aadesh                 │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ departmentTemplates.ts                                       │
├──────────────────────────────────────────────────────────────┤
│ • getDepartmentTemplate(departmentName, docType)             │
│   → Returns template identifier                              │
│                                                              │
│ • hasDepartmentTemplates(departmentName)                     │
│   → Checks if department has custom templates                │
│                                                              │
│ • getSupportedDepartments()                                  │
│   → Returns list of supported departments                    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ governmentTemplates.ts                                       │
├──────────────────────────────────────────────────────────────┤
│ • generateVigyapti(context)                                  │
│   → Returns structured Vigyapti HTML                         │
│                                                              │
│ • generateSupplyAadesh(context)                              │
│   → Returns structured Supply Aadesh HTML                    │
│                                                              │
│ • generateItemsTable(items, language)                        │
│   → Returns professional items table HTML                    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ aiDraftService.ts (UPDATED)                                  │
├──────────────────────────────────────────────────────────────┤
│ • generateDraft(request)                                     │
│   → Orchestrates document generation                         │
│   → Uses government templates for Vigyapti/Supply Aadesh     │
│   → Falls back to default templates for other types          │
│                                                              │
│ • docUsesLetterhead(docType)                                 │
│   → Determines if document uses firm letterhead              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ documentService.ts (EXISTING)                                │
├──────────────────────────────────────────────────────────────┤
│ • generateAndPersistDocument(request)                        │
│   → Calls aiDraftService                                     │
│   → Saves document to data service                           │
│   → Creates version history                                  │
│                                                              │
│ • updateDocumentContent(documentId, contentHTML)             │
│   → Updates document content                                 │
│   → Creates new version                                      │
└──────────────────────────────────────────────────────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      COMPONENT HIERARCHY                        │
└─────────────────────────────────────────────────────────────────┘

app/tenders/new/page.tsx
└── ProfessionalTenderForm
    ├── Header Section
    │   ├── Title & Description
    │   ├── Auto-generated Tender Number
    │   └── Status Badge
    │
    ├── Progress Indicator
    │   └── Step 1 → Step 2 → Step 3
    │
    ├── Step 1: Tender Information
    │   ├── Basic Fields (Title, Department, Language)
    │   ├── Conditional Fields (Place, District)
    │   └── Date Fields (Publish, Submission, Opening)
    │
    ├── Step 2: Item Management
    │   ├── MultiProductItemManager
    │   │   └── Item Table (Name, Desc, Category, Qty, Unit, Rate, GST)
    │   └── Grand Total Panel
    │       ├── Subtotal
    │       ├── GST Total
    │       └── Grand Total
    │
    └── Step 3: Firm Selection
        ├── Main Firm Selector
        │   └── Firm Detail Card
        ├── Alternate Firm A Selector
        │   └── Firm Detail Card
        └── Alternate Firm B Selector
            └── Firm Detail Card

app/tenders/[id]/page.tsx (EXISTING - TO BE REDESIGNED)
└── TenderDetailPage
    ├── Header
    ├── Summary Cards
    ├── Document Tabs
    │   ├── Vigyapti
    │   ├── Quotation Main
    │   ├── Quotation Alt A
    │   ├── Quotation Alt B
    │   ├── Supply Aadesh
    │   └── Firm Bill
    └── Document Editor
        ├── Controls
        ├── RichTextEditor
        └── DocumentViewer
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                          DATA FLOW                              │
└─────────────────────────────────────────────────────────────────┘

USER ACTION: Create Tender
     │
     ▼
┌─────────────────────────────────────┐
│ ProfessionalTenderForm              │
│ - Collects user input               │
│ - Validates data                    │
│ - Calculates totals                 │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ dataService.tenders.create()        │
│ - Generates tender ID               │
│ - Saves to local storage            │
│ - Returns tender object             │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ Router navigates to /tenders/[id]   │
└─────────────────────────────────────┘

USER ACTION: Generate Document
     │
     ▼
┌─────────────────────────────────────┐
│ documentService                     │
│ .generateAndPersistDocument()       │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ aiDraftService.generateDraft()      │
│ - Checks document type              │
│ - Routes to appropriate generator   │
└─────────────────────────────────────┘
     │
     ├─── Vigyapti/Supply Aadesh ────┐
     │                                │
     ▼                                ▼
┌──────────────────────┐   ┌──────────────────────┐
│ governmentTemplates  │   │ aiContextGenerator   │
│ .generateVigyapti()  │   │ .generateIntro()     │
│ or                   │   │ .generateSubject()   │
│ .generateSupply      │   │ .generateBody()      │
│ Aadesh()             │   │                      │
└──────────────────────┘   └──────────────────────┘
     │                                │
     └────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Structured HTML Document            │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ layoutEngine.applyLetterhead()      │
│ - Adds letterhead layer             │
│ - Adds signature/stamp              │
│ - Wraps in A4 page                  │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ dataService.documents.create()      │
│ - Saves document                    │
│ - Creates version history           │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ UI updates with new document        │
└─────────────────────────────────────┘
```

## Type System

```
┌─────────────────────────────────────────────────────────────────┐
│                         TYPE HIERARCHY                          │
└─────────────────────────────────────────────────────────────────┘

BaseEntity
├── id: string
├── createdAt: string
└── updatedAt: string

Tender extends BaseEntity
├── title: string
├── tenderNumber: string
├── departmentProfileId: string
├── mainFirmId: string
├── alternateFirms?: string[]
├── items: TenderItem[]
├── language: Language
├── status: TenderStatus
├── tenderType?: string              ← NEW
├── placeName?: string               ← NEW
├── districtName?: string            ← NEW
├── publishDate?: string             ← NEW
├── submissionDate?: string          ← NEW
├── openingDate?: string             ← NEW
└── estimatedBudget?: number         ← NEW

TenderItem extends BaseEntity
├── tenderId: string
├── productName: string
├── description?: string
├── category?: string                ← NEW
├── quantity: number
├── unit?: string                    ← NEW
├── rate: number
├── gstPercent: GSTRate
├── estimatedAmount?: number         ← NEW
└── totalAmount: number

Firm extends BaseEntity
├── name: string
├── headerImagePath: string
├── signatureImagePath?: string
├── stampImagePath?: string
├── defaultLanguage: Language
├── firmCity?: string                ← NEW
├── firmAddress?: string             ← NEW
├── gstNumber?: string               ← NEW
├── mobileNumber?: string            ← NEW
├── contactPerson?: string           ← NEW
└── ... (layout fields)

TenderDocument extends BaseEntity
├── tenderId: string
├── docType: TenderDocType
├── contentHTML: string
├── currentVersion: number
├── versions: DocumentVersion[]
└── ... (display options)
```

## Module Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                      MODULE DEPENDENCIES                        │
└─────────────────────────────────────────────────────────────────┘

components/forms/professionalTenderForm.tsx
├── depends on: types/index.ts
├── depends on: services/dataService.ts
├── depends on: services/tenderUtility.ts
├── depends on: components/ui/* (Button, Card, Input, etc.)
└── depends on: components/MultiProductItemManager.tsx

services/governmentTemplates.ts
├── depends on: types/index.ts
└── depends on: services/aiContextGenerator.ts

services/aiContextGenerator.ts
└── depends on: types/index.ts

services/departmentTemplates.ts
└── depends on: types/index.ts

services/aiDraftService.ts
├── depends on: types/index.ts
├── depends on: services/aiFormatter.ts
├── depends on: services/layoutEngine.ts
├── depends on: services/templateLoader.ts
├── depends on: services/governmentTemplates.ts ← NEW
└── depends on: services/dataService.ts ← NEW

services/documentService.ts
├── depends on: types/index.ts
├── depends on: services/aiDraftService.ts
└── depends on: services/dataService.ts
```

## Future Architecture (Phase 2+)

```
┌─────────────────────────────────────────────────────────────────┐
│                    FUTURE ENHANCEMENTS                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Real AI Integration                                          │
├──────────────────────────────────────────────────────────────┤
│ aiService.ts (NEW)                                           │
│ ├── OpenAI Provider                                          │
│ ├── Gemini Provider                                          │
│ ├── Claude Provider                                          │
│ └── Provider Abstraction Layer                               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Template Versioning                                          │
├──────────────────────────────────────────────────────────────┤
│ templateVersioning.ts (NEW)                                  │
│ ├── Version Manager                                          │
│ ├── Migration Tools                                          │
│ └── Template Selector                                        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Enhanced Document Editor                                     │
├──────────────────────────────────────────────────────────────┤
│ components/editors/splitLayoutEditor.tsx (NEW)               │
│ ├── Left Panel: Controls                                     │
│ ├── Right Panel: A4 Preview                                  │
│ └── Zoom & Print Controls                                    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Collaboration Features                                       │
├──────────────────────────────────────────────────────────────┤
│ services/collaboration.ts (NEW)                              │
│ ├── User Management                                          │
│ ├── Approval Workflow                                        │
│ └── Sharing & Permissions                                    │
└──────────────────────────────────────────────────────────────┘
```

---

**Version**: 1.0.0
**Last Updated**: May 28, 2026
**Status**: Phase 1 Architecture Complete
