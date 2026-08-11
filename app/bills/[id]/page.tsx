'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, Trash2, Receipt, Edit, Plus, CheckCircle, AlertTriangle, Sparkles, X, MessageCircle } from 'lucide-react';
import { Bill, CustomTemplate, Firm, HindiMapping } from '@/types';
import { dataService } from '@/services/dataService';
import { compileBillHTML } from '@/templates/default/billTemplate';
import { numberToWords } from '@/lib/numberToWords';
import { saveBillItemMappings, getOrCreateItemMappingPack } from '@/services/mappingService';
import { resolveFirmLayoutMetrics } from '@/services/layoutEngine';
import { pdfService } from '@/services/pdfService';
import { sharePDFViaWhatsApp } from '@/services/shareService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const A4_WIDTH_PX = 794; // 210mm at 96dpi
const A4_HEIGHT_PX = 1123; // 297mm at 96dpi

interface ItemRow {
  id: string;
  productName: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
}

export default function BillViewerPage() {
  const params = useParams();
  const router = useRouter();
  const billId = params?.id as string;

  const [bill, setBill] = useState<Bill | null>(null);
  const [firm, setFirm] = useState<Firm | null>(null);
  const [allFirms, setAllFirms] = useState<Firm[]>([]);
  const [customTemplate, setCustomTemplate] = useState<CustomTemplate | null>(null);
  const [allBillTemplates, setAllBillTemplates] = useState<CustomTemplate[]>([]);
  const [existingBills, setExistingBills] = useState<Bill[]>([]);
  const [allItemMappings, setAllItemMappings] = useState<HindiMapping[]>([]);
  const [loading, setLoading] = useState(true);

  // Toggle controls
  const [showLetterheadBackground, setShowLetterheadBackground] = useState(true);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [includeStamp, setIncludeStamp] = useState(true);

  // Responsive preview: the printable area is a fixed 210mm x 297mm box (must stay
  // exact for print/PDF fidelity), so on narrow screens we scale it down visually
  // with a CSS transform rather than reflowing it, and reserve exactly the scaled
  // height so the page layout below doesn't leave a gap.
  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [sharingPdf, setSharingPdf] = useState(false);

  useEffect(() => {
    const updateScale = () => {
      const wrapper = previewWrapperRef.current;
      if (!wrapper) return;
      const available = wrapper.clientWidth;
      setPreviewScale(available > 0 ? Math.min(1, available / A4_WIDTH_PX) : 1);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Edit Modal State
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editInvoiceNumber, setEditInvoiceNumber] = useState('');
  const [editNoDate, setEditNoDate] = useState(false);
  const [editInvoiceDate, setEditInvoiceDate] = useState('');
  const [editRecipientAddress, setEditRecipientAddress] = useState('');
  const [editFirmId, setEditFirmId] = useState('');
  const [editCustomTemplateId, setEditCustomTemplateId] = useState('');
  const [editSgstPercent, setEditSgstPercent] = useState(9.0);
  const [editCgstPercent, setEditCgstPercent] = useState(9.0);
  const [editIgstPercent, setEditIgstPercent] = useState(0.0);
  const [editItems, setEditItems] = useState<ItemRow[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  // Edit autocomplete & inline AI state
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
  const [generatingRowId, setGeneratingRowId] = useState<string | null>(null);

  useEffect(() => {
    if (!billId) return;

    (async () => {
      const fetchedBill = await dataService.bills.get(billId);
      if (!fetchedBill) {
        setLoading(false);
        return;
      }
      setBill(fetchedBill);
      setShowLetterheadBackground(fetchedBill.showLetterheadBackground !== false);
      setIncludeSignature(fetchedBill.includeSignature !== false);
      setIncludeStamp(fetchedBill.includeStamp !== false);

      const [fetchedFirm, firmsList, templatesList, billsList, mappingsList] = await Promise.all([
        dataService.firms.get(fetchedBill.firmId),
        dataService.firms.list(),
        dataService.customTemplates.list(),
        dataService.bills.list(),
        dataService.itemHindiMappings.list(),
      ]);

      // Bills without an explicit template pinned fall back to the firm's
      // currently configured default bill template (Manage Firms), so older
      // bills automatically pick up a newer default without needing an edit.
      const effectiveTemplateId = fetchedBill.customTemplateId || fetchedFirm?.customBillTemplateId;
      const fetchedTemplate = effectiveTemplateId
        ? await dataService.customTemplates.get(effectiveTemplateId)
        : undefined;

      if (fetchedFirm) setFirm(fetchedFirm);
      if (fetchedTemplate) setCustomTemplate(fetchedTemplate);
      setAllFirms(firmsList);
      setAllBillTemplates(templatesList.filter((t) => t.docType === 'firm_bill'));
      setExistingBills(billsList);
      setAllItemMappings(mappingsList);
      setLoading(false);

      // Auto trigger print if print=true parameter is present
      if (typeof window !== 'undefined' && window.location.search.includes('print=true')) {
        setTimeout(() => {
          window.print();
        }, 600);
      }
    })();
  }, [billId]);

  const handleToggleOption = async (field: 'showLetterheadBackground' | 'includeSignature' | 'includeStamp', value: boolean) => {
    if (!bill) return;
    if (field === 'showLetterheadBackground') setShowLetterheadBackground(value);
    if (field === 'includeSignature') setIncludeSignature(value);
    if (field === 'includeStamp') setIncludeStamp(value);

    const updated = await dataService.bills.update(bill.id, { [field]: value });
    if (updated) setBill(updated);
  };

  const handleOpenEditDialog = () => {
    if (!bill) return;
    const isDateBlank = !bill.invoiceDate || !bill.invoiceDate.trim();
    setEditInvoiceNumber(bill.invoiceNumber || '');
    setEditNoDate(isDateBlank);
    setEditInvoiceDate(bill.invoiceDate || new Date().toISOString().split('T')[0]);
    setEditRecipientAddress(
      bill.recipientAddress ||
      [bill.recipientDesignation, bill.recipientDepartment, bill.recipientDistrict].filter(Boolean).join('\n')
    );
    setEditFirmId(bill.firmId || '');
    setEditCustomTemplateId(bill.customTemplateId || '');
    setEditSgstPercent(bill.sgstPercent ?? 9.0);
    setEditCgstPercent(bill.cgstPercent ?? 9.0);
    setEditIgstPercent(bill.igstPercent ?? 0.0);
    setEditItems(
      bill.items.map((it) => ({
        id: it.id,
        productName: it.productName,
        description: it.description || '',
        quantity: it.quantity,
        unit: it.unit || 'nos',
        rate: it.rate,
      }))
    );
    setEditDialogOpen(true);
  };

  // Duplicate check for edit modal
  const isEditDuplicateInvoice = Boolean(
    bill &&
    editFirmId &&
    editInvoiceNumber.trim() &&
    existingBills.some(
      (b) =>
        b.id !== bill.id &&
        b.firmId === editFirmId &&
        b.invoiceNumber.trim().toLowerCase() === editInvoiceNumber.trim().toLowerCase()
    )
  );

  const handleAddItemToEdit = () => {
    setEditItems([
      ...editItems,
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

  const handleAddItemAfterToEdit = (index: number) => {
    const newItem: ItemRow = {
      id: Date.now().toString() + Math.random().toString().slice(2, 5),
      productName: '',
      description: '',
      quantity: 1,
      unit: 'nos',
      rate: 0,
    };
    const updated = [...editItems];
    updated.splice(index + 1, 0, newItem);
    setEditItems(updated);
  };

  const handleRemoveItemFromEdit = (id: string) => {
    if (editItems.length <= 1) return;
    setEditItems(editItems.filter((it) => it.id !== id));
  };

  const handleEditItemChange = (id: string, field: keyof ItemRow, value: any) => {
    setEditItems(
      editItems.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Inline AI Generation for edit row
  const handleInlineAIGenerateInEdit = async (idx: number) => {
    const item = editItems[idx];
    if (!item.productName.trim()) {
      alert('Please enter an item name first.');
      return;
    }

    setGeneratingRowId(item.id);
    try {
      const mapping = await getOrCreateItemMappingPack(item.productName, item.description);
      
      // Refresh mappings
      dataService.itemHindiMappings.list().then(setAllItemMappings);

      const selectedTemplate = allBillTemplates.find((t) => t.id === editCustomTemplateId);
      const isHindi = selectedTemplate?.language === 'hindi';

      const newName = isHindi ? (mapping.hindiName || mapping.englishName) : (mapping.englishName || mapping.hindiName);
      const newDesc = isHindi ? (mapping.hindiDescription || mapping.englishDescription || '') : (mapping.englishDescription || mapping.hindiDescription || '');

      const updated = [...editItems];
      updated[idx] = {
        ...updated[idx],
        productName: newName,
        description: newDesc,
      };
      setEditItems(updated);
      setActiveSuggestionIndex(null);
    } catch (err) {
      console.error('Inline AI generation in edit error:', err);
    } finally {
      setGeneratingRowId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!bill) return;
    setSavingEdit(true);

    const subtotal = editItems.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const sgstAmount = editSgstPercent ? (subtotal * editSgstPercent) / 100 : 0;
    const cgstAmount = editCgstPercent ? (subtotal * editCgstPercent) / 100 : 0;
    const igstAmount = editIgstPercent ? (subtotal * editIgstPercent) / 100 : 0;
    const grandTotal = subtotal + sgstAmount + cgstAmount + igstAmount;
    const amountInWords = numberToWords(grandTotal);

    const recipientLines = editRecipientAddress.split('\n').map((l) => l.trim()).filter(Boolean);
    const recipientDesignation = recipientLines[0] || 'Chief Municipal Officer';
    const recipientDepartment = recipientLines[1] || 'City Council';
    const recipientDistrict = recipientLines[2] || 'District';

    // Save item mappings with AI transliteration in background (non-blocking)
    // Preserves exact typed item names & descriptions on the bill
    saveBillItemMappings(editItems).catch((err) =>
      console.warn('Background item mapping save warning:', err)
    );

    const updatedData = {
      invoiceNumber: editInvoiceNumber,
      invoiceDate: editNoDate ? '' : editInvoiceDate,
      recipientAddress: editRecipientAddress,
      recipientDesignation,
      recipientDepartment,
      recipientDistrict,
      firmId: editFirmId,
      customTemplateId: editCustomTemplateId || undefined,
      items: editItems.map((it) => ({
        id: it.id,
        productName: it.productName,
        description: it.description,
        quantity: it.quantity,
        unit: it.unit,
        rate: it.rate,
        amount: it.quantity * it.rate,
      })),
      sgstPercent: editSgstPercent,
      cgstPercent: editCgstPercent,
      igstPercent: editIgstPercent,
      totalAmount: subtotal,
      sgstAmount,
      cgstAmount,
      igstAmount,
      grandTotal,
      amountInWords,
    };

    const updated = await dataService.bills.update(bill.id, updatedData);
    if (updated) {
      setBill(updated);
      const [newFirm, newTpl] = await Promise.all([
        dataService.firms.get(updated.firmId),
        updated.customTemplateId ? dataService.customTemplates.get(updated.customTemplateId) : undefined,
      ]);
      if (newFirm) setFirm(newFirm);
      setCustomTemplate(newTpl || null);
    }
    setSavingEdit(false);
    setEditDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!bill) return;
    if (!confirm('Are you sure you want to delete this bill?')) return;
    await dataService.bills.delete(bill.id);
    router.push('/dashboard');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = async () => {
    const element = document.getElementById('printable-bill-area');
    if (!element || !bill) return;
    setSharingPdf(true);
    try {
      const blob = await pdfService.generatePDFBlobFromElement(element);
      const filename = `Invoice-${bill.invoiceNumber || 'Draft'}.pdf`;
      await sharePDFViaWhatsApp(blob, filename, `Invoice No. ${bill.invoiceNumber || 'Draft'} — ${firm?.name || ''}`);
    } catch (error) {
      console.error('WhatsApp share failed:', error);
      alert('Failed to prepare the PDF for sharing.');
    } finally {
      setSharingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 gap-4">
        <h2 className="text-xl font-bold text-slate-800">Bill Not Found</h2>
        <Link href="/dashboard">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const updatedBillForRender: Bill = {
    ...bill,
    showLetterheadBackground,
    includeSignature,
    includeStamp,
  };

  // Resolve scaled layout metrics (preview px → A4 px)
  const layout = firm ? resolveFirmLayoutMetrics(firm, { showLetterheadBackground }) : null;
  const contentStartY  = layout?.contentStartY  ?? 40;
  const footerReserve  = layout?.footerReserve   ?? 40;
  const pageMargin     = layout?.pageMargin      ?? 40;

  const compiledHTML = compileBillHTML(
    updatedBillForRender,
    firm || undefined,
    customTemplate || undefined,
    showLetterheadBackground ? { contentStartY, footerReserve, pageMargin } : undefined,
  );

  return (
    <div className="min-h-screen bg-slate-100 pb-16 print:bg-white print:p-0">
      {/* Top Action Bar (hidden when printing) */}
      <div className="border-b bg-white/95 backdrop-blur-sm shadow-xs sticky top-0 z-30 print:hidden">
        <div className="mx-auto flex max-w-screen-xl flex-col gap-3 px-3 py-3 sm:px-6 sm:py-3.5 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="shrink-0 gap-1.5 px-2 text-slate-600 sm:px-3">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              </Link>
              <div className="hidden h-5 w-px bg-slate-200 sm:block" />
              <div className="min-w-0">
                <h1 className="flex items-center gap-1.5 truncate text-base font-bold text-slate-900 sm:gap-2 sm:text-lg">
                  <Receipt className="h-4 w-4 shrink-0 text-emerald-600 sm:h-5 sm:w-5" />
                  <span className="truncate">Invoice No. {bill.invoiceNumber || 'Draft'}</span>
                </h1>
                <p className="truncate text-[11px] font-medium text-slate-500 sm:text-xs">
                  <span className="font-semibold text-slate-800">{firm?.name || 'N/A'}</span>
                  {bill.invoiceDate && <> · {bill.invoiceDate}</>}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
            <Button variant="outline" onClick={handleOpenEditDialog} className="justify-center gap-2 bg-white shadow-xs hover:bg-slate-50">
              <Edit className="h-4 w-4 text-blue-600" />
              Edit Bill
            </Button>
            <Button
              variant="outline"
              onClick={handleShareWhatsApp}
              loading={sharingPdf}
              disabled={sharingPdf}
              className="justify-center gap-2 bg-white shadow-xs hover:bg-emerald-50"
            >
              <MessageCircle className="h-4 w-4 text-emerald-600" />
              WhatsApp
            </Button>
            <Button variant="outline" onClick={handlePrint} className="justify-center gap-2 bg-white shadow-xs hover:bg-slate-50">
              <Printer className="h-4 w-4 text-slate-600" />
              <span className="sm:hidden">Print / PDF</span>
              <span className="hidden sm:inline">Print / Export PDF</span>
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="justify-center gap-2 border border-red-200 bg-red-50 text-red-600 shadow-xs hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Control Bar (hidden when printing) */}
      <div className="mx-auto max-w-screen-xl px-3 py-4 sm:px-6 lg:px-8 print:hidden">
        <Card className="border border-slate-200 bg-white shadow-xs">
          <CardContent className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { key: 'showLetterheadBackground', label: 'Letterhead', full: 'Show Letterhead Background', value: showLetterheadBackground },
                  { key: 'includeSignature', label: 'Signature', full: 'Include Signature', value: includeSignature },
                  { key: 'includeStamp', label: 'Firm Stamp', full: 'Include Firm Stamp', value: includeStamp },
                ] as const
              ).map((toggle) => (
                <label
                  key={toggle.key}
                  className={`flex cursor-pointer select-none items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    toggle.value
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={toggle.value}
                    onChange={(e) => handleToggleOption(toggle.key, e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="sm:hidden">{toggle.label}</span>
                  <span className="hidden sm:inline">{toggle.full}</span>
                </label>
              ))}
            </div>

            {customTemplate && (
              <span className="w-fit rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                Template: {customTemplate.name}
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Printable A4 Container — scaled down to fit narrow screens via CSS transform;
          the box itself always stays a true 210mm x 297mm for print/PDF fidelity. */}
      <div className="mx-auto flex justify-center px-2 py-4 print:p-0 print:m-0">
        <div
          ref={previewWrapperRef}
          className="flex w-full justify-center print:block print:h-auto print:w-auto"
          style={{ height: `${A4_HEIGHT_PX * previewScale}px` }}
        >
        <div
          id="printable-bill-area"
          className="relative bg-white shadow-xl rounded-none print:shadow-none print:m-0 overflow-hidden"
          style={{
            width: '210mm',
            height: '297mm',
            minHeight: '297mm',
            boxSizing: 'border-box',
            position: 'relative',
            transform: `scale(${previewScale})`,
            transformOrigin: 'top center',
            padding: showLetterheadBackground && firm?.headerImagePath
              ? `${contentStartY}px ${pageMargin}px ${footerReserve}px ${pageMargin}px`
              : '40px',
          }}
        >
          {/* Header Letterhead Image Background Layer */}
          {firm?.headerImagePath && showLetterheadBackground && (
            <div
              className="absolute inset-0 pointer-events-none z-0"
              style={{
                backgroundImage: `url(${firm.headerImagePath})`,
                backgroundSize: firm.fitLetterheadMode === 'stretch'
                  ? '100% 100%'
                  : firm.fitLetterheadMode === 'cover'
                  ? 'cover'
                  : '100% 100%',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
              }}
            />
          )}

          {/* Stamp image overlay if enabled. Bill templates already print their own
              "FOR: {firmName} / PROPRIETOR" signature line, so the firm's "generic text
              stamp" mode (used by quotations/supply orders that have no such line) is
              intentionally NOT rendered here — it would just duplicate that same text
              on top of itself. Only an actual uploaded stamp image (a real seal) shows. */}
          {includeStamp && firm?.stampImagePath && (
            <div
              className="absolute pointer-events-none z-20"
              style={{
                bottom: `${firm.stampOffsetY || 60}px`,
                right: `${firm.stampOffsetX || 80}px`,
                transformOrigin: 'bottom right',
                transform: `scale(${firm.stampScale || 1})`,
              }}
            >
              <img
                src={firm.stampImagePath}
                alt="Stamp"
                style={{ maxHeight: '100px', width: 'auto', opacity: 0.85 }}
              />
            </div>
          )}

          {/* Main Compiled HTML Bill */}
          <div
            className="relative z-10 w-full text-slate-900"
            dangerouslySetInnerHTML={{ __html: compiledHTML }}
          />
        </div>
        </div>
      </div>

      {/* EDIT BILL DIALOG MODAL */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Edit className="h-5 w-5 text-blue-600" />
              Edit Invoice No. {bill.invoiceNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Invoice No</Label>
                    <Input value={editInvoiceNumber} onChange={(e) => setEditInvoiceNumber(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Date</Label>
                      <label className="flex items-center gap-1 cursor-pointer text-[11px] text-slate-600 select-none">
                        <input
                          type="checkbox"
                          checked={editNoDate}
                          onChange={(e) => setEditNoDate(e.target.checked)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3 w-3"
                        />
                        <span className="font-medium">No Date</span>
                      </label>
                    </div>
                    <Input
                      type="date"
                      disabled={editNoDate}
                      value={editNoDate ? '' : editInvoiceDate}
                      onChange={(e) => setEditInvoiceDate(e.target.value)}
                      className={editNoDate ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}
                    />
                  </div>
                </div>

                {isEditDuplicateInvoice && (
                  <div className="flex items-center gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs font-medium animate-in fade-in">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Warning ⚠️: Invoice No. <strong>{editInvoiceNumber}</strong> already exists for this firm!</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Select Firm</Label>
                <select
                  value={editFirmId}
                  onChange={(e) => setEditFirmId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
                >
                  {allFirms.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recipient Details Textarea */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Recipient Header / Address (Paragraph-wise)</Label>
              <Textarea
                rows={3}
                value={editRecipientAddress}
                onChange={(e) => setEditRecipientAddress(e.target.value)}
                placeholder={`Chief Municipal Officer\nCity Council Mihona\nDistt. Bhind`}
                className="font-mono text-xs"
              />
            </div>

            {/* Template Selector */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Custom Template</Label>
              <select
                value={editCustomTemplateId}
                onChange={(e) => setEditCustomTemplateId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
              >
                <option value="">-- Standard Reference Bill Template --</option>
                {allBillTemplates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Items Table in Edit Dialog */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Bill Items List</h4>
                  <p className="text-xs text-slate-500">Add items, specifications, quantities, and rates for the invoice. Click ✨ to replace with AI generated item name.</p>
                </div>
              </div>

              <div className="overflow-x-auto border rounded-lg border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 uppercase font-semibold">
                    <tr>
                      <th className="py-2 px-2 text-center w-8">#</th>
                      <th className="py-2 px-2">Item Name & Description</th>
                      <th className="py-2 px-2 text-center w-24">Qty</th>
                      <th className="py-2 px-2 text-center w-20">Unit</th>
                      <th className="py-2 px-2 text-right w-28">Rate (₹)</th>
                      <th className="py-2 px-2 text-right w-28">Amount (₹)</th>
                      <th className="py-2 px-2 text-center w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {editItems.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="py-1.5 px-2 text-center font-bold text-slate-500 align-top pt-2.5">{idx + 1}</td>
                        <td className="py-1.5 px-2 space-y-1">
                          <div className="relative w-full">
                            <div className="flex items-center gap-1.5">
                              <Input
                                value={item.productName}
                                onFocus={() => setActiveSuggestionIndex(idx)}
                                onChange={(e) => {
                                  handleEditItemChange(item.id, 'productName', e.target.value);
                                  setActiveSuggestionIndex(idx);
                                }}
                                placeholder="Item Name"
                                className="h-7 text-xs font-medium flex-1"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                title="Generate & Replace with AI Pack"
                                disabled={generatingRowId === item.id || !item.productName.trim()}
                                onClick={() => handleInlineAIGenerateInEdit(idx)}
                                className="h-7 px-2 text-[11px] font-semibold border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center gap-1 shrink-0 shadow-xs transition-all cursor-pointer"
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
                                          const selectedTemplate = allBillTemplates.find((t) => t.id === editCustomTemplateId);
                                          const isHindi = selectedTemplate?.language === 'hindi';
                                          const chosenName = isHindi ? (s.hindiName || s.englishName) : (s.englishName || s.hindiName);
                                          const chosenDesc = isHindi ? (s.hindiDescription || s.englishDescription || '') : (s.englishDescription || s.hindiDescription || '');
                                          
                                          const updated = [...editItems];
                                          updated[idx] = {
                                            ...updated[idx],
                                            productName: chosenName,
                                            description: chosenDesc,
                                          };
                                          setEditItems(updated);
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

                          {/* Description Input with Clear Cross Icon */}
                          <div className="relative flex items-center">
                            <Input
                              value={item.description}
                              onChange={(e) => handleEditItemChange(item.id, 'description', e.target.value)}
                              placeholder="Specification / Description (Optional)"
                              className="h-6 text-[11px] bg-slate-50 text-slate-600 border-dashed pr-6"
                            />
                            {item.description?.trim() ? (
                              <button
                                type="button"
                                title="Clear Description"
                                onClick={() => handleEditItemChange(item.id, 'description', '')}
                                className="absolute right-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 p-0.5 rounded-full transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-1.5 px-2 align-top pt-2.5">
                          <Input
                            type="number"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleEditItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="h-7 text-xs text-center"
                          />
                        </td>
                        <td className="py-1.5 px-2 align-top pt-2.5">
                          <Input
                            value={item.unit}
                            onChange={(e) => handleEditItemChange(item.id, 'unit', e.target.value)}
                            className="h-7 text-xs text-center"
                          />
                        </td>
                        <td className="py-1.5 px-2 align-top pt-2.5">
                          <Input
                            type="number"
                            step="any"
                            value={item.rate}
                            onChange={(e) => handleEditItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                            className="h-7 text-xs text-right"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-right font-bold align-top pt-3">
                          ₹{(item.quantity * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 1 })}
                        </td>
                        <td className="py-1.5 px-2 text-center align-top pt-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              title="Add row after"
                              onClick={() => handleAddItemAfterToEdit(idx)}
                              className="h-6 w-6 p-0 text-emerald-600 hover:bg-emerald-50"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              title="Delete row"
                              disabled={editItems.length <= 1}
                              onClick={() => handleRemoveItemFromEdit(item.id)}
                              className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Add row under table */}
                    <tr className="bg-slate-50/50">
                      <td colSpan={7} className="py-2 px-3 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleAddItemToEdit}
                          className="gap-2 text-emerald-700 font-semibold hover:bg-emerald-50 w-full py-1 justify-center border border-dashed border-emerald-300"
                        >
                          <Plus className="h-4 w-4" />
                          Add Item Row
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tax Rates in Edit Dialog */}
            <div className="grid grid-cols-3 gap-3 border-t pt-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">SGST (%)</Label>
                <Input type="number" step="any" value={editSgstPercent} onChange={(e) => setEditSgstPercent(parseFloat(e.target.value) || 0)} className="h-8 text-xs text-center" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">CGST (%)</Label>
                <Input type="number" step="any" value={editCgstPercent} onChange={(e) => setEditCgstPercent(parseFloat(e.target.value) || 0)} className="h-8 text-xs text-center" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">IGST (%)</Label>
                <Input type="number" step="any" value={editIgstPercent} onChange={(e) => setEditIgstPercent(parseFloat(e.target.value) || 0)} className="h-8 text-xs text-center" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <CheckCircle className="h-4 w-4" />
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Specific CSS */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
          #printable-bill-area {
            box-shadow: none !important;
            width: 100% !important;
            min-height: 100vh !important;
            margin: 0 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
