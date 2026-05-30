# Magra Tender Automation Panel

Local-first Tender Automation Platform for preparing government-style tender documents with firm-specific branding, bilingual drafting, manual item pricing, GST slab control, and print-ready A4 output.

This project is designed to work fully offline today and migrate to Firebase/Supabase/OpenAI later without rewriting UI flows.

---

## 1) Why this exists

Tender teams usually lose time on repeated work:
- Re-entering vendor/firms and tender details
- Formatting quotations and supply orders every time
- Aligning text manually on letterheads
- Re-checking GST totals and bill calculations
- Managing multiple document variants for the same tender

This system solves that with a single local panel where users can:
- Create a tender once
- Add items manually (with fixed GST slabs)
- Generate all required document variants
- Keep each firm’s letterhead and style isolated
- Edit documents quickly in a rich editor
- Export/print directly

---

## 2) Product direction (what we are building)

Target workflow:
1. Admin configures firms with pre-created letterhead assets.
2. Tender operator creates a tender with manual items.
3. System generates multiple document types (main/alternate quotations, vigyapti, supply order, main bill).
4. Documents render in A4 layout with strict letterhead scope.
5. Operator edits content in TipTap and exports PDF/print.
6. Local version history and reusable layout/style controls keep output consistent.

Long-term target:
- Cloud sync + multi-user + audit trails
- AI-assisted drafting using firm-specific prompts
- Production-grade PDF engine and distribution workflows

---

## 3) Current integration status

### Core stack
- Next.js 15 (App Router)
- TypeScript (strict)
- Tailwind CSS
- TipTap editor
- LocalStorage persistence layer
- Service-based architecture for backend swapping

### Implemented domain features
- Local-first data storage with migration-friendly normalization
- Tender creation with manual line-item entry
- Fixed GST slabs: `0, 5, 9, 12, 18`
- Firm management using upload-first letterhead model
- Letterhead fit modes: `contain`, `cover`, `stretch`
- `contentStartY` + `pagePaddingLeft` alignment controls
- A4 layout engine with safe-zone/page/bleed guides
- Document types:
  - `vigyapti`
  - `quotation_main`
  - `quotation_alt_1`
  - `quotation_alt_2`
  - `supply_aadesh`
  - `firm_bill`
- Strict letterhead scope enforcement
- Document option toggles:
  - Show letterhead background
  - Show safe margin guide
  - Lock header position
  - Include signature
  - Include stamp
- Document version snapshots (local)
- Duplicate document layout to sibling docs in same tender
- AI formatter + template fallback path
- Bilingual default templates (`default`, `english`, `hindi`)

### Cloud/AI-ready interfaces already in place
- `dataService` abstraction isolates UI from storage engine
- `documentService` centralizes generation/version/layout logic
- `aiDraftService` prompt stacking and fallback orchestration
- `templateLoader` decouples content fallback from UI/editor
- `layoutEngine` contains all layout constants/rules (no hardcoded UI positioning)

---

## 4) Letterhead policy (critical business rule)

Letterhead must be applied only for firm-bound docs.

Current scope rule:
- Uses letterhead:
  - `quotation_main`
  - `quotation_alt_1`
  - `quotation_alt_2`
  - `supply_aadesh`
  - `firm_bill`
- Does not use letterhead by default:
  - `vigyapti` (global/public notice)

The system also auto-corrects stale old docs where a global doc accidentally retained firm-letterhead flags from earlier data.

---

## 5) Architecture overview

### Layering model

1. UI layer (`app/*`, `components/*`)
- Collects user input
- Displays preview/editor
- Calls service layer only

2. Service layer (`services/*`)
- Business logic and orchestration
- Document generation and fallback
- Layout rendering and content sanitation
- Versioning and reusable workflows

3. Data layer (`data/schema.ts`, `services/storageService.ts`)
- Firestore-like collections in localStorage
- UUID entities + timestamps
- Backward-compatible normalization/migrations

### Why this design
- Offline-first reliability
- Easy backend replacement (Firebase/Supabase)
- Testable business logic independent from UI
- Safer evolution of document rules over time

---

## 6) Key services

### `services/dataService.ts`
Thin interface used by UI; delegates CRUD to storage implementation.

### `services/storageService.ts`
LocalStorage DB engine with:
- schema hydration
- timestamping
- UUID creation
- normalization of legacy fields to new schema

### `services/layoutEngine.ts`
Responsible for:
- A4 wrappers
- absolute layer composition (page, letterhead, content)
- fit mode handling
- safe margin / page boundary / print bleed guides
- grid snapping utilities
- item table paging for long documents

### `services/aiDraftService.ts`
Responsible for:
- prompt stack composition:
  - global system prompt
  - firm style profile hint
  - document-type prompt
  - firm-specific prompt
- AI output shaping
- default template fallback when response invalid
- letterhead-aware layout composition

### `services/aiFormatter.ts`
Responsible for:
- forcing structured `.doc-body` HTML
- stripping dangerous tags
- spacing normalization
- width/font normalization
- overflow warning detection

### `services/templateLoader.ts`
Responsible for:
- selecting proper language template
- falling back to default templates if needed

### `services/documentService.ts`
Responsible for:
- document generation and persistence
- document version snapshots
- layout duplication
- letterhead-scope enforcement at orchestration level

