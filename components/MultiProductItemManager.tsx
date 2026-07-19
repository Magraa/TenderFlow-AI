'use client';

import { useState, useEffect } from 'react';
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
        <div className="overflow-x-auto rounded-md border">
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
                      <td className="px-3 py-2">
                        <input
                          list="product-suggestions"
                          className="w-full rounded border border-slate-300 px-2 py-1"
                          value={item.productName}
                          onChange={(event) => handleChange(index, 'productName', event.target.value)}
                          placeholder="Product name"
                        />
                      </td>
                      <td className="px-3 py-2">
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

        <datalist id="product-suggestions">
          {mappings.flatMap((m) => {
            const opts = [];
            if (m.rawName) {
              opts.push(
                <option key={`${m.id}-raw`} value={m.rawName}>
                  {m.rawDescription ? `${m.rawName} - ${m.rawDescription}` : m.rawName}
                </option>
              );
            }
            if (m.englishName && m.englishName !== m.rawName) {
              opts.push(
                <option key={`${m.id}-en`} value={m.englishName}>
                  {m.englishDescription ? `${m.englishName} - ${m.englishDescription}` : m.englishName}
                </option>
              );
            }
            return opts;
          })}
        </datalist>
      </CardContent>
    </Card>
  );
}
