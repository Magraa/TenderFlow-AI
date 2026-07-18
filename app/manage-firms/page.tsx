'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Firm, FirmStyleProfile, LetterheadFitMode, CustomTemplate } from '@/types';
import { dataService } from '@/services/dataService';
import { firmService } from '@/services/firmService';
import { layoutEngine } from '@/services/layoutEngine';
import { uploadFirmImage } from '@/services/imageUploadService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FirmFormData = Omit<Firm, 'id' | 'createdAt' | 'updatedAt'>;

type FirmFormState = FirmFormData & {
  headerImagePathLoading?: boolean;
  signatureImagePathLoading?: boolean;
  stampImagePathLoading?: boolean;
  headerImagePathFileInfo?: { url: string; fileName: string };
  signatureImagePathFileInfo?: { url: string; fileName: string };
  stampImagePathFileInfo?: { url: string; fileName: string };
  headerImagePathPreview?: string;
  signatureImagePathPreview?: string;
  stampImagePathPreview?: string;
};

const FIT_MODES: LetterheadFitMode[] = ['contain', 'cover', 'stretch'];
const STYLE_PROFILES: FirmStyleProfile[] = ['govt_formal', 'minimal_business', 'bilingual', 'table_heavy'];

const EMPTY_FORM: FirmFormState = {
  name: '',
  headerImagePath: '',
  signatureImagePath: '',
  stampImagePath: '',
  defaultLanguage: 'english',
  fitLetterheadMode: 'contain',
  headerSpacing: 170,
  footerSpacing: 120,
  pageMargin: 40,
  signatureOffsetX: 16,
  signatureOffsetY: 16,
  signatureScale: 1,
  signatureRotateDeg: 0,
  stampOffsetX: 140,
  stampOffsetY: 16,
  stampScale: 1,
  stampMode: 'image',
  layoutReferenceWidth: 0,
  aiPromptQuotation: '',
  aiPromptBill: '',
  firmStyleProfile: 'govt_formal',
  firmCity: '',
  firmAddress: '',
  gstNumber: '',
  mobileNumber: '',
  contactPerson: '',
  vendorHindiName: '',
  bankName: '',
  bankBranch: '',
  ifscCode: '',
  accountNumber: '',
  panNumber: '',
  billInstructions: '',
  customQuotationTemplateId: '',
};

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setDebounced(value), delayMs);
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [value, delayMs]);

  return debounced;
}

function getFitStyle(mode: LetterheadFitMode) {
  if (mode === 'stretch') return { backgroundSize: '100% 100%' };
  if (mode === 'cover') return { backgroundSize: 'cover' };
  return { backgroundSize: 'contain' };
}

