'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  Download,
  Copy,
  Check,
  Building2,
  Layers,
  FileCheck2,
  FileText,
  DollarSign,
  ExternalLink,
  RefreshCw,
  Award,
  MapPin,
  CheckCircle2,
  Search,
  Share2,
  Lightbulb,
} from 'lucide-react';
import { GeMAIAnalysis, GeMTender, GeMStarredTender } from '@/types/gem';
import { db } from '@/services/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateAndDownloadTenderPdf } from '@/services/gemAnalysisPdfService';

function getEstimatedValueInfo(analysis?: GeMAIAnalysis | null) {
  if (!analysis) return { text: 'Undisclosed', isCalculated: false, rawNumber: 0 };

  if (
    analysis.estimatedBidValue?.isEstimatedProvided &&
    analysis.estimatedBidValue.amount &&
    analysis.estimatedBidValue.amount > 0
  ) {
    return {
      text: `₹ ${analysis.estimatedBidValue.amount.toLocaleString('en-IN')}`,
      isCalculated: false,
      rawNumber: analysis.estimatedBidValue.amount,
      note: 'Official Estimated Value',
    };
  }

  const emdVal = analysis.emdAmount?.amount || 0;
  if (emdVal > 0) {
    const calculatedValue = emdVal * 100;
    return {
      text: `₹ ${calculatedValue.toLocaleString('en-IN')}`,
      isCalculated: true,
      rawNumber: calculatedValue,
      note: 'Calculated from 1% EMD',
    };
  }

  return {
    text: analysis.estimatedBidValue?.rawText || 'Undisclosed by Buyer',
    isCalculated: false,
    rawNumber: 0,
  };
}

function getPlaceBadgeInfo(
  analysis?: GeMAIAnalysis | null,
  tender?: GeMTender | GeMStarredTender | null
): string | null {
  if (analysis?.placeDisplay) return analysis.placeDisplay;
  if (analysis?.townName && analysis?.districtName) {
    return `${analysis.townName} (${analysis.districtName})`;
  }
  if (analysis?.townName) return analysis.townName;
  if (analysis?.districtName) return analysis.districtName;

  if (tender && 'placeDisplay' in tender && tender.placeDisplay) {
    return tender.placeDisplay;
  }
  if (tender && 'townName' in tender && tender.townName && 'districtName' in tender && tender.districtName) {
    return `${tender.townName} (${tender.districtName})`;
  }

  const combined = `${analysis?.officeName || ''} ${analysis?.buyerAddress || ''} ${tender?.departmentName || ''} ${tender?.ministryName || ''}`.toLowerCase();
  if (combined.includes('porsa')) return 'Porsa (Morena)';
  if (combined.includes('morena')) return 'Morena';

  return null;
}

function TenderAnalysisContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawId = searchParams?.get('id') || searchParams?.get('bidNumber') || searchParams?.get('bid') || '';
  const queryPdfUrl = searchParams?.get('pdfUrl') || '';

  // Extract clean bid number or ID (supports raw bidNumber, analysis_GEM_..., gem_...)
  const targetId = decodeURIComponent(rawId).trim();
  const cleanBidNumber = targetId
    .replace(/^analysis_/, '')
    .replace(/^gem_/, '')
    .replace(/_/g, (m, _offset, str) => {
      // If it looks like GEM_2026_B_..., turn back into GEM/2026/B/...
      if (str.startsWith('GEM_') || str.startsWith('gem_')) return '/';
      return m;
    });

  const [tender, setTender] = useState<GeMTender | GeMStarredTender | null>(null);
  const [analysis, setAnalysis] = useState<GeMAIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'atc' | 'items' | 'emd' | 'eligibility' | 'docs' | 'extras'>('overview');
  const [copied, setCopied] = useState(false);
  const [atcSearch, setAtcSearch] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Load tender and analysis data from session storage, database, or API
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      let loadedTender: GeMTender | GeMStarredTender | null = null;
      let loadedAnalysis: GeMAIAnalysis | null = null;

      // 1. Try session storage (zero-latency instant load)
      if (typeof window !== 'undefined') {
        try {
          const raw = sessionStorage.getItem('current_gem_tender_for_analysis');
          if (raw) {
            const parsed = JSON.parse(raw);
            const pBid = parsed.tender?.bidNumber?.toUpperCase() || '';
            const pId = String(parsed.tender?.id || '');
            const tUpper = targetId.toUpperCase();
            const cUpper = cleanBidNumber.toUpperCase();

            if (pBid === tUpper || pBid === cUpper || pId === targetId || tUpper.includes(pBid) || (pBid && tUpper.includes(pBid.replace(/\//g, '_')))) {
              loadedTender = parsed.tender;
              loadedAnalysis = parsed.analysis || parsed.tender?.aiAnalysis || null;
            }
          }
        } catch {
          // ignore session parse error
        }
      }

      // 2. Try Global AI Analyses Repository (Firestore / DB)
      if (!loadedAnalysis && targetId) {
        try {
          const fromDb =
            (await db.getGeMAIAnalysis(targetId)) ||
            (cleanBidNumber !== targetId ? await db.getGeMAIAnalysis(cleanBidNumber) : undefined);
          if (fromDb) {
            loadedAnalysis = fromDb;
          }
        } catch {
          // ignore db fetch error
        }
      }

      // 3. Try Starred Tenders in Firestore / DB
      if (!loadedTender && targetId) {
        try {
          const starred =
            (await db.getStarredGeMTender(targetId)) ||
            (cleanBidNumber !== targetId ? await db.getStarredGeMTender(cleanBidNumber) : undefined);
          if (starred) {
            loadedTender = starred;
            if (!loadedAnalysis && starred.aiAnalysis) {
              loadedAnalysis = starred.aiAnalysis;
            }
          }
        } catch {
          // ignore starred error
        }
      }

      // 4. Construct tender object from analysis or clean ID
      const finalBidNumber = loadedTender?.bidNumber || cleanBidNumber || targetId;
      const numIdMatch = targetId.match(/\d+/g);
      const parsedNum = numIdMatch ? Number(numIdMatch[numIdMatch.length - 1]) : 1;
      const derivedNumericId = typeof loadedTender?.id === 'number' ? loadedTender.id : parsedNum;

      if (!loadedTender && finalBidNumber) {
        loadedTender = {
          id: derivedNumericId,
          bidNumber: finalBidNumber,
          categoryName: loadedAnalysis?.itemTitle || 'GeM Procurement Requirement',
          items: (loadedAnalysis?.items || []).map((it) => it.name),
          totalQuantity: loadedAnalysis?.totalQuantity || 1,
          startDate: '',
          endDate: '',
          bidType: 1,
          isRA: false,
          isBunch: false,
          isHighValue: false,
          isCustomItem: false,
          isSinglePacket: false,
          isGlobalTendering: false,
          pdfUrl:
            queryPdfUrl ||
            (loadedAnalysis?.linkedDocuments && loadedAnalysis.linkedDocuments[0]?.url) ||
            `https://bidplus.gem.gov.in/showbidDocument/${derivedNumericId}`,
          corrigendumUrl: '',
        };
      }

      setTender(loadedTender);

      // If analysis is already available, finish loading
      if (loadedAnalysis) {
        setAnalysis(loadedAnalysis);
        setLoading(false);
        return;
      }

      // 5. If no analysis, trigger fresh AI analysis via server API
      const targetPdfUrl = queryPdfUrl || loadedTender?.pdfUrl;
      if (!targetPdfUrl) {
        setError('No PDF URL or cached analysis found for this ID.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/gem/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdfUrl: targetPdfUrl,
            bidNumber: loadedTender?.bidNumber || cleanBidNumber || targetId,
            tender: loadedTender,
          }),
        });

        const data = await res.json();
        if (data.success && data.analysis) {
          setAnalysis(data.analysis);
          await db.saveGeMAIAnalysis(
            loadedTender?.bidNumber || cleanBidNumber || targetId,
            loadedTender?.id,
            data.analysis
          ).catch(() => {});
        } else {
          setError(data.error || 'Failed to complete AI analysis on tender PDF.');
        }
      } catch (err: any) {
        setError(err?.message || 'Network error during AI analysis.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [rawId, queryPdfUrl, cleanBidNumber, targetId]);

  // Re-run AI Analysis
  const handleReanalyze = async () => {
    if (!tender) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/gem/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfUrl: tender.pdfUrl,
          bidNumber: tender.bidNumber,
          tender,
        }),
      });

      const data = await res.json();
      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
        await db.saveGeMAIAnalysis(tender.bidNumber, tender.id, data.analysis).catch(() => {});
        await db.starGeMTender(tender as GeMTender, data.analysis).catch(() => {});
      } else {
        setError(data.error || 'Failed to re-run AI analysis.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error running re-analysis.');
    } finally {
      setLoading(false);
    }
  };

  // Copy Full Analysis Text
  const copyAnalysisAsText = () => {
    if (!analysis || !tender) return;
    const estValInfo = getEstimatedValueInfo(analysis);
    const text = `
GeM Tender Analysis: ${tender.bidNumber}
Category: ${analysis.itemTitle || tender.categoryName}
Ministry/State: ${analysis.ministryName || 'N/A'}
Department: ${analysis.departmentName || 'N/A'}
Organisation: ${analysis.organisationName || 'N/A'}
Office: ${analysis.officeName || 'N/A'}
Location: ${analysis.placeDisplay || analysis.townName || 'N/A'}
Total Quantity: ${analysis.totalQuantity || tender.totalQuantity}
EMD Amount: ${analysis.emdAmount?.required && analysis.emdAmount.amount > 0 ? `₹${analysis.emdAmount.amount.toLocaleString('en-IN')}` : 'Not Required / Nil'}
Estimated Value: ${estValInfo.text} ${estValInfo.isCalculated ? '(Calculated from 1% EMD)' : ''}

Hindi Summary (हिंदी सारांश):
${analysis.summaryHindi || 'N/A'}

English Summary:
${analysis.summaryEnglish || 'N/A'}

Buyer Added Bid Specific Terms & Conditions (ATC):
${(analysis.buyerAddedTerms || []).map((t, idx) => `${idx + 1}. ${t}`).join('\n')}

Items & Technical Parameters:
${(analysis.items || []).map((it) => `- ${it.name} | Qty: ${it.quantity} ${it.unit || ''} | Specs: ${typeof it.specifications === 'string' ? it.specifications : JSON.stringify(it.specifications)}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Import into Tender Panel
  const handleImportToPanel = () => {
    if (!analysis || !tender) return;

    const items = analysis.items && analysis.items.length > 0
      ? analysis.items.map((it) => ({
          productName: it.name,
          quantity: it.quantity || 1,
          rate: 0,
          gstPercent: 18,
          description: typeof it.specifications === 'string' ? it.specifications : undefined,
        }))
      : (tender.items || []).map((itemName) => ({
          productName: itemName,
          quantity: tender.totalQuantity || 1,
          rate: 0,
          gstPercent: 18,
        }));

    const atcSummary = analysis.buyerAddedTerms && analysis.buyerAddedTerms.length > 0
      ? `\n\nBuyer Added ATC Terms:\n${analysis.buyerAddedTerms.slice(0, 8).map((t, i) => `${i + 1}. ${t}`).join('\n')}`
      : '';

    const importPayload = {
      title: analysis.itemTitle || tender.categoryName || `Tender ${tender.bidNumber}`,
      tenderNumber: tender.bidNumber,
      submissionDate: tender.endDate ? tender.endDate.split('T')[0] : '',
      departmentName:
        analysis.departmentName ||
        analysis.ministryName ||
        tender.departmentName ||
        tender.ministryName ||
        '',
      items,
      notes: `Imported from GeM Bid: ${tender.bidNumber}\nMinistry: ${
        analysis.ministryName || tender.ministryName || 'N/A'
      }\nDepartment: ${
        analysis.departmentName || tender.departmentName || 'N/A'
      }\nOffice: ${analysis.officeName || 'N/A'}\nLocation: ${
        analysis.placeDisplay || analysis.townName || 'N/A'
      }\nEMD: ${
        analysis.emdAmount?.required ? `₹${analysis.emdAmount.amount}` : 'Nil'
      }\nPDF URL: ${tender.pdfUrl}${atcSummary}`,
    };

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('gem_import_tender', JSON.stringify(importPayload));
      router.push('/tenders/new');
    }
  };

  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);

  // Generate & Download Minimal Professional PDF
  const handleDownloadAnalysisPdf = async () => {
    if (!analysis || !tender) return;
    setGeneratingPdf(true);
    try {
      const blob = await generateAndDownloadTenderPdf(tender, analysis);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GeM_${(tender.bidNumber || 'Tender').replace(/[^a-zA-Z0-9]/g, '_')}_Analysis.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('PDF download error:', err);
      alert('Failed to generate PDF document: ' + (err?.message || 'Unknown error'));
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Share to WhatsApp (Files Web Share or Direct Link Fallback)
  const handleShareWhatsApp = async () => {
    if (!analysis || !tender) return;
    setSharingWhatsApp(true);

    const estVal = getEstimatedValueInfo(analysis).text;
    const emdVal =
      analysis.emdAmount?.required && analysis.emdAmount.amount > 0
        ? `₹ ${analysis.emdAmount.amount.toLocaleString('en-IN')}`
        : 'Nil';

    const attachedDocsText =
      analysis.linkedDocuments && analysis.linkedDocuments.length > 0
        ? `\n\n📎 *Attached Specification Sheets:*\n${analysis.linkedDocuments.map((d, i) => `${i + 1}. ${d.title}: ${d.url}`).join('\n')}`
        : '';

    const shareText = `*📑 GeM Tender Analysis Report*
---------------------------------------
🆔 *Bid No:* ${tender.bidNumber}
📋 *Title:* ${analysis.itemTitle || tender.categoryName}
🏛️ *Ministry:* ${analysis.ministryName || 'N/A'}
🏢 *Office:* ${analysis.officeName || 'N/A'} ${analysis.placeDisplay ? `(📍 ${analysis.placeDisplay})` : ''}
📦 *Quantity:* ${(analysis.totalQuantity || tender.totalQuantity || 1).toLocaleString('en-IN')} Units
💰 *Est. Value:* ${estVal}
💵 *EMD Amount:* ${emdVal}
⏰ *Bid End Date:* ${tender.endDate ? new Date(tender.endDate).toLocaleDateString('en-IN') : 'N/A'}

📝 *Executive Summary:*
${analysis.summaryEnglish || analysis.summaryHindi || 'N/A'}

📥 *Official GeM PDF:* ${tender.pdfUrl}${attachedDocsText}
---------------------------------------
_Generated via Magra Automation Panel_`;

    try {
      // 1. Try Native Web Share with actual PDF file
      if (typeof navigator !== 'undefined' && navigator.share) {
        const blob = await generateAndDownloadTenderPdf(tender, analysis);
        const file = new File(
          [blob],
          `GeM_${(tender.bidNumber || 'Tender').replace(/[^a-zA-Z0-9]/g, '_')}_Analysis.pdf`,
          { type: 'application/pdf' }
        );

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `GeM Bid Analysis - ${tender.bidNumber}`,
            text: shareText,
            files: [file],
          });
          setSharingWhatsApp(false);
          return;
        }
      }
    } catch (err) {
      console.log('Web share with file dismissed or unsupported, falling back to WhatsApp link:', err);
    }

    // 2. Fallback direct WhatsApp URL
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
    setSharingWhatsApp(false);
  };

  const filteredATC = (analysis?.buyerAddedTerms || []).filter((term) =>
    term.toLowerCase().includes(atcSearch.toLowerCase())
  );

  const placeBadge = getPlaceBadgeInfo(analysis, tender);
  const estValInfo = getEstimatedValueInfo(analysis);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 sm:pb-20">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/tenders/open"
              className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors bg-slate-100 hover:bg-slate-200 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 shrink-0"
            >
              <ArrowLeft className="w-4 h-4 mr-1 sm:mr-1.5" />
              <span><span className="hidden xs:inline">Back to</span> Tenders</span>
            </Link>
            <div className="hidden sm:flex items-center gap-2 text-xs truncate">
              <span className="text-slate-300">/</span>
              <span className="text-blue-700 font-mono font-bold truncate">{tender?.bidNumber || cleanBidNumber || targetId}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {analysis && (
              <>
                {/* Download Minimal PDF Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAnalysisPdf}
                  disabled={generatingPdf}
                  className="bg-white hover:bg-slate-100 text-slate-800 border-slate-300 text-xs h-8 w-8 sm:w-auto p-0 sm:px-3 shadow-xs font-semibold flex items-center justify-center"
                  title="Download Professional Minimal PDF Analysis"
                >
                  <Download className={`w-3.5 h-3.5 sm:mr-1.5 text-blue-600 shrink-0 ${generatingPdf ? 'animate-bounce' : ''}`} />
                  <span className="hidden sm:inline">{generatingPdf ? 'Generating...' : 'Download PDF'}</span>
                </Button>

                {/* Share to WhatsApp Button */}
                <Button
                  size="sm"
                  onClick={handleShareWhatsApp}
                  disabled={sharingWhatsApp}
                  className="bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs h-8 w-8 sm:w-auto p-0 sm:px-3 shadow-xs font-semibold flex items-center justify-center"
                  title="Share Analysis Report to WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5 sm:mr-1.5 shrink-0" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyAnalysisAsText}
                  className="bg-white hover:bg-slate-100 text-slate-700 border-slate-300 text-xs h-8 px-2.5 shadow-xs hidden md:inline-flex"
                  title="Copy Full Analysis Summary"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Copy
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReanalyze}
                  disabled={loading}
                  className="bg-white hover:bg-slate-100 text-slate-700 border-slate-300 text-xs h-8 w-8 sm:w-auto p-0 sm:px-2.5 shadow-xs flex items-center justify-center"
                  title="Re-run AI Analysis"
                >
                  <RefreshCw className={`w-3.5 h-3.5 sm:mr-1 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Re-analyze</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleImportToPanel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-3 sm:px-3.5 shadow-xs hidden sm:inline-flex"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Import to Panel
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Page Container */}
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 mt-4 sm:mt-6">
        
        {/* Tender Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-lg mb-4 sm:mb-6 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="font-mono text-[11px] sm:text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full truncate max-w-[240px] sm:max-w-none">
                  {tender?.bidNumber || cleanBidNumber || targetId}
                </span>

                <span className="text-[11px] sm:text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full flex items-center gap-1.5 shrink-0">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden xs:inline">AI Full Document Intelligence</span>
                  <span className="xs:hidden">AI Intelligence</span>
                </span>

                {placeBadge && (
                  <span className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/10 border border-white/20 text-white font-bold text-[11px] sm:text-xs shrink-0">
                    <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-300 shrink-0" />
                    <span>{placeBadge}</span>
                  </span>
                )}

                {analysis?.modelUsed && (
                  <span className="text-[10px] sm:text-[11px] text-slate-300 font-mono hidden md:inline-block">
                    ({analysis.modelUsed})
                  </span>
                )}
              </div>

              <h1 className="text-fluid-xl font-extrabold text-white leading-snug">
                {analysis?.itemTitle || tender?.categoryName || 'GeM Tender Details'}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-200 pt-1">
                {analysis?.ministryName && (
                  <span>
                    <strong className="text-slate-400 font-medium">Ministry:</strong> {analysis.ministryName}
                  </span>
                )}
                {analysis?.departmentName && (
                  <span>
                    <strong className="text-slate-400 font-medium">Dept:</strong> {analysis.departmentName}
                  </span>
                )}
                {analysis?.officeName && (
                  <span>
                    <strong className="text-slate-400 font-medium">Office:</strong> {analysis.officeName}
                  </span>
                )}
              </div>
            </div>

            {tender?.pdfUrl && (
              <div className="flex items-center gap-2 pt-2 lg:pt-0 shrink-0">
                <a
                  href={tender.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs font-semibold px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors shadow-xs"
                  title="Download Original GeM Official PDF Document"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-blue-300 shrink-0" />
                  <span>GeM PDF</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Loading Banner */}
        {loading && (
          <div className="bg-white border border-blue-200 rounded-2xl p-8 sm:p-12 text-center shadow-sm my-6 sm:my-8">
            <RefreshCw className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 animate-spin mx-auto mb-3" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900">AI Deep Document Intelligence in Progress...</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto leading-relaxed">
              Downloading official GeM PDF, discovering buyer-uploaded technical specification sheets, parsing buyer ATC clauses, quantities, consignees, and government hierarchy.
            </p>
          </div>
        )}

        {/* Error Banner */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-6 text-red-800 text-sm mb-6 flex items-start gap-3">
            <div className="flex-1">
              <h4 className="font-bold text-red-900">Analysis Could Not Complete</h4>
              <p className="text-xs text-red-700 mt-1">{error}</p>
              <Button onClick={handleReanalyze} className="mt-3 bg-red-600 hover:bg-red-700 text-white text-xs h-8">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Retry Analysis
              </Button>
            </div>
          </div>
        )}

        {/* Quick Stats Strip */}
        {analysis && !loading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-xl shadow-xs">
              <span className="text-slate-500 font-medium text-[11px] sm:text-xs block">EMD Amount (ईएमडी)</span>
              <span className="text-sm sm:text-base font-extrabold text-emerald-600 block mt-0.5 sm:mt-1">
                {analysis.emdAmount?.required && analysis.emdAmount.amount > 0
                  ? `₹ ${analysis.emdAmount.amount.toLocaleString('en-IN')}`
                  : '₹ 0 / Nil'}
              </span>
              {analysis.emdAmount?.exemptionAllowed && (
                <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">MSE/Startup Exemption Allowed</span>
              )}
            </div>

            <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-xl shadow-xs">
              <span className="text-slate-500 font-medium text-[11px] sm:text-xs block">Estimated Bid Value</span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900 block mt-0.5 sm:mt-1">
                {estValInfo.text}
              </span>
              {estValInfo.isCalculated && (
                <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">Calculated from 1% EMD</span>
              )}
            </div>

            <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-xl shadow-xs">
              <span className="text-slate-500 font-medium text-[11px] sm:text-xs block">Total Quantity</span>
              <span className="text-sm sm:text-base font-extrabold text-indigo-700 block mt-0.5 sm:mt-1">
                {(analysis.totalQuantity || tender?.totalQuantity || 1).toLocaleString('en-IN')} Units
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-xl shadow-xs">
              <span className="text-slate-500 font-medium text-[11px] sm:text-xs block">ePBG / Security</span>
              <span className="text-sm sm:text-base font-extrabold text-amber-700 block mt-0.5 sm:mt-1">
                {analysis.emdAmount?.pbgPercentage
                  ? `${analysis.emdAmount.pbgPercentage}% of Bid Value`
                  : 'As per GeM rules'}
              </span>
            </div>
          </div>
        )}

        {/* Intelligence Tabs & Body */}
        {analysis && !loading && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6">
            {/* Tabs Header (Scrollable ribbon on mobile) */}
            <div className="border-b border-slate-200 bg-slate-50/80 px-3 sm:px-6 flex items-center overflow-x-auto no-scrollbar flex-nowrap gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`py-2.5 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Overview & Summaries</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('atc')}
                className={`py-2.5 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'atc'
                    ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Buyer ATC ({analysis.buyerAddedTerms?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('items')}
                className={`py-2.5 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'items'
                    ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Items & Specs ({analysis.items?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('emd')}
                className={`py-2.5 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'emd'
                    ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>EMD & Values</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('eligibility')}
                className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === 'eligibility'
                    ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Award className="w-4 h-4" />
                Eligibility & Checklist
              </button>

              {analysis.linkedDocuments && analysis.linkedDocuments.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('docs')}
                  className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === 'docs'
                      ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                  Attached Specification Sheets ({analysis.linkedDocuments.length})
                </button>
              )}

              {analysis.extraObservations && analysis.extraObservations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('extras')}
                  className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === 'extras'
                      ? 'border-purple-600 text-purple-600 bg-white shadow-xs'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Lightbulb className="w-4 h-4 text-purple-600" />
                  Extras & Insights ({analysis.extraObservations.length})
                </button>
              )}
            </div>

            {/* Tab Contents */}
            <div className="p-6 space-y-6 text-slate-800">
              
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Executive Summaries */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {analysis.summaryHindi && (
                      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 shadow-xs">
                        <div className="flex items-center gap-2 mb-3 text-amber-800 font-bold text-xs uppercase tracking-wider">
                          <span className="px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 font-bold text-[10px]">
                            HINDI
                          </span>
                          <span>हिंदी सारांश (Hindi Summary)</span>
                        </div>
                        <p className="text-sm text-slate-800 leading-relaxed font-sans">
                          {analysis.summaryHindi}
                        </p>
                      </div>
                    )}

                    {analysis.summaryEnglish && (
                      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 shadow-xs">
                        <div className="flex items-center gap-2 mb-3 text-blue-800 font-bold text-xs uppercase tracking-wider">
                          <span className="px-2 py-0.5 rounded bg-blue-200/80 text-blue-900 font-bold text-[10px]">
                            ENGLISH
                          </span>
                          <span>Executive Summary (English)</span>
                        </div>
                        <p className="text-sm text-slate-800 leading-relaxed font-sans">
                          {analysis.summaryEnglish}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Government Hierarchy Breakdown */}
                  <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200">
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      Government Organization Hierarchy
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-slate-500 font-medium block">मंत्रालय/राज्य का नाम / Ministry / State:</span>
                        <span className="text-sm font-bold text-slate-900 block mt-1">
                          {analysis.ministryName || 'N/A'}
                        </span>
                      </div>
                      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-slate-500 font-medium block">विभाग का नाम / Department:</span>
                        <span className="text-sm font-bold text-slate-900 block mt-1">
                          {analysis.departmentName || 'N/A'}
                        </span>
                      </div>
                      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-slate-500 font-medium block">संगठन का नाम / Organisation:</span>
                        <span className="text-sm font-bold text-slate-900 block mt-1">
                          {analysis.organisationName || 'N/A'}
                        </span>
                      </div>
                      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-slate-500 font-medium block">कार्यालय का नाम / Office:</span>
                        <span className="text-sm font-bold text-slate-900 block mt-1">
                          {analysis.officeName || 'N/A'}
                        </span>
                      </div>
                      {analysis.placeDisplay && (
                        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs sm:col-span-2">
                          <span className="text-slate-500 font-medium block">Town & District Location:</span>
                          <span className="text-sm font-bold text-blue-700 block mt-1">
                            📍 {analysis.placeDisplay}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: BUYER ADDED ATC */}
              {activeTab === 'atc' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="Search ATC clauses (e.g. GST, EMD, Warranty, Turnover)..."
                        value={atcSearch}
                        onChange={(e) => setAtcSearch(e.target.value)}
                        className="pl-9 bg-white border-slate-300 text-xs h-9 text-slate-900 placeholder:text-slate-400 shadow-xs"
                      />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      Showing {filteredATC.length} of {analysis.buyerAddedTerms?.length || 0} clauses
                    </span>
                  </div>

                  <div className="space-y-3">
                    {filteredATC.map((clause, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200 hover:border-slate-300 p-4 rounded-xl transition-all relative group shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans flex-1">
                            {clause}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(clause);
                              setCopiedIndex(idx);
                              setTimeout(() => setCopiedIndex(null), 2000);
                            }}
                            className="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors"
                            title="Copy Clause"
                          >
                            {copiedIndex === idx ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: ITEMS & SPECIFICATIONS */}
              {activeTab === 'items' && (
                <div className="space-y-4">
                  {analysis.items.map((item, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                          {item.category && <span className="text-xs text-slate-500">{item.category}</span>}
                        </div>
                        <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-lg text-xs">
                          Quantity: {item.quantity} {item.unit || 'Units'}
                        </span>
                      </div>

                      {item.specifications && (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <span className="text-xs font-bold text-slate-600 block mb-2">
                            Technical Parameters & Buyer Uploaded Specification:
                          </span>
                          <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed font-sans">
                            {typeof item.specifications === 'string'
                              ? item.specifications
                              : JSON.stringify(item.specifications, null, 2)}
                          </p>
                        </div>
                      )}

                      {item.consignees && item.consignees.length > 0 && (
                        <div>
                          <span className="text-xs font-bold text-slate-600 block mb-2">
                            Consignees & Delivery Destinations:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            {item.consignees.map((c, cIdx) => (
                              <div key={cIdx} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <span className="font-bold text-slate-900 block">{c.name || 'Consignee Officer'}</span>
                                <span className="text-slate-600 block mt-0.5">{c.address || c.city || 'Address on file'}</span>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 text-[11px]">
                                  <span className="text-slate-500">Qty: {c.quantity}</span>
                                  {c.deliveryDays && <span className="text-blue-600 font-medium">{c.deliveryDays} Delivery Days</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 4: EMD & FINANCIALS */}
              {activeTab === 'emd' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Earnest Money Deposit (ईएमडी विवरण)
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">EMD Required:</span>
                        <span className="font-bold text-slate-900">
                          {analysis.emdAmount?.required ? 'YES (अनिवार्य)' : 'NO / Nil'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Exact EMD Amount:</span>
                        <span className="font-extrabold text-emerald-600 text-sm">
                          {analysis.emdAmount?.required && analysis.emdAmount.amount > 0
                            ? `₹ ${analysis.emdAmount.amount.toLocaleString('en-IN')}`
                            : 'Nil'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">EMD Exemption Allowed:</span>
                        <span className="font-semibold text-slate-900">
                          {analysis.emdAmount?.exemptionAllowed ? 'Yes (MSE / Startups)' : 'No Exemption Allowed'}
                        </span>
                      </div>
                      {analysis.emdAmount?.exemptionCriteria && (
                        <div className="py-1.5 text-slate-700">
                          <span className="text-slate-500 block font-medium">Exemption Conditions:</span>
                          <p className="mt-1 text-slate-800 leading-relaxed">{analysis.emdAmount.exemptionCriteria}</p>
                        </div>
                      )}
                      {analysis.emdAmount?.advisory && (
                        <div className="py-1.5 text-slate-700">
                          <span className="text-slate-500 block font-medium">EMD Advisory / Favour of:</span>
                          <p className="mt-1 text-slate-800">{analysis.emdAmount.advisory}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Performance Security (ePBG) & Budget
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">ePBG / Security (%):</span>
                        <span className="font-bold text-slate-900">
                          {analysis.emdAmount?.pbgPercentage ? `${analysis.emdAmount.pbgPercentage}%` : 'As per Rules'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Estimated Bid Value:</span>
                        <span className="font-bold text-slate-900">
                          {estValInfo.text}
                        </span>
                      </div>
                      {estValInfo.isCalculated && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-xs leading-relaxed">
                          💡 Estimated bid value is calculated at 100× EMD amount (based on standard 1% GeM EMD rule).
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: ELIGIBILITY & CHECKLIST */}
              {activeTab === 'eligibility' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                      <span className="text-slate-500 font-medium block">Average Annual Turnover:</span>
                      <span className="text-sm font-bold text-slate-900 block mt-1">
                        {analysis.eligibilityCriteria?.turnover || 'As per tender terms'}
                      </span>
                    </div>
                    <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                      <span className="text-slate-500 font-medium block">Past Experience Required:</span>
                      <span className="text-sm font-bold text-slate-900 block mt-1">
                        {analysis.eligibilityCriteria?.experienceYears
                          ? `${analysis.eligibilityCriteria.experienceYears} Years`
                          : 'Not explicitly specified'}
                      </span>
                    </div>
                    <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                      <span className="text-slate-500 font-medium block">OEM Authorization Required:</span>
                      <span className="text-sm font-bold text-slate-900 block mt-1">
                        {analysis.eligibilityCriteria?.oemAuthorizationRequired ? 'YES (अनिवार्य)' : 'NO'}
                      </span>
                    </div>
                  </div>

                  {analysis.eligibilityCriteria?.certificatesRequired &&
                    analysis.eligibilityCriteria.certificatesRequired.length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                          Mandatory Documents Checklist:
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {analysis.eligibilityCriteria.certificatesRequired.map((cert, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              <span className="text-slate-800">{cert}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* TAB 6: ATTACHMENTS */}
              {activeTab === 'docs' && analysis.linkedDocuments && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500">
                    The following buyer-uploaded ATC, BOQ sheets, and technical specification files were extracted directly from the GeM tender PDF:
                  </p>
                  <div className="space-y-3">
                    {analysis.linkedDocuments
                      .filter((doc) => doc.url && doc.url.startsWith('http'))
                      .map((doc, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-slate-200 hover:border-blue-400 p-5 rounded-xl transition-all shadow-xs space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 mt-0.5 shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 flex-1 space-y-1.5">
                                <span className="text-sm sm:text-base font-bold text-slate-900 block leading-snug">
                                  {doc.title}
                                </span>
                                {doc.description && (
                                  <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                                    <strong className="text-blue-900 font-semibold">Document Overview: </strong>
                                    {doc.description}
                                  </p>
                                )}
                                <span className="text-xs text-slate-400 font-mono block truncate">
                                  {doc.url}
                                </span>
                              </div>
                            </div>

                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors flex-shrink-0 shadow-xs"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>Open Document</span>
                            </a>
                          </div>
                        </div>
                      ))}

                    {analysis.linkedDocuments.filter((doc) => doc.url && doc.url.startsWith('http')).length === 0 && (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                        No external secondary specification files attached in this bid.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 7: EXTRAS & SPECIAL OBSERVATIONS */}
              {activeTab === 'extras' && analysis.extraObservations && analysis.extraObservations.length > 0 && (
                <div className="space-y-4">
                  <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-4 sm:p-5 text-xs sm:text-sm">
                    <h4 className="font-bold text-purple-950 flex items-center gap-2 text-sm sm:text-base">
                      <Lightbulb className="w-5 h-5 text-purple-600" />
                      Special Observations & Extra AI Insights
                    </h4>
                    <p className="text-purple-800 mt-1 leading-relaxed">
                      Critical parameters, special penalties, lab testing criteria, delivery instructions, or nuances extracted from the tender and buyer specification documents:
                    </p>
                  </div>
                  <div className="space-y-3">
                    {analysis.extraObservations.map((obs, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 text-xs sm:text-sm text-slate-800 leading-relaxed flex items-start gap-3.5 shadow-xs"
                      >
                        <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1 whitespace-pre-line leading-relaxed">{obs}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Sticky Bottom Action Bar (Thumb-zone access) */}
      {analysis && !loading && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-2.5 sm:hidden z-40 flex items-center justify-between gap-2 shadow-lg pb-safe">
          <Button
            size="sm"
            onClick={handleShareWhatsApp}
            disabled={sharingWhatsApp}
            className="flex-1 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs h-9 font-semibold flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share WhatsApp</span>
          </Button>

          <Button
            size="sm"
            onClick={handleImportToPanel}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-semibold flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Import to Panel</span>
          </Button>
        </div>
      )}
    </div>
  );
}

export default function TenderAnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading AI Document Intelligence...</p>
          </div>
        </div>
      }
    >
      <TenderAnalysisContent />
    </Suspense>
  );
}
