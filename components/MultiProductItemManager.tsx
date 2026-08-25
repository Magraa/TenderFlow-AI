'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TenderItem, HindiMapping } from '@/types';
import { dataService } from '@/services/dataService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UNIT_OPTIONS } from '@/lib/unitUtils';
import { X } from 'lucide-react';

const GST_OPTIONS: Array<0 | 5 | 9 | 12 | 18> = [0, 5, 9, 12, 18];

// Sentinel value to indicate "custom" is selected in the dropdown
const CUSTOM_UNIT_VALUE = '__custom__';

function createRowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function calculateSubtotal(item: TenderItem): number {
  return Math.round(item.quantity * item.rate * 100) / 100;
}

function createNewItem(tenderId: string): TenderItem {
  const now = new Date().toISOString();
  return {
    id: createRowId(),
    tenderId,
    productName: '',
    description: '',
    quantity: 1,
    unit: 'Nos',
    rate: 0,
    gstPercent: 18,
    totalAmount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/** Returns true if the unit value is NOT in the known preset list */
function isCustomUnit(unit: string | undefined): boolean {
  if (!unit) return false;
  return !UNIT_OPTIONS.some((u) => u.value === unit);
}

export interface ItemManagerProps {
  tenderId: string;
  items: TenderItem[];
  onItemsChange: (items: TenderItem[]) => void;
}

interface ProductSuggestion {
  id: string;
  name: string;
  description?: string;
  hindiName?: string;
  rawName?: string;
}

interface ProductAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: { name: string; description?: string }) => void;
  suggestions: ProductSuggestion[];
  placeholder?: string;
}

