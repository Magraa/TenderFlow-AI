'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DocumentVersion, Firm, Settings, Tender, TenderDocType, TenderDocument } from '@/types';
import { dataService } from '@/services/dataService';
import { documentService } from '@/services/documentService';
import { pdfService } from '@/services/pdfService';
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

const DOC_CONFIGS: Record<TenderDocType, { label: string; description: string }> = {
  vigyapti: { label: 'Vigyapti', description: 'Global tender notice (no firm letterhead by default).' },
  quotation_main: { label: 'Quotation Main', description: 'Main firm quotation in tender language.' },
  quotation_alt_1: { label: 'Quotation Alt A', description: 'Alternate firm A quotation in firm language.' },
  quotation_alt_2: { label: 'Quotation Alt B', description: 'Alternate firm B quotation in firm language.' },
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

export default function TenderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState('');
  const [tender, setTender] = useState<Tender | null>(null);
  const [mainFirm, setMainFirm] = useState<Firm | null>(null);
  const [altFirmA, setAltFirmA] = useState<Firm | null>(null);
  const [altFirmB, setAltFirmB] = useState<Firm | null>(null);
  const [documents, setDocuments] = useState<TenderDocument[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [historyByDocumentId, setHistoryByDocumentId] = useState<Record<string, DocumentVersion[]>>({});
  const [pendingContentByDocumentId, setPendingContentByDocumentId] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<TenderDocType>('vigyapti');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [autoFixed, setAutoFixed] = useState<Record<string, boolean>>({});
  const autoSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    params.then((resolved) => setId(resolved.id));
  }, [params]);

  useEffect(() => {
    return () => {
      Object.values(autoSaveTimers.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      const currentTender = await dataService.tenders.get(id);
      if (!currentTender) {
        if (cancelled) return;
        setError('Tender not found.');
        setLoading(false);
        return;
      }

      const altAId = currentTender.alternateFirms?.[0] || '';
      const altBId = currentTender.alternateFirms?.[1] || '';

      const [currentMainFirm, altA, altB, docs, loadedSettings] = await Promise.all([
        dataService.firms.get(currentTender.mainFirmId),
        altAId ? dataService.firms.get(altAId) : Promise.resolve(null),
        altBId ? dataService.firms.get(altBId) : Promise.resolve(null),
        dataService.documents.listByTender(id),
        dataService.settings.get(),
      ]);

      if (cancelled) return;
      setTender(currentTender);
      setMainFirm(currentMainFirm || null);
      setAltFirmA(altA || null);
      setAltFirmB(altB || null);
      setDocuments(docs);
      setSettings(loadedSettings);
      setLoading(false);
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

  const refreshDocuments = async () => {
    if (!tender) return;
    setDocuments(await dataService.documents.listByTender(tender.id));
  };

  const generateDocument = async (docType: TenderDocType, forceTemplateFallback = false) => {
    if (!tender || !mainFirm) return;
    setGenerating(true);
    setError('');
    try {
      const targetFirm = getFirmForDocType(docType);
      if (!targetFirm) {
        throw new Error(`Cannot generate ${DOC_CONFIGS[docType].label}: firm not configured.`);
      }

      const current = getDocument(docType);
      const result = await documentService.generateAndPersistDocument({
        tender,
        mainFirm,
        targetFirm,
        docType,
        language: getLanguageForDocType(docType),
        showLetterheadBackground: current?.showLetterheadBackground,
        showSafeMarginGuide: current?.showSafeMarginGuide,
        lockHeaderPosition: current?.lockHeaderPosition,
        includeSignature: current?.includeSignature,
        includeStamp: current?.includeStamp,
        showPageBoundaryGuide: current?.showSafeMarginGuide,
        showPrintBleedMargin: current?.showSafeMarginGuide,
        forceTemplateFallback,
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
    try {
      await pdfService.downloadPDF(
        current.contentHTML,
        `${tender.tenderNumber}-${activeTab}-${Date.now()}.pdf`
      );
    } catch {
      setError('Failed to download PDF.');
    }
  };

  const printDocument = () => {
    const current = getDocument(activeTab);
    if (!current) return;
    pdfService.printHTML(current.contentHTML);
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
        <div className="mx-auto flex max-w-screen-xl items-start justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{tender.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              #{tender.tenderNumber} • {tender.items.length} items • {tender.language} • {tender.status}
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-slate-500">Subtotal</p>
              <p className="text-2xl font-bold">Rs. {totals.subtotal.toLocaleString('en-IN')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-slate-500">GST Total</p>
              <p className="text-2xl font-bold">Rs. {totals.gstTotal.toLocaleString('en-IN')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-slate-500">Grand Total</p>
              <p className="text-2xl font-bold">Rs. {totals.grandTotal.toLocaleString('en-IN')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-slate-500">Status</p>
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={tender.status === 'draft' ? 'default' : 'outline'}
                  onClick={() => handleStatusChange('draft')}
                >
                  Draft
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={tender.status === 'final' ? 'default' : 'outline'}
                  onClick={() => handleStatusChange('final')}
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
              <TabsList className="grid w-full grid-cols-2 gap-2 lg:grid-cols-6">
                {DOC_TYPES.map((docType) => (
                  <TabsTrigger key={docType} value={docType} onClick={() => setActiveTab(docType)}>
                    {DOC_CONFIGS[docType].label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {DOC_TYPES.map((docType) => {
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

                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => generateDocument(docType)} loading={generating} disabled={generating}>
                        Generate Document
                      </Button>
                      {current && (
                        <>
                          <Button type="button" variant="outline" onClick={downloadPDF}>
                            Download PDF
                          </Button>
                          <Button type="button" variant="outline" onClick={printDocument}>
                            Print
                          </Button>
                        </>
                      )}
                    </div>

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
                        <div>
                          <p className="mb-2 text-sm font-medium">Edit Content (TipTap)</p>
                          <RichTextEditor initialContent={current.contentHTML} onChange={handleEditorChange} />
                          <div className="mt-2 flex items-center gap-2">
                            {manualSaveMode && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleManualSave}
                                loading={saving}
                                disabled={saving || !pendingContent || pendingContent === current.contentHTML}
                              >
                                Save Version
                              </Button>
                            )}
                            {saving && <p className="text-xs text-slate-500">Saving version...</p>}
                            {manualSaveMode && pendingContent && pendingContent !== current.contentHTML && (
                              <p className="text-xs text-amber-600">Unsaved document changes</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="mb-2 text-sm font-medium">Preview</p>
                          <DocumentViewer 
                            content={current.contentHTML} 
                            docType={docType} 
                            tender={tender}
                            mainFirm={mainFirm || undefined}
                            targetFirm={getFirmForDocType(docType) || undefined}
                            tenderLanguage={getLanguageForDocType(docType)}
                            versioningSettings={versioningSettings}
                            versions={docHistory}
                            onManualSave={manualSaveMode ? handleManualSave : undefined}
                            onLanguageChange={() => {
                              // Regenerate document when language changes
                              generateDocument(docType);
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
