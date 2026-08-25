'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Tag,
  MessageSquareQuote,
  Wand2,
  Check,
  RotateCw,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Tender,
  TenderDocType,
  TenderDocument,
  Firm,
  HindiMapping,
  DocumentPhraseMapping,
  Bill,
} from '@/types';
import { dataService } from '@/services/dataService';
import { Button } from '@/components/ui/button';

interface QuickCustomizerToolbarProps {
  tender: Tender;
  activeDocType: TenderDocType;
  currentDocument: TenderDocument | null;
  firmBill?: Bill | null;
  mainFirm: Firm | null;
  targetFirm: Firm | null;
  language: 'hindi' | 'english';
  generating: boolean;
  onUpdateDocumentContent: (html: string) => Promise<void> | void;
  onUpdateFirmBill?: (bill: Bill) => Promise<void> | void;
  onRegenerateDocument: (customPrompt?: string) => Promise<void>;
}

const PROMPT_SUGGESTIONS = [
  { label: '🏛️ Strict Govt Tone', text: 'Use strictly formal, official government procurement language and numbered clauses.' },
  { label: '🛡️ 1-Year Warranty', text: 'Add a mandatory clause stating a 1-year comprehensive replacement guarantee on all supplied items.' },
  { label: '🚚 7-Day Delivery', text: 'Specify urgent delivery requirement within 7 working days from date of supply order.' },
  { label: '💳 30-Day Payment', text: 'Include standard government payment term: payment within 30 days post physical verification & inspection.' },
  { label: '📦 ISI/ISO Standard', text: 'Specify that all supplied items must conform to standard ISI/ISO quality specifications.' },
];

