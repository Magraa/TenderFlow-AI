<div align="center">

# ⚡ TENDERFLOW AI
### *Next-Gen Autonomous Government Tender & Procurement Automation Suite*

[![Next.js 15](https://img.shields.io/badge/Next.js-15.1-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-1.5_Flash-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Groq](https://img.shields.io/badge/Groq-Llama_3_Fast-F55036?style=for-the-badge&logo=groq&logoColor=white)](https://groq.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT_4o-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-Proprietary-blue.svg?style=for-the-badge)](LICENSE)

<br />

<p align="center">
  <b>Transform 4 hours of tedious government tender paperwork into a 60-second automated workflow.</b><br />
  One-Click Multi-Document Generation • Firm Letterhead Engine • Bilingual Hindi-English Transliteration • AI-Driven Procurement Drafting • Print-Ready A4 PDF Engine • 100% Offline-First (IndexedDB) + Cloud Sync (Firestore)
</p>

<p align="center">
  <a href="#-key-features">Key Features</a> •
  <a href="#-document-pipeline">Document Pipeline</a> •
  <a href="#-architecture--tech-stack">Architecture</a> •
  <a href="#-ai--bilingual-engine">AI & Master Dictionaries</a> •
  <a href="#-getting-started">Quickstart</a> •
  <a href="#-project-name--repo-suggestions">Name Suggestions</a> •
  <a href="docs/README.md">Documentation Hub</a>
</p>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" alt="separator" />

</div>

---

## 🌟 Executive Overview

**TenderFlow AI** (Magra Tender Automation) is an enterprise-grade procurement automation platform tailored specifically for government contractors, vendors, and public administrative departments.

By entering core tender specifications and line items once, TenderFlow instantly orchestrates, formats, and renders a synchronized set of official documents — complete with firm-specific letterheads, custom legal terms, localized Hindi translations, automatic GST calculations, and pixel-perfect A4 print-ready layouts.

`
                  ┌───────────────────────────────────────────────────────────┐
                  │                 TenderFlow Single-Entry                   │
                  │   Tender ID • Line Items • Budget • GST • Department      │
                  └─────────────────────────────┬─────────────────────────────┘
                                                │
       ┌────────────────────────┬───────────────┴───────────────┬────────────────────────┐
       ▼                        ▼                               ▼                        ▼
 📜 VIGYAPTI             📄 QUOTATION                    📋 SUPPLY ORDER          🧾 FIRM TAX BILL
(Tender Notice)       (Main & Alternates)               (Official Sanction)      (Bank Details & GST)
`

---

## 🚀 Key Features

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🏛️ 1-Click Multi-Document Generation</h3>
      <ul>
        <li>Generate <b>Vigyapti (निविदा सूचना)</b>, <b>Quotations (Main & Alternate Rates)</b>, <b>Supply Orders (आपूर्ति आदेश)</b>, and <b>Firm Bills (टैक्स बिल)</b> simultaneously.</li>
        <li>Eliminates duplicate manual entries and human calculation errors.</li>
        <li>Instant document versioning snapshot engine with rollback support.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>🎨 Precision A4 Letterhead Engine</h3>
      <ul>
        <li>Dynamic background letterhead integration with <code>contain</code>, <code>cover</code>, and <code>stretch</code> fit modes.</li>
        <li>Print-safe margin boundaries, overflow detection, and page break controls.</li>
        <li>Drag-and-drop firm digital signatures and official stamps.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🤖 Multi-LLM Bilingual Intelligence</h3>
      <ul>
        <li>Supports <b>Google Gemini</b>, <b>Groq (Llama 3)</b>, <b>NVIDIA NIM</b>, and <b>OpenAI</b>.</li>
        <li>Context-aware formal Hindi government procurement terminology.</li>
        <li>Smart transliteration engine for English item catalogs to Hindi.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>⚡ Local-First + Cloud-Ready Hybrid</h3>
      <ul>
        <li><b>100% Offline Capable:</b> Instant client-side IndexedDB storage.</li>
        <li><b>Cloud Sync:</b> Seamless Firestore integration with namespace isolation.</li>
        <li>Built-in JSON backup and restore capabilities.</li>
      </ul>
    </td>
  </tr>
</table>

---

## 📋 Document Pipeline

TenderFlow automates the entire lifecycle of tender document submission:

`mermaid
flowchart LR
    A[📝 Single Input Form] --> B[⚙️ Core Orchestrator]
    B --> C[📜 1. Vigyapti / NIT]
    B --> D[📄 2. Main Quotation L1]
    B --> E[📑 3. Alternate Quotations L2/L3]
    B --> F[📋 4. Supply Aadesh]
    B --> G[🧾 5. GST Tax Bill]
    
    C --> H[🖨️ A4 Print-Safe PDF]
    D --> H
    E --> H
    F --> H
    G --> H
`

| Document Type | Hindi Name | Letterhead Applied? | Description |
| :--- | :--- | :---: | :--- |
| **igyapti** | निविदा सूचना | ❌ Plain (Public) | Official tender notification with item lists, terms, and dates |
| **quotation_main** | मुख्य कोटेशन (L1) | ✅ Yes | Lowest rate bid generated on selected primary firm's letterhead |
| **quotation_alt_1** | वैकल्पिक कोटेशन 1 | ✅ Yes | Competing rate quote on alternate firm's letterhead |
| **quotation_alt_2** | वैकल्पिक कोटेशन 2 | ✅ Yes | Second alternate rate quote for compliant procurement records |
| **supply_aadesh** | आपूर्ति आदेश | ✅ Yes | Formal work/supply award sanction letter |
| **irm_bill** | फर्म टैक्स बिल | ✅ Yes | Detailed GST invoice with bank account, IFSC & HSN breakdown |

---

## 🧠 AI & Bilingual Master Dictionaries

TenderFlow bridges English commercial catalogs with strict Hindi administrative standards.

### 1. Purpose Library Engine
Transforms generic item categories into legally sound administrative procurement statements:
`
Category: "fire_fighting"
  ├── Hindi : "अग्निशमन एवं आपातकालीन जल आपूर्ति कार्य हेतु आवश्यक उच्च क्षमता सामग्री"
  └── English: "Essential high-capacity materials for fire fighting and emergency water supply"
`

### 2. Auto-Transliteration Engine
English line items are automatically transliterated and cached into Master Dictionaries for instant reuse:
`
"Fire Hose Nozzle 63mm" ────▶ AI Engine ────▶ "अग्निशमन होज नोज़ल 63 मि.मी."
`

### 3. Multi-Model AI Stack
Customize AI prompt stacks per firm and document type:
* **System Directive**: Government procurement phrasing compliance.
* **Firm Profile**: govt_formal, minimal_business, ilingual, or 	able_heavy.
* **Dynamic Context**: Line items, GST slabs, department headers, and budget constraints.

---

## 🏛️ Architecture & Tech Stack

`
┌─────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                            │
│    Next.js 15 (App Router) • React 18 • Tailwind CSS • Lucide Icons     │
│             TipTap WYSIWYG Rich Editor • Live A4 Canvas Viewer          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                             SERVICE LAYER                               │
│  ┌───────────────────────┐ ┌──────────────────────┐ ┌────────────────┐  │
│  │    documentService    │ │    aiDraftService    │ │  layoutEngine  │  │
│  └───────────────────────┘ └──────────────────────┘ └────────────────┘  │
│  ┌───────────────────────┐ ┌──────────────────────┐ ┌────────────────┐  │
│  │    mappingService     │ │   governmentTmpl     │ │  dataService   │  │
│  └───────────────────────┘ └──────────────────────┘ └────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                             STORAGE LAYER                               │
│  ┌─────────────────────────────────────┐ ┌───────────────────────────┐  │
│  │      Client-Side IndexedDB (idb)    │ │   Cloud Firestore (v11)   │  │
│  │    Instant Offline Local-First      │ │    Real-Time Sync Engine  │  │
│  └─────────────────────────────────────┘ └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
`

---

## 📂 Project Organization & Documentation

All technical documentation is organized inside the [docs/](docs/) directory:

`
docs/
├── 🏛️ architecture/           # System topology, UI redesign & technical roadmap
├── 🤖 ai/                     # Multi-LLM integration, prompts & master dictionaries
├── 🗄️ storage/                # Firebase Firestore config & IndexedDB dual-engine
├── 📖 guides/                 # Complete User Manual, quick references & onboarding
├── 🛠️ fixes-and-history/      # Patch notes, letterhead alignment & image fixes
└── 📑 README.md               # Complete Documentation Index
`

👉 **[Explore Full Documentation Center ➔](docs/README.md)**

---

## 🛠️ Getting Started

### 📋 Prerequisites
* **Node.js**: 18.17.0 or higher
* **Package Manager**: 
pm, yarn, pnpm, or un

### ⚡ Installation

1. **Clone the repository:**
   `ash
   git clone https://github.com/your-username/tenderflow-ai.git
   cd tenderflow-ai
   `

2. **Install dependencies:**
   `ash
   npm install
   `

3. **Configure Environment Variables:**
   `ash
   cp .env.example .env.local
   `
   *Fill in your AI API key and backend configuration:*
   `env
   # AI Provider Configuration (gemini, openai, groq, nvidia, mock)
   NEXT_PUBLIC_AI_PROVIDER=gemini
   NEXT_PUBLIC_AI_API_KEY=your_gemini_api_key_here
   NEXT_PUBLIC_AI_MODEL=gemini-1.5-flash

   # Storage Backend (indexeddb or firestore)
   NEXT_PUBLIC_DATA_BACKEND=indexeddb
   `

4. **Launch the Development Server:**
   `ash
   npm run dev
   `
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏷️ Recommended Project Names & Descriptions

If you are naming and describing this repository on GitHub, here are top curated suggestions:

### 🏆 Top Choice: **TenderFlow-AI**
* **Repository Name:** 	enderflow-ai
* **Short Description:** *🚀 Next-Gen Autonomous Government Tender & Procurement Automation Suite. One-click multi-document drafting, precision A4 letterheads, bilingual Hindi/English AI engine, and offline-first dual storage.*
* **Tagline:** *From Tender to Tax Bill in 60 Seconds.*

---

### 🌟 Option 2: **GovDoc-Studio**
* **Repository Name:** govdoc-studio
* **Short Description:** *⚡ Intelligent Government Tender Document Engine & Firm Management Platform with Bilingual AI Transliteration & A4 Letterhead Layouts.*
* **Tagline:** *The Smartest Way to Manage Government Contracts & Quotations.*

---

### 🌟 Option 3: **BidForge-AI**
* **Repository Name:** idforge-ai
* **Short Description:** *📄 Full-stack bilingual tender management suite: Auto-generate Vigyapti, Quotations, Supply Orders & GST Bills with AI-powered drafting and print-ready A4 exports.*
* **Tagline:** *Craft Winning Government Bids with AI Precision.*

---

### 🌟 Option 4: **Magra-Tender-Automation** (Original Brand)
* **Repository Name:** magra-tender-automation
* **Short Description:** *💼 Complete government tender document automation system with firm-specific branding, bilingual Hindi support, multi-LLM drafting, and local-first architecture.*

---

## 🏷️ Suggested GitHub Topics / Tags

`
tender-automation • government-procurement • nextjs15 • typescript • tailwindcss • gemini-ai • groq • openai • tiptap • indexeddb • firestore • hindi-transliteration • document-generator • pwa • a4-pdf-layout
`

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your branch (git checkout -b feature/awesome-feature)
3. Commit your changes (git commit -m 'feat: Add awesome feature')
4. Push to the branch (git push origin feature/awesome-feature)
5. Open a Pull Request

---

## 📄 License

This software is licensed under proprietary terms. See [LICENSE](LICENSE) for details.

<div align="center">
  <sub>Built with ❤️ by the Magra Automation Team. Powered by Next.js, TypeScript & Advanced AI.</sub>
</div>