### `services/firmService.ts`
Responsible for:
- firm validation/defaulting
- firm duplication
- style duplication
- letterhead preview render

---

## 7) Data model (current)

See `types/index.ts` for exact source of truth.

Main entities:
- `Tender`
- `Firm`
- `TenderItem`
- `TenderDocument`
- `DocumentVersion`
- `Settings`

Highlights:
- Firm now includes:
  - `fitLetterheadMode`
  - `contentStartY`
  - `pagePaddingLeft`
  - prompt fields per doc type
  - `firmStyleProfile`
- Document includes:
  - preview/layout toggles
  - overflow warning text
  - version references
- Tender supports draft/final status and alternate firms.

---

## 8) Document generation flow

1. User selects doc type in tender screen.
2. UI calls `documentService.generateAndPersistDocument(...)`.
3. `documentService` resolves defaults and version handling.
4. `aiDraftService` builds prompt stack + base content.
5. `aiFormatter` sanitizes/normalizes HTML.
6. If AI response invalid -> `templateLoader` provides fallback template.
7. `layoutEngine` renders final A4 layered HTML.
8. Document saved and version snapshot updated.

Editor updates:
- TipTap edits call `documentService.updateDocumentContent(...)`
- Previous content is versioned before update.

---

## 9) Manage Firms capabilities

Implemented in `app/manage-firms/page.tsx`.

Supports:
- Required letterhead upload
- Optional signature and stamp uploads
- Language default selection
- Style profile selection
- Fit mode selection (`contain/cover/stretch`)
- `contentStartY` slider + numeric input
- Snap-to-grid alignment
- `pagePaddingLeft` control
- Firm-specific prompt fields:
  - quotation
  - supply order
  - vigyapti
  - bill (optional, gated by toggle)
- Live A4 preview with guides:
  - safe zone
  - page boundary
  - print bleed
- Duplicate firm profile
- Duplicate style settings from another firm

---

## 10) Current pages and responsibilities

- `app/dashboard/page.tsx`
  - Tender list, status overview, entry point.

- `app/tenders/new/page.tsx` + `components/forms/createTenderForm.tsx`
  - Tender creation and manual item capture.

- `app/tenders/[id]/page.tsx`
  - Multi-document generation, editing, preview, toggles, version history.

- `app/manage-firms/page.tsx`
  - Firm branding/layout/prompt administration.

- `app/settings/page.tsx`
  - Organization-level defaults and firm summary entry point.

---

## 11) Setup and run

```bash
npm install
npm run dev
```

Production:
```bash
npm run type-check
npm run build
npm start
```

Open:
- `http://localhost:3000/dashboard`

---

## 12) Data backends

Default backend is local/offline (`localStorage`).

### A) Local (default)

Storage key:
- `tender-automation-db`

Properties:
- Fully browser-local
- No server dependency for core workflows
- Auto-normalizes old data fields to new schema on load

Backup methods are available through `dataService.backup`.

---

### B) Firestore (cloud + offline cache)

1) Set backend selector:
- `NEXT_PUBLIC_DATA_BACKEND=firestore`

2) Set Firebase web config (client SDK):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- Optional: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- Optional: `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`

3) Optional runtime knobs:
- `NEXT_PUBLIC_FIRESTORE_NAMESPACE` (defaults to `default`)
- `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST` (e.g. `127.0.0.1:8080`)

Notes:
- IndexedDB persistence is enabled best-effort (works offline; multi-tab may disable persistence in one tab).
- Firestore data is stored under `tap/<namespace>/...` collections.

---

## 13) Known constraints (current)

- PDF endpoint is still a placeholder-quality path for production-grade rendering.
- HTML preview uses iframe render and depends on generated HTML quality.
- Image optimization warning remains in firm preview due to `<img>` usage.
- AI generation currently template-driven (not connected to remote model provider).

---

## 14) Future scope (recommended roadmap)

### A) Cloud and collaboration
- Firebase/Supabase persistence adapter
- Multi-device sync
- Role-based access (admin/operator/reviewer)
- Conflict-aware offline sync

### B) AI integration maturity
- OpenAI/Anthropic provider adapters
- Prompt versioning per firm
- Model fallback chain
- Structured output validation with schema checks

### C) Document and workflow operations
- True server-grade PDF pipeline (Puppeteer/Playwright)
- Approval workflow (Draft → Review → Final)
- Digital signature workflows
- Tender package exports (zip bundle)
- Document diff and side-by-side version comparison

### D) Layout intelligence
- Real header-height auto detection
- Interactive drag/drop anchors for content layer
- Per-document layout presets
- Auto overflow pagination warnings before save

### E) Audit and observability
- Action logs (who changed what and when)
- Event timeline per tender
- Metrics dashboard (turnaround time, doc generation frequency)

---

## 15) Developer guidance

If you add a new feature:
1. Extend `types/index.ts` first.
2. Update normalization in `services/storageService.ts`.
3. Add business logic in service layer.
4. Keep UI dumb (consume service APIs only).
5. Verify:
   - `npm run type-check`
   - `npm run build`

Do not hardcode layout rules in components; keep layout logic in `services/layoutEngine.ts`.

---

## 16) Project goal in one line

Build a production-grade tender office automation engine where every firm can generate documents in its own style, on its own letterhead, with consistent structure, editable output, and cloud migration readiness.