function PreviewFrame({
  formData,
  showLetterheadBackground,
  showBoundaryGuide,
  showPrintBleedGuide,
  previewBackground,
  zoom,
  onPageWidthChange,
}: {
  formData: FirmFormState;
  showLetterheadBackground: boolean;
  showBoundaryGuide: boolean;
  showPrintBleedGuide: boolean;
  previewBackground: 'white' | 'print';
  zoom: number;
  onPageWidthChange?: (width: number) => void;
}) {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const headerSpacing = clampNumber(formData.headerSpacing, 80, 300);
  const footerSpacing = clampNumber(formData.footerSpacing, 40, 220);
  const pageMargin = clampNumber(formData.pageMargin, 20, 100);

  const snappedHeaderSpacing = layoutEngine.snapToGrid(headerSpacing, 4);
  const snappedFooterSpacing = layoutEngine.snapToGrid(footerSpacing, 4);
  const snappedPageMargin = layoutEngine.snapToGrid(pageMargin, 4);

  const signatureOffsetX = layoutEngine.snapToGrid(clampNumber(formData.signatureOffsetX ?? 16, 0, 240), 2);
  const signatureOffsetY = layoutEngine.snapToGrid(clampNumber(formData.signatureOffsetY ?? 16, 0, 240), 2);
  const signatureScale = clampNumber(formData.signatureScale ?? 1, 0.4, 2.2);
  const signatureRotateDeg = clampNumber(formData.signatureRotateDeg ?? 0, -45, 45);
  const stampOffsetX = layoutEngine.snapToGrid(clampNumber(formData.stampOffsetX ?? 140, 0, 320), 2);
  const stampOffsetY = layoutEngine.snapToGrid(clampNumber(formData.stampOffsetY ?? 16, 0, 240), 2);
  const stampScale = clampNumber(formData.stampScale ?? 1, 0.4, 2.2);
  const stampMode = formData.stampMode ?? 'image';
  const fitStyle = getFitStyle(formData.fitLetterheadMode);

  // Use local preview URLs if available (prevents CORS & network load issues)
  const headerImagePath = formData.headerImagePathPreview || formData.headerImagePath;
  const signatureImagePath = formData.signatureImagePathPreview || formData.signatureImagePath;
  const stampImagePath = formData.stampImagePathPreview || formData.stampImagePath;

  // Debug: Log letterhead URL
  useEffect(() => {
    if (headerImagePath) {
      console.log('Preview letterhead URL:', headerImagePath);
      console.log('Is Firebase URL:', headerImagePath.startsWith('https://firebasestorage.googleapis.com/'));
    }
  }, [headerImagePath]);

  useEffect(() => {
    if (!pageRef.current || !onPageWidthChange) return;
    const updateWidth = () => {
      const width = pageRef.current?.clientWidth || 0;
      if (width > 0) onPageWidthChange(Math.round(width));
    };
    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(pageRef.current);
    return () => observer.disconnect();
  }, [onPageWidthChange]);

  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Live Preview</div>
        <div className="text-xs text-slate-500">A4 • realistic content • guides</div>
      </div>

      <div className={previewBackground === 'print' ? 'rounded-lg bg-slate-200/70 p-4' : 'rounded-lg bg-white p-4'}>
        <div
          className="mx-auto origin-top rounded-md bg-white shadow-sm ring-1 ring-slate-200"
          style={{
            width: 'min(100%, 520px)',
            transform: `scale(${zoom})`,
          }}
        >
          <div ref={pageRef} className="relative w-full overflow-hidden" style={{ aspectRatio: '210 / 297' }}>
        {showLetterheadBackground && headerImagePath ? (
          <>
            <div
              className="absolute inset-0 bg-top bg-no-repeat"
              style={{ backgroundImage: `url("${headerImagePath}")`, ...fitStyle }}
            />
            {/* Debug: Show URL in preview */}
            <div className="absolute bottom-2 left-2 z-50 rounded bg-black/70 px-2 py-1 text-[10px] font-mono text-white">
              <span className="truncate max-w-[200px]">{headerImagePath}</span>
            </div>
          </>
        ) : showLetterheadBackground && !headerImagePath ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-slate-100">
            <p className="text-sm text-slate-500">No letterhead uploaded</p>
          </div>
        ) : null}

        {showBoundaryGuide && (
          <div className="absolute inset-[2px] border border-dashed border-slate-400/70" />
        )}
        {showPrintBleedGuide && (
          <div className="absolute inset-[6px] border border-dotted border-sky-500/70" />
        )}

        <div
          className="absolute z-10"
          style={{
            top: `${snappedHeaderSpacing}px`,
            left: `${snappedPageMargin}px`,
            right: `${snappedPageMargin}px`,
            bottom: `${snappedFooterSpacing}px`,
          }}
        >
          <h3 className="text-sm font-semibold tracking-tight">Quotation</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
            <span>
              <span className="font-medium text-slate-700">Quotation No:</span> QTN-000123
            </span>
            <span>
              <span className="font-medium text-slate-700">Date:</span> 27/05/2026
            </span>
            <span>
              <span className="font-medium text-slate-700">To:</span> Public Works Department
            </span>
          </div>

          <p className="mt-2 text-[11px] leading-4 text-slate-700">
            We are pleased to submit our quotation for the following items. Rates are inclusive of packing and forwarding, and
            applicable GST as mentioned.
          </p>

          <table className="mt-2 w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-1.5 text-left">Item</th>
                <th className="border border-slate-300 p-1.5 text-right">Qty</th>
                <th className="border border-slate-300 p-1.5 text-right">Rate</th>
                <th className="border border-slate-300 p-1.5 text-right">GST</th>
                <th className="border border-slate-300 p-1.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, index) => (
                <tr key={index} className={index % 2 === 1 ? 'bg-slate-50/70' : undefined}>
                  <td className="border border-slate-300 p-1.5">PVC Pipe {index + 1} inch (Sample)</td>
                  <td className="border border-slate-300 p-1.5 text-right">{index + 2}</td>
                  <td className="border border-slate-300 p-1.5 text-right">{(450 + index * 35).toLocaleString('en-IN')}</td>
                  <td className="border border-slate-300 p-1.5 text-right">18%</td>
                  <td className="border border-slate-300 p-1.5 text-right">{(6372 + index * 510).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-2 flex items-start justify-between gap-3 text-[10.5px] text-slate-700">
            <div className="max-w-[60%] leading-4 text-slate-600">
              <p className="font-medium text-slate-700">Terms</p>
              <p>Delivery: 7 days • Payment: 100% against bill • Validity: 30 days</p>
            </div>
            <div className="text-right leading-4">
              <p>
                <span className="text-slate-600">Subtotal:</span> <span className="font-medium">₹ 42,500.00</span>
              </p>
              <p>
                <span className="text-slate-600">GST:</span> <span className="font-medium">₹ 7,650.00</span>
              </p>
              <p className="mt-0.5 text-[11px]">
                <span className="text-slate-600">Grand Total:</span> <span className="font-semibold">₹ 50,150.00</span>
              </p>
            </div>
          </div>
        </div>

        {signatureImagePath && (
          <div
            className="absolute z-20"
            style={{
              right: `${signatureOffsetX}px`,
              bottom: `${signatureOffsetY}px`,
              transformOrigin: 'bottom right',
              transform: `rotate(${Math.round(signatureRotateDeg)}deg) scale(${Math.round(signatureScale * 100) / 100})`,
            }}
          >
            <div className="relative h-11 w-[132px]">
              <Image
                src={signatureImagePath}
                alt="Signature preview"
                fill
                className="object-contain object-right-bottom"
                unoptimized
              />
            </div>
          </div>
        )}

        {(stampMode === 'generic' || stampImagePath) && (
          <div
            className="absolute z-20"
            style={{
              right: `${stampOffsetX}px`,
              bottom: `${stampOffsetY}px`,
              transformOrigin: 'bottom right',
              transform: `scale(${Math.round(stampScale * 100) / 100})`,
            }}
          >
            {stampMode === 'generic' ? (
              <div className="w-max max-w-none rounded-md border-2 border-slate-900/25 bg-white/70 px-2 py-1 text-right text-[10.5px] font-extrabold uppercase leading-4 text-slate-900/90">
                <div className="whitespace-nowrap">
                  FOR{' '}
                  {formData.name?.trim()
                    ? formData.name.trim().replace(/\s+/g, ' ').toUpperCase()
                    : 'YOUR FIRM NAME'}
                </div>
                <div className="whitespace-nowrap">PROPRIETOR</div>
              </div>
            ) : (
              <div className="relative h-16 w-[92px]">
                {stampImagePath ? (
                  <Image src={stampImagePath} alt="Stamp preview" fill className="object-contain object-right-bottom" unoptimized />
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Layout guides */}
        <div className="pointer-events-none absolute inset-0 z-30">
          {/* Content start marker */}
          <div className="absolute left-0 right-0 border-t border-emerald-500/60" style={{ top: `${snappedHeaderSpacing}px` }} />
          <div className="absolute left-2 rounded bg-emerald-600/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700" style={{ top: `${snappedHeaderSpacing + 6}px` }}>
            Content starts
          </div>

          {/* Footer reserved area */}
          <div
            className="absolute left-0 right-0 border-t border-rose-500/50 bg-rose-400/5"
            style={{ bottom: 0, height: `${snappedFooterSpacing}px` }}
          />
          <div className="absolute right-2 rounded bg-rose-600/10 px-2 py-0.5 text-[10px] font-medium text-rose-700" style={{ bottom: `${Math.max(6, snappedFooterSpacing - 18)}px` }}>
            Footer reserve
          </div>

          {/* Margin safe area */}
          <div className="absolute top-0 bottom-0 border-l border-slate-900/15" style={{ left: `${snappedPageMargin}px` }} />
          <div className="absolute top-0 bottom-0 border-r border-slate-900/15" style={{ right: `${snappedPageMargin}px` }} />
        </div>
      </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
        <div className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-200">
          Content start: <strong>{headerSpacing}px</strong>
        </div>
        <div className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-200">
          Footer: <strong>{footerSpacing}px</strong>
        </div>
        <div className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-200">
          Margins: <strong>{pageMargin}px</strong>
        </div>
      </div>
    </div>
  );
}

export default function ManageFirmsPage() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFirm, setPreviewFirm] = useState<Firm | null>(null);
  const [editingFirm, setEditingFirm] = useState<Firm | null>(null);
  const [styleSourceId, setStyleSourceId] = useState('');
  const [showLetterheadBackground, setShowLetterheadBackground] = useState(true);
  const [showBoundaryGuide, setShowBoundaryGuide] = useState(true);
  const [showPrintBleedGuide, setShowPrintBleedGuide] = useState(false);
  const [previewBackground, setPreviewBackground] = useState<'white' | 'print'>('white');
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewPageWidth, setPreviewPageWidth] = useState(0);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [aiSectionOpen, setAiSectionOpen] = useState(false);
  const [billSectionOpen, setBillSectionOpen] = useState(false);
  const [generatingHindiName, setGeneratingHindiName] = useState(false);
  const [formData, setFormData] = useState<FirmFormState>({ ...EMPTY_FORM });
  const initialFormDataRef = useRef<FirmFormData>({ ...EMPTY_FORM });

  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);

  const debouncedFormData = useDebouncedValue(formData, 80);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loadedFirms, loadedTemplates] = await Promise.all([
        dataService.firms.list(),
        dataService.customTemplates.list(),
      ]);
      if (cancelled) return;
      setFirms(loadedFirms);
      setCustomTemplates(loadedTemplates);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isEditMode = Boolean(editingFirm);

  const styleSourceFirm = useMemo(
    () => firms.find((firm) => firm.id === styleSourceId) || null,
    [firms, styleSourceId]
  );

  const openNewDialog = () => {
    const initial = { ...EMPTY_FORM };
    setEditingFirm(null);
    setStyleSourceId('');
    setFormData(initial);
    initialFormDataRef.current = initial;
    setShowLetterheadBackground(true);
    setShowBoundaryGuide(true);
    setShowPrintBleedGuide(false);
    setPreviewBackground('white');
    setPreviewZoom(1);
    setPreviewPageWidth(0);
    setMobilePreviewOpen(false);
    setAiSectionOpen(false);
    setBillSectionOpen(false);
    setDialogOpen(true);
  };

  const openEditDialog = (firm: Firm) => {
    const initial: FirmFormData = {
      name: firm.name,
      headerImagePath: firm.headerImagePath,
      signatureImagePath: firm.signatureImagePath || '',
      stampImagePath: firm.stampImagePath || '',
      defaultLanguage: firm.defaultLanguage,
      fitLetterheadMode: firm.fitLetterheadMode,
      headerSpacing: firm.headerSpacing ?? firm.contentStartY ?? 170,
      footerSpacing: firm.footerSpacing ?? 120,
      pageMargin: firm.pageMargin ?? firm.pagePaddingLeft ?? 40,
      layoutReferenceWidth: firm.layoutReferenceWidth || 0,
      signatureOffsetX: firm.signatureOffsetX ?? 16,
      signatureOffsetY: firm.signatureOffsetY ?? 16,
      signatureScale: firm.signatureScale ?? 1,
      signatureRotateDeg: firm.signatureRotateDeg ?? 0,
      stampOffsetX: firm.stampOffsetX ?? 140,
      stampOffsetY: firm.stampOffsetY ?? 16,
      stampScale: firm.stampScale ?? 1,
      stampMode: firm.stampMode ?? 'image',
      aiPromptQuotation: firm.aiPromptQuotation,
      aiPromptBill: firm.aiPromptBill || '',
      firmStyleProfile: firm.firmStyleProfile,
      firmCity: firm.firmCity || '',
      firmAddress: firm.firmAddress || '',
      gstNumber: firm.gstNumber || '',
      mobileNumber: firm.mobileNumber || '',
      contactPerson: firm.contactPerson || '',
      vendorHindiName: firm.vendorHindiName || '',
      bankName: firm.bankName || '',
      bankBranch: firm.bankBranch || '',
      ifscCode: firm.ifscCode || '',
      accountNumber: firm.accountNumber || '',
      panNumber: firm.panNumber || '',
      billInstructions: firm.billInstructions || '',
      customQuotationTemplateId: firm.customQuotationTemplateId || '',
    };
    setEditingFirm(firm);
    setStyleSourceId('');
    setFormData(initial);
    initialFormDataRef.current = initial;
    setShowLetterheadBackground(true);
    setShowBoundaryGuide(true);
    setShowPrintBleedGuide(false);
    setPreviewBackground('white');
    setPreviewZoom(1);
    setPreviewPageWidth(0);
    setMobilePreviewOpen(false);
    setAiSectionOpen(false);
    setBillSectionOpen(false);
    setDialogOpen(true);
  };

  const cleanupPreviews = (data: FirmFormState) => {
    if (data.headerImagePathPreview) {
      try { URL.revokeObjectURL(data.headerImagePathPreview); } catch (e) {}
    }
    if (data.signatureImagePathPreview) {
      try { URL.revokeObjectURL(data.signatureImagePathPreview); } catch (e) {}
    }
    if (data.stampImagePathPreview) {
      try { URL.revokeObjectURL(data.stampImagePathPreview); } catch (e) {}
    }
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormDataRef.current);
      if (isDirty && !confirm('You have unsaved changes. Close without saving?')) return;
      cleanupPreviews(formData);
    }
    setDialogOpen(nextOpen);
  };

  const handleUpload = async (field: 'headerImagePath' | 'signatureImagePath' | 'stampImagePath', file?: File) => {
    if (!file) return;
    
    // Create local object URL for instant preview
    const objectUrl = URL.createObjectURL(file);
    
    try {
      // Show upload progress and set preview URL
      setFormData((prev) => ({ 
        ...prev, 
        [`${field}Loading`]: true,
        [`${field}Preview`]: objectUrl
      }));
      
      // Get firm ID (use temp ID if creating new firm)
      const firmId = editingFirm?.id || `temp-${Date.now()}`;
      
      // Get firm name (use temp name if creating new firm)
      const firmName = editingFirm?.name || formData.name || 'temp-firm';
      
      // Map field to image type
      const imageType = field === 'headerImagePath' ? 'letterhead' : field === 'signatureImagePath' ? 'signature' : 'stamp';
      
      console.log(`Uploading ${imageType} image for firm ${firmName} (${firmId})...`);
      
      // Upload to Firebase Storage (pass firm name for folder)
      const result = await uploadFirmImage(file, firmId, firmName, imageType);
      
      console.log(`Upload successful! URL:`, result.url);
      
      // Update form with URL
      setFormData((previous) => ({ 
        ...previous, 
        [field]: result.url,
        [`${field}Loading`]: false
      }));
      
      // Store file info for cleanup if upload fails later
      setFormData((previous) => ({
        ...previous,
        [`${field}FileInfo`]: {
          url: result.url,
          fileName: result.fileName,
        },
      }));
      
      // Show success message
      setSuccess(`${imageType} image uploaded successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Upload failed.';
      setError(message);
      console.error('Upload error:', uploadError);
      // Clean up local preview URL on failure
      try { URL.revokeObjectURL(objectUrl); } catch (e) {}
      setFormData((prev) => ({ 
        ...prev, 
        [`${field}Loading`]: false,
        [`${field}Preview`]: undefined 
      }));
    }
  };

  const handleGenerateHindiName = async () => {
    const firmName = formData.name?.trim();
    if (!firmName) {
      setError('Please enter a Firm Name first');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setGeneratingHindiName(true);
    setError('');

    try {
      const response = await fetch('/api/ai/transliterate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: firmName,
          sourceLanguage: 'english',
          targetLanguage: 'hindi',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to generate Hindi name');
        return;
      }

      if (data.transliteratedText) {
        setFormData((prev) => ({ ...prev, vendorHindiName: data.transliteratedText }));
        setSuccess('Hindi name generated successfully!');
      } else {
        setError('Failed to generate Hindi name');
      }
    } catch (err) {
      console.error('Hindi name generation error:', err);
      setError('Failed to generate Hindi name');
    } finally {
      setGeneratingHindiName(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleApplyStyle = () => {
    if (!styleSourceFirm) return;
    setFormData((previous) => ({
      ...previous,
      fitLetterheadMode: styleSourceFirm.fitLetterheadMode,
      headerSpacing: styleSourceFirm.headerSpacing ?? styleSourceFirm.contentStartY ?? 170,
      footerSpacing: styleSourceFirm.footerSpacing ?? 120,
      pageMargin: styleSourceFirm.pageMargin ?? styleSourceFirm.pagePaddingLeft ?? 40,
      layoutReferenceWidth: styleSourceFirm.layoutReferenceWidth || previous.layoutReferenceWidth,
      signatureOffsetX: styleSourceFirm.signatureOffsetX ?? 16,
      signatureOffsetY: styleSourceFirm.signatureOffsetY ?? 16,
      signatureScale: styleSourceFirm.signatureScale ?? 1,
      signatureRotateDeg: styleSourceFirm.signatureRotateDeg ?? 0,
      stampOffsetX: styleSourceFirm.stampOffsetX ?? 140,
      stampOffsetY: styleSourceFirm.stampOffsetY ?? 16,
      stampScale: styleSourceFirm.stampScale ?? 1,
      stampMode: styleSourceFirm.stampMode ?? 'image',
      aiPromptQuotation: styleSourceFirm.aiPromptQuotation,
      aiPromptBill: styleSourceFirm.aiPromptBill || '',
      firmStyleProfile: styleSourceFirm.firmStyleProfile,
      firmCity: styleSourceFirm.firmCity || '',
      firmAddress: styleSourceFirm.firmAddress || '',
      gstNumber: styleSourceFirm.gstNumber || '',
      mobileNumber: styleSourceFirm.mobileNumber || '',
      contactPerson: styleSourceFirm.contactPerson || '',
      vendorHindiName: styleSourceFirm.vendorHindiName || '',
      bankName: styleSourceFirm.bankName || '',
      bankBranch: styleSourceFirm.bankBranch || '',
      ifscCode: styleSourceFirm.ifscCode || '',
      accountNumber: styleSourceFirm.accountNumber || '',
      panNumber: styleSourceFirm.panNumber || '',
      billInstructions: styleSourceFirm.billInstructions || '',
    }));
    setSuccess('Style profile copied from selected firm.');
    setTimeout(() => setSuccess(''), 1800);
  };

  const handleSave = async () => {
    const normalized: FirmFormData = {
      ...formData,
      headerSpacing: clampNumber(formData.headerSpacing, 80, 300),
      footerSpacing: clampNumber(formData.footerSpacing, 40, 220),
      pageMargin: clampNumber(formData.pageMargin, 20, 100),
      signatureOffsetX: clampNumber(formData.signatureOffsetX ?? 16, 0, 240),
      signatureOffsetY: clampNumber(formData.signatureOffsetY ?? 16, 0, 240),
      signatureScale: clampNumber(formData.signatureScale ?? 1, 0.4, 2.2),
      signatureRotateDeg: clampNumber(formData.signatureRotateDeg ?? 0, -45, 45),
      stampOffsetX: clampNumber(formData.stampOffsetX ?? 140, 0, 320),
      stampOffsetY: clampNumber(formData.stampOffsetY ?? 16, 0, 240),
      stampScale: clampNumber(formData.stampScale ?? 1, 0.4, 2.2),
      stampMode: (formData.stampMode ?? 'image') as 'image' | 'generic',
    };
    normalized.contentStartY = normalized.headerSpacing;
    normalized.pagePaddingLeft = normalized.pageMargin;
    normalized.layoutReferenceWidth = previewPageWidth || normalized.layoutReferenceWidth || 424;

    // Create a clean object for saving to Firestore by deleting UI-only state keys
    const cleanData = { ...normalized };
    delete (cleanData as any).headerImagePathLoading;
    delete (cleanData as any).signatureImagePathLoading;
    delete (cleanData as any).stampImagePathLoading;
    delete (cleanData as any).headerImagePathFileInfo;
    delete (cleanData as any).signatureImagePathFileInfo;
    delete (cleanData as any).stampImagePathFileInfo;
    delete (cleanData as any).headerImagePathPreview;
    delete (cleanData as any).signatureImagePathPreview;
    delete (cleanData as any).stampImagePathPreview;

    const validation = firmService.validateFirmComplete(cleanData);
    if (!validation.valid) {
      setError(validation.errors.join(' '));
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editingFirm) {
        const updated = await dataService.firms.update(editingFirm.id, cleanData);
        if (updated) {
          setFirms((previous) => previous.map((firm) => (firm.id === editingFirm.id ? updated : firm)));
        }
        setSuccess('Firm updated.');
      } else {
        const created = await dataService.firms.create(cleanData);
        setFirms((previous) => [...previous, created]);
        setSuccess('Firm created.');
      }
      cleanupPreviews(formData);
      setDialogOpen(false);
      setTimeout(() => setSuccess(''), 2200);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save firm.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this firm?')) return;
    try {
      await firmService.deleteFirm(id);
      setFirms((previous) => previous.filter((firm) => firm.id !== id));
      setSuccess('Firm deleted.');
      setTimeout(() => setSuccess(''), 2200);
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Failed to delete firm.';
      setError(message);
    }
  };

  const handleDuplicate = async (firm: Firm) => {
    try {
      const copy = await firmService.duplicateFirm(firm.id, `${firm.name} (Copy)`);
      setFirms((previous) => [...previous, copy]);
      setSuccess('Firm duplicated.');
      setTimeout(() => setSuccess(''), 2200);
    } catch (duplicateError) {
      const message = duplicateError instanceof Error ? duplicateError.message : 'Failed to duplicate firm.';
      setError(message);
    }
  };

  const openPreview = (firm: Firm) => {
    setPreviewFirm(firm);
    setPreviewOpen(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading firms...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Manage Firms</h1>
            <p className="mt-1 text-sm text-slate-600">Configure letterhead fit, AI prompt style, and document layout.</p>
          </div>
          <Link href="/settings">
            <Button variant="outline">Back to Settings</Button>
          </Link>
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

        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" onClick={openNewDialog}>
              + Add New Firm
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-screen-lg">
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Edit Firm' : 'Add New Firm'}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-6 py-2 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold">Firm Information</h3>
                  <div className="space-y-2">
                    <Label htmlFor="firm-name">Firm Name</Label>
                    <Input
                      id="firm-name"
                      value={formData.name}
                      onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                      placeholder="e.g., Magra Industrial Suppliers"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vendor-hindi-name">Vendor Hindi Name</Label>
                    <div className="flex gap-2">
                      <Input
                        id="vendor-hindi-name"
                        value={formData.vendorHindiName || ''}
                        onChange={(event) => setFormData({ ...formData, vendorHindiName: event.target.value })}
                        placeholder="e.g., माग्रा इंडस्ट्रियल सप्लायर्स"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateHindiName}
                        disabled={generatingHindiName || !formData.name?.trim()}
                        title="Generate Hindi transliteration using AI"
                      >
                        {generatingHindiName ? 'Generating...' : 'Generate'}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="language">Default Language</Label>
                      <select
                        id="language"
                        className="h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={formData.defaultLanguage}
                        onChange={(event) =>
                          setFormData({ ...formData, defaultLanguage: event.target.value as 'hindi' | 'english' })
                        }
                      >
                        <option value="english">English</option>
                        <option value="hindi">Hindi</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="style-profile">Style Profile</Label>
                      <select
                        id="style-profile"
                        className="h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={formData.firmStyleProfile}
                        onChange={(event) =>
                          setFormData({ ...formData, firmStyleProfile: event.target.value as FirmStyleProfile })
                        }
                      >
                        {STYLE_PROFILES.map((profile) => (
                          <option key={profile} value={profile}>
                            {profile}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom-template">Custom Quotation Template (Optional)</Label>
                    <select
                      id="custom-template"
                      className="h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
                      value={formData.customQuotationTemplateId || ''}
                      onChange={(event) =>
                        setFormData({ ...formData, customQuotationTemplateId: event.target.value })
                      }
                    >
                      <option value="">-- Use Standard System Template --</option>
                      {customTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} ({template.language === 'hindi' ? 'Hindi' : 'English'} - {template.docType === 'quotation_main' ? 'Main' : template.docType === 'quotation_alt_1' ? 'Alt A' : 'Alt B'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firm-city">City</Label>
                      <Input
                        id="firm-city"
                        value={formData.firmCity || ''}
                        onChange={(event) => setFormData({ ...formData, firmCity: event.target.value })}
                        placeholder="e.g., New Delhi"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="firm-address">Address</Label>
                      <Input
                        id="firm-address"
                        value={formData.firmAddress || ''}
                        onChange={(event) => setFormData({ ...formData, firmAddress: event.target.value })}
                        placeholder="e.g., 123 Main Street"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="gst-number">GST Number</Label>
                      <Input
                        id="gst-number"
                        value={formData.gstNumber || ''}
                        onChange={(event) => setFormData({ ...formData, gstNumber: event.target.value })}
                        placeholder="e.g., 22AAAAA0000A1Z5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobile-number">Mobile Number</Label>
                      <Input
                        id="mobile-number"
                        value={formData.mobileNumber || ''}
                        onChange={(event) => setFormData({ ...formData, mobileNumber: event.target.value })}
                        placeholder="e.g., 9876543210"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-person">Contact Person</Label>
                    <Input
                      id="contact-person"
                      value={formData.contactPerson || ''}
                      onChange={(event) => setFormData({ ...formData, contactPerson: event.target.value })}
                      placeholder="e.g., John Doe"
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold">Branding Assets</h3>
                  <div className="space-y-2">
                    <Label htmlFor="letterhead-upload">Letterhead (Required)</Label>
                    <Input
                      id="letterhead-upload"
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleUpload('headerImagePath', event.target.files?.[0])}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="signature-upload">Signature (Optional)</Label>
                      <Input
                        id="signature-upload"
                        type="file"
                        accept="image/png,image/*"
                        onChange={(event) => handleUpload('signatureImagePath', event.target.files?.[0])}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stamp-upload">Stamp (Optional)</Label>
                      <Input
                        id="stamp-upload"
                        type="file"
                        accept="image/png,image/*"
                        onChange={(event) => handleUpload('stampImagePath', event.target.files?.[0])}
                      />
                      <label className="mt-2 flex items-start gap-2 text-sm">
                        <input
                          className="mt-0.5"
                          type="checkbox"
                          checked={(formData.stampMode ?? 'image') === 'generic'}
                          onChange={(event) =>
                            setFormData({
                              ...formData,
                              stampMode: event.target.checked ? 'generic' : 'image',
                            })
                          }
                        />
                        <span>
                          <span className="font-medium">Use generic stamp</span>{' '}
                          <span className="text-slate-600">
                            (FOR{' '}
                            {formData.name?.trim()
                              ? formData.name.trim().replace(/\s+/g, ' ').toUpperCase()
                              : 'FIRM NAME'}{' '}
                            / PROPRIETOR)
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>

                  {(Boolean(formData.signatureImagePath) ||
                    (formData.stampMode ?? 'image') === 'generic' ||
                    Boolean(formData.stampImagePath)) && (
                    <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      Placement X/Y are measured from the <strong>bottom-right</strong> corner of the page.
                    </p>
                  )}

                  {formData.signatureImagePath && (
                    <div className="space-y-2">
                      <Label>Signature Placement</Label>
                      <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="signature-x" className="text-xs text-slate-600">X (px)</Label>
                            <span className="text-xs font-medium text-slate-700">{Math.round(formData.signatureOffsetX ?? 16)}px</span>
                          </div>
                          <input
                            id="signature-x"
                            type="range"
                            min={0}
                            max={240}
                            step={1}
                            className="w-full accent-slate-900"
                            value={formData.signatureOffsetX ?? 16}
                            onChange={(event) => setFormData({ ...formData, signatureOffsetX: Number(event.target.value) || 0 })}
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="signature-y" className="text-xs text-slate-600">Y (px)</Label>
                            <span className="text-xs font-medium text-slate-700">{Math.round(formData.signatureOffsetY ?? 16)}px</span>
                          </div>
                          <input
                            id="signature-y"
                            type="range"
                            min={0}
                            max={240}
                            step={1}
                            className="w-full accent-slate-900"
                            value={formData.signatureOffsetY ?? 16}
                            onChange={(event) => setFormData({ ...formData, signatureOffsetY: Number(event.target.value) || 0 })}
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="signature-size" className="text-xs text-slate-600">Size</Label>
                            <span className="text-xs font-medium text-slate-700">{Math.round((formData.signatureScale ?? 1) * 100)}%</span>
                          </div>
                          <input
                            id="signature-size"
                            type="range"
                            min={40}
                            max={220}
                            step={5}
                            className="w-full accent-slate-900"
                            value={Math.round((formData.signatureScale ?? 1) * 100)}
                            onChange={(event) => setFormData({ ...formData, signatureScale: (Number(event.target.value) || 100) / 100 })}
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="signature-rotate" className="text-xs text-slate-600">Rotate</Label>
                            <span className="text-xs font-medium text-slate-700">{Math.round(formData.signatureRotateDeg ?? 0)}deg</span>
                          </div>
                          <input
                            id="signature-rotate"
                            type="range"
                            min={-45}
                            max={45}
                            step={1}
                            className="w-full accent-slate-900"
                            value={Math.round(formData.signatureRotateDeg ?? 0)}
                            onChange={(event) => setFormData({ ...formData, signatureRotateDeg: Number(event.target.value) || 0 })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {((formData.stampMode ?? 'image') === 'generic' || Boolean(formData.stampImagePath)) && (
                    <div className="space-y-2">
                      <Label>Stamp Placement</Label>
                      <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="stamp-x" className="text-xs text-slate-600">X (px)</Label>
                            <span className="text-xs font-medium text-slate-700">{Math.round(formData.stampOffsetX ?? 140)}px</span>
                          </div>
                          <input
                            id="stamp-x"
                            type="range"
                            min={0}
                            max={320}
                            step={1}
                            className="w-full accent-slate-900"
                            value={formData.stampOffsetX ?? 140}
                            onChange={(event) => setFormData({ ...formData, stampOffsetX: Number(event.target.value) || 0 })}
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="stamp-y" className="text-xs text-slate-600">Y (px)</Label>
                            <span className="text-xs font-medium text-slate-700">{Math.round(formData.stampOffsetY ?? 16)}px</span>
                          </div>
                          <input
                            id="stamp-y"
                            type="range"
                            min={0}
                            max={240}
                            step={1}
                            className="w-full accent-slate-900"
                            value={formData.stampOffsetY ?? 16}
                            onChange={(event) => setFormData({ ...formData, stampOffsetY: Number(event.target.value) || 0 })}
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="stamp-size" className="text-xs text-slate-600">Size</Label>
                            <span className="text-xs font-medium text-slate-700">{Math.round((formData.stampScale ?? 1) * 100)}%</span>
                          </div>
                          <input
                            id="stamp-size"
                            type="range"
                            min={40}
                            max={220}
                            step={5}
                            className="w-full accent-slate-900"
                            value={Math.round((formData.stampScale ?? 1) * 100)}
                            onChange={(event) => setFormData({ ...formData, stampScale: (Number(event.target.value) || 100) / 100 })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold">Layout Controls</h3>
                  <div className="space-y-2">
                    <Label htmlFor="fit-mode">Letterhead Fit Mode</Label>
                    <select
                      id="fit-mode"
                      className="h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={formData.fitLetterheadMode}
                      onChange={(event) =>
                        setFormData({ ...formData, fitLetterheadMode: event.target.value as LetterheadFitMode })
                      }
                    >
                      {FIT_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="header-spacing">Content Start Position</Label>
                      <span className="text-xs font-medium text-slate-700">{Math.round(formData.headerSpacing)}px</span>
                    </div>
                    <input
                      id="header-spacing"
                      type="range"
                      min={80}
                      max={300}
                      step={1}
                      className="w-full accent-slate-900"
                      value={formData.headerSpacing}
                      onChange={(event) => setFormData({ ...formData, headerSpacing: Number(event.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="footer-spacing">Footer Spacing</Label>
                      <span className="text-xs font-medium text-slate-700">{Math.round(formData.footerSpacing)}px</span>
                    </div>
                    <input
                      id="footer-spacing"
                      type="range"
                      min={40}
                      max={220}
                      step={1}
                      className="w-full accent-slate-900"
                      value={formData.footerSpacing}
                      onChange={(event) => setFormData({ ...formData, footerSpacing: Number(event.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="page-margins">Page Margins</Label>
                      <span className="text-xs font-medium text-slate-700">{Math.round(formData.pageMargin)}px</span>
                    </div>
                    <input
                      id="page-margins"
                      type="range"
                      min={20}
                      max={100}
                      step={1}
                      className="w-full accent-slate-900"
                      value={formData.pageMargin}
                      onChange={(event) => setFormData({ ...formData, pageMargin: Number(event.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-semibold">AI Instructions</h3>
                      <p className="text-xs text-slate-600">
                        These instructions guide AI-generated document formatting and wording for this firm.
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setAiSectionOpen((v) => !v)}>
                      {aiSectionOpen ? 'Hide' : 'Edit'}
                    </Button>
                  </div>

                  {aiSectionOpen && (
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 p-2">
                        <div className="flex items-center gap-2">
                          <select
                            className="h-9 rounded border border-slate-300 bg-white px-2 text-xs"
                            value={styleSourceId}
                            onChange={(event) => setStyleSourceId(event.target.value)}
                          >
                            <option value="">Copy from another firm…</option>
                            {firms.map((firm) => (
                              <option key={firm.id} value={firm.id}>
                                {firm.name}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleApplyStyle}
                            disabled={!styleSourceFirm}
                          >
                            Copy
                          </Button>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setFormData((previous) => ({
                              ...previous,
                              aiPromptQuotation: EMPTY_FORM.aiPromptQuotation,
                              aiPromptBill: EMPTY_FORM.aiPromptBill || '',
                            }))
                          }
                        >
                          Reset to Default
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="prompt-quotation">Quotation Generation Instructions</Label>
                        <textarea
                          id="prompt-quotation"
                          className="min-h-[84px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          value={formData.aiPromptQuotation}
                          onChange={(event) => setFormData({ ...formData, aiPromptQuotation: event.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="prompt-bill">Bill Generation Instructions (Optional)</Label>
                        <textarea
                          id="prompt-bill"
                          className="min-h-[84px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          value={formData.aiPromptBill}
                          onChange={(event) => setFormData({ ...formData, aiPromptBill: event.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-semibold">Bill Details</h3>
                      <p className="text-xs text-slate-600">
                        Bank account information for firm bill generation.
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setBillSectionOpen((v) => !v)}>
                      {billSectionOpen ? 'Hide' : 'Edit'}
                    </Button>
                  </div>

                  {billSectionOpen && (
                    <div className="mt-3 space-y-3">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="bank-name">Bank Name</Label>
                          <Input
                            id="bank-name"
                            value={formData.bankName || ''}
                            onChange={(event) => setFormData({ ...formData, bankName: event.target.value })}
                            placeholder="e.g., State Bank of India"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bank-branch">Branch</Label>
                          <Input
                            id="bank-branch"
                            value={formData.bankBranch || ''}
                            onChange={(event) => setFormData({ ...formData, bankBranch: event.target.value })}
                            placeholder="e.g., Connaught Place"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="ifsc-code">IFSC Code</Label>
                          <Input
                            id="ifsc-code"
                            value={formData.ifscCode || ''}
                            onChange={(event) => setFormData({ ...formData, ifscCode: event.target.value })}
                            placeholder="e.g., SBIN0001234"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="account-number">Account Number</Label>
                          <Input
                            id="account-number"
                            value={formData.accountNumber || ''}
                            onChange={(event) => setFormData({ ...formData, accountNumber: event.target.value })}
                            placeholder="e.g., 1234567890"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pan-number">PAN Number</Label>
                        <Input
                          id="pan-number"
                          value={formData.panNumber || ''}
                          onChange={(event) => setFormData({ ...formData, panNumber: event.target.value })}
                          placeholder="e.g., ABCDE1234F"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bill-instructions">Bill Instructions (Optional)</Label>
                        <textarea
                          id="bill-instructions"
                          className="min-h-[84px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          value={formData.billInstructions || ''}
                          onChange={(event) => setFormData({ ...formData, billInstructions: event.target.value })}
                          placeholder="Additional instructions for bill generation..."
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 rounded-md border border-slate-200 p-3 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showLetterheadBackground}
                      onChange={(event) => setShowLetterheadBackground(event.target.checked)}
                    />
                    Show Letterhead Background
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showBoundaryGuide}
                      onChange={(event) => setShowBoundaryGuide(event.target.checked)}
                    />
                    Page Boundary Outline
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showPrintBleedGuide}
                      onChange={(event) => setShowPrintBleedGuide(event.target.checked)}
                    />
                    Preview Print Bleed
                  </label>
                </div>
              </div>

              <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewZoom((z) => clampNumber(Math.round((z - 0.1) * 10) / 10, 0.7, 1.3))}
                    >
                      Zoom Out
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewZoom((z) => clampNumber(Math.round((z + 0.1) * 10) / 10, 0.7, 1.3))}
                    >
                      Zoom In
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setPreviewZoom(1)}>
                      Fit Width
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setPreviewBackground((v) => (v === 'white' ? 'print' : 'white'))}
                    >
                      Background: {previewBackground === 'white' ? 'White' : 'Print'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="lg:hidden"
                      onClick={() => setMobilePreviewOpen((v) => !v)}
                    >
                      {mobilePreviewOpen ? 'Hide Preview' : 'Show Preview'}
                    </Button>
                  </div>
                </div>

                <div className={mobilePreviewOpen ? 'block' : 'hidden lg:block'}>
                  <PreviewFrame
                    formData={debouncedFormData}
                    showLetterheadBackground={showLetterheadBackground}
                    showBoundaryGuide={showBoundaryGuide}
                    showPrintBleedGuide={showPrintBleedGuide}
                    previewBackground={previewBackground}
                    zoom={previewZoom}
                    onPageWidthChange={setPreviewPageWidth}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} loading={saving} disabled={saving}>
                {isEditMode ? 'Update Firm' : 'Save Firm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {firms.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-slate-500">
              No firms found. Create your first letterhead profile.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {firms.map((firm) => (
              <Card key={firm.id} className="overflow-hidden">
                <div
                  className="h-24 bg-slate-200 bg-top bg-no-repeat"
                  style={
                    firm.headerImagePath
                      ? { backgroundImage: `url("${firm.headerImagePath}")`, ...getFitStyle(firm.fitLetterheadMode) }
                      : undefined
                  }
                />
                <CardHeader>
                  <CardTitle className="text-lg">{firm.name}</CardTitle>
                  <CardDescription>
                    {firm.defaultLanguage} • {firm.firmStyleProfile}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-left">
                  <p>Header spacing: {firm.headerSpacing}px</p>
                  <p>Footer spacing: {firm.footerSpacing}px</p>
                  <p>Page margins: {firm.pageMargin}px</p>
                  <p>fitMode: {firm.fitLetterheadMode}</p>
                  {(() => {
                    const template = customTemplates.find((t) => t.id === firm.customQuotationTemplateId);
                    return (
                      <p className="text-xs text-slate-500 font-medium pt-1 border-t border-slate-100 mt-2">
                        Template: <span className="text-blue-600 font-semibold">{template ? template.name : 'Standard Fallback'}</span>
                      </p>
                    );
                  })()}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => openPreview(firm)}>
                      Preview
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => openEditDialog(firm)}>
                      Edit
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleDuplicate(firm)}>
                      Duplicate Firm
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(firm.id)}>
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{previewFirm?.name || 'Firm'} Preview</DialogTitle>
          </DialogHeader>
          {previewFirm ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewZoom((z) => clampNumber(Math.round((z - 0.1) * 10) / 10, 0.7, 1.3))}
                  >
                    Zoom Out
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewZoom((z) => clampNumber(Math.round((z + 0.1) * 10) / 10, 0.7, 1.3))}
                  >
                    Zoom In
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setPreviewZoom(1)}>
                    Fit Width
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreviewBackground((v) => (v === 'white' ? 'print' : 'white'))}
                  >
                    Background: {previewBackground === 'white' ? 'White' : 'Print'}
                  </Button>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showLetterheadBackground}
                      onChange={(event) => setShowLetterheadBackground(event.target.checked)}
                    />
                    Letterhead
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showBoundaryGuide}
                      onChange={(event) => setShowBoundaryGuide(event.target.checked)}
                    />
                    Boundary
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showPrintBleedGuide}
                      onChange={(event) => setShowPrintBleedGuide(event.target.checked)}
                    />
                    Bleed
                  </label>
                </div>
              </div>

              <PreviewFrame
                formData={{
                  ...EMPTY_FORM,
                  name: previewFirm.name,
                  headerImagePath: previewFirm.headerImagePath,
                  signatureImagePath: previewFirm.signatureImagePath || '',
                  stampImagePath: previewFirm.stampImagePath || '',
                  defaultLanguage: previewFirm.defaultLanguage,
                  fitLetterheadMode: previewFirm.fitLetterheadMode,
                  headerSpacing: previewFirm.headerSpacing ?? previewFirm.contentStartY ?? EMPTY_FORM.headerSpacing,
                  footerSpacing: previewFirm.footerSpacing ?? EMPTY_FORM.footerSpacing,
                  pageMargin: previewFirm.pageMargin ?? previewFirm.pagePaddingLeft ?? EMPTY_FORM.pageMargin,
                  layoutReferenceWidth: previewFirm.layoutReferenceWidth || EMPTY_FORM.layoutReferenceWidth,
                  signatureOffsetX: previewFirm.signatureOffsetX ?? EMPTY_FORM.signatureOffsetX,
                  signatureOffsetY: previewFirm.signatureOffsetY ?? EMPTY_FORM.signatureOffsetY,
                  signatureScale: previewFirm.signatureScale ?? EMPTY_FORM.signatureScale,
                  signatureRotateDeg: previewFirm.signatureRotateDeg ?? EMPTY_FORM.signatureRotateDeg,
                  stampOffsetX: previewFirm.stampOffsetX ?? EMPTY_FORM.stampOffsetX,
                  stampOffsetY: previewFirm.stampOffsetY ?? EMPTY_FORM.stampOffsetY,
                  stampScale: previewFirm.stampScale ?? EMPTY_FORM.stampScale,
                  stampMode: previewFirm.stampMode ?? EMPTY_FORM.stampMode,
                  aiPromptQuotation: previewFirm.aiPromptQuotation,
                  aiPromptBill: previewFirm.aiPromptBill || '',
                  firmStyleProfile: previewFirm.firmStyleProfile,
                }}
                showLetterheadBackground={showLetterheadBackground}
                showBoundaryGuide={showBoundaryGuide}
                showPrintBleedGuide={showPrintBleedGuide}
                previewBackground={previewBackground}
                zoom={previewZoom}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
