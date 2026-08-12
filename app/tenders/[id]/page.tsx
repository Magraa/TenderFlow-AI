'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle, Wallet, Percent, TrendingUp, Flag, ArrowLeft } from 'lucide-react';
import { Bill, BillItem, CustomTemplate, DocumentVersion, Firm, Settings, Tender, TenderDocType, TenderDocument } from '@/types';
import { dataService } from '@/services/dataService';
import { documentService } from '@/services/documentService';
import { layoutEngine } from '@/services/layoutEngine';
import { pdfService } from '@/services/pdfService';
import { sharePDFViaWhatsApp } from '@/services/shareService';
import { numberToWords } from '@/lib/numberToWords';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RichTextEditor } from '@/components/editors/richTextEditor';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import DocumentViewer from '@/components/documentViewer';

const DOC_TYPES: TenderDocType[] = [
  'vigyapti',
  'quotation_main',
  'quotation_alt_1',
  'quotation_alt_2',
  'supply_aadesh',
  'firm_bill',
];

// Alt quotations are competing bids that must read as genuinely higher-priced —
// each item gets a deterministic, realistically-rounded markup within this range
// (same document regenerated = same numbers; different items get different % within
// the range so it doesn't look like a flat multiplier was applied).
const PRICE_MARKUP_BY_DOC_TYPE: Partial<Record<TenderDocType, { minPercent: number; maxPercent: number }>> = {
  quotation_alt_1: { minPercent: 15, maxPercent: 20 },
  quotation_alt_2: { minPercent: 25, maxPercent: 30 },
};

const DOC_CONFIGS: Record<TenderDocType, { label: string; description: string }> = {
  vigyapti: { label: 'Vigyapti', description: 'Global tender notice (no firm letterhead by default).' },
  quotation_main: { label: 'Quotation Main', description: 'Main firm quotation in tender language.' },
  quotation_alt_1: { label: 'Quotation Alt A', description: 'Alternate firm A quotation, priced 15-20% above main.' },
  quotation_alt_2: { label: 'Quotation Alt B', description: 'Alternate firm B quotation, priced 25-30% above main.' },
  supply_aadesh: { label: 'Supply Aadesh', description: 'Government supply order (no letterhead).' },
  firm_bill: { label: 'Main Firm Bill', description: 'Bill format for main firm only.' },
};

function calcTotals(tender: Tender) {
  const subtotal = tender.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const gstTotal = tender.items.reduce((sum, item) => sum + ((item.quantity * item.rate) * item.gstPercent) / 100, 0);
  return {
    subtotal,
    gstTotal,
    grandTotal: subtotal + gstTotal,
  };
}