export function QuickCustomizerToolbar({
  tender,
  activeDocType,
  currentDocument,
  firmBill,
  mainFirm,
  targetFirm,
  language,
  generating,
  onUpdateDocumentContent,
  onUpdateFirmBill,
  onRegenerateDocument,
}: QuickCustomizerToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'phrases' | 'ai'>('items');
  const [mappings, setMappings] = useState<HindiMapping[]>([]);
  const [phrasePacks, setPhrasePacks] = useState<DocumentPhraseMapping[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  // Collapsible state for items: index 0 open by default
  const [collapsedItems, setCollapsedItems] = useState<Record<number, boolean>>({});

  // Per-option inline regeneration state
  const [expandedRegenField, setExpandedRegenField] = useState<string | null>(null);
  const [optionPromptText, setOptionPromptText] = useState<Record<string, string>>({});
  const [regeneratingField, setRegeneratingField] = useState<string | null>(null);

  // Load mappings and phrase packs
  useEffect(() => {
    (async () => {
      try {
        const [loadedMappings, loadedPacks] = await Promise.all([
          dataService.itemHindiMappings.list(),
          dataService.documentPhraseMappings.list(),
        ]);
        setMappings(loadedMappings);
        setPhrasePacks(loadedPacks);

        // Auto-select detected phrase pack
        if (loadedPacks.length > 0 && tender.items.length > 0) {
          const firstItem = tender.items[0].productName.toLowerCase();
          const matched = loadedPacks.find((p) =>
            p.keywords.some((k) => firstItem.includes(k.toLowerCase()))
          );
          if (matched) setSelectedPackId(matched.id);
          else setSelectedPackId(loadedPacks[0].id);
        }
      } catch (err) {
        console.error('Failed to load QuickCustomizer data:', err);
      }
    })();
  }, [tender]);

  const showFeedback = (msg: string) => {
    setAppliedFeedback(msg);
    setTimeout(() => setAppliedFeedback(null), 2500);
  };

  const toggleItemCollapse = (index: number) => {
    setCollapsedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const escapeHtmlStr = (value: string): string => {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  /** Replace item name inside active document HTML or Firm Bill */
  /** Replace item name inside active document HTML or Firm Bill */
  const handleApplyItemName = async (
    item: Tender['items'][0],
    _matched: HindiMapping | undefined,
    newName: string,
    itemIndex: number,
    isCombined: boolean = false,
    customDescription?: string
  ) => {
    if (!newName.trim()) return;

    // ── Handle Firm Bill ──────────────────────────────────────────────────
    if (activeDocType === 'firm_bill') {
      if (!firmBill) {
        showFeedback('Please generate the Firm Bill first.');
        return;
      }
      try {
        const updatedItems = firmBill.items.map((bItem, idx) => {
          if (idx === itemIndex || bItem.id === item.id) {
            return { ...bItem, productName: newName };
          }
          return bItem;
        });

        const updated = await dataService.bills.update(firmBill.id, {
          items: updatedItems,
        });

        if (updated) {
          onUpdateFirmBill?.(updated);
          showFeedback(`Updated item in Firm Bill to "${newName}"`);
        }
      } catch (err) {
        console.error('Failed to update Firm Bill item:', err);
        showFeedback('Failed to update Firm Bill item.');
      }
      return;
    }

    // ── Handle HTML Tender Documents ──────────────────────────────────────
    if (!currentDocument) {
      showFeedback('Please generate the document first.');
      return;
    }

    let currentHtml = currentDocument.contentHTML;

    if (typeof window !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(currentHtml, 'text/html');

        // When isCombined is true, do NOT append a separate description container
        const descText = isCombined
          ? ''
          : (customDescription || item.description || _matched?.rawDescription || _matched?.hindiDescription || _matched?.englishDescription || '');
        const descHTML = descText
          ? `<div style="font-size: 13px; font-weight: normal; margin-top: 4px; color: #444;">${language === 'hindi' ? 'विवरण: ' : 'Description: '}${escapeHtmlStr(descText)}</div>`
          : '';

        if (activeDocType === 'vigyapti') {
          // ── Vigyapti Notice ──────────────────────────────────────────────────
          // Table structure:
          // Col 0: .mc-vigyapti-serial -> EXACTLY "${index + 1}." (Never put item name here)
          // Col 1: .mc-vigyapti-item   -> Item Name (strong) + Description
          // Col 2: .mc-vigyapti-amount -> Estimated amount (rowspan)
          const vigyaptiRows = doc.querySelectorAll('.mc-vigyapti-table tbody tr, table tbody tr');
          if (vigyaptiRows.length > itemIndex) {
            const row = vigyaptiRows[itemIndex];
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
              // Ensure serial column ONLY contains the index number
              cells[0].className = 'mc-vigyapti-center mc-vigyapti-serial';
              cells[0].textContent = `${itemIndex + 1}.`;

              // Ensure item column contains the item name (and description if not combined)
              cells[1].className = 'mc-vigyapti-item';
              cells[1].innerHTML = `<strong>${escapeHtmlStr(newName)}</strong>${descHTML}`;
            } else if (cells.length === 1) {
              cells[0].className = 'mc-vigyapti-item';
              cells[0].innerHTML = `<strong>${escapeHtmlStr(newName)}</strong>${descHTML}`;
            }
          }
        } else if (activeDocType === 'supply_aadesh') {
          // ── Municipal Supply Order (Supply Aadesh) ──────────────────────────
          // Table structure: NO Serial Number column!
          // Col 0: .mc-sa-item -> Item Name (strong) + Description
          // Col 1: .mc-sa-qty  -> Quantity & Unit (e.g. "1 Nos")
          // Col 2: .mc-sa-rate -> Rate (Rs.)
          const saRows = doc.querySelectorAll('.mc-sa-table tbody tr, table tbody tr');
          if (saRows.length > itemIndex) {
            const row = saRows[itemIndex];
            const cells = row.querySelectorAll('td');
            if (cells.length > 0) {
              // Target Col 0 directly
              cells[0].className = 'mc-sa-cell mc-sa-item';
              cells[0].innerHTML = `<strong>${escapeHtmlStr(newName)}</strong>${descHTML}`;
            }
          }
        } else if (
          activeDocType === 'quotation_main' ||
          activeDocType === 'quotation_alt_1' ||
          activeDocType === 'quotation_alt_2'
        ) {
          // ── Quotations (Main, Alt 1, Alt 2) ──────────────────────────────────
          const tableRows = doc.querySelectorAll('table tbody tr');
          if (tableRows.length > itemIndex) {
            const row = tableRows[itemIndex];
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
              const stripped = (cells[0].textContent || '').replace(/[\s\d०-९.,\-()/#]/g, '');
              const targetCol = stripped === '' ? 1 : 0;
              cells[targetCol].innerHTML = `<strong>${escapeHtmlStr(newName)}</strong>${descHTML}`;
            } else if (cells.length === 1) {
              cells[0].innerHTML = `<strong>${escapeHtmlStr(newName)}</strong>${descHTML}`;
            }
          } else {
            // Flex numbered list
            const itemRegex = new RegExp(`^\\s*${itemIndex + 1}\\s*[.)-]\\s*(.+)$`);
            const candidates = doc.querySelectorAll('div, p, span');
            for (const el of Array.from(candidates)) {
              if (el.closest('table')) continue;
              if (el.querySelector('div, p, table, ul, ol')) continue;
              const text = el.textContent?.trim() || '';
              if (itemRegex.test(text)) {
                el.textContent = `${itemIndex + 1}. ${newName}`;
                break;
              }
            }
          }
        } else {
          // ── Generic Fallback ────────────────────────────────────────────────
          const rows = doc.querySelectorAll('table tbody tr');
          if (rows.length > itemIndex) {
            const row = rows[itemIndex];
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
              const stripped = (cells[0].textContent || '').replace(/[\s\d०-९.,\-()/#]/g, '');
              const targetCol = stripped === '' ? 1 : 0;
              cells[targetCol].innerHTML = `<strong>${escapeHtmlStr(newName)}</strong>${descHTML}`;
            } else if (cells.length === 1) {
              cells[0].innerHTML = `<strong>${escapeHtmlStr(newName)}</strong>${descHTML}`;
            }
          }
        }

        currentHtml = doc.documentElement.outerHTML;
      } catch (domErr) {
        console.warn('DOM replacement error:', domErr);
      }
    }

    await onUpdateDocumentContent(currentHtml);
    showFeedback(`Updated item to: "${newName}"`);
  };

  /** Inline AI regeneration for a specific item name variant */
  const handleRegenerateItemOption = async (
    item: Tender['items'][0],
    matched: HindiMapping | undefined,
    targetField: string,
    fieldKey: string,
    isCombined: boolean = false
  ) => {
    setRegeneratingField(fieldKey);
    const userPrompt = (optionPromptText[fieldKey] || '').trim();

    try {
      const res = await fetch('/api/ai/regenerate-option', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'item_name',
          targetField,
          itemName: item.productName,
          description: item.description || matched?.englishDescription || '',
          currentValue: matched ? (matched as any)[targetField] : '',
          customPrompt: userPrompt,
          language,
        }),
      });

      if (!res.ok) throw new Error('Regeneration failed');
      const data = await res.json();
      const newValue = data.value;

      if (newValue) {
        if (matched) {
          const patch = { [targetField]: newValue };
          await dataService.itemHindiMappings.update(matched.id, patch);
          setMappings((prev) =>
            prev.map((m) => (m.id === matched.id ? { ...m, ...patch } : m))
          );
        }

        await handleApplyItemName(item, matched, newValue, tender.items.indexOf(item), isCombined);
        setExpandedRegenField(null);
        showFeedback(`Regenerated & applied: "${newValue}"`);
      }
    } catch (err) {
      console.error('Failed to regenerate item option:', err);
      showFeedback('Failed to regenerate option.');
    } finally {
      setRegeneratingField(null);
    }
  };

  /** Replace subject or phrase line in active document HTML without regex offset bugs */
  const handleApplyPhrase = async (newPhrase: string) => {
    if (!currentDocument || !newPhrase.trim()) return;

    // Clean up phrase by removing any leading 'विषय:-', 'विषय:', 'Subject:', etc.
    const cleanPhrase = newPhrase.replace(/^(विषय\s*[:-]*\s*|Subject\s*[:-]*\s*)/i, '').trim();
    if (!cleanPhrase) return;

    let currentHtml = currentDocument.contentHTML;

    if (typeof window !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(currentHtml, 'text/html');

        let replaced = false;

        // 1. Check dedicated subject class containers
        const subjectEls = doc.querySelectorAll(
          '.mc-vigyapti-subject, .mc-sa-subject, .subject, .doc-subject, [data-subject]'
        );
        for (const el of Array.from(subjectEls)) {
          const isHindi = language === 'hindi' || (el.textContent || '').includes('विषय');
          el.innerHTML = `<strong>${isHindi ? 'विषय:-' : 'Subject:'}</strong> ${escapeHtmlStr(cleanPhrase)}`;
          replaced = true;
        }

        // 2. Scan all heading, div, p, td elements that start with विषय or Subject
        if (!replaced) {
          const elements = doc.querySelectorAll('div, p, td, h2, h3, h4, span');
          for (const el of Array.from(elements)) {
            // Ignore containers that have block children
            if (el.querySelector('table, div, p, h1, h2, h3, h4')) continue;

            const txt = (el.textContent || '').trim();
            if (txt.startsWith('विषय') || txt.startsWith('Subject')) {
              const isHindi = txt.startsWith('विषय');
              el.innerHTML = `<strong>${isHindi ? 'विषय:-' : 'Subject:'}</strong> ${escapeHtmlStr(cleanPhrase)}`;
              replaced = true;
              break;
            }
          }
        }

        if (replaced) {
          currentHtml = doc.documentElement.outerHTML;
        }
      } catch (domErr) {
        console.warn('DOM phrase replacement error:', domErr);
      }
    }

    await onUpdateDocumentContent(currentHtml);
    showFeedback('Applied phrase pack subject to document!');
  };

  /** Inline AI regeneration for phrase pack option */
  const handleRegeneratePhraseOption = async (
    pack: DocumentPhraseMapping,
    phraseKeyPath: string,
    currentVal: string,
    fieldKey: string
  ) => {
    setRegeneratingField(fieldKey);
    const userPrompt = (optionPromptText[fieldKey] || '').trim();

    try {
      const res = await fetch('/api/ai/regenerate-option', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'phrase_pack',
          targetField: phraseKeyPath,
          itemName: pack.categoryName,
          currentValue: currentVal,
          customPrompt: userPrompt,
          language,
        }),
      });

      if (!res.ok) throw new Error('Regeneration failed');
      const data = await res.json();
      const newValue = data.value;

      if (newValue) {
        const updatedPhrases = { ...pack.phrases };
        if (phraseKeyPath === 'quotationMain') {
          updatedPhrases.quotationMain = {
            english: language === 'english' ? newValue : updatedPhrases.quotationMain?.english || '',
            hindi: language === 'hindi' ? newValue : updatedPhrases.quotationMain?.hindi || '',
          };
        } else if (phraseKeyPath === 'quotationAlt') {
          if (language === 'hindi') {
            updatedPhrases.quotationAltHindi = { subject: newValue };
          } else {
            updatedPhrases.quotationAltEnglish = { subject: newValue };
          }
        } else if (phraseKeyPath === 'purchaseLine') {
          updatedPhrases.quotation = { purchaseLine: newValue };
        }

        await dataService.documentPhraseMappings.update(pack.id, { phrases: updatedPhrases });
        setPhrasePacks((prev) =>
          prev.map((p) => (p.id === pack.id ? { ...p, phrases: updatedPhrases } : p))
        );

        await handleApplyPhrase(newValue);
        setExpandedRegenField(null);
        showFeedback(`Regenerated phrase: "${newValue}"`);
      }
    } catch (err) {
      console.error('Failed to regenerate phrase option:', err);
      showFeedback('Failed to regenerate phrase.');
    } finally {
      setRegeneratingField(null);
    }
  };

  const selectedPack = useMemo(() => {
    return phrasePacks.find((p) => p.id === selectedPackId) || phrasePacks[0] || null;
  }, [phrasePacks, selectedPackId]);

  const docTypeLabel = useMemo(() => {
    switch (activeDocType) {
      case 'vigyapti':
        return 'Vigyapti Notice';
      case 'quotation_main':
        return 'Main Quotation';
      case 'quotation_alt_1':
        return 'Alternate Quote A';
      case 'quotation_alt_2':
        return 'Alternate Quote B';
      case 'supply_aadesh':
        return 'Supply Order';
      case 'firm_bill':
        return 'Firm Bill';
      default:
        return 'Document';
    }
  }, [activeDocType]);

  return (
    <>
      {/* Floating Trigger Pill when closed */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed right-4 bottom-6 z-40 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xl hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 border border-blue-400/30"
          title="Open Quick Customizer"
        >
          <Sparkles className="h-4 w-4 animate-pulse text-amber-300" />
          <span>Quick Customizer</span>
          <span className="rounded-full bg-blue-500/80 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-blue-100">
            {docTypeLabel}
          </span>
        </button>
      )}

      {/* Slide-out Customizer Drawer */}
      {isOpen && (
        <div className="fixed right-4 top-20 bottom-6 z-50 flex w-[430px] max-w-[94vw] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 animate-in slide-in-from-right-8 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Wand2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Quick Customizer</h3>
                <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                  Active: <span className="text-blue-600 font-semibold">{docTypeLabel}</span>
                  <span>({language})</span>
                  {(targetFirm?.name || mainFirm?.name) && (
                    <span className="truncate max-w-[120px] text-slate-400">
                      • {targetFirm?.name || mainFirm?.name}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Feedback Toast */}
          {appliedFeedback && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs font-medium text-emerald-800 flex items-center gap-1.5 animate-in fade-in">
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>{appliedFeedback}</span>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="grid grid-cols-3 border-b border-slate-100 bg-slate-50 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('items')}
              className={`flex items-center justify-center gap-1.5 py-2.5 transition-colors border-b-2 ${
                activeTab === 'items'
                  ? 'border-blue-600 bg-white text-blue-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Tag className="h-3.5 w-3.5" />
              <span>Item Names</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('phrases')}
              className={`flex items-center justify-center gap-1.5 py-2.5 transition-colors border-b-2 ${
                activeTab === 'phrases'
                  ? 'border-blue-600 bg-white text-blue-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquareQuote className="h-3.5 w-3.5" />
              <span>Phrase Packs</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`flex items-center justify-center gap-1.5 py-2.5 transition-colors border-b-2 ${
                activeTab === 'ai'
                  ? 'border-blue-600 bg-white text-blue-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>AI Prompt</span>
            </button>
          </div>

          {/* Scrollable Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
            {/* TAB 1: Item Names & Alternates */}
            {activeTab === 'items' && (
              <div className="space-y-3">
                <div className="rounded-lg bg-blue-50/70 p-2.5 text-xs text-blue-900 border border-blue-200/60">
                  <p className="font-semibold flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5 text-blue-600" />
                    Alternative Item Names
                  </p>
                  <p className="mt-0.5 text-blue-700 text-[11px]">
                    Click any alternate to instantly swap in the document. Click ✨ AI to regenerate that option.
                  </p>
                </div>

                {tender.items.map((item, idx) => {
                  const rawName = item.productName.trim();
                  const matched = mappings.find(
                    (m) =>
                      m.hindiName.trim() === rawName ||
                      m.englishName.toLowerCase().trim() === rawName.toLowerCase() ||
                      (m.rawName && m.rawName.toLowerCase().trim() === rawName.toLowerCase())
                  );

                  const primaryName = language === 'hindi' ? (matched?.hindiName || rawName) : (matched?.englishName || rawName);
                  const alt1 = language === 'hindi' ? matched?.altHindiName : matched?.altEnglishName1;
                  const alt2 = language === 'hindi' ? matched?.altHindiName2 : matched?.altEnglishName2;
                  const alt3 = language === 'hindi' ? matched?.altHindiName3 : matched?.altEnglishName3;
                  const alt4 = language === 'hindi' ? matched?.altHindiName4 : matched?.altEnglishName4;

                  const description = item.description || matched?.rawDescription || matched?.englishDescription || matched?.hindiDescription || '';
                  const isCollapsed = Boolean(collapsedItems[idx]);

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all"
                    >
                      {/* Collapsible Card Header */}
                      <button
                        type="button"
                        onClick={() => toggleItemCollapse(idx)}
                        className="w-full flex items-center justify-between p-3 bg-slate-50/70 hover:bg-slate-100/70 text-left border-b border-slate-100 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="text-xs font-bold text-slate-800 block truncate">
                            #{idx + 1} {rawName}
                          </span>
                          {description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 italic mt-0.5">
                              {description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-slate-400 font-medium bg-white px-2 py-0.5 rounded border border-slate-200">
                            Qty: {item.quantity} {item.unit || 'Nos'}
                          </span>
                          {isCollapsed ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {/* Card Body with options (when expanded) */}
                      {!isCollapsed && (
                        <div className="p-3 space-y-2.5">
                          {/* Option 1: Primary Name */}
                          {(() => {
                            const fieldKey = `item-${idx}-primary`;
                            const isRegenOpen = expandedRegenField === fieldKey;
                            const targetField = language === 'hindi' ? 'hindiName' : 'englishName';

                            return (
                              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 space-y-1.5 transition-all">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <span className="block font-bold text-slate-900 text-xs leading-snug break-words">
                                      {primaryName}
                                    </span>
                                    <span className="inline-block text-[10px] font-medium text-slate-400 pt-0.5">
                                      Primary {language === 'hindi' ? 'Hindi' : 'English'} Name
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-md gap-1"
                                      title="Regenerate with custom prompt"
                                      onClick={() => setExpandedRegenField(isRegenOpen ? null : fieldKey)}
                                    >
                                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                      <span>AI</span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="h-7 px-3 text-xs bg-slate-900 text-white hover:bg-slate-800 rounded-md font-medium"
                                      onClick={() => handleApplyItemName(item, matched, primaryName, idx)}
                                    >
                                      Apply
                                    </Button>
                                  </div>
                                </div>

                                {isRegenOpen && (
                                  <div className="pt-2 border-t border-slate-200 space-y-2 animate-in fade-in">
                                    <input
                                      type="text"
                                      placeholder="Instruction (e.g. formal, include 500W, shorter)..."
                                      value={optionPromptText[fieldKey] || ''}
                                      onChange={(e) => setOptionPromptText((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
                                      className="w-full text-xs rounded border border-slate-300 px-2.5 py-1.5 bg-white focus:outline-none focus:border-blue-500"
                                    />
                                    <div className="flex justify-end gap-1.5">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-[11px]"
                                        onClick={() => setExpandedRegenField(null)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        disabled={regeneratingField === fieldKey}
                                        className="h-6 px-2.5 text-[11px] bg-blue-600 hover:bg-blue-700 text-white gap-1"
                                        onClick={() => handleRegenerateItemOption(item, matched, targetField, fieldKey)}
                                      >
                                        <RotateCw className={`h-3 w-3 ${regeneratingField === fieldKey ? 'animate-spin' : ''}`} />
                                        {regeneratingField === fieldKey ? 'Generating...' : 'Regenerate'}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Option 2: Alternate Name 1 (Medium) */}
                          {(() => {
                            const fieldKey = `item-${idx}-alt1`;
                            const isRegenOpen = expandedRegenField === fieldKey;
                            const targetField = language === 'hindi' ? 'altHindiName' : 'altEnglishName1';
                            const displayName = alt1 || `${primaryName} (Medium)`;

                            return (
                              <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-2.5 space-y-1.5 transition-all">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <span className="block font-bold text-amber-950 text-xs leading-snug break-words">
                                      {displayName}
                                    </span>
                                    <span className="inline-block text-[10px] font-medium text-amber-600 pt-0.5">
                                      Alternate Name 1
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs font-semibold text-amber-700 bg-amber-100/70 hover:bg-amber-200/70 border border-amber-300/80 rounded-md gap-1"
                                      title="Regenerate with custom prompt"
                                      onClick={() => setExpandedRegenField(isRegenOpen ? null : fieldKey)}
                                    >
                                      <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                                      <span>AI</span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="h-7 px-3 text-xs bg-amber-600 text-white hover:bg-amber-700 rounded-md font-medium"
                                      onClick={() => handleApplyItemName(
                                        item,
                                        matched,
                                        displayName,
                                        idx,
                                        false,
                                        language === 'hindi' ? matched?.altHindiDescription1 : matched?.altEnglishDescription1
                                      )}
                                    >
                                      Apply
                                    </Button>
                                  </div>
                                </div>

                                {isRegenOpen && (
                                  <div className="pt-2 border-t border-amber-200 space-y-2 animate-in fade-in">
                                    <input
                                      type="text"
                                      placeholder="Instruction for Alt 1 (Medium)..."
                                      value={optionPromptText[fieldKey] || ''}
                                      onChange={(e) => setOptionPromptText((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
                                      className="w-full text-xs rounded border border-amber-300 px-2.5 py-1.5 bg-white focus:outline-none focus:border-amber-600"
                                    />
                                    <div className="flex justify-end gap-1.5">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-[11px]"
                                        onClick={() => setExpandedRegenField(null)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        disabled={regeneratingField === fieldKey}
                                        className="h-6 px-2.5 text-[11px] bg-amber-600 hover:bg-amber-700 text-white gap-1"
                                        onClick={() => handleRegenerateItemOption(item, matched, targetField, fieldKey, false)}
                                      >
                                        <RotateCw className={`h-3 w-3 ${regeneratingField === fieldKey ? 'animate-spin' : ''}`} />
                                        {regeneratingField === fieldKey ? 'Generating...' : 'Regenerate'}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Option 3: Alternate Name 2 (Short) */}
                          {(() => {
                            const fieldKey = `item-${idx}-alt2`;
                            const isRegenOpen = expandedRegenField === fieldKey;
                            const targetField = language === 'hindi' ? 'altHindiName2' : 'altEnglishName2';
                            const displayName = alt2 || `${primaryName} (Short)`;

                            return (
                              <div className="rounded-lg border border-purple-200 bg-purple-50/30 p-2.5 space-y-1.5 transition-all">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <span className="block font-bold text-purple-950 text-xs leading-snug break-words">
                                      {displayName}
                                    </span>
                                    <span className="inline-block text-[10px] font-medium text-purple-600 pt-0.5">
                                      Alternate Name 2
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs font-semibold text-purple-700 bg-purple-100/70 hover:bg-purple-200/70 border border-purple-300/80 rounded-md gap-1"
                                      title="Regenerate with custom prompt"
                                      onClick={() => setExpandedRegenField(isRegenOpen ? null : fieldKey)}
                                    >
                                      <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                                      <span>AI</span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="h-7 px-3 text-xs bg-purple-600 text-white hover:bg-purple-700 rounded-md font-medium"
                                      onClick={() => handleApplyItemName(
                                        item,
                                        matched,
                                        displayName,
                                        idx,
                                        false,
                                        language === 'hindi' ? matched?.altHindiDescription2 : matched?.altEnglishDescription2
                                      )}
                                    >
                                      Apply
                                    </Button>
                                  </div>
                                </div>

                                {isRegenOpen && (
                                  <div className="pt-2 border-t border-purple-200 space-y-2 animate-in fade-in">
                                    <input
                                      type="text"
                                      placeholder="Instruction for Alt 2 (Short)..."
                                      value={optionPromptText[fieldKey] || ''}
                                      onChange={(e) => setOptionPromptText((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
                                      className="w-full text-xs rounded border border-purple-300 px-2.5 py-1.5 bg-white focus:outline-none focus:border-purple-600"
                                    />
                                    <div className="flex justify-end gap-1.5">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-[11px]"
                                        onClick={() => setExpandedRegenField(null)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        disabled={regeneratingField === fieldKey}
                                        className="h-6 px-2.5 text-[11px] bg-purple-600 hover:bg-purple-700 text-white gap-1"
                                        onClick={() => handleRegenerateItemOption(item, matched, targetField, fieldKey, false)}
                                      >
                                        <RotateCw className={`h-3 w-3 ${regeneratingField === fieldKey ? 'animate-spin' : ''}`} />
                                        {regeneratingField === fieldKey ? 'Generating...' : 'Regenerate'}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Option 4: Alternate Name 3 (Combined Medium) - ONLY IF DESCRIPTION EXISTS */}
                          {Boolean(description) && (() => {
                            const fieldKey = `item-${idx}-alt3`;
                            const isRegenOpen = expandedRegenField === fieldKey;
                            const targetField = language === 'hindi' ? 'altHindiName3' : 'altEnglishName3';
                            const displayName = alt3 || (description ? `${primaryName} सहित ${description}` : `${primaryName} (Combined)`);

                            return (
                              <div className="rounded-lg border border-teal-200 bg-teal-50/30 p-2.5 space-y-1.5 transition-all">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <span className="block font-bold text-teal-950 text-xs leading-snug break-words">
                                      {displayName}
                                    </span>
                                    <span className="inline-block text-[10px] font-medium text-teal-600 pt-0.5">
                                      Alt 3 (Combined Med)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs font-semibold text-teal-700 bg-teal-100/70 hover:bg-teal-200/70 border border-teal-300/80 rounded-md gap-1"
                                      title="Regenerate with custom prompt"
                                      onClick={() => setExpandedRegenField(isRegenOpen ? null : fieldKey)}
                                    >
                                      <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                                      <span>AI</span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="h-7 px-3 text-xs bg-teal-600 text-white hover:bg-teal-700 rounded-md font-medium"
                                      onClick={() => handleApplyItemName(item, matched, displayName, idx, true)}
                                    >
                                      Apply
                                    </Button>
                                  </div>
                                </div>

                                {isRegenOpen && (
                                  <div className="pt-2 border-t border-teal-200 space-y-2 animate-in fade-in">
                                    <input
                                      type="text"
                                      placeholder="Instruction for Alt 3 Combined..."
                                      value={optionPromptText[fieldKey] || ''}
                                      onChange={(e) => setOptionPromptText((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
                                      className="w-full text-xs rounded border border-teal-300 px-2.5 py-1.5 bg-white focus:outline-none focus:border-teal-600"
                                    />
                                    <div className="flex justify-end gap-1.5">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-[11px]"
                                        onClick={() => setExpandedRegenField(null)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        disabled={regeneratingField === fieldKey}
                                        className="h-6 px-2.5 text-[11px] bg-teal-600 hover:bg-teal-700 text-white gap-1"
                                        onClick={() => handleRegenerateItemOption(item, matched, targetField, fieldKey, true)}
                                      >
                                        <RotateCw className={`h-3 w-3 ${regeneratingField === fieldKey ? 'animate-spin' : ''}`} />
                                        {regeneratingField === fieldKey ? 'Generating...' : 'Regenerate'}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Option 5: Alternate Name 4 (Combined Short) - ONLY IF DESCRIPTION EXISTS */}
                          {Boolean(description) && (() => {
                            const fieldKey = `item-${idx}-alt4`;
                            const isRegenOpen = expandedRegenField === fieldKey;
                            const targetField = language === 'hindi' ? 'altHindiName4' : 'altEnglishName4';
                            const displayName = alt4 || (description ? `${primaryName} (${description.slice(0, 20)})` : `${primaryName} (Short)`);

                            return (
                              <div className="rounded-lg border border-sky-200 bg-sky-50/30 p-2.5 space-y-1.5 transition-all">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <span className="block font-bold text-sky-950 text-xs leading-snug break-words">
                                      {displayName}
                                    </span>
                                    <span className="inline-block text-[10px] font-medium text-sky-600 pt-0.5">
                                      Alt 4 (Combined Short)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs font-semibold text-sky-700 bg-sky-100/70 hover:bg-sky-200/70 border border-sky-300/80 rounded-md gap-1"
                                      title="Regenerate with custom prompt"
                                      onClick={() => setExpandedRegenField(isRegenOpen ? null : fieldKey)}
                                    >
                                      <Sparkles className="h-3.5 w-3.5 text-sky-600" />
                                      <span>AI</span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="h-7 px-3 text-xs bg-sky-600 text-white hover:bg-sky-700 rounded-md font-medium"
                                      onClick={() => handleApplyItemName(item, matched, displayName, idx, true)}
                                    >
                                      Apply
                                    </Button>
                                  </div>
                                </div>

                                {isRegenOpen && (
                                  <div className="pt-2 border-t border-sky-200 space-y-2 animate-in fade-in">
                                    <input
                                      type="text"
                                      placeholder="Instruction for Alt 4 (Short Combined)..."
                                      value={optionPromptText[fieldKey] || ''}
                                      onChange={(e) => setOptionPromptText((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
                                      className="w-full text-xs rounded border border-sky-300 px-2.5 py-1.5 bg-white focus:outline-none focus:border-sky-600"
                                    />
                                    <div className="flex justify-end gap-1.5">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-[11px]"
                                        onClick={() => setExpandedRegenField(null)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        disabled={regeneratingField === fieldKey}
                                        className="h-6 px-2.5 text-[11px] bg-sky-600 hover:bg-sky-700 text-white gap-1"
                                        onClick={() => handleRegenerateItemOption(item, matched, targetField, fieldKey, true)}
                                      >
                                        <RotateCw className={`h-3 w-3 ${regeneratingField === fieldKey ? 'animate-spin' : ''}`} />
                                        {regeneratingField === fieldKey ? 'Generating...' : 'Regenerate'}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: Phrase Packs */}
            {activeTab === 'phrases' && (
              <div className="space-y-4">
                <div className="rounded-lg bg-emerald-50/70 p-2.5 text-xs text-emerald-900 border border-emerald-200/60">
                  <p className="font-semibold flex items-center gap-1">
                    <MessageSquareQuote className="h-3.5 w-3.5 text-emerald-600" />
                    Government Phrase Packs
                  </p>
                  <p className="mt-0.5 text-emerald-700 text-[11px]">
                    Select phrase categories, apply official subjects, or click ✨ AI to regenerate specific phrases.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Category Pack
                  </label>
                  <select
                    value={selectedPackId}
                    onChange={(e) => setSelectedPackId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none"
                  >
                    {phrasePacks.map((pack) => (
                      <option key={pack.id} value={pack.id}>
                        {pack.categoryName} ({pack.keywords.slice(0, 2).join(', ')})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPack && (
                  <div className="space-y-3 pt-2">
                    {/* Quotation Main Subject */}
                    {(() => {
                      const fieldKey = 'phrase-quote-main';
                      const isRegenOpen = expandedRegenField === fieldKey;
                      const phraseText = language === 'hindi'
                        ? selectedPack.phrases.quotationMain?.hindi || ''
                        : selectedPack.phrases.quotationMain?.english || '';

                      return (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-700">Main Quotation Subject</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-md gap-1"
                                title="Regenerate subject with custom prompt"
                                onClick={() => setExpandedRegenField(isRegenOpen ? null : fieldKey)}
                              >
                                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                <span>AI</span>
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 px-3 text-xs bg-slate-900 text-white hover:bg-slate-800 rounded-md font-medium"
                                onClick={() => handleApplyPhrase(phraseText)}
                              >
                                Apply
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 font-medium break-words">
                            {phraseText || 'N/A'}
                          </p>

                          {isRegenOpen && (
                            <div className="pt-2 border-t border-slate-200 space-y-2 animate-in fade-in">
                              <input
                                type="text"
                                placeholder="Custom instruction for main subject..."
                                value={optionPromptText[fieldKey] || ''}
                                onChange={(e) => setOptionPromptText((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
                                className="w-full text-xs rounded border border-slate-300 px-2.5 py-1.5 bg-white focus:outline-none focus:border-blue-500"
                              />
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-[11px]"
                                  onClick={() => setExpandedRegenField(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={regeneratingField === fieldKey}
                                  className="h-6 px-2.5 text-[11px] bg-blue-600 hover:bg-blue-700 text-white gap-1"
                                  onClick={() => handleRegeneratePhraseOption(selectedPack, 'quotationMain', phraseText, fieldKey)}
                                >
                                  <RotateCw className={`h-3 w-3 ${regeneratingField === fieldKey ? 'animate-spin' : ''}`} />
                                  {regeneratingField === fieldKey ? 'Generating...' : 'Regenerate'}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Quotation Alt Subject */}
                    {(() => {
                      const fieldKey = 'phrase-quote-alt';
                      const isRegenOpen = expandedRegenField === fieldKey;
                      const phraseText = language === 'hindi'
                        ? selectedPack.phrases.quotationAltHindi?.subject || ''
                        : selectedPack.phrases.quotationAltEnglish?.subject || '';

                      return (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-amber-900">Alternate Quotation Subject</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs font-semibold text-amber-800 bg-amber-100/70 hover:bg-amber-200/70 border border-amber-300/80 rounded-md gap-1"
                                title="Regenerate alternate subject"
                                onClick={() => setExpandedRegenField(isRegenOpen ? null : fieldKey)}
                              >
                                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                                <span>AI</span>
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 px-3 text-xs bg-amber-600 text-white hover:bg-amber-700 rounded-md font-medium"
                                onClick={() => handleApplyPhrase(phraseText)}
                              >
                                Apply
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-amber-800 font-medium break-words">
                            {phraseText || 'N/A'}
                          </p>

                          {isRegenOpen && (
                            <div className="pt-2 border-t border-amber-200 space-y-2 animate-in fade-in">
                              <input
                                type="text"
                                placeholder="Custom instruction for alternate subject..."
                                value={optionPromptText[fieldKey] || ''}
                                onChange={(e) => setOptionPromptText((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
                                className="w-full text-xs rounded border border-amber-300 px-2.5 py-1.5 bg-white focus:outline-none focus:border-amber-600"
                              />
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-[11px]"
                                  onClick={() => setExpandedRegenField(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={regeneratingField === fieldKey}
                                  className="h-6 px-2.5 text-[11px] bg-amber-600 hover:bg-amber-700 text-white gap-1"
                                  onClick={() => handleRegeneratePhraseOption(selectedPack, 'quotationAlt', phraseText, fieldKey)}
                                >
                                  <RotateCw className={`h-3 w-3 ${regeneratingField === fieldKey ? 'animate-spin' : ''}`} />
                                  {regeneratingField === fieldKey ? 'Generating...' : 'Regenerate'}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* General Purchase Line */}
                    {(() => {
                      const fieldKey = 'phrase-purchase-line';
                      const isRegenOpen = expandedRegenField === fieldKey;
                      const phraseText = selectedPack.phrases.quotation?.purchaseLine || '';

                      return (
                        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-700">General Purchase Statement</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-md gap-1"
                                title="Regenerate statement"
                                onClick={() => setExpandedRegenField(isRegenOpen ? null : fieldKey)}
                              >
                                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                <span>AI</span>
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 px-3 text-xs bg-slate-900 text-white hover:bg-slate-800 rounded-md font-medium"
                                onClick={() => handleApplyPhrase(phraseText)}
                              >
                                Apply
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 break-words">
                            {phraseText || 'N/A'}
                          </p>

                          {isRegenOpen && (
                            <div className="pt-2 border-t border-slate-200 space-y-2 animate-in fade-in">
                              <input
                                type="text"
                                placeholder="Custom instruction for purchase statement..."
                                value={optionPromptText[fieldKey] || ''}
                                onChange={(e) => setOptionPromptText((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
                                className="w-full text-xs rounded border border-slate-300 px-2.5 py-1.5 bg-white focus:outline-none focus:border-blue-500"
                              />
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-[11px]"
                                  onClick={() => setExpandedRegenField(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={regeneratingField === fieldKey}
                                  className="h-6 px-2.5 text-[11px] bg-blue-600 hover:bg-blue-700 text-white gap-1"
                                  onClick={() => handleRegeneratePhraseOption(selectedPack, 'purchaseLine', phraseText, fieldKey)}
                                >
                                  <RotateCw className={`h-3 w-3 ${regeneratingField === fieldKey ? 'animate-spin' : ''}`} />
                                  {regeneratingField === fieldKey ? 'Generating...' : 'Regenerate'}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: AI Prompt Refine & Regenerate */}
            {activeTab === 'ai' && (
              <div className="space-y-4">
                <div className="rounded-lg bg-purple-50/70 p-2.5 text-xs text-purple-900 border border-purple-200/60">
                  <p className="font-semibold flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                    Custom AI Instructions
                  </p>
                  <p className="mt-0.5 text-purple-700 text-[11px]">
                    Specify custom conditions, tone adjustments, or clauses to regenerate this document.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Quick Suggestions
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PROMPT_SUGGESTIONS.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCustomPrompt((prev) => (prev ? `${prev}\n${chip.text}` : chip.text));
                        }}
                        className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 transition-all text-left"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Custom Prompt / Clause Requirements
                  </label>
                  <textarea
                    rows={4}
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="e.g., Include 30-day payment term, specify delivery within 7 working days, and make tone formal..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none shadow-inner"
                  />
                </div>

                <Button
                  type="button"
                  onClick={() => onRegenerateDocument(customPrompt.trim() || undefined)}
                  disabled={generating}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md gap-2"
                >
                  <RotateCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
                  {generating ? 'Regenerating Document...' : 'Regenerate Document with AI'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
