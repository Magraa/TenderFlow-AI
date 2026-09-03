<div align="center">

# ⚡ TENDERFLOW AI

<img src="public/Assets/Tenderflow%20AI%20Logo%20Horizontal%20on%20Transparency.webp" alt="TenderFlow AI Logo" width="480" />

### *Next-Gen Autonomous Government Tender & Procurement Automation Suite*

[![Next.js 15](https://img.shields.io/badge/Next.js-15.1-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-1.5_Flash-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Groq](https://img.shields.io/badge/Groq-Llama_3_Fast-F55036?style=for-the-badge&logo=groq&logoColor=white)](https://groq.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT_4o-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline_First-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

<br />

<p align="center">
  <b>Transform 4 hours of tedious government tender paperwork into a 60-second automated workflow.</b><br />
  24/7 Server Auto-Scanner • Deep Town & Local Body GeM Explorer • Deep AI Bid Analysis • Real-Time AI Quota Tracking • One-Click Multi-Document Generation • Firm Letterhead Engine • Bilingual Hindi-English Transliteration • Print-Ready A4 PDF Engine • 100% Offline-First (IndexedDB) + Cloud Sync (Firestore)
</p>

<p align="center">
  <a href="#-key-features">Key Features</a> •
  <a href="#-system-workflow">System Workflow</a> •
  <a href="#-247-autonomous-server-side-auto-scanner">24/7 Auto-Scanner</a> •
  <a href="#-gem-tender-explorer">GeM Explorer</a> •
  <a href="#-hyper-localized-town--local-body-search">Town & Local Body Search</a> •
  <a href="#-ai-tender-deep-analysis">AI Analysis</a> •
  <a href="#-real-time-ai-quota-hud">AI Quota HUD</a> •
  <a href="#-document-pipeline">Document Pipeline</a> •
  <a href="#-architecture--tech-stack">Architecture</a> •
  <a href="#-bilingual--ai-intelligence">AI Engine</a> •
  <a href="#-quickstart-guide">Quickstart</a> •
  <a href="docs/README.md">Documentation Hub</a>
</p>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" alt="separator" />

</div>

---

## 🌟 Executive Overview

**TenderFlow AI** is an enterprise-grade procurement automation platform engineered specifically for government contractors, vendors, and administrative departments.

Whether running **autonomous 24/7 server-side scans** for newly published tenders, conducting **hyper-localized searches across specific Nagar Palikas & Nagar Parishads**, performing **instant AI deep-analysis of complex tender clauses (ATC)**, or tracking live **AI API quotas in real-time**, TenderFlow orchestrates, drafts, and renders an entire synchronized package of official documents — complete with firm-specific letterheads, custom legal conditions, localized Hindi transliterations, dynamic GST calculations, and pixel-perfect A4 print-ready layouts.

---

## 🔄 System Workflow

```mermaid
flowchart TD
    subgraph CRON ["🤖 24/7 Autonomous Server-Side Scanner"]
        CS["<b>Vercel Cron / External Trigger</b><br/>Mumbai (bom1) Serverless Execution"]
        CP["<b>Scan Profiles</b><br/>State • District • Nagar Palika / Parishad • Days Ahead"]
        CS --> CP
    end

    subgraph SOURCES ["🌐 Tender Input & Live Discovery"]
        G["<b>GeM Portal Live Explorer</b><br/>bidplus.gem.gov.in (Bid/RA, Category, Ministry, BOQ)"]
        T["<b>Deep Town Registry Search</b><br/>State ➔ District ➔ Nagar Palika / Parishad / Nigam"]
        M["<b>Manual / Custom Entry</b><br/>Tender ID • Budget • Quantities • Rates • GST %"]
    end

    subgraph ANALYSIS ["🧠 AI Deep Analysis & Intelligence"]
        A["<b>Tender AI Deep-Parser</b><br/>Buyer Terms (ATC) • Technical Specs • EMD / EPBG • Mandatory Docs"]
    end

    subgraph ENGINE ["⚡ TenderFlow Automation Core"]
        O["<b>Orchestration Engine</b><br/>AI Prompt Stacks • Purpose Dictionary • A4 Layout System • Quota Tracker"]
    end

    subgraph OUTPUTS ["📑 Synchronized Document Generation"]
        D1["📜 <b>Vigyapti (NIT)</b><br/>Public Tender Notice"]
        D2["📄 <b>Quotation (L1)</b><br/>Primary Firm Letterhead"]
        D3["📑 <b>Quotations (L2/L3)</b><br/>Alternate Competing Quotes"]
        D4["📋 <b>Supply Order</b><br/>Work Award Sanction"]
        D5["🧾 <b>Firm Tax Bill</b><br/>GST & Bank Invoice"]
    end

    subgraph EXPORT ["🖨️ Precision Output"]
        P["<b>A4 Print-Ready PDF with Margins & Signatures</b>"]
    end

    CP -->|Auto-Detect & Background AI Analyze| A
    G & T -->|1-Click Analyze| A
    A -->|1-Click Auto-Import| O
    G & T -->|Direct Import| O
    M --> O
    O --> D1
    O --> D2
    O --> D3
    O --> D4
    O --> D5
    D1 & D2 & D3 & D4 & D5 --> P
```

---

## 🚀 Key Features

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🏙️ Deep Town & Local Body Search</h3>
      <ul>
        <li><b>Hyper-Localized Discovery:</b> Filter by State ➔ District ➔ constituent Nagar Palikas, Nagar Parishads & Nagar Nigams.</li>
        <li><b>Smart Alias Engine:</b> Auto-resolves buyer usernames (<code>cmo</code>, <code>np</code>, <code>buycon</code>, etc.) to discover hidden local tenders.</li>
        <li><b>Parallel Batch Scraping:</b> Deep Solr pagination to harvest 100% of municipal tenders across India.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>⚡ Inline AI Analysis & Job Queue Drawer</h3>
      <ul>
        <li><b>Zero New Tabs:</b> Run deep AI analysis directly in-place on tender cards with live state transitions.</li>
        <li><b>Floating Background Worker:</b> Bottom-right Job Queue drawer tracks queued, running, completed, and failed tasks with an animated progress bar.</li>
        <li><b>"Analyze All" Batch Processor:</b> 1-Click batch enqueuing of all unanalyzed page tenders for background processing.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🤖 24/7 Autonomous Server Auto-Scanner</h3>
      <ul>
        <li><b>Zero-Touch Tender Monitoring:</b> Automated background crons running from Mumbai (bom1) serverless nodes.</li>
        <li><b>Targeted Profiles:</b> Configure custom scan rules by State, District, Town, Department, Ministry, and Category.</li>
        <li><b>Automated Background AI Analysis:</b> Discovered bids are pre-analyzed with ATC extraction and saved to your database automatically.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>🧠 AI Tender Deep-Analysis Modal</h3>
      <ul>
        <li>Instantly parses and decodes complex government tenders into structured, digestible intelligence.</li>
        <li><b>Extracts Buyer Terms (ATC):</b> Searchable Buyer-Added Bid Specific Terms & Conditions.</li>
        <li><b>Key Insights:</b> Exact EMD amounts, EPBG, technical item specs, turnover/experience criteria, and mandatory checklist documents.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>📊 Real-Time AI Quota HUD & Tracker</h3>
      <ul>
        <li><b>Floating Live HUD:</b> Visual pill showing real-time daily requests remaining & tokens used.</li>
        <li><b>UTC Reset Countdown:</b> Exact countdown timer to midnight UTC quota resets.</li>
        <li><b>Usage Logs & Alerts:</b> Feature-by-feature breakdown (Drafts, Transliteration, Analysis) with automated threshold warning states.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>📄 Dynamic A4 Executive PDF Exporter</h3>
      <ul>
        <li><b>Intelligent DOM Pagination Engine:</b> Measures rendered heights in real time to split modular blocks cleanly across pages.</li>
        <li><b>Zero Data Truncation:</b> Running headers, structured financial boxes, full ATC clauses, and accurate "Page X of Y" footers.</li>
        <li>Auto-calculates project estimates from 1% EMD amounts when undisclosed.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🏛️ 1-Click Multi-Document Generation</h3>
      <ul>
        <li>Generate <b>Vigyapti</b>, <b>Quotations (Main & Alternate Rates)</b>, <b>Supply Orders</b>, and <b>Firm Bills</b> in one synchronized step.</li>
        <li>Eliminates duplicate manual entries, mismatched dates, and calculation mistakes.</li>
        <li>Instant document versioning snapshot engine with rollback support.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>⚡ QuickCustomizer™ Floating Drawer</h3>
      <ul>
        <li>Interactive floating side-drawer for live in-document customizations.</li>
        <li><b>1-Click Clause Injection:</b> Strict Govt Tone, 1-Yr Warranty, 7-Day Urgent Delivery, 30-Day Inspection Payment & ISO Standards.</li>
        <li><b>Per-Clause AI Micro-Regenerator:</b> Inline rephrasing with custom prompt instructions.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🎨 Precision A4 Letterhead Engine</h3>
      <ul>
        <li>Dynamic background letterhead integration with <code>contain</code>, <code>cover</code>, and <code>stretch</code> fit modes.</li>
        <li>Print-safe margin boundaries, live safe-zone guides, and overflow detection.</li>
        <li>Drag-and-drop firm digital signatures and official seals.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>⚡ Local-First + Cloud-Ready Hybrid</h3>
      <ul>
        <li><b>100% Offline Capable:</b> Instant client-side IndexedDB database.</li>
        <li><b>Cloud Sync:</b> Real-time Firestore synchronization with namespace isolation.</li>
        <li>PWA support with service worker asset caching.</li>
      </ul>
    </td>
  </tr>
</table>

---

## 🏙️ Hyper-Localized Town & Local Body Search

Go beyond broad city searches to discover tenders from specific municipal bodies:

```mermaid
flowchart LR
    REG["📚 <b>Local Body Registry</b><br/>stateDistrictTowns.ts"] --> MAP["🗺️ <b>State ➔ District ➔ Town</b><br/>Nagar Palika • Nagar Parishad • Nagar Nigam"]
    MAP --> ALIAS["🔍 <b>Smart Alias Engine</b><br/>Matches buyer usernames (np, cmo, buycon)"]
    ALIAS --> SOLR["⚡ <b>Deep Solr Scraper</b><br/>Parallel batch pagination across GeM indices"]
    SOLR --> BIDS["📑 <b>Exact Municipal Bids</b><br/>Filtered by Department & Location"]
```

* **Comprehensive Local Registry**: Pre-mapped database of constituent Nagar Palikas and Nagar Parishads with alternate aliases and username prefixes.
* **Accurate Department Filtering**: Ensures discovered bids belong strictly to your target municipal department (filtering out unrelated central PSU tenders).

---

## 🤖 24/7 Autonomous Server-Side Auto-Scanner

Set up custom surveillance profiles to monitor and parse government bids around the clock:

```mermaid
flowchart LR
    CRON["⏰ <b>Automated Cron Trigger</b><br/>Serverless Execution (Mumbai Node)"] --> SCAN["⚙️ <b>serverTenderScanner</b><br/>Executes Active Profiles"]
    SCAN --> GEM["🌐 <b>GeM Deep Town & Solr Bridge</b><br/>Location & Department Registry"]
    GEM --> DEDUP["🔍 <b>Deduplication Engine</b><br/>Filters Already-Saved Tenders"]
    DEDUP --> AI["🧠 <b>Background AI Deep Analysis</b><br/>Extracts ATC, Specs & EMD"]
    AI --> STORE["💾 <b>Saved / Starred Database</b><br/>Ready for 1-Click Drafting"]
```

* **Custom Monitoring Profiles**: Define targeted parameters (e.g., *State: MADHYA PRADESH, District: BHIND, Town: MEHGAON, Department: NAGAR PARISHAD, Days: 30*).
* **Automatic Background AI Ingestion**: Discovered tenders are immediately analyzed by the Multi-LLM engine without requiring user intervention.
* **Autonomous Execution Logs**: Track scan duration, total tenders found, new unique bids discovered, and AI analysis success metrics in real time.

---

## 🧠 AI Tender Deep Analysis, Inline Worker & Executive PDF Export

Transform dense 50-page government tender documents into actionable intelligence and print-ready executive briefing reports within seconds:

```mermaid
flowchart LR
    DOC["📑 <b>Raw Tender / GeM Bid</b><br/>PDF & Portal Data"] --> QUEUE["🤖 <b>Background AI Job Queue</b><br/>Sequential Worker & 'Analyze All'"]
    QUEUE --> LLM["⚡ <b>Deep Analysis Engine</b><br/>Multi-Prompt Intelligence"]
    LLM --> T1["📋 <b>Buyer Added Terms (ATC)</b><br/>Extracted Legal Clauses"]
    LLM --> T2["⚙️ <b>Item Specifications</b><br/>Quantities & Detailed Specs"]
    LLM --> T3["💰 <b>Financial Terms</b><br/>EMD, EPBG & Calculated Budget"]
    LLM --> T4["📜 <b>Compliance Checklist</b><br/>Turnover, Experience & Mandatory Docs"]
    
    T1 & T2 & T3 & T4 --> MODAL["⚡ <b>Inline Intelligence Modal</b><br/>Zero Context Switch / Same Page"]
    MODAL --> PDF["📄 <b>Multi-Page Executive PDF Report</b><br/>Intelligent ATC Pagination Engine"]
    MODAL --> IMP["📥 <b>1-Click Import to Draft</b>"]
```

* **Inline AI Analysis (No New Tab)**: Click to analyze any tender in-place. Button states dynamically switch (*Analyzing with AI...* → *View AI Insights*), and extracted specs & ATC render directly on the card.
* **Floating Background Job Queue (`AiJobQueueDrawer`)**: Bottom-right floating drawer tracks real-time progress across queued bids, with minimizable floating pill state (`⚡ AI Worker: 1 running (3 queued)`).
* **1-Click "Analyze All" Batch Processor**: Enqueue all unanalyzed tenders on the current page into the background queue with a single click.
* **Dedicated Full-Screen Analysis Suite (`/tenders/open/analysis`)**: Dedicated landing page featuring interactive tabbed views for Overview, ATC Clause search, Specifications, Financials, Eligibility, and Mandatory Document checklists.
* **Intelligent Executive PDF Generator (`gemAnalysisPdfService`)**: Generates print-ready multi-page briefing reports with smart ATC height balancing across pages (Page 1 summary + Page 2/3 seamless continuation).
* **Smart Budget Estimator**: Automatically derives estimated tender valuation from 1% EMD figures when undisclosed by the buyer department.
* **Direct Import to Document Generator**: One click transfers all parsed specifications, line items, and requirements directly into the tender drafting suite.

---

## 📊 Real-Time AI Quota HUD & Usage Tracking

Never hit unexpected rate limits during urgent bid submissions:

```mermaid
flowchart LR
    CALL["🤖 <b>AI API Invocation</b><br/>Drafting • Transliteration • Analysis"] --> TRACK["⚙️ <b>aiUsageService</b><br/>Token & Request Counter"]
    TRACK --> PILL["🟢 <b>Floating Quota HUD</b><br/>Live remaining requests • Token count • UTC Reset timer"]
    TRACK --> DASH["📊 <b>Settings Dashboard</b><br/>Feature-by-feature breakdown • Audit logs • Warning thresholds"]
```

* **Live Floating Pill**: Sits unobtrusively on the screen with real-time request counts and color-coded health indicators (`Green` → `Amber` at 80% → `Red` at 95%).
* **Pre-Configured Provider Quotas**: Native tracking for **Google Gemini** (1,500 req/day), **Groq** (14,400 req/day), **OpenAI**, and **NVIDIA NIM**.
* **Feature Analytics**: Detailed usage logs broken down by feature (Document Drafting, Transliteration, GeM Analysis, Phrase Packs, Location Search).
* **Live Health Diagnostics**: Dedicated `/api/ai/health` endpoint for instant provider status checks.

---

## 🌐 GeM Open Tender Explorer

Search, filter, and import active government bids in real time without leaving TenderFlow:

```mermaid
flowchart LR
    GEM["🌐 <b>GeM Portal</b><br/>bidplus.gem.gov.in"] --> SCRAPE["⚙️ <b>gemScraperService</b><br/>Session & Token Bridge"]
    SCRAPE --> FILTERS["🔍 <b>Filter & Search</b><br/>Bid ID • Category • Ministry • BOQ"]
    FILTERS --> CARDS["📑 <b>Live Tender Cards</b><br/>Quantities • Deadlines • PDF Links"]
    CARDS -->|1-Click Import| SUITE["📝 <b>TenderFlow Suite</b><br/>Bilingual Drafts • Multi-Firm Quotes • Tax Bills"]
```

* **Live Bid PDF & Corrigendum Links**: Directly access official bid documents and corrigendum addendums.
* **Auto-Populate Specs**: Imports product specifications, quantities, and submission dates instantly.
* 👉 **[Read Detailed GeM Explorer Documentation ➔](docs/guides/GEM_TENDER_EXPLORER.md)**

---

## 📋 Document Pipeline

```mermaid
flowchart LR
    A["📝 Input Specs"] --> B["⚙️ Core Orchestrator"]
    B --> C["📜 1. Vigyapti / NIT"]
    B --> D["📄 2. Main Quotation L1"]
    B --> E["📑 3. Alternate Quotes L2/L3"]
    B --> F["📋 4. Supply Order"]
    B --> G["🧾 5. GST Tax Bill"]
    
    C & D & E & F & G --> H["🖨️ A4 Print-Safe PDF"]
```

| Document Type | Official Hindi Title | Letterhead Applied? | Description |
| :--- | :--- | :---: | :--- |
| **`vigyapti`** | निविदा सूचना (NIT) | ❌ Plain (Public) | Official public procurement notice detailing line items, earnest money, and deadlines |
| **`quotation_main`** | मुख्य कोटेशन (L1) | ✅ Yes (Branded) | Lowest-rate compliant bid generated on selected primary firm's letterhead |
| **`quotation_alt_1`** | वैकल्पिक कोटेशन 1 (L2) | ✅ Yes (Branded) | Alternate quotation on secondary firm's letterhead for price comparison |
| **`quotation_alt_2`** | वैकल्पिक कोटेशन 2 (L3) | ✅ Yes (Branded) | Third competitive rate quote for statutory departmental compliance |
| **`supply_aadesh`** | आपूर्ति आदेश / कार्यादेश | ✅ Yes (Branded) | Official supply award sanction letter with contractual conditions |
| **`firm_bill`** | फर्म टैक्स बिल | ✅ Yes (Branded) | Complete GST tax invoice with bank details, IFSC, and HSN breakdown |

---

## 🏛️ Architecture & Tech Stack

```mermaid
graph TB
    subgraph UI ["🖥️ PRESENTATION LAYER"]
        P1["Next.js 15 App Router"]
        P2["Tailwind CSS + Lucide Icons"]
        P3["GeM Open Tenders Explorer (/tenders/open)"]
        P4["AiJobQueueDrawer (Floating Background Worker)"]
        P5["AutoScannerModal (Profile & Cron Manager)"]
        P6["Full-Screen Analysis Suite (/tenders/open/analysis)"]
        P7["TenderAIAnalysisModal (Deep ATC Parser)"]
        P8["AIQuotaPill & SyncStatusPill (Live HUDs)"]
        P9["TipTap WYSIWYG Rich Editor"]
        P10["QuickCustomizer™ Floating Drawer"]
        P11["Live A4 Canvas & Layout Engine"]
    end

    subgraph SERVICES ["⚙️ BUSINESS SERVICE LAYER"]
        S1["<b>serverTenderScanner</b><br/>24/7 Cron Daemon & Profile Scanner"]
        S2["<b>gemScraperService</b><br/>GeM Session, CSRF & Deep Solr Client"]
        S3["<b>stateDistrictTowns</b><br/>State ➔ District ➔ Town Local Body Registry"]
        S4["<b>gemAnalysisService</b><br/>Background Autonomous Deep Analysis"]
        S5["<b>gemAnalysisPdfService</b><br/>Dynamic DOM-Height A4 PDF Engine"]
        S6["<b>aiUsageService</b><br/>Daily Quota, Token Tracking & Alerts"]
        S7["<b>documentService</b><br/>Generation & Version Snapshots"]
        S8["<b>aiDraftService</b><br/>Prompt Stacks & LLM Orchestration"]
        S9["<b>layoutEngine</b><br/>A4 Margins, Bleeds & Letterhead"]
        S10["<b>mappingService</b><br/>4-Variant Dictionaries & Transliteration"]
        S11["<b>governmentTemplates</b><br/>Standardized Legal Layouts"]
    end

    subgraph AI_LAYER ["🤖 MULTI-LLM AI ENGINE"]
        A1["Google Gemini 1.5/2.0"]
        A2["Groq Llama 3"]
        A3["OpenAI GPT-4o"]
        A4["NVIDIA NIM"]
        A5["Deep Analysis API (/api/gem/analyze)"]
        A6["Vercel Cron (/api/cron/scan-tenders)"]
        A7["Micro-Regenerator & Health Diagnostics"]
    end

    subgraph STORAGE ["🗄️ DUAL-ENGINE STORAGE LAYER"]
        DB1["<b>Client-Side IndexedDB</b><br/>Local-First • Instant • 100% Offline"]
        DB2["<b>Firebase Firestore</b><br/>Multi-Device Cloud Sync & Backup"]
    end

    UI --> SERVICES
    SERVICES <--> AI_LAYER
    SERVICES <--> STORAGE
```


---

## 🧠 Bilingual & AI Intelligence

TenderFlow bridges standard English commercial terminology with formal Hindi administrative procurement standards.

### 1. Purpose Library Engine
Transforms simple categories into legally sound administrative purpose statements:

```mermaid
flowchart LR
    C["Category: <b>fire_fighting</b>"] --> E["⚡ Purpose Mapping Engine"]
    E --> H1["🇮🇳 <b>Hindi:</b> 'अग्निशमन एवं आपातकालीन जल आपूर्ति कार्य हेतु आवश्यक सामग्री'"]
    E --> H2["🇬🇧 <b>English:</b> 'Materials required for fire fighting and emergency water supply'"]
```

### 2. 4-Tier Alternate Translation Variations
Every line item is equipped with 4 distinct length and styling options for document customization:
* **Full Title**: Complete formal specification.
* **Alt 1 (Medium)**: Balanced, standard quotation title.
* **Alt 2 (Short)**: Concise, high-density table format.
* **Alt 3 & 4 (Combined)**: Title seamlessly combined with product description paragraphs.

### 3. Automated Transliteration Cache
English line items are automatically translated/transliterated and cached in IndexedDB for instantaneous future queries:

```mermaid
flowchart LR
    IN["Input: 'Fire Hose Nozzle 63mm'"] --> AI["🤖 Multi-LLM Transliteration"]
    AI --> OUT["Output: 'अग्निशमन होज नोज़ल 63 मि.मी.'"]
    OUT --> CACHE["💾 Saved to Master Dictionary"]
```

---

## 📂 Documentation Center

All technical documentation is organized inside the [`docs/`](docs/) directory:

```mermaid
flowchart LR
    DOCS["📂 <b>docs/ Hub</b>"]
    
    DOCS --> ARC["🏛️ <b>architecture/</b><br/>System design, roadmap & UI evolution"]
    DOCS --> AI["🤖 <b>ai/</b><br/>Multi-LLM prompts & bilingual dictionaries"]
    DOCS --> STO["🗄️ <b>storage/</b><br/>Firebase Firestore & IndexedDB setup"]
    DOCS --> GUI["📖 <b>guides/</b><br/>User manual & quick reference cards"]
    DOCS --> FIX["🛠️ <b>fixes-and-history/</b><br/>Changelogs, patch notes & bug fixes"]
```

| Section | Description | Link |
| :--- | :--- | :---: |
| 🏛️ **Architecture** | System topology, roadmap, before/after comparison | [Explore ➔](docs/architecture/ARCHITECTURE.md) |
| 🤖 **AI & Transliteration** | Multi-LLM configuration, prompt engineering & dictionaries | [Explore ➔](docs/ai/AI_INTEGRATION_GUIDE.md) |
| 🗄️ **Storage & Cloud** | IndexedDB offline layer & Firestore cloud sync setup | [Explore ➔](docs/storage/FIREBASE_STORAGE_SETUP.md) |
| 📖 **Guides & Manuals** | Comprehensive user manual, quick references & onboarding | [Explore ➔](docs/guides/USER_GUIDE.md) |
| 🛠️ **Fixes & Changelogs** | Implementation status, layout fixes & patch history | [Explore ➔](docs/fixes-and-history/IMPLEMENTATION_STATUS.md) |

👉 **[View Complete Documentation Directory ➔](docs/README.md)**

---

## ⚡ Quickstart Guide

### 📋 Prerequisites
* **Node.js**: `v18.17.0` or higher
* **Package Manager**: `npm`, `yarn`, `pnpm`, or `bun`

### 🛠️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/tenderflow-ai.git
   cd tenderflow-ai
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   ```bash
   cp .env.example .env.local
   ```
   Configure your preferred AI provider and storage backend in `.env.local`:
   ```env
   # AI Provider (gemini, openai, groq, nvidia, mock)
   NEXT_PUBLIC_AI_PROVIDER=gemini
   NEXT_PUBLIC_AI_API_KEY=your_api_key_here
   NEXT_PUBLIC_AI_MODEL=gemini-1.5-flash

   # Storage Mode (indexeddb or firestore)
   NEXT_PUBLIC_DATA_BACKEND=indexeddb
   ```

4. **Launch Development Server:**
   ```bash
   npm run dev
   ```
   Navigate to [http://localhost:3000](http://localhost:3000).

---



## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your branch (`git checkout -b feature/awesome-feature`)
3. Commit your changes (`git commit -m 'feat: Add awesome feature'`)
4. Push to the branch (`git push origin feature/awesome-feature`)
5. Open a Pull Request

---

## 📄 License

This software is distributed under proprietary licensing. See [LICENSE](LICENSE) for details.

<div align="center">
  <sub>Crafted with ❤️ by the Magraa Powered by Next.js, TypeScript & Advanced AI.</sub>
</div>

