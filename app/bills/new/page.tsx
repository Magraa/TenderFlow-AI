'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Receipt, Building2, FileText, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { Bill, CustomTemplate, Firm, HindiMapping } from '@/types';
import { dataService } from '@/services/dataService';
import { numberToWords } from '@/lib/numberToWords';
import { saveBillItemMappings, getOrCreateItemMappingPack } from '@/services/mappingService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ItemRow {
  id: string;
  productName: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
}

export default function NewBillPage() {
  const router = useRouter();
  const [firms, setFirms] = useState<Firm[]>([]);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [existingBills, setExistingBills] = useState<Bill[]>([]);
  const [allItemMappings, setAllItemMappings] = useState<HindiMapping[]>([]);
  const [loadingFirms, setLoadingFirms] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Autocomplete & AI inline state
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
  const [generatingRowId, setGeneratingRowId] = useState<string | null>(null);

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [noDate, setNoDate] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Single multiline paragraph-wise recipient address input field
  const [recipientAddress, setRecipientAddress] = useState(
    `Chief Municipal Officer\nCity Council Mihona\nDistt. Bhind`
  );

  // Firm selection defaults to empty ("-- Select Firm --")
  const [firmId, setFirmId] = useState('');
  const [customTemplateId, setCustomTemplateId] = useState('');

  // Tax Percentages
  const [sgstPercent, setSgstPercent] = useState(9.0);
  const [cgstPercent, setCgstPercent] = useState(9.0);
  const [igstPercent, setIgstPercent] = useState(0.0);

  // Items State (No sample items pre-filled, default to 1 clean blank row)
  const [items, setItems] = useState<ItemRow[]>([
    { id: '1', productName: '', description: '', quantity: 1, unit: 'nos', rate: 0 },
  ]);

  const notes = '';

  useEffect(() => {
    (async () => {
      const [firmsList, templatesList, billsList, mappingsList] = await Promise.all([
        dataService.firms.list(),
        dataService.customTemplates.list(),
        dataService.bills.list(),
        dataService.itemHindiMappings.list(),
      ]);
      setFirms(firmsList);
      setCustomTemplates(templatesList.filter((t) => t.docType === 'firm_bill'));
      setExistingBills(billsList);
      setAllItemMappings(mappingsList);
      setLoadingFirms(false);
    })();
  }, []);

  // Compute next auto-incremented invoice number when firm changes
  const calculateNextInvoiceNumber = (selectedFirmId: string, bills: Bill[]) => {
    if (!selectedFirmId) return '';
    const firmBills = bills.filter((b) => b.firmId === selectedFirmId);
    let maxNo = 0;
    firmBills.forEach((b) => {
      const rawNum = b.invoiceNumber ? b.invoiceNumber.replace(/\D/g, '') : '';
      const num = parseInt(rawNum, 10);
      if (!isNaN(num) && num > maxNo) {
        maxNo = num;
      }
    });
    return (maxNo + 1).toString();
  };

  const handleFirmChange = (selectedId: string) => {
    setFirmId(selectedId);
    if (!selectedId) {
      setInvoiceNumber('');
      setCustomTemplateId('');
      return;
    }

    // Auto-fill next invoice number (+1) for this firm
    const nextNo = calculateNextInvoiceNumber(selectedId, existingBills);
    setInvoiceNumber(nextNo);

    // Auto-select custom template if firm has one
    const firm = firms.find((f) => f.id === selectedId);
    if (firm && firm.customBillTemplateId) {
      setCustomTemplateId(firm.customBillTemplateId);
    }
  };

  // Check if current invoice number already exists for selected firm
  const isDuplicateInvoice = Boolean(
    firmId &&
    invoiceNumber.trim() &&
    existingBills.some(
      (b) => b.firmId === firmId && b.invoiceNumber.trim().toLowerCase() === invoiceNumber.trim().toLowerCase()
    )
  );

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        productName: '',
        description: '',
        quantity: 1,
        unit: 'nos',
        rate: 0,
      },
    ]);
  };

  const handleAddItemAfter = (index: number) => {
    const newItem: ItemRow = {
      id: Date.now().toString() + Math.random().toString().slice(2, 5),
      productName: '',
      description: '',
      quantity: 1,
      unit: 'nos',
      rate: 0,
    };
    const updated = [...items];
    updated.splice(index + 1, 0, newItem);
    setItems(updated);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof ItemRow, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Inline AI generation for specific row
  const handleInlineAIGenerate = async (idx: number) => {
    const item = items[idx];
    if (!item.productName.trim()) {
      alert('Please enter an item name first.');
      return;
    }

    setGeneratingRowId(item.id);
    try {
      const mapping = await getOrCreateItemMappingPack(item.productName, item.description);
      
      // Refresh mappings list
      dataService.itemHindiMappings.list().then(setAllItemMappings);

      // Determine template language
      const selectedTemplate = customTemplates.find((t) => t.id === customTemplateId);
      const isHindi = selectedTemplate?.language === 'hindi';

      const newName = isHindi ? (mapping.hindiName || mapping.englishName) : (mapping.englishName || mapping.hindiName);
      const newDesc = isHindi ? (mapping.hindiDescription || mapping.englishDescription || '') : (mapping.englishDescription || mapping.hindiDescription || '');

      const updated = [...items];
      updated[idx] = {
        ...updated[idx],
        productName: newName,
        description: newDesc,
      };
      setItems(updated);
      setActiveSuggestionIndex(null);
    } catch (err) {
      console.error('Inline AI generation error:', err);
    } finally {
      setGeneratingRowId(null);
    }
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const sgstAmount = sgstPercent ? (subtotal * sgstPercent) / 100 : 0;
  const cgstAmount = cgstPercent ? (subtotal * cgstPercent) / 100 : 0;
  const igstAmount = igstPercent ? (subtotal * igstPercent) / 100 : 0;
  const grandTotal = subtotal + sgstAmount + cgstAmount + igstAmount;
  const amountInWords = numberToWords(grandTotal);

  const selectedFirm = firms.find((f) => f.id === firmId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firmId) {
      alert('Please select a firm for the bill.');
      return;
    }

    setSubmitting(true);
    try {
      const recipientLines = recipientAddress.split('\n').map((l) => l.trim()).filter(Boolean);
      const recipientDesignation = recipientLines[0] || 'Chief Municipal Officer';
      const recipientDepartment = recipientLines[1] || 'City Council';
      const recipientDistrict = recipientLines[2] || 'District';

      // Save item mappings with AI transliteration in background (non-blocking fallback)
      // Preserves exact typed item names & descriptions on the bill
      saveBillItemMappings(items).catch((err) =>
        console.warn('Background item mapping save warning:', err)
      );

      const created = await dataService.bills.create({
        invoiceNumber,
        invoiceDate: noDate ? '' : invoiceDate,
        firmId,
        customTemplateId: customTemplateId || undefined,
        recipientAddress,
        recipientDesignation,
        recipientDepartment,
        recipientDistrict,
        items: items.map((item) => ({
          id: item.id,
          productName: item.productName,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.quantity * item.rate,
        })),
        sgstPercent,
        cgstPercent,
        igstPercent,
        totalAmount: subtotal,
        sgstAmount,
        cgstAmount,
        igstAmount,
        grandTotal,
        amountInWords,
        status: 'draft',
        showLetterheadBackground: true,
        includeSignature: true,
        includeStamp: true,
        notes,
      });

      router.push(`/bills/${created.id}`);
    } catch (err) {
      console.error('Error creating bill:', err);
      alert('Failed to create bill');
      setSubmitting(false);
    }
  };

  if (loadingFirms) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Top Bar */}
      <div className="border-b bg-white shadow-xs">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <div className="h-4 w-[1px] bg-slate-200"></div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              Create New Bill / Invoice
            </h1>
          </div>
          <Button
            type="submit"
            form="bill-form"
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            {submitting ? 'Generating...' : 'Save & View Bill'}
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 lg:px-8">
        <form id="bill-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Header Info Card */}
          <Card className="shadow-xs">
            <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-600" />
                Invoice & Recipient Details
              </CardTitle>
              <CardDescription>Enter invoice header information and recipient address.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="invoiceNo" className="text-xs font-semibold uppercase text-slate-500">
                      Invoice Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="invoiceNo"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="e.g. 902"
                      required
                    />
                    {isDuplicateInvoice && (
                      <div className="flex items-center gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs font-medium mt-1.5 animate-in fade-in">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>Warning ⚠️: Invoice No. <strong>{invoiceNumber}</strong> already exists for {selectedFirm?.name || 'this firm'}!</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="invoiceDate" className="text-xs font-semibold uppercase text-slate-500">
                        Invoice Date {!noDate && <span className="text-red-500">*</span>}
                      </Label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 select-none">
                        <input
                          type="checkbox"
                          checked={noDate}
                          onChange={(e) => setNoDate(e.target.checked)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                        />
                        <span className="font-medium">No Date (Blank)</span>
                      </label>
                    </div>
                    <Input
                      id="invoiceDate"
                      type="date"
                      disabled={noDate}
                      value={noDate ? '' : invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      required={!noDate}
                      className={noDate ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}
                    />
                  </div>
                </div>
              </div>

              {/* Single paragraph-wise input field for Recipient Details */}
              <div className="space-y-1.5">
                <Label htmlFor="recipientAddress" className="text-xs font-semibold uppercase text-slate-500">
                  Recipient Header / Details <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="recipientAddress"
                  rows={4}
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder={`Chief Municipal Officer\nCity Council Mihona\nDistt. Bhind`}
                  className="font-mono text-sm border-slate-300 focus-visible:ring-emerald-500 leading-relaxed"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  Enter designation, department, and district line-by-line as you want it centered on the bill header.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Firm & Template Binding Card */}
          <Card className="shadow-xs">
            <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Firm & Bank Details Selection
              </CardTitle>
              <CardDescription>Select the issuing firm (loads bank details & letterhead).</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 grid gap-6 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firmSelect" className="text-xs font-semibold uppercase text-slate-500">
                  Select Firm <span className="text-red-500">*</span>
                </Label>
                <select
                  id="firmSelect"
                  value={firmId}
                  onChange={(e) => handleFirmChange(e.target.value)}
                  className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:ring-emerald-500"
                  required
                >
                  <option value="">-- Select Firm --</option>
                  {firms.map((firm) => (
                    <option key={firm.id} value={firm.id}>
                      {firm.name}
                    </option>
                  ))}
                </select>
                {selectedFirm && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1 text-slate-600">
                    <p className="font-semibold text-slate-900">Stored Bank Details:</p>
                    <p>Bank: <span className="font-medium text-slate-800">{selectedFirm.bankName || 'Not configured'} / {selectedFirm.bankBranch || ''}</span></p>
                    <p>IFSC: <span className="font-medium text-slate-800">{selectedFirm.ifscCode || 'N/A'}</span> | A/C: <span className="font-medium text-slate-800">{selectedFirm.accountNumber || 'N/A'}</span></p>
                    <p>PAN: <span className="font-medium text-slate-800">{selectedFirm.panNumber || 'N/A'}</span></p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="templateSelect" className="text-xs font-semibold uppercase text-slate-500">
                  Custom Bill Template (Optional)
                </Label>
                <select
                  id="templateSelect"
                  value={customTemplateId}
                  onChange={(e) => setCustomTemplateId(e.target.value)}
                  className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:ring-emerald-500"
                >
                  <option value="">-- Standard Reference Bill Template --</option>
                  {customTemplates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.language === 'hindi' ? 'Hindi' : 'English'})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Default template is designed exactly as your reference bill image with bank details box & tax breakdown.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Items Table Card */}
          <Card className="shadow-xs">
            <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  Bill Items List
                </CardTitle>
                <CardDescription>Add items, quantities, and rates for the invoice. Click ✨ to replace with AI generated item name.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="overflow-x-auto border rounded-lg border-slate-200">
                <table className="w-full text-xs text-left text-slate-700">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                      <th className="py-2.5 px-3">Item Name & Description</th>
                      <th className="py-2.5 px-3 w-28 text-center">Quantity</th>
                      <th className="py-2.5 px-3 w-24 text-center">Unit</th>
                      <th className="py-2.5 px-3 w-32 text-right">Price / Rate (₹)</th>
                      <th className="py-2.5 px-3 w-36 text-right">Amount (₹)</th>
                      <th className="py-2.5 px-2 w-20 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 group">
                        <td className="py-2.5 px-3 text-center font-semibold text-slate-500 align-top pt-3">{idx + 1}</td>
                        <td className="py-2.5 px-3 space-y-1.5">
                          {/* Autocomplete Input Container */}
                          <div className="relative w-full">
                            <div className="flex items-center gap-1.5">
                              <Input
                                value={item.productName}
                                onFocus={() => setActiveSuggestionIndex(idx)}
                                onChange={(e) => {
                                  handleItemChange(item.id, 'productName', e.target.value);
                                  setActiveSuggestionIndex(idx);
                                }}
                                placeholder="Item name (e.g. Dustbine 100 ltr)"
                                className="h-8 text-xs bg-white font-medium flex-1"
                                required
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                title="Generate & Replace with AI Pack"
                                disabled={generatingRowId === item.id || !item.productName.trim()}
                                onClick={() => handleInlineAIGenerate(idx)}
                                className="h-8 px-2.5 text-xs font-semibold border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center gap-1.5 shrink-0 shadow-xs transition-all cursor-pointer"
                              >
                                {generatingRowId === item.id ? (
                                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                                ) : (
                                  <Sparkles className="h-3.5 w-3.5 text-amber-600 fill-amber-400" />
                                )}
                                <span>AI Pack</span>
                              </Button>
                            </div>

                            {/* Suggestions Dropdown */}
                            {activeSuggestionIndex === idx && item.productName.trim().length >= 1 && (
                              (() => {
                                const suggestions = allItemMappings.filter(
                                  (m) =>
                                    (m.rawName && m.rawName.toLowerCase().includes(item.productName.toLowerCase())) ||
                                    (m.englishName && m.englishName.toLowerCase().includes(item.productName.toLowerCase())) ||
                                    (m.hindiName && m.hindiName.includes(item.productName))
                                ).slice(0, 5);

                                if (suggestions.length === 0) return null;

                                return (
                                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden">
                                    {suggestions.map((s) => (
                                      <button
                                        key={s.id}
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          const selectedTemplate = customTemplates.find((t) => t.id === customTemplateId);
                                          const isHindi = selectedTemplate?.language === 'hindi';
                                          const chosenName = isHindi ? (s.hindiName || s.englishName) : (s.englishName || s.hindiName);
                                          const chosenDesc = isHindi ? (s.hindiDescription || s.englishDescription || '') : (s.englishDescription || s.hindiDescription || '');
                                          
                                          const updated = [...items];
                                          updated[idx] = {
                                            ...updated[idx],
                                            productName: chosenName,
                                            description: chosenDesc,
                                          };
                                          setItems(updated);
                                          setActiveSuggestionIndex(null);
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 transition-colors text-xs border-b border-slate-100 last:border-0"
                                      >
                                        <div className="font-semibold text-slate-800">{s.englishName} <span className="text-slate-400 font-normal">({s.hindiName})</span></div>
                                        {s.rawName && <div className="text-[10px] text-amber-700">Raw: {s.rawName}</div>}
                                      </button>
                                    ))}
                                  </div>
                                );
                              })()
                            )}
                          </div>

                          <Input
                            value={item.description}
                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                            placeholder="Specification / Description (Optional)"
                            className="h-7 text-[11px] bg-slate-50 text-slate-600 border-dashed border-slate-300"
                          />
                        </td>
                        <td className="py-2.5 px-3 align-top pt-3">
                          <Input
                            type="number"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-center bg-white"
                            required
                          />
                        </td>
                        <td className="py-2.5 px-3 align-top pt-3">
                          <Input
                            value={item.unit}
                            onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                            placeholder="nos / pairs"
                            className="h-8 text-xs text-center bg-white"
                          />
                        </td>
                        <td className="py-2.5 px-3 align-top pt-3">
                          <Input
                            type="number"
                            step="any"
                            value={item.rate}
                            onChange={(e) => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-right bg-white"
                            required
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 align-top pt-4">
                          ₹{(item.quantity * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 1 })}
                        </td>
                        <td className="py-2.5 px-2 text-center align-top pt-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              title="Add item row after this"
                              onClick={() => handleAddItemAfter(idx)}
                              className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              title="Delete item row"
                              disabled={items.length <= 1}
                              onClick={() => handleRemoveItem(item.id)}
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Add Item Row Button right below item rows */}
                    <tr className="bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                      <td colSpan={7} className="py-2.5 px-4 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleAddItem}
                          className="gap-2 text-emerald-700 hover:text-emerald-800 font-semibold hover:bg-emerald-50 w-full py-1.5 justify-center border border-dashed border-emerald-300 rounded-md"
                        >
                          <Plus className="h-4 w-4" />
                          Add Item Row
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tax Breakdown & Totals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200 pt-6">
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Tax Rates Configuration</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-500">SGST (%)</Label>
                      <Input
                        type="number"
                        step="any"
                        value={sgstPercent}
                        onChange={(e) => setSgstPercent(parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-500">CGST (%)</Label>
                      <Input
                        type="number"
                        step="any"
                        value={cgstPercent}
                        onChange={(e) => setCgstPercent(parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-500">IGST (%)</Label>
                      <Input
                        type="number"
                        step="any"
                        value={igstPercent}
                        onChange={(e) => setIgstPercent(parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-center"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-900">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 1 })}</span>
                  </div>
                  {sgstPercent > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>SGST ({sgstPercent}%):</span>
                      <span className="font-medium text-slate-800">₹{sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 1 })}</span>
                    </div>
                  )}
                  {cgstPercent > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>CGST ({cgstPercent}%):</span>
                      <span className="font-medium text-slate-800">₹{cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 1 })}</span>
                    </div>
                  )}
                  {igstPercent > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>IGST ({igstPercent}%):</span>
                      <span className="font-medium text-slate-800">₹{igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 1 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-emerald-800 border-t border-slate-200 pt-2">
                    <span>Grand Total:</span>
                    <span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 1 })}</span>
                  </div>
                  <p className="text-xs text-slate-500 pt-1">
                    <strong className="text-slate-700">In words:</strong> {amountInWords}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