function ProductAutocompleteInput({
  value,
  onChange,
  onSelect,
  suggestions,
  placeholder = 'Product name',
}: ProductAutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 320),
      });
    }
  };

  // Filter suggestions dynamically based on typed text
  const filteredSuggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];

    const exactStarts: ProductSuggestion[] = [];
    const nameContains: ProductSuggestion[] = [];
    const otherContains: ProductSuggestion[] = [];

    for (const s of suggestions) {
      const sName = s.name.toLowerCase();
      const sRaw = (s.rawName || '').toLowerCase();
      const sHindi = (s.hindiName || '').toLowerCase();
      const sDesc = (s.description || '').toLowerCase();

      if (sName.startsWith(q) || sRaw.startsWith(q)) {
        exactStarts.push(s);
      } else if (sName.includes(q) || sRaw.includes(q)) {
        nameContains.push(s);
      } else if (sHindi.includes(q) || sDesc.includes(q)) {
        otherContains.push(s);
      }
    }

    return [...exactStarts, ...nameContains, ...otherContains];
  }, [value, suggestions]);

  useEffect(() => {
    if (!isOpen) return;
    updateCoords();
    const handleScrollOrResize = () => {
      updateCoords();
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Scroll highlighted item into view during keyboard navigation
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleSelect = (item: ProductSuggestion) => {
    onSelect({
      name: item.name,
      description: item.description,
    });
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredSuggestions.length === 0) {
      if (e.key === 'ArrowDown' && value.trim().length > 0) {
        updateCoords();
        setIsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        e.preventDefault();
        handleSelect(filteredSuggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          updateCoords();
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => {
          if (value.trim().length > 0) {
            updateCoords();
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />

      {mounted &&
        isOpen &&
        filteredSuggestions.length > 0 &&
        createPortal(
          <div
            ref={listRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="max-h-[220px] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl py-1 text-slate-800 animate-in fade-in-0 zoom-in-95 duration-100"
          >
            {filteredSuggestions.map((item, idx) => {
              const isHighlighted = idx === highlightedIndex;
              return (
                <button
                  key={`${item.id}-${idx}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(item);
                  }}
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors border-b border-slate-50 last:border-b-0 ${
                    isHighlighted ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="font-medium text-slate-900 text-xs sm:text-sm truncate">
                      {item.name}
                    </span>
                    {item.hindiName && (
                      <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 font-normal">
                        {item.hindiName}
                      </span>
                    )}
                  </div>
                  {item.description ? (
                    <span className="line-clamp-1 text-xs text-slate-500">
                      {item.description}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

export function MultiProductItemManager({ tenderId, items, onItemsChange }: ItemManagerProps) {
  const [mappings, setMappings] = useState<HindiMapping[]>([]);
  // Track which rows are in "custom unit" mode (dropdown shows __custom__ and text input visible)
  const [customUnitRows, setCustomUnitRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const list = await dataService.itemHindiMappings.list();
        setMappings(list);
      } catch (err) {
        console.error('Error loading item Hindi mappings:', err);
      }
    })();
  }, []);

  // Pre-process mappings into product suggestions
  const productSuggestions = useMemo(() => {
    const list: ProductSuggestion[] = [];
    const seenNames = new Set<string>();

    for (const m of mappings) {
      if (m.englishName && m.englishName.trim()) {
        const name = m.englishName.trim();
        const lower = name.toLowerCase();
        if (!seenNames.has(lower)) {
          seenNames.add(lower);
          list.push({
            id: `${m.id}-en`,
            name,
            description: m.englishDescription?.trim() || m.rawDescription?.trim(),
            hindiName: m.hindiName?.trim(),
            rawName: m.rawName?.trim(),
          });
        }
      }
      if (m.rawName && m.rawName.trim()) {
        const name = m.rawName.trim();
        const lower = name.toLowerCase();
        if (!seenNames.has(lower)) {
          seenNames.add(lower);
          list.push({
            id: `${m.id}-raw`,
            name,
            description: m.rawDescription?.trim() || m.englishDescription?.trim(),
            hindiName: m.hindiName?.trim(),
            rawName: name,
          });
        }
      }
    }
    return list;
  }, [mappings]);

  // On initial load, mark rows that already have a custom (non-preset) unit
  useEffect(() => {
    const customIds = items
      .filter((item) => isCustomUnit(item.unit))
      .map((item) => item.id);
    if (customIds.length > 0) {
      setCustomUnitRows((prev) => new Set([...prev, ...customIds]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateItems = (nextItems: TenderItem[]) => {
    onItemsChange(
      nextItems.map((item) => {
        const subtotal = calculateSubtotal(item);
        return {
          ...item,
          totalAmount: subtotal,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const handleAddItem = () => {
    updateItems([...items, createNewItem(tenderId)]);
  };

  const handleDuplicateItem = (index: number) => {
    const source = items[index];
    const now = new Date().toISOString();
    const duplicate: TenderItem = {
      ...source,
      id: createRowId(),
      createdAt: now,
      updatedAt: now,
    };
    const next = [...items];
    next.splice(index + 1, 0, duplicate);
    // If the source was in custom mode, the duplicate starts in custom mode too
    if (customUnitRows.has(source.id)) {
      setCustomUnitRows((prev) => new Set([...prev, duplicate.id]));
    }
    updateItems(next);
  };

  const handleRemoveItem = (index: number) => {
    const removed = items[index];
    setCustomUnitRows((prev) => {
      const next = new Set(prev);
      next.delete(removed.id);
      return next;
    });
    updateItems(items.filter((_, i) => i !== index));
  };

  const handleSelectSuggestion = (
    index: number,
    suggestion: { name: string; description?: string }
  ) => {
    const next = [...items];
    const current = { ...next[index] };
    current.productName = suggestion.name;
    if (suggestion.description) {
      current.description = suggestion.description;
    }
    current.totalAmount = calculateSubtotal(current);
    next[index] = current;
    updateItems(next);
  };

  const handleChange = (
    index: number,
    field: 'productName' | 'description' | 'quantity' | 'unit' | 'rate' | 'gstPercent',
    value: string
  ) => {
    const next = [...items];
    const current = { ...next[index] };

    if (field === 'quantity') {
      current.quantity = Number(value) || 0;
    } else if (field === 'rate') {
      current.rate = Number(value) || 0;
    } else if (field === 'gstPercent') {
      current.gstPercent = (Number(value) as 0 | 5 | 9 | 12 | 18) || 0;
    } else if (field === 'unit') {
      current.unit = value;
    } else if (field === 'description') {
      current.description = value;
    } else {
      current.productName = value;
      const matched = mappings.find(
        (m) => m.englishName.toLowerCase().trim() === value.toLowerCase().trim()
      );
      if (matched && matched.englishDescription) {
        current.description = matched.englishDescription;
      }
    }

    current.totalAmount = calculateSubtotal(current);
    next[index] = current;
    updateItems(next);
  };

  /** Handle dropdown selection change — switches between preset and custom mode */
  const handleUnitDropdownChange = (index: number, itemId: string, selectedValue: string) => {
    if (selectedValue === CUSTOM_UNIT_VALUE) {
      // Enter custom mode — keep existing unit value in text input
      setCustomUnitRows((prev) => new Set([...prev, itemId]));
      // Don't change the actual unit value yet — user will type it
    } else {
      // Preset selected — leave custom mode, update unit
      setCustomUnitRows((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      handleChange(index, 'unit', selectedValue);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + calculateSubtotal(item), 0);
  const totalGst = items.reduce((sum, item) => sum + (calculateSubtotal(item) * item.gstPercent) / 100, 0);
  const grandTotal = subtotal + totalGst;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Items Table</CardTitle>
        <CardDescription>Enter products manually with quantity, rate, and GST slab.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-md border min-h-[160px]">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr className="border-b">
                <th className="px-3 py-2 text-left font-medium">Product Name</th>
                <th className="px-3 py-2 text-left font-medium">Description</th>
                <th className="px-3 py-2 text-center font-medium">Qty</th>
                <th className="px-3 py-2 text-center font-medium min-w-[140px]">Unit</th>
                <th className="px-3 py-2 text-center font-medium">Rate</th>
                <th className="px-3 py-2 text-center font-medium">GST</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 text-center font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                    No items yet. Click + Add Item to begin.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const rowSubtotal = calculateSubtotal(item);
                  const isCustom = customUnitRows.has(item.id);
                  // Dropdown shows __custom__ when in custom mode, otherwise the stored unit value
                  const dropdownValue = isCustom ? CUSTOM_UNIT_VALUE : (item.unit || 'Nos');

                  return (
                    <tr key={item.id} className="border-b align-top">
                      <td className="px-3 py-2 min-w-[220px]">
                        <ProductAutocompleteInput
                          value={item.productName}
                          onChange={(val) => handleChange(index, 'productName', val)}
                          onSelect={(suggestion) => handleSelectSuggestion(index, suggestion)}
                          suggestions={productSuggestions}
                          placeholder="Product name"
                        />
                      </td>
                      <td className="px-3 py-2 min-w-[200px]">
                        <div className="relative flex items-center">
                          <input
                            className="w-full rounded border border-slate-300 px-2 py-1 pr-6"
                            value={item.description || ''}
                            onChange={(event) => handleChange(index, 'description', event.target.value)}
                            placeholder="Optional description"
                          />
                          {item.description?.trim() ? (
                            <button
                              type="button"
                              title="Clear Description"
                              onClick={() => handleChange(index, 'description', '')}
                              className="absolute right-1.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          className="w-20 rounded border border-slate-300 px-2 py-1 text-center"
                          value={item.quantity}
                          onChange={(event) => handleChange(index, 'quantity', event.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        {/* Unit dropdown */}
                        <select
                          className="w-full rounded border border-slate-300 px-2 py-1 text-center text-sm"
                          value={dropdownValue}
                          onChange={(event) =>
                            handleUnitDropdownChange(index, item.id, event.target.value)
                          }
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u.value} value={u.value}>
                              {u.label}
                            </option>
                          ))}
                          <option value={CUSTOM_UNIT_VALUE}>Custom…</option>
                        </select>
                        {/* Custom text input appears below when selected */}
                        {isCustom && (
                          <input
                            className="mt-1 w-full rounded border border-blue-300 bg-blue-50 px-2 py-1 text-center text-sm"
                            placeholder="Type unit…"
                            value={item.unit || ''}
                            onChange={(event) => handleChange(index, 'unit', event.target.value)}
                            autoFocus
                          />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className="w-28 rounded border border-slate-300 px-2 py-1 text-center"
                          value={item.rate}
                          onChange={(event) => handleChange(index, 'rate', event.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="w-20 rounded border border-slate-300 px-2 py-1 text-center"
                          value={item.gstPercent}
                          onChange={(event) => handleChange(index, 'gstPercent', event.target.value)}
                        >
                          {GST_OPTIONS.map((gst) => (
                            <option key={gst} value={gst}>
                              {gst}%
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        Rs. {rowSubtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleDuplicateItem(index)}
                          >
                            Duplicate
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemoveItem(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot className="bg-slate-50 font-medium">
                <tr>
                  <td colSpan={6} className="px-3 py-2 text-right">
                    Subtotal
                  </td>
                  <td className="px-3 py-2 text-right">Rs. {subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td />
                </tr>
                <tr>
                  <td colSpan={6} className="px-3 py-2 text-right">
                    GST Total
                  </td>
                  <td className="px-3 py-2 text-right">Rs. {totalGst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td />
                </tr>
                <tr>
                  <td colSpan={6} className="px-3 py-2 text-right text-base">
                    Grand Total
                  </td>
                  <td className="px-3 py-2 text-right text-base">
                    Rs. {grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <Button type="button" onClick={handleAddItem} variant="outline" className="w-full">
          + Add Item
        </Button>
      </CardContent>
    </Card>
  );
}