export default function TenderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const [tender, setTender] = useState<Tender | null>(null);
  const [mainFirm, setMainFirm] = useState<Firm | null>(null);
  const [altFirmA, setAltFirmA] = useState<Firm | null>(null);
  const [altFirmB, setAltFirmB] = useState<Firm | null>(null);
  const [documents, setDocuments] = useState<TenderDocument[]>([]);
  const [firmBill, setFirmBill] = useState<Bill | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [selectedTemplateByDocType, setSelectedTemplateByDocType] = useState<Record<TenderDocType, string>>({} as any);
  const [historyByDocumentId, setHistoryByDocumentId] = useState<Record<string, DocumentVersion[]>>({});
  const [pendingContentByDocumentId, setPendingContentByDocumentId] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<TenderDocType>('vigyapti');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [autoFixed, setAutoFixed] = useState<Record<string, boolean>>({});
  const autoSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    return () => {
      Object.values(autoSaveTimers.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError('');

        const currentTender = await dataService.tenders.get(id);
        if (!currentTender) {
          if (cancelled) return;
          setError('Tender not found.');
          return;
        }

        const altAId = currentTender.alternateFirms?.[0] || '';
        const altBId = currentTender.alternateFirms?.[1] || '';

        const [currentMainFirm, altA, altB, docs, loadedSettings, templates, allBills] = await Promise.all([
          dataService.firms.get(currentTender.mainFirmId),
          altAId ? dataService.firms.get(altAId) : Promise.resolve(null),
          altBId ? dataService.firms.get(altBId) : Promise.resolve(null),
          dataService.documents.listByTender(id),
          dataService.settings.get(),
          dataService.customTemplates.list(),
          dataService.bills.list(),
        ]);

        if (cancelled) return;
        setTender(currentTender);
        setMainFirm(currentMainFirm || null);
        setAltFirmA(altA || null);
        setAltFirmB(altB || null);
        setDocuments(docs);
        setSettings(loadedSettings);
        setCustomTemplates(templates || []);
        setFirmBill(allBills.find((b) => b.tenderId === currentTender.id) || null);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load tender page:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tender data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const totals = useMemo(
    () => (tender ? calcTotals(tender) : { subtotal: 0, gstTotal: 0, grandTotal: 0 }),
    [tender]
  );

  const getDocument = (docType: TenderDocType): TenderDocument | null =>
    documents.find((document) => document.docType === docType) || null;

  useEffect(() => {
    const current = documents.find((document) => document.docType === activeTab) || null;
    if (!current) return;
    let cancelled = false;
    (async () => {
      const versions = await documentService.getDocumentHistory(current.id);
      if (cancelled) return;
      setHistoryByDocumentId((previous) => ({ ...previous, [current.id]: versions }));
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, documents]);

  const getFirmForDocType = (docType: TenderDocType): Firm | null => {
    if (docType === 'quotation_alt_1') return altFirmA;
    if (docType === 'quotation_alt_2') return altFirmB;
    if (docType === 'firm_bill') return mainFirm;
    if (docType === 'vigyapti') return mainFirm;
    return mainFirm;
  };

  const getLanguageForDocType = (docType: TenderDocType): 'hindi' | 'english' => {
    if (!tender) return 'english';
    if (docType === 'quotation_alt_1' && altFirmA) return altFirmA.defaultLanguage;
    if (docType === 'quotation_alt_2' && altFirmB) return altFirmB.defaultLanguage;
    if (docType === 'firm_bill') return tender.language;
    if (docType === 'vigyapti') return tender.language;
    return tender.language;
  };

  const getSyncedDocumentHTML = (document: TenderDocument, docType: TenderDocType): string => {
    const targetFirm = getFirmForDocType(docType);
    if (!targetFirm || !documentService.documentUsesLetterhead(docType)) {
      return document.contentHTML;
    }

    return layoutEngine.syncLetterheadLayoutHTML(document.contentHTML, targetFirm, {
      lockHeaderPosition: document.lockHeaderPosition,
    });
  };

  const refreshDocuments = async () => {
    if (!tender) return;
    setDocuments(await dataService.documents.listByTender(tender.id));
  };

  const generateDocument = async (
    docType: TenderDocType,
    forceTemplateFallback = false,
    languageOverride?: 'hindi' | 'english'
  ) => {
    if (!tender || !mainFirm) return;
    setGenerating(true);
    setError('');
    try {
      const targetFirm = getFirmForDocType(docType);
      if (!targetFirm) {
        throw new Error(`Cannot generate ${DOC_CONFIGS[docType].label}: firm not configured.`);
      }

      const selectedTemplateId = selectedTemplateByDocType[docType];

      const current = getDocument(docType);
      const result = await documentService.generateAndPersistDocument({
        tender,
        mainFirm,
        targetFirm,
        docType,
        language: languageOverride || getLanguageForDocType(docType),
        showLetterheadBackground: current?.showLetterheadBackground,
        showSafeMarginGuide: current?.showSafeMarginGuide,
        lockHeaderPosition: current?.lockHeaderPosition,
        includeSignature: current?.includeSignature,
        includeStamp: current?.includeStamp,
        showPageBoundaryGuide: current?.showSafeMarginGuide,
        showPrintBleedMargin: current?.showSafeMarginGuide,
        forceTemplateFallback,
        customTemplateId: selectedTemplateId || undefined,
        priceMarkupRange: PRICE_MARKUP_BY_DOC_TYPE[docType],
      });

      await refreshDocuments();
      setSuccess(
        `${DOC_CONFIGS[docType].label} generated${result.draft.metadata.usedTemplateFallback ? ' (default template fallback).' : '.'}`
      );
      setTimeout(() => setSuccess(''), 2500);
    } catch (generateError) {
      const message = generateError instanceof Error ? generateError.message : 'Generation failed.';
      setError(message);
    } finally {
      setGenerating(false);
    }
  };

  // "Main Firm Bill" is generated/edited as a real Bill record (the same entity the
  // Bills dashboard uses) instead of a free-text AI-drafted TenderDocument, so it
  // renders with the firm's configured Bill template and shows up in the Bills list.
  const generateOrSyncFirmBill = async () => {
    if (!tender || !mainFirm) return;
    setGenerating(true);
    setError('');
    try {
      const subtotal = tender.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
      const gstTotal = tender.items.reduce(
        (sum, item) => sum + (item.quantity * item.rate * item.gstPercent) / 100,
        0
      );
      const blendedGstPercent = subtotal > 0 ? (gstTotal / subtotal) * 100 : 0;
      const halfGstPercent = Math.round((blendedGstPercent / 2) * 100) / 100;

      const billItems: BillItem[] = tender.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        description: item.description || '',
        quantity: item.quantity,
        unit: item.unit || 'nos',
        rate: item.rate,
        amount: Math.round(item.quantity * item.rate * 100) / 100,
      }));

      const isHindi = tender.language === 'hindi';
      const recipientDesignation = isHindi ? 'मुख्य नगर पालिका अधिकारी' : 'Chief Municipal Officer';
      const recipientDepartment = (isHindi ? 'नगर परिषद ' : 'City Council ') + (tender.placeName || '');
      const recipientDistrict = (isHindi ? 'जिला ' : 'Distt. ') + (tender.districtName || '');
      const recipientAddress = [recipientDesignation, recipientDepartment.trim(), recipientDistrict.trim()]
        .filter((line) => line.trim())
        .join('\n');

      const sgstAmount = Math.round(((subtotal * halfGstPercent) / 100) * 100) / 100;
      const cgstAmount = sgstAmount;
      const grandTotal = subtotal + sgstAmount + cgstAmount;
      const amountInWords = numberToWords(grandTotal);

      if (firmBill) {
        const updated = await dataService.bills.update(firmBill.id, {
          items: billItems,
          recipientDesignation,
          recipientDepartment: recipientDepartment.trim(),
          recipientDistrict: recipientDistrict.trim(),
          recipientAddress,
          sgstPercent: halfGstPercent,
          cgstPercent: halfGstPercent,
          igstPercent: 0,
          totalAmount: subtotal,
          sgstAmount,
          cgstAmount,
          igstAmount: 0,
          grandTotal,
          amountInWords,
        });
        if (updated) setFirmBill(updated);
      } else {
        const allBills = await dataService.bills.list();
        const firmBills = allBills.filter((b) => b.firmId === mainFirm.id);
        let maxNo = 0;
        firmBills.forEach((b) => {
          const num = parseInt((b.invoiceNumber || '').replace(/\D/g, ''), 10);
          if (!isNaN(num) && num > maxNo) maxNo = num;
        });

        const created = await dataService.bills.create({
          invoiceNumber: (maxNo + 1).toString(),
          invoiceDate: new Date().toISOString().split('T')[0],
          firmId: mainFirm.id,
          tenderId: tender.id,
          recipientDesignation,
          recipientDepartment: recipientDepartment.trim(),
          recipientDistrict: recipientDistrict.trim(),
          recipientAddress,
          items: billItems,
          sgstPercent: halfGstPercent,
          cgstPercent: halfGstPercent,
          igstPercent: 0,
          totalAmount: subtotal,
          sgstAmount,
          cgstAmount,
          igstAmount: 0,
          grandTotal,
          amountInWords,
          status: tender.status === 'final' ? 'final' : 'draft',
          showLetterheadBackground: true,
          includeSignature: true,
          includeStamp: true,
        });
        setFirmBill(created);
      }

      setSuccess('Main Firm Bill synced from tender items.');
      setTimeout(() => setSuccess(''), 2500);
    } catch (generateError) {
      const message = generateError instanceof Error ? generateError.message : 'Failed to generate bill.';
      setError(message);
    } finally {
      setGenerating(false);
    }
  };

  const handleFirmBillToggle = async (
    field: 'showLetterheadBackground' | 'includeSignature' | 'includeStamp',
    value: boolean
  ) => {
    if (!firmBill) return;
    const updated = await dataService.bills.update(firmBill.id, { [field]: value });
    if (updated) setFirmBill(updated);
  };

  const updateDocumentOption = async (docType: TenderDocType, updates: Partial<TenderDocument>) => {
    const current = getDocument(docType);
    if (!current) return;
    const updated = await dataService.documents.update(current.id, updates);
    if (updated) {
      setDocuments((previous) => previous.map((entry) => (entry.id === updated.id ? updated : entry)));
      await generateDocument(docType);
    }
  };

  useEffect(() => {
    const current = documents.find((document) => document.docType === activeTab) || null;
    if (!current) return;
    if (generating) return;
    if (!tender || !mainFirm) return;
    if (documentService.documentUsesLetterhead(activeTab)) return;
    if (autoFixed[activeTab]) return;

    const hasLetterheadLayerElement = /<div class="letterhead-layer"><\/div>/.test(current.contentHTML);
    const hasInvalidFlags = current.showLetterheadBackground || current.includeSignature || current.includeStamp;

    if (hasLetterheadLayerElement || hasInvalidFlags) {
      setAutoFixed((previous) => ({ ...previous, [activeTab]: true }));
      (async () => {
        const updated = await dataService.documents.update(current.id, {
          showLetterheadBackground: false,
          includeSignature: false,
          includeStamp: false,
        });
        if (!updated) return;

        setDocuments((previous) => previous.map((doc) => (doc.id === updated.id ? updated : doc)));
        const targetFirm =
          activeTab === 'quotation_alt_1'
            ? altFirmA
            : activeTab === 'quotation_alt_2'
              ? altFirmB
              : mainFirm;
        const language =
          activeTab === 'quotation_alt_1' && altFirmA
            ? altFirmA.defaultLanguage
            : activeTab === 'quotation_alt_2' && altFirmB
              ? altFirmB.defaultLanguage
              : tender.language;

        if (!targetFirm) return;
        setGenerating(true);
        try {
          await documentService.generateAndPersistDocument({
            tender,
            mainFirm,
            targetFirm,
            docType: activeTab,
            language,
            showLetterheadBackground: false,
            includeSignature: false,
            includeStamp: false,
            showSafeMarginGuide: updated.showSafeMarginGuide,
            lockHeaderPosition: updated.lockHeaderPosition,
            showPageBoundaryGuide: updated.showSafeMarginGuide,
            showPrintBleedMargin: updated.showSafeMarginGuide,
          });
          setDocuments(await dataService.documents.listByTender(tender.id));
        } finally {
          setGenerating(false);
        }
      })();
    }
  }, [activeTab, documents, generating, autoFixed, tender, mainFirm, altFirmA, altFirmB]);

  const saveDocumentContent = async (documentId: string, contentHTML: string, changeNote: string) => {
    setSaving(true);
    try {
      const updated = await documentService.updateDocumentContent(documentId, contentHTML, changeNote);
      if (updated) {
        setDocuments((previous) => previous.map((document) => (document.id === updated.id ? updated : document)));
        const versions = await documentService.getDocumentHistory(updated.id);
        setHistoryByDocumentId((previous) => ({ ...previous, [updated.id]: versions }));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEditorChange = async (contentHTML: string) => {
    const current = getDocument(activeTab);
    if (!current) return;

    setPendingContentByDocumentId((previous) => ({ ...previous, [current.id]: contentHTML }));

    if (!settings?.versioningSettings.enabled || !settings.versioningSettings.autoSaveEnabled) {
      return;
    }

    if (autoSaveTimers.current[current.id]) {
      clearTimeout(autoSaveTimers.current[current.id]);
    }

    autoSaveTimers.current[current.id] = setTimeout(() => {
      saveDocumentContent(current.id, contentHTML, 'Auto-save after editor changes').then(() => {
        setPendingContentByDocumentId((previous) => {
          const next = { ...previous };
          delete next[current.id];
          return next;
        });
      });
      delete autoSaveTimers.current[current.id];
    }, settings.versioningSettings.autoSaveInterval * 60 * 1000);
  };

  const handleManualSave = async () => {
    const current = getDocument(activeTab);
    if (!current) return;
    const pendingContent = pendingContentByDocumentId[current.id];
    if (!pendingContent || pendingContent === current.contentHTML) {
      setSuccess('No content changes to save.');
      setTimeout(() => setSuccess(''), 1800);
      return;
    }

    setSaving(true);
    try {
      await saveDocumentContent(current.id, pendingContent, 'Manual editor save');
      setPendingContentByDocumentId((previous) => {
        const next = { ...previous };
        delete next[current.id];
        return next;
      });
      setSuccess('Document version saved.');
      setTimeout(() => setSuccess(''), 1800);
    } finally {
      setSaving(false);
    }
  };

  const downloadPDF = async () => {
    const current = getDocument(activeTab);
    if (!current || !tender) return;
    setDownloadingPdf(true);
    setError('');
    try {
      const syncedContent = getSyncedDocumentHTML(current, activeTab);
      const result = await pdfService.downloadPDF(
        syncedContent,
        `${tender.tenderNumber}-${activeTab}-${Date.now()}.pdf`
      );
      setSuccess(result.savedToFolder ? `PDF saved to "${result.folderName}".` : 'PDF downloaded.');
      setTimeout(() => setSuccess(''), 2500);
    } catch {
      setError('Failed to generate PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const printDocument = () => {
    const current = getDocument(activeTab);
    if (!current) return;
    pdfService.printHTML(getSyncedDocumentHTML(current, activeTab));
  };

  const shareDocumentWhatsApp = async () => {
    const current = getDocument(activeTab);
    if (!current || !tender) return;
    setSharingPdf(true);
    setError('');
    try {
      const syncedContent = getSyncedDocumentHTML(current, activeTab);
      const blob = await pdfService.generatePDFBlob(syncedContent);
      const filename = `${tender.tenderNumber}-${activeTab}.pdf`;
      await sharePDFViaWhatsApp(blob, filename, `${DOC_CONFIGS[activeTab].label} — ${tender.tenderNumber}`);
    } catch {
      setError('Failed to prepare PDF for sharing.');
    } finally {
      setSharingPdf(false);
    }
  };

  const handleStatusChange = async (nextStatus: 'draft' | 'final') => {
    if (!tender || tender.status === nextStatus) return;
    const updated = await dataService.tenders.update(tender.id, { status: nextStatus });
    if (updated) {
      setTender(updated);
      setSuccess(`Tender marked as ${nextStatus}.`);
      setTimeout(() => setSuccess(''), 1800);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading tender...</p>
      </div>
    );
  }

  if (!tender || !mainFirm) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || 'Tender data missing.'}</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-screen-xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:py-6 sm:px-6 lg:px-8">
          <div className="flex items-start gap-2 sm:block">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="shrink-0 -ml-2 gap-1.5 text-slate-600 sm:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-3xl">{tender.title}</h1>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                #{tender.tenderNumber} • {tender.items.length} items • {tender.language} • {tender.status}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.push('/dashboard')} className="hidden shrink-0 sm:inline-flex">
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl space-y-4 px-4 py-4 sm:px-6 lg:px-8">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert variant="success">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <Card className="overflow-hidden border-slate-200">
            <CardContent className="flex items-start justify-between gap-2 p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">Subtotal</p>
                <p className="mt-1 truncate text-lg font-bold text-slate-900 sm:text-2xl">Rs. {totals.subtotal.toLocaleString('en-IN')}</p>
              </div>
              <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-500">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-slate-200">
            <CardContent className="flex items-start justify-between gap-2 p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">GST Total</p>
                <p className="mt-1 truncate text-lg font-bold text-slate-900 sm:text-2xl">Rs. {totals.gstTotal.toLocaleString('en-IN')}</p>
              </div>
              <div className="shrink-0 rounded-lg bg-amber-50 p-2 text-amber-600">
                <Percent className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-emerald-200 bg-emerald-50/40">
            <CardContent className="flex items-start justify-between gap-2 p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700/70 sm:text-xs">Grand Total</p>
                <p className="mt-1 truncate text-lg font-bold text-emerald-800 sm:text-2xl">Rs. {totals.grandTotal.toLocaleString('en-IN')}</p>
              </div>
              <div className="shrink-0 rounded-lg bg-emerald-100 p-2 text-emerald-700">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-slate-200">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">Status</p>
                <div className="shrink-0 rounded-lg bg-blue-50 p-2 text-blue-600">
                  <Flag className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={tender.status === 'draft' ? 'default' : 'outline'}
                  onClick={() => handleStatusChange('draft')}
                  className="flex-1 sm:flex-none"
                >
                  Draft
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={tender.status === 'final' ? 'default' : 'outline'}
                  onClick={() => handleStatusChange('final')}
                  className="flex-1 sm:flex-none"
                >
                  Final
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>
              Firm-specific letterhead scope, template fallback, and local version history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="vigyapti">
              {/* `!`-prefixed overrides guarantee they win over the shared Tabs
                  component's baked-in `h-10`/`whitespace-nowrap` regardless of
                  Tailwind's internal utility ordering — needed so labels like
                  "Quotation Alt A" can wrap onto two lines on narrow phones
                  instead of overflowing their grid cell. */}
              <TabsList className="grid !h-auto w-full grid-cols-2 gap-1.5 p-1 sm:grid-cols-3 sm:gap-2 lg:grid-cols-6">
                {DOC_TYPES.map((docType) => (
                  <TabsTrigger
                    key={docType}
                    value={docType}
                    onClick={() => setActiveTab(docType)}
                    className="!whitespace-normal !py-2 !text-[11px] !leading-tight text-center sm:!text-xs lg:!text-sm"
                  >
                    {DOC_CONFIGS[docType].label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {DOC_TYPES.map((docType) => {
                if (docType === 'firm_bill') {
                  return (
                    <TabsContent key={docType} value={docType} className="mt-6 space-y-4">
                      <p className="text-sm text-slate-500">{DOC_CONFIGS[docType].description}</p>
                      <p className="text-sm text-slate-500">
                        Target firm: <strong>{mainFirm?.name || 'N/A'}</strong> — generated as a real Bill using the
                        firm&apos;s configured Bill template (Manage Firms), so it also appears in the Bills dashboard.
                      </p>

                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                        <Button onClick={generateOrSyncFirmBill} loading={generating} disabled={generating} className="w-full sm:w-auto">
                          {firmBill ? 'Sync From Tender Items' : 'Generate Document'}
                        </Button>
                        {firmBill && (
                          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
                            <Link href={`/bills/${firmBill.id}`} className="contents">
                              <Button type="button" variant="outline" className="justify-center">Open in Bills →</Button>
                            </Link>
                            <Link href={`/bills/${firmBill.id}?print=true`} target="_blank" className="contents">
                              <Button type="button" variant="outline" className="justify-center">Print / Export PDF</Button>
                            </Link>
                          </div>
                        )}
                      </div>

                      {firmBill ? (
                        <>
                          <div className="space-y-3 rounded-md border border-slate-200 p-3 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                                Invoice No. {firmBill.invoiceNumber} • {firmBill.status}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                Grand Total Rs. {firmBill.grandTotal.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-4">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={firmBill.showLetterheadBackground !== false}
                                  onChange={(event) => handleFirmBillToggle('showLetterheadBackground', event.target.checked)}
                                />
                                Show Letterhead Background
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={firmBill.includeSignature !== false}
                                  onChange={(event) => handleFirmBillToggle('includeSignature', event.target.checked)}
                                />
                                Include Signature
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={firmBill.includeStamp !== false}
                                  onChange={(event) => handleFirmBillToggle('includeStamp', event.target.checked)}
                                />
                                Include Firm Stamp
                              </label>
                            </div>
                            <p className="text-xs text-slate-500">
                              Item quantities, rates, and totals are pulled from this tender&apos;s items via &quot;Sync From
                              Tender Items&quot;. Invoice number, recipient text, and template selection are edited on the Bill
                              page (Open in Bills →).
                            </p>
                          </div>

                          <div>
                            <p className="mb-2 text-sm font-medium">Preview</p>
                            <iframe
                              key={firmBill.id + firmBill.updatedAt}
                              src={`/bills/${firmBill.id}`}
                              className="w-full h-[900px] rounded-lg border border-slate-200 bg-white"
                              title="Main Firm Bill Preview"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="rounded-lg border-2 border-dashed border-slate-300 p-10 text-center">
                          <p className="text-slate-500">No bill generated yet. Click &quot;Generate Document&quot; to create one from this tender&apos;s items.</p>
                        </div>
                      )}
                    </TabsContent>
                  );
                }

                const current = getDocument(docType);
                const targetFirm = getFirmForDocType(docType);
                const docHistory = current ? historyByDocumentId[current.id] || [] : [];
                const pendingContent = current ? pendingContentByDocumentId[current.id] : '';
                const versioningSettings = settings?.versioningSettings;
                const manualSaveMode = Boolean(
                  current &&
                    versioningSettings &&
                    (!versioningSettings.enabled || !versioningSettings.autoSaveEnabled)
                );
                const usesLetterhead = documentService.documentUsesLetterhead(docType);
                return (
                  <TabsContent key={docType} value={docType} className="mt-6 space-y-4">
                    <p className="text-sm text-slate-500">{DOC_CONFIGS[docType].description}</p>
                    <p className="text-sm text-slate-500">
                      Target firm: <strong>{targetFirm?.name || 'N/A'}</strong> | Language:{' '}
                      <strong>{getLanguageForDocType(docType)}</strong> | Letterhead Scope:{' '}
                      <strong>{documentService.documentUsesLetterhead(docType) ? 'Firm-only' : 'Global'}</strong>
                    </p>

                    {(() => {
                      const isQuotationType = docType === 'quotation_main' || docType === 'quotation_alt_1' || docType === 'quotation_alt_2';
                      // Only offer templates authored for this exact quotation doc type —
                      // previously this listed every custom template (including Bill/Invoice
                      // templates), which had no business appearing in a quotation dropdown.
                      const availableTemplates = isQuotationType
                        ? customTemplates.filter((t) => t.docType === docType)
                        : [];
                      
                      return (
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                          <Button onClick={() => generateDocument(docType)} loading={generating} disabled={generating} className="w-full sm:w-auto">
                            Generate Document
                          </Button>

                          {isQuotationType && availableTemplates.length > 0 && (
                            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2.5 py-1 bg-white shadow-sm h-10 w-full sm:w-auto">
                              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0">Template:</span>
                              <select
                                className="bg-transparent focus-visible:outline-none text-xs text-slate-700 font-medium w-full sm:w-auto"
                                value={selectedTemplateByDocType[docType] || ''}
                                onChange={(e) => setSelectedTemplateByDocType(prev => ({ ...prev, [docType]: e.target.value }))}
                              >
                                <option value="">Firm Default Template</option>
                                {availableTemplates.map((tpl) => (
                                  <option key={tpl.id} value={tpl.id}>
                                    {tpl.name} ({tpl.language === 'hindi' ? 'Hindi' : 'English'})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {current && (
                            <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-2">
                              <Button type="button" variant="outline" onClick={downloadPDF} loading={downloadingPdf} disabled={downloadingPdf} className="justify-center">
                                <span className="sm:hidden">PDF</span>
                                <span className="hidden sm:inline">Download PDF</span>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={shareDocumentWhatsApp}
                                loading={sharingPdf}
                                disabled={sharingPdf}
                                className="justify-center gap-1.5 hover:bg-emerald-50"
                              >
                                <MessageCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                                <span className="hidden sm:inline">WhatsApp</span>
                              </Button>
                              <Button type="button" variant="outline" onClick={printDocument} className="justify-center">
                                Print
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {current && (
                      <div className="space-y-3 rounded-md border border-slate-200 p-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              versioningSettings?.enabled ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            Versioning {versioningSettings?.enabled ? 'enabled' : 'disabled'}
                          </span>
                          {versioningSettings?.enabled && (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                              {versioningSettings.autoSaveEnabled
                                ? `Auto-save every ${versioningSettings.autoSaveInterval} min`
                                : 'Manual save mode'}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4">
                          {usesLetterhead && (
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={current.showLetterheadBackground}
                                onChange={(event) =>
                                  updateDocumentOption(docType, { showLetterheadBackground: event.target.checked })
                                }
                              />
                              Show Letterhead Background
                            </label>
                          )}
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={current.showSafeMarginGuide}
                              onChange={(event) =>
                                updateDocumentOption(docType, { showSafeMarginGuide: event.target.checked })
                              }
                            />
                            Show Safe Margin Guide
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={current.lockHeaderPosition}
                              onChange={(event) =>
                                updateDocumentOption(docType, { lockHeaderPosition: event.target.checked })
                              }
                            />
                            Lock Header Position
                          </label>
                          {usesLetterhead && (
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={current.includeSignature}
                                onChange={(event) =>
                                  updateDocumentOption(docType, { includeSignature: event.target.checked })
                                }
                              />
                              Include Signature
                            </label>
                          )}
                          {usesLetterhead && (
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={current.includeStamp}
                                onChange={(event) =>
                                  updateDocumentOption(docType, { includeStamp: event.target.checked })
                                }
                              />
                              Include Stamp
                            </label>
                          )}
                        </div>
                        {!usesLetterhead && (
                          <p className="text-xs text-slate-500">
                            Letterhead, signature, and stamp are disabled for this global document type.
                          </p>
                        )}

                        {current.overflowWarning && (
                          <Alert variant="warning">
                            <AlertTitle>Overflow Warning</AlertTitle>
                            <AlertDescription>{current.overflowWarning}</AlertDescription>
                          </Alert>
                        )}

                        {docHistory.length > 0 && (
                          <div className="rounded border border-slate-200 p-2">
                            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Version History</p>
                            <div className="max-h-24 space-y-1 overflow-y-auto text-xs">
                              {docHistory.map((version) => (
                                <div key={version.id} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
                                  <span>v{version.versionNumber}</span>
                                  <span>{new Date(version.createdAt).toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {current ? (
                      <div className="space-y-4">
                        <details className="rounded-md border border-slate-200">
                          <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-slate-600">
                            Edit Content (legacy TipTap editor — collapsed; tables don&apos;t render correctly here, edit in the Preview below instead)
                          </summary>
                          <div className="border-t border-slate-200 p-3">
                            <RichTextEditor initialContent={current.contentHTML} onChange={handleEditorChange} />
                          </div>
                        </details>
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-medium">Preview (click in to edit directly)</p>
                            {saving && <p className="text-xs text-slate-500">Saving version...</p>}
                            {manualSaveMode && pendingContent && pendingContent !== current.contentHTML && (
                              <p className="text-xs text-amber-600">Unsaved document changes</p>
                            )}
                          </div>
                          <DocumentViewer
                            content={getSyncedDocumentHTML(current, docType)}
                            docType={docType}
                            tender={tender}
                            mainFirm={mainFirm || undefined}
                            targetFirm={getFirmForDocType(docType) || undefined}
                            tenderLanguage={getLanguageForDocType(docType)}
                            versioningSettings={versioningSettings}
                            versions={docHistory}
                            onManualSave={manualSaveMode ? handleManualSave : undefined}
                            onContentChange={handleEditorChange}
                            onLanguageChange={(lang) => {
                              // Regenerate document when language changes
                              generateDocument(docType, false, lang);
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border-2 border-dashed border-slate-300 p-10 text-center">
                        <p className="text-slate-500">No document generated yet.</p>
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
