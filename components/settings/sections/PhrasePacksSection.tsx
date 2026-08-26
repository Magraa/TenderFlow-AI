'use client';

import { useState, useMemo } from 'react';
import { DocumentPhraseMapping } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Package, 
  Search, 
  Plus, 
  Sparkles, 
  Trash2, 
  Edit3, 
  ChevronDown, 
  ChevronUp, 
  FileText,
  Tag
} from 'lucide-react';

interface PhrasePacksSectionProps {
  phrasePacks: DocumentPhraseMapping[];
  loading: boolean;
  onOpenAdd: () => void;
  onOpenEdit: (pack: DocumentPhraseMapping) => void;
  onDelete: (id: string) => void;
}

export function PhrasePacksSection({
  phrasePacks,
  loading,
  onOpenAdd,
  onOpenEdit,
  onDelete,
}: PhrasePacksSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredPacks = useMemo(() => {
    let list = phrasePacks;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.categoryName.toLowerCase().includes(q) ||
          (p.keywords && p.keywords.some((k) => k.toLowerCase().includes(q))) ||
          (p.englishDescription && p.englishDescription.toLowerCase().includes(q))
      );
    }
    return [...list].reverse();
  }, [phrasePacks, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            Standardized Phrase Packs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Pre-approved procurement phrase formulation templates for quotation bodies, supply orders, and billing descriptions.
          </p>
        </div>

        <Button
          size="sm"
          className="h-9 text-xs rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs"
          onClick={onOpenAdd}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Create Phrase Pack
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search phrase packs by category or keyword..."
            className="pl-9 h-9 text-xs border-slate-200 rounded-xl bg-slate-50/50 focus-visible:ring-purple-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Phrase Packs List */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium">
            Loading phrase packs...
          </div>
        ) : filteredPacks.length === 0 ? (
          <div className="p-10 text-center rounded-2xl border border-dashed border-slate-200 bg-white space-y-2">
            <Package className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">No phrase packs found</p>
            <p className="text-[11px] text-slate-400">
              {searchQuery ? 'Try a different search query.' : 'Create your first standardized phrase pack.'}
            </p>
          </div>
        ) : (
          filteredPacks.map((pack) => {
            const isExpanded = expandedId === pack.id;
            const keywords = pack.keywords || [];

            return (
              <div
                key={pack.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">{pack.categoryName}</span>
                      {pack.generatedByAI && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-purple-50 text-purple-700 border border-purple-200/70 px-2 py-0.5 rounded-full font-bold">
                          <Sparkles className="h-3 w-3" />
                          AI Generated
                        </span>
                      )}
                    </div>

                    {pack.englishDescription && (
                      <p className="text-xs text-slate-500 line-clamp-1">{pack.englishDescription}</p>
                    )}

                    {keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {keywords.slice(0, 5).map((kw, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium"
                          >
                            <Tag className="h-2.5 w-2.5 text-slate-400" />
                            {kw}
                          </span>
                        ))}
                        {keywords.length > 5 && (
                          <span className="text-[10px] text-slate-400 self-center">
                            +{keywords.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg px-2"
                      onClick={() => setExpandedId(isExpanded ? null : pack.id)}
                    >
                      <FileText className="h-3.5 w-3.5 mr-1 text-slate-400" />
                      <span>{isExpanded ? 'Hide Phrases' : 'View Phrases'}</span>
                      {isExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-medium rounded-lg border-slate-200"
                      onClick={() => onOpenEdit(pack)}
                    >
                      <Edit3 className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 text-xs font-medium rounded-lg"
                      onClick={() => onDelete(pack.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Clause Accordion */}
                {isExpanded && (
                  <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-3 text-xs animate-fade-in">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Standardized Clause Templates
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {pack.phrases?.supplyOrder?.subject && (
                        <div className="p-3 bg-white rounded-xl border border-slate-200/70 space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Supply Order Subject</p>
                          <p className="text-slate-800 font-medium">{pack.phrases.supplyOrder.subject}</p>
                        </div>
                      )}

                      {pack.phrases?.quotation?.purchaseLine && (
                        <div className="p-3 bg-white rounded-xl border border-slate-200/70 space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Quotation Purchase Line</p>
                          <p className="text-slate-800 font-medium">{pack.phrases.quotation.purchaseLine}</p>
                        </div>
                      )}

                      {pack.phrases?.quotationMain?.hindi && (
                        <div className="p-3 bg-white rounded-xl border border-slate-200/70 space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Main Quotation (Hindi)</p>
                          <p className="text-slate-800 font-medium">{pack.phrases.quotationMain.hindi}</p>
                        </div>
                      )}

                      {pack.phrases?.quotationMain?.english && (
                        <div className="p-3 bg-white rounded-xl border border-slate-200/70 space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Main Quotation (English)</p>
                          <p className="text-slate-800 font-medium">{pack.phrases.quotationMain.english}</p>
                        </div>
                      )}

                      {pack.phrases?.quotationAltHindi?.subject && (
                        <div className="p-3 bg-white rounded-xl border border-slate-200/70 space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Alt Quotation (Hindi)</p>
                          <p className="text-slate-800 font-medium">{pack.phrases.quotationAltHindi.subject}</p>
                        </div>
                      )}

                      {pack.phrases?.bill?.itemDescription && (
                        <div className="p-3 bg-white rounded-xl border border-slate-200/70 space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Bill / Invoice Description</p>
                          <p className="text-slate-800 font-medium">{pack.phrases.bill.itemDescription}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
