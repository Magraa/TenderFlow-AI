'use client';

import { useState, useMemo } from 'react';
import { PurposeMapping, HindiMapping, PlaceMapping } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, 
  Search, 
  Plus, 
  DownloadCloud, 
  UploadCloud, 
  MapPin, 
  Package, 
  Languages, 
  Trash2, 
  Edit3, 
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface DictionariesSectionProps {
  purposeMappings: PurposeMapping[];
  itemHindiMappings: HindiMapping[];
  placeMappings: PlaceMapping[];
  loadingMappings: boolean;
  onOpenAddPurpose: () => void;
  onOpenEditPurpose: (mapping: PurposeMapping) => void;
  onDeletePurpose: (id: string) => void;
  onOpenAddItem: () => void;
  onOpenEditItem: (mapping: HindiMapping) => void;
  onDeleteItem: (id: string) => void;
  onOpenAddPlace: () => void;
  onOpenEditPlace: (place: PlaceMapping) => void;
  onDeletePlace: (id: string) => void;
  onOpenImport: (type: 'purpose' | 'itemHindi') => void;
  onOpenExport: (type: 'purpose' | 'itemHindi') => void;
}

export function DictionariesSection({
  purposeMappings,
  itemHindiMappings,
  placeMappings,
  loadingMappings,
  onOpenAddPurpose,
  onOpenEditPurpose,
  onDeletePurpose,
  onOpenAddItem,
  onOpenEditItem,
  onDeleteItem,
  onOpenAddPlace,
  onOpenEditPlace,
  onDeletePlace,
  onOpenImport,
  onOpenExport,
}: DictionariesSectionProps) {
  const [subTab, setSubTab] = useState<'items' | 'purpose' | 'places'>('items');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Filtered & sorted items
  const filteredItems = useMemo(() => {
    let list = itemHindiMappings;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((m) => {
        const raw = (m.rawName || '').toLowerCase();
        const rawDesc = (m.rawDescription || '').toLowerCase();
        const eng = (m.englishName || '').toLowerCase();
        const engDesc = (m.englishDescription || '').toLowerCase();
        const hin = (m.hindiName || '').toLowerCase();
        const hinDesc = (m.hindiDescription || '').toLowerCase();
        const altHin1 = (m.altHindiName || '').toLowerCase();
        const altHin2 = (m.altHindiName2 || '').toLowerCase();
        const altHin3 = (m.altHindiName3 || '').toLowerCase();
        const altHin4 = (m.altHindiName4 || '').toLowerCase();
        const altEng1 = (m.altEnglishName1 || '').toLowerCase();
        const altEng2 = (m.altEnglishName2 || '').toLowerCase();

        return (
          raw.includes(q) ||
          rawDesc.includes(q) ||
          eng.includes(q) ||
          engDesc.includes(q) ||
          hin.includes(q) ||
          hinDesc.includes(q) ||
          altHin1.includes(q) ||
          altHin2.includes(q) ||
          altHin3.includes(q) ||
          altHin4.includes(q) ||
          altEng1.includes(q) ||
          altEng2.includes(q)
        );
      });
    }
    return [...list].reverse();
  }, [itemHindiMappings, searchQuery]);

  // Filtered purposes
  const filteredPurposes = useMemo(() => {
    let list = purposeMappings;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.category.toLowerCase().includes(q) ||
          p.professionalPurpose.toLowerCase().includes(q) ||
          p.language.toLowerCase().includes(q)
      );
    }
    return [...list].reverse();
  }, [purposeMappings, searchQuery]);

  // Filtered places
  const filteredPlaces = useMemo(() => {
    let list = placeMappings;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          (p.englishName && p.englishName.toLowerCase().includes(q)) ||
          (p.hindiName && p.hindiName.toLowerCase().includes(q)) ||
          (p.districtName && p.districtName.toLowerCase().includes(q))
      );
    }
    return [...list].reverse();
  }, [placeMappings, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Master Procurement Dictionaries
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Manage transliterations, procurement purpose libraries, and municipal location records.
          </p>
        </div>

        {/* Global Sub-Tab Navigation */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
          <button
            type="button"
            onClick={() => setSubTab('items')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'items'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            <span>Items ({itemHindiMappings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('purpose')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'purpose'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Languages className="h-3.5 w-3.5" />
            <span>Purpose ({purposeMappings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('places')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'places'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>Locations ({placeMappings.length})</span>
          </button>
        </div>
      </div>

      {/* Action & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder={
              subTab === 'items'
                ? 'Search by English, Hindi, or alternate names...'
                : subTab === 'purpose'
                ? 'Search purposes or categories...'
                : 'Search locations or districts...'
            }
            className="pl-9 h-9 text-xs border-slate-200 rounded-xl bg-slate-50/50 focus-visible:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {subTab !== 'places' && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs rounded-xl border-slate-200 font-semibold"
                onClick={() => onOpenImport(subTab === 'items' ? 'itemHindi' : 'purpose')}
              >
                <UploadCloud className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs rounded-xl border-slate-200 font-semibold"
                onClick={() => onOpenExport(subTab === 'items' ? 'itemHindi' : 'purpose')}
              >
                <DownloadCloud className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                Export
              </Button>
            </>
          )}

          {subTab === 'items' && (
            <Button
              size="sm"
              className="h-9 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
              onClick={onOpenAddItem}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Item Pack
            </Button>
          )}

          {subTab === 'purpose' && (
            <Button
              size="sm"
              className="h-9 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
              onClick={onOpenAddPurpose}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Purpose
            </Button>
          )}

          {subTab === 'places' && (
            <Button
              size="sm"
              className="h-9 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
              onClick={onOpenAddPlace}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Location
            </Button>
          )}
        </div>
      </div>

      {/* ─── Sub-Tab 1: Items Transliterations ─── */}
      {subTab === 'items' && (
        <div className="space-y-3">
          {loadingMappings ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              Loading dictionary items...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-10 text-center rounded-2xl border border-dashed border-slate-200 bg-white space-y-2">
              <Package className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No item mappings found</p>
              <p className="text-[11px] text-slate-400">
                {searchQuery ? 'Try a different search query.' : 'Add your first item transliteration pack.'}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isExpanded = expandedItemId === item.id;
              const hasAlternates = Boolean(
                item.altHindiName || item.altHindiName2 || item.altEnglishName1 || item.altEnglishName2
              );

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">{item.englishName}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-bold text-blue-700">{item.hindiName}</span>
                        {item.rawName && (
                          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200/60 px-2 py-0.5 rounded-md font-mono">
                            Raw: {item.rawName}
                          </span>
                        )}
                      </div>

                      {(item.englishDescription || item.hindiDescription) && (
                        <div className="text-[11px] text-slate-500 space-y-0.5 pt-0.5">
                          {item.englishDescription && <p className="truncate">EN: {item.englishDescription}</p>}
                          {item.hindiDescription && <p className="truncate text-slate-600">HI: {item.hindiDescription}</p>}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasAlternates && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg px-2"
                          onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                        >
                          <Layers className="h-3.5 w-3.5 mr-1 text-slate-400" />
                          <span>Variations</span>
                          {isExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-medium rounded-lg border-slate-200"
                        onClick={() => onOpenEditItem(item)}
                      >
                        <Edit3 className="h-3 w-3 sm:mr-1" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 text-xs font-medium rounded-lg"
                        onClick={() => onDeleteItem(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Expandable Variations Pill Strip */}
                  {isExpanded && hasAlternates && (
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-2 text-xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Configured Variations (Competing Bids)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {item.altHindiName && (
                          <div className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px]">
                            <span className="font-semibold text-slate-400">Alt HI 1:</span> {item.altHindiName}
                          </div>
                        )}
                        {item.altHindiName2 && (
                          <div className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px]">
                            <span className="font-semibold text-slate-400">Alt HI 2:</span> {item.altHindiName2}
                          </div>
                        )}
                        {item.altEnglishName1 && (
                          <div className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px]">
                            <span className="font-semibold text-slate-400">Alt EN 1:</span> {item.altEnglishName1}
                          </div>
                        )}
                        {item.altEnglishName2 && (
                          <div className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px]">
                            <span className="font-semibold text-slate-400">Alt EN 2:</span> {item.altEnglishName2}
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
      )}

      {/* ─── Sub-Tab 2: Purpose Library ─── */}
      {subTab === 'purpose' && (
        <div className="space-y-3">
          {loadingMappings ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              Loading purpose library...
            </div>
          ) : filteredPurposes.length === 0 ? (
            <div className="p-10 text-center rounded-2xl border border-dashed border-slate-200 bg-white space-y-2">
              <Languages className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No purpose mappings found</p>
              <p className="text-[11px] text-slate-400">
                {searchQuery ? 'Try a different search query.' : 'Add your first purpose statement.'}
              </p>
            </div>
          ) : (
            filteredPurposes.map((mapping) => (
              <div
                key={mapping.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition-all flex items-start justify-between gap-4"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 font-bold">
                      {mapping.category}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {mapping.language}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 pt-1 leading-relaxed">
                    {mapping.professionalPurpose}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium rounded-lg border-slate-200"
                    onClick={() => onOpenEditPurpose(mapping)}
                  >
                    <Edit3 className="h-3 w-3 sm:mr-1" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 text-xs font-medium rounded-lg"
                    onClick={() => onDeletePurpose(mapping.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Sub-Tab 3: Locations ─── */}
      {subTab === 'places' && (
        <div className="space-y-3">
          {loadingMappings ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              Loading location mappings...
            </div>
          ) : filteredPlaces.length === 0 ? (
            <div className="p-10 text-center rounded-2xl border border-dashed border-slate-200 bg-white space-y-2">
              <MapPin className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No locations configured</p>
              <p className="text-[11px] text-slate-400">
                {searchQuery ? 'Try a different search query.' : 'Add your first municipal location mapping.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPlaces.map((place) => (
                <div
                  key={place.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition-all space-y-2.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{place.englishName}</p>
                        {place.hindiName && (
                          <p className="text-[11px] font-semibold text-blue-700">{place.hindiName}</p>
                        )}
                      </div>
                      {place.localBodyType && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          {place.localBodyType}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-[11px] text-slate-500 space-y-1">
                      {place.districtName && (
                        <p><span className="font-semibold text-slate-400">District:</span> {place.districtName} {place.districtHindiName ? `(${place.districtHindiName})` : ''}</p>
                      )}
                      {place.stateName && (
                        <p><span className="font-semibold text-slate-400">State:</span> {place.stateName}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] font-medium rounded-lg border-slate-200"
                      onClick={() => onOpenEditPlace(place)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 text-[11px] font-medium rounded-lg"
                      onClick={() => onDeletePlace(place.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
