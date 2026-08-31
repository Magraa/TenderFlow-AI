'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Download,
  Copy,
  Check,
  Building2,
  Calendar,
  Layers,
  FileCheck2,
  FileText,
  DollarSign,
  ExternalLink,
  RefreshCw,
  Award,
  Share2,
  Lightbulb,
} from 'lucide-react';
import { GeMAIAnalysis, GeMTender, GeMStarredTender } from '@/types/gem';
import { Button } from '@/components/ui/button';
import { generateAndDownloadTenderPdf } from '@/services/gemAnalysisPdfService';
import { useScrollLock } from '@/components/ui/useScrollLock';

interface TenderAIAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  tender: GeMTender | GeMStarredTender;
  analysis: GeMAIAnalysis | null;
  loading: boolean;
  onReanalyze?: () => void;
  onImportToTender?: (tender: GeMTender | GeMStarredTender, analysis?: GeMAIAnalysis) => void;
}

export function TenderAIAnalysisModal({
  isOpen,
  onClose,
  tender,
  analysis,
  loading,
  onReanalyze,
  onImportToTender,
}: TenderAIAnalysisModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'atc' | 'items' | 'emd' | 'eligibility' | 'docs' | 'extras'>('overview');
  const [copied, setCopied] = useState(false);
  const [atcSearch, setAtcSearch] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [modalSummaryLang, setModalSummaryLang] = useState<'hindi' | 'english'>('hindi');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);

  // Lock background scroll when open on PC and Phone
  useScrollLock(isOpen);

  // Smooth exit animation
  const handleSmoothClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isClosing) {
        handleSmoothClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isClosing]);

  // Download Analysis PDF
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

  // Share to WhatsApp
  const handleShareWhatsApp = async () => {
    if (!analysis || !tender) return;
    setSharingWhatsApp(true);

    const estVal =
      analysis.estimatedBidValue?.isEstimatedProvided && analysis.estimatedBidValue.amount
        ? `₹ ${analysis.estimatedBidValue.amount.toLocaleString('en-IN')}`
        : analysis.emdAmount?.amount && analysis.emdAmount.amount > 0
        ? `₹ ${(analysis.emdAmount.amount * 100).toLocaleString('en-IN')} (Est. from 1% EMD)`
        : analysis.estimatedBidValue?.rawText || 'Undisclosed';

    const emdVal =
      analysis.emdAmount?.required && analysis.emdAmount.amount > 0
        ? `₹ ${analysis.emdAmount.amount.toLocaleString('en-IN')}`
        : 'Nil';

    const attachedDocsText =
      analysis.linkedDocuments && analysis.linkedDocuments.length > 0
        ? `\n\n📎 *Attached Specification Sheets:*\n${analysis.linkedDocuments
            .filter((d) => d.url && d.url.startsWith('http'))
            .map((d, i) => `${i + 1}. ${d.title}: ${d.url}${d.description ? `\n   ↳ ${d.description}` : ''}`)
            .join('\n')}`
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
      console.log('Native share dismissed or not supported, falling back to WhatsApp Web URL:', err);
    }

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
    setSharingWhatsApp(false);
  };

  if (!isOpen) return null;

  const copyAnalysisAsText = () => {
    if (!analysis) return;
    const text = `
GeM Tender Analysis: ${tender.bidNumber}
Category: ${analysis.itemTitle || tender.categoryName}
Ministry/State: ${analysis.ministryName || 'N/A'}
Department: ${analysis.departmentName || 'N/A'}
Organisation: ${analysis.organisationName || 'N/A'}
Office: ${analysis.officeName || 'N/A'}
Total Quantity: ${analysis.totalQuantity || tender.totalQuantity}
EMD Amount: ${analysis.emdAmount?.required ? `₹${analysis.emdAmount.amount?.toLocaleString('en-IN')}` : 'Not Required / Nil'}
Estimated Value: ${analysis.estimatedBidValue?.isEstimatedProvided ? `₹${analysis.estimatedBidValue.amount?.toLocaleString('en-IN')}` : 'Undisclosed'}

Buyer Added Bid Specific Terms & Conditions (ATC):
${(analysis.buyerAddedTerms || []).map((t, idx) => `${idx + 1}. ${t}`).join('\n')}

Items:
${analysis.items.map((it) => `- ${it.name} | Qty: ${it.quantity} ${it.unit || ''} | Specs: ${typeof it.specifications === 'string' ? it.specifications : JSON.stringify(it.specifications)}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredATC = (analysis?.buyerAddedTerms || []).filter((term) =>
    term.toLowerCase().includes(atcSearch.toLowerCase())
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-sm transition-opacity duration-200 ${
        isClosing ? 'opacity-0' : 'opacity-100 animate-fadeIn'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleSmoothClose();
      }}
    >
      <div
        className={`bg-white rounded-t-2xl sm:rounded-2xl max-w-5xl w-full max-h-[94vh] sm:max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-slate-900 ${
          isClosing
            ? 'animate-slide-down-mobile sm:animate-modal-out'
            : 'animate-slide-up-mobile sm:animate-modal-in'
        }`}
      >
        
        {/* Mobile Drag Indicator Bar */}
        <div className="w-12 h-1.5 bg-slate-400/40 rounded-full mx-auto mt-2 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between gap-2 sm:gap-3">
          
          {/* Tender Identity (Left Column) */}
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <span className="text-[10px] sm:text-xs font-mono font-bold bg-blue-500/25 text-blue-200 border border-blue-400/30 px-1.5 sm:px-2.5 py-0.5 rounded-md sm:rounded-full truncate max-w-[130px] sm:max-w-[220px]">
                {tender.bidNumber}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-full flex items-center gap-1 shrink-0">
                <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="hidden xs:inline">AI Analysis</span>
                <span className="xs:hidden">AI</span>
              </span>
              {analysis?.modelUsed && (
                <span className="text-[10px] text-slate-400 font-mono hidden md:inline-block">
                  ({analysis.modelUsed})
                </span>
              )}
            </div>
            <h2
              className="text-xs sm:text-sm md:text-base font-extrabold text-white leading-tight line-clamp-1 sm:line-clamp-2"
              title={analysis?.itemTitle || tender.categoryName || 'GeM Tender Details'}
            >
              {analysis?.itemTitle || tender.categoryName || 'GeM Tender Details'}
            </h2>
          </div>

          {/* Dialog Action Buttons (Right Column) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* 1. Download Analysis PDF */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadAnalysisPdf}
              disabled={!analysis || loading || generatingPdf}
              className="h-8 w-8 sm:w-auto p-0 sm:px-2.5 bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs shadow-xs font-semibold flex items-center justify-center"
              title="Download AI Analysis PDF Document"
            >
              <Download className={`w-3.5 h-3.5 sm:mr-1.5 text-blue-300 shrink-0 ${generatingPdf ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{generatingPdf ? 'Generating...' : 'Analysis PDF'}</span>
            </Button>

            {/* 2. Share to WhatsApp */}
            <Button
              size="sm"
              onClick={handleShareWhatsApp}
              disabled={!analysis || loading || sharingWhatsApp}
              className="h-8 w-8 sm:w-auto p-0 sm:px-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-semibold shadow-xs flex items-center justify-center"
              title="Share AI Analysis Summary to WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5 sm:mr-1.5 shrink-0" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>

            {/* 3. Original GeM PDF */}
            {tender.pdfUrl && (
              <a
                href={tender.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 w-8 sm:w-auto p-0 sm:px-2.5 inline-flex items-center justify-center bg-blue-600/90 hover:bg-blue-600 text-white border border-blue-400/40 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                title="Download Original GeM Official PDF"
              >
                <Download className="w-3.5 h-3.5 sm:mr-1.5 text-blue-200 shrink-0" />
                <span className="hidden sm:inline">GeM PDF</span>
              </a>
            )}

            {/* 4. Copy Text (Hidden on mobile) */}
            <Button
              variant="outline"
              size="sm"
              onClick={copyAnalysisAsText}
              disabled={!analysis || loading}
              className="h-8 w-8 p-0 bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs hidden md:inline-flex items-center justify-center"
              title="Copy Full Analysis Text"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>

            {/* 5. Re-analyze (Hidden on small mobile) */}
            {onReanalyze && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReanalyze}
                disabled={loading}
                className="h-8 w-8 p-0 bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs hidden lg:inline-flex items-center justify-center"
                title="Re-run AI Analysis"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}

            {/* 6. Open Dedicated Full Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  try {
                    sessionStorage.setItem(
                      'current_gem_tender_for_analysis',
                      JSON.stringify({ tender, analysis })
                    );
                  } catch {}
                  const targetUrl = `/tenders/open/analysis?id=${encodeURIComponent(tender.bidNumber || String(tender.id))}`;
                  window.open(targetUrl, '_blank');
                }
              }}
              className="h-8 w-8 sm:w-auto p-0 sm:px-2 bg-indigo-600/90 hover:bg-indigo-600 text-white border-indigo-400/40 text-xs shadow-xs hidden xs:inline-flex items-center justify-center"
              title="Open Full Analysis in Dedicated Page"
            >
              <ExternalLink className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Full Page</span>
            </Button>

            {/* 7. Close Dialog Button */}
            <button
              type="button"
              onClick={handleSmoothClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Close Dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading Banner */}
        {loading && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 sm:px-6 py-6 sm:py-8 text-center animate-pulse">
            <RefreshCw className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600 animate-spin mx-auto mb-2" />
            <h4 className="text-xs sm:text-sm font-bold text-blue-900">AI Deep Analysis in Progress...</h4>
            <p className="text-[11px] sm:text-xs text-blue-700 mt-1 max-w-md mx-auto">
              Downloading GeM PDF specification document, reading Buyer Added ATC clauses, extracting quantities, Hindi/English government details, and EMD information.
            </p>
          </div>
        )}

        {/* Quick Stats Strip */}
        {analysis && !loading && (() => {
          const emdVal = analysis.emdAmount?.amount || 0;
          const officialEstVal = analysis.estimatedBidValue?.isEstimatedProvided && analysis.estimatedBidValue.amount
            ? analysis.estimatedBidValue.amount
            : null;
          const calculatedEstVal = !officialEstVal && emdVal > 0 ? emdVal * 100 : null;

          return (
            <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-slate-500 font-medium block">EMD Amount (ईएमडी राशि)</span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">
                  {analysis.emdAmount?.required && emdVal > 0
                    ? `₹ ${emdVal.toLocaleString('en-IN')}`
                    : '₹ 0 / Not Required'}
                </span>
                {analysis.emdAmount?.exemptionAllowed && (
                  <span className="text-[10px] text-emerald-600 font-medium">MSE/Startup Exemption Available</span>
                )}
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-slate-500 font-medium block">Estimated Bid Value</span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">
                  {officialEstVal
                    ? `₹ ${officialEstVal.toLocaleString('en-IN')}`
                    : calculatedEstVal
                    ? `₹ ${calculatedEstVal.toLocaleString('en-IN')}`
                    : analysis.estimatedBidValue?.rawText || 'Undisclosed by Buyer'}
                </span>
                {calculatedEstVal && !officialEstVal && (
                  <span className="text-[10px] text-blue-600 font-medium block">Calculated from 1% EMD</span>
                )}
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-slate-500 font-medium block">Total Quantity</span>
                <span className="text-sm font-bold text-indigo-700 block mt-0.5">
                  {(analysis.totalQuantity || tender.totalQuantity || 1).toLocaleString('en-IN')} Units
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-slate-500 font-medium block">ePBG / Security</span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">
                  {analysis.emdAmount?.pbgPercentage
                    ? `${analysis.emdAmount.pbgPercentage}% of Bid Value`
                    : 'As per GeM rules'}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Tabs Bar */}
        <div className="border-b border-slate-200 bg-white px-3 sm:px-6 flex items-center overflow-x-auto no-scrollbar flex-nowrap gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 sm:py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Overview & Summary</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('atc')}
            className={`py-2.5 sm:py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'atc'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Buyer ATC ({analysis?.buyerAddedTerms?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('items')}
            className={`py-2.5 sm:py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'items'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Items & BOQ ({analysis?.items?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('emd')}
            className={`py-2.5 sm:py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'emd'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>EMD & Values</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('eligibility')}
            className={`py-2.5 sm:py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'eligibility'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Eligibility</span>
          </button>

          {analysis?.linkedDocuments && analysis.linkedDocuments.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('docs')}
              className={`py-2.5 sm:py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'docs'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Attached Docs ({analysis.linkedDocuments.length})</span>
            </button>
          )}

          {analysis?.extraObservations && analysis.extraObservations.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('extras')}
              className={`py-2.5 sm:py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'extras'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
              <span>Extras & Insights ({analysis.extraObservations.length})</span>
            </button>
          )}
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh] space-y-6">
          {!analysis && !loading && (
            <div className="py-12 text-center text-slate-500">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-sm">No AI analysis data available yet.</p>
              <p className="text-xs text-slate-400 mt-1">Click &quot;Re-analyze&quot; to run deep multimodal AI parsing on this tender.</p>
              {onReanalyze && (
                <Button onClick={onReanalyze} className="mt-4 bg-blue-600 text-white text-xs">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Run AI Analysis Now
                </Button>
              )}
            </div>
          )}

          {analysis && !loading && (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Executive Summaries */}
                  {/* Phone Screen: Language Switcher (Shows one summary at a time) */}
                  <div className="md:hidden">
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-amber-200/60">
                        <span className="text-xs font-bold text-amber-950">Executive Summary:</span>
                        <div className="inline-flex rounded-lg bg-amber-100/90 p-0.5 border border-amber-300/80">
                          {analysis.summaryHindi && (
                            <button
                              type="button"
                              onClick={() => setModalSummaryLang('hindi')}
                              className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all ${
                                modalSummaryLang === 'hindi'
                                  ? 'bg-white text-amber-950 shadow-xs'
                                  : 'text-amber-800 hover:text-amber-950'
                              }`}
                            >
                              हिंदी
                            </button>
                          )}
                          {analysis.summaryEnglish && (
                            <button
                              type="button"
                              onClick={() => setModalSummaryLang('english')}
                              className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all ${
                                modalSummaryLang === 'english'
                                  ? 'bg-white text-amber-950 shadow-xs'
                                  : 'text-amber-800 hover:text-amber-950'
                              }`}
                            >
                              English
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-800 leading-relaxed pt-0.5">
                        {modalSummaryLang === 'hindi'
                          ? analysis.summaryHindi || analysis.summaryEnglish
                          : analysis.summaryEnglish || analysis.summaryHindi}
                      </p>
                    </div>
                  </div>

                  {/* Desktop / Tablet: Side-by-side Dual Summaries */}
                  <div className="hidden md:grid md:grid-cols-2 gap-4">
                    {analysis.summaryHindi && (
                      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                          <span className="px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 font-bold text-[10px]">HINDI</span>
                          <span>हिंदी सारांश (Hindi Summary)</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                          {analysis.summaryHindi}
                        </p>
                      </div>
                    )}

                    {analysis.summaryEnglish && (
                      <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
                          <span className="px-2 py-0.5 rounded bg-blue-200/80 text-blue-900 font-bold text-[10px]">ENGLISH</span>
                          <span>Executive Summary (English)</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                          {analysis.summaryEnglish}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Government Hierarchy Breakdown */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      Government Organization Hierarchy
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <span className="text-slate-500 font-medium block">मं ालय/रा!य का नाम / Ministry / State:</span>
                        <span className="text-sm font-bold text-slate-900 block mt-0.5">
                          {analysis.ministryName || tender.ministryName || 'N/A'}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <span className="text-slate-500 font-medium block">विभाग का नाम / Department:</span>
                        <span className="text-sm font-bold text-slate-900 block mt-0.5">
                          {analysis.departmentName || tender.departmentName || 'N/A'}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <span className="text-slate-500 font-medium block">संगठन का नाम / Organisation:</span>
                        <span className="text-sm font-bold text-slate-900 block mt-0.5">
                          {analysis.organisationName || 'N/A'}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <span className="text-slate-500 font-medium block">कार्यालय का नाम / Office Name:</span>
                        <span className="text-sm font-bold text-slate-900 block mt-0.5">
                          {analysis.officeName || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Key Dates */}
                  {analysis.importantDates && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        Key Schedule & Timelines
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        {analysis.importantDates.publishDate && (
                          <div className="bg-white p-3 rounded-lg border border-slate-200">
                            <span className="text-slate-500 font-medium block">Publish Date:</span>
                            <span className="text-xs font-bold text-slate-800 block mt-0.5">
                              {analysis.importantDates.publishDate}
                            </span>
                          </div>
                        )}
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <span className="text-slate-500 font-medium block">Bid End Date:</span>
                          <span className="text-xs font-bold text-red-600 block mt-0.5">
                            {analysis.importantDates.bidEndDate || tender.endDate}
                          </span>
                        </div>
                        {analysis.importantDates.bidOpeningDate && (
                          <div className="bg-white p-3 rounded-lg border border-slate-200">
                            <span className="text-slate-500 font-medium block">Bid Opening Date:</span>
                            <span className="text-xs font-bold text-indigo-700 block mt-0.5">
                              {analysis.importantDates.bidOpeningDate}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: BUYER ADDED ATC */}
              {activeTab === 'atc' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        Buyer Added Bid Specific Additional Terms and Conditions (ATC)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Extracted directly from buyer-added ATC clauses in GeM PDF document.
                      </p>
                    </div>
                    <input
                      type="text"
                      placeholder="Filter ATC clauses (e.g. EMD, Sample)..."
                      value={atcSearch}
                      onChange={(e) => setAtcSearch(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-64"
                    />
                  </div>

                  {filteredATC.length === 0 ? (
                    <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                      No specific ATC clauses found matching your filter.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredATC.map((clause, idx) => (
                        <div
                          key={idx}
                          className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 p-4 transition-all shadow-sm flex items-start gap-3"
                        >
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="flex-1 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                            {clause}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(clause);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors"
                            title="Copy Clause"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ITEMS & SPECS */}
              {activeTab === 'items' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {analysis.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
                      >
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold text-xs rounded">
                              Item #{idx + 1}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                          </div>
                          <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-100">
                            Quantity: {item.quantity} {item.unit || 'Units'}
                          </div>
                        </div>

                        <div className="p-4 space-y-3 text-xs">
                          {/* Specs */}
                          {item.specifications && (
                            <div>
                              <span className="text-slate-500 font-medium block mb-1">
                                Technical Specifications & Requirements:
                              </span>
                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-800 whitespace-pre-line font-mono text-[11px]">
                                {typeof item.specifications === 'string'
                                  ? item.specifications
                                  : JSON.stringify(item.specifications, null, 2)}
                              </div>
                            </div>
                          )}

                          {/* Consignees / Locations */}
                          {item.consignees && item.consignees.length > 0 && (
                            <div>
                              <span className="text-slate-500 font-medium block mb-1">
                                Consignee Locations & Delivery Allotment:
                              </span>
                              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                                <table className="w-full text-left text-[11px]">
                                  <thead className="bg-slate-100 text-slate-700">
                                    <tr>
                                      <th className="p-2">Consignee</th>
                                      <th className="p-2">Address / City / State</th>
                                      <th className="p-2 text-right">Quantity</th>
                                      <th className="p-2 text-right">Delivery Days</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {item.consignees.map((c, cIdx) => (
                                      <tr key={cIdx}>
                                        <td className="p-2 font-medium">{c.name || 'Consignee'}</td>
                                        <td className="p-2 text-slate-600">
                                          {[c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ') || 'N/A'}
                                        </td>
                                        <td className="p-2 text-right font-bold">{c.quantity || item.quantity}</td>
                                        <td className="p-2 text-right">{c.deliveryDays || item.deliveryDays || 'As per bid'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: EMD & FINANCIALS */}
              {activeTab === 'emd' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* EMD Box */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        EMD Details (ईएमडी राशि)
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                          <span className="text-slate-500">EMD Required:</span>
                          <span className="font-bold text-slate-800">
                            {analysis.emdAmount?.required ? 'Yes' : 'No / Nil'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                          <span className="text-slate-500">EMD Amount (INR):</span>
                          <span className="font-bold text-base text-emerald-700">
                            {analysis.emdAmount?.amount
                              ? `₹ ${analysis.emdAmount.amount.toLocaleString('en-IN')}`
                              : '₹ 0'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                          <span className="text-slate-500">MSE / Startup Exemption:</span>
                          <span className="font-bold text-slate-800">
                            {analysis.emdAmount?.exemptionAllowed ? 'Allowed' : 'Not Allowed'}
                          </span>
                        </div>
                        {analysis.emdAmount?.exemptionCriteria && (
                          <div className="py-1">
                            <span className="text-slate-500 block mb-0.5">Exemption Criteria:</span>
                            <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                              {analysis.emdAmount.exemptionCriteria}
                            </p>
                          </div>
                        )}
                        {analysis.emdAmount?.advisory && (
                          <div className="py-1">
                            <span className="text-slate-500 block mb-0.5">EMD Advisory:</span>
                            <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                              {analysis.emdAmount.advisory}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ePBG & Value Box */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Award className="w-4 h-4 text-indigo-600" />
                        ePBG & Estimated Value
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                          <span className="text-slate-500">Estimated Bid Value:</span>
                          <span className="font-bold text-slate-900">
                            {analysis.estimatedBidValue?.isEstimatedProvided && analysis.estimatedBidValue.amount
                              ? `₹ ${analysis.estimatedBidValue.amount.toLocaleString('en-IN')}`
                              : analysis.estimatedBidValue?.rawText || 'Undisclosed'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                          <span className="text-slate-500">Performance Security (ePBG %):</span>
                          <span className="font-bold text-indigo-700">
                            {analysis.emdAmount?.pbgPercentage ? `${analysis.emdAmount.pbgPercentage}%` : 'Standard GeM Terms'}
                          </span>
                        </div>
                        {analysis.emdAmount?.pbgAmount && (
                          <div className="flex justify-between py-1.5 border-b border-slate-100">
                            <span className="text-slate-500">ePBG Amount (INR):</span>
                            <span className="font-bold text-slate-800">
                              ₹ {analysis.emdAmount.pbgAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: ELIGIBILITY & CRITERIA */}
              {activeTab === 'eligibility' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500 font-medium block">Average Annual Turnover:</span>
                      <span className="text-sm font-bold text-slate-900 block mt-1">
                        {analysis.eligibilityCriteria?.turnover || 'As per GeM rules'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500 font-medium block">Past Experience Required:</span>
                      <span className="text-sm font-bold text-slate-900 block mt-1">
                        {analysis.eligibilityCriteria?.experienceYears
                          ? `${analysis.eligibilityCriteria.experienceYears} Years`
                          : 'Not Specified'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500 font-medium block">Past Performance:</span>
                      <span className="text-sm font-bold text-slate-900 block mt-1">
                        {analysis.eligibilityCriteria?.pastPerformancePercent
                          ? `${analysis.eligibilityCriteria.pastPerformancePercent}%`
                          : 'Standard'}
                      </span>
                    </div>
                  </div>

                  {/* Mandatory Certificates */}
                  {analysis.eligibilityCriteria?.certificatesRequired &&
                    analysis.eligibilityCriteria.certificatesRequired.length > 0 && (
                      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <FileCheck2 className="w-4 h-4 text-emerald-600" />
                          Mandatory Certificates & Documents to Upload
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {analysis.eligibilityCriteria.certificatesRequired.map((cert, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 text-slate-800"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                              <span>{cert}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* TAB 6: ATTACHED SPECIFICATION SHEETS */}
              {activeTab === 'docs' && analysis.linkedDocuments && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    The following buyer-uploaded ATC, BOQ sheets, and technical specification files were extracted directly from the GeM bid document:
                  </p>
                  <div className="space-y-2.5">
                    {analysis.linkedDocuments
                      .filter((doc) => doc.url && doc.url.startsWith('http'))
                      .map((doc, idx) => (
                        <div
                          key={idx}
                          className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 p-4 transition-all shadow-xs space-y-2"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <div className="p-2 rounded-lg bg-blue-50 text-blue-700 mt-0.5 shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <span className="text-xs sm:text-sm font-bold text-slate-900 block leading-snug">
                                  {doc.title}
                                </span>
                                {doc.description && (
                                  <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-md border border-slate-100 leading-relaxed">
                                    <strong className="text-blue-900 font-semibold">Document Overview: </strong>
                                    {doc.description}
                                  </p>
                                )}
                                <span className="text-[11px] text-slate-400 font-mono block truncate">
                                  {doc.url}
                                </span>
                              </div>
                            </div>

                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 gap-1.5"
                            >
                              <span>Open Document</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      ))}

                    {analysis.linkedDocuments.filter((doc) => doc.url && doc.url.startsWith('http')).length === 0 && (
                      <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                        No external secondary specification URLs attached in this bid.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 7: EXTRAS & SPECIAL OBSERVATIONS */}
              {activeTab === 'extras' && analysis.extraObservations && analysis.extraObservations.length > 0 && (
                <div className="space-y-4">
                  <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-4 text-xs">
                    <h4 className="font-bold text-purple-950 flex items-center gap-2 text-sm">
                      <Lightbulb className="w-4 h-4 text-purple-600" />
                      Special Observations & Extra AI Insights
                    </h4>
                    <p className="text-purple-800 mt-1">
                      Critical parameters, special penalties, lab testing criteria, delivery instructions, or nuances extracted from the tender and buyer specification documents:
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {analysis.extraObservations.map((obs, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 text-xs sm:text-sm text-slate-800 leading-relaxed flex items-start gap-3 shadow-xs"
                      >
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1 whitespace-pre-line">{obs}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {tender.pdfUrl && (
              <a
                href={tender.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs transition-colors"
                title="Download Original GeM Official PDF"
              >
                <Download className="w-3.5 h-3.5 mr-1 sm:mr-1.5 text-blue-600 shrink-0" />
                <span>GeM PDF</span>
              </a>
            )}

            {analysis && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadAnalysisPdf}
                disabled={generatingPdf}
                className="inline-flex items-center text-xs font-semibold h-8 px-2.5 sm:px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs transition-colors"
                title="Download Generated AI Analysis Report PDF"
              >
                <Download className={`w-3.5 h-3.5 mr-1 sm:mr-1.5 text-indigo-600 shrink-0 ${generatingPdf ? 'animate-bounce' : ''}`} />
                <span>Analysis PDF</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSmoothClose} className="text-xs h-8 px-3">
              Close
            </Button>
            {onImportToTender && (
              <Button
                size="sm"
                onClick={() => onImportToTender(tender, analysis || undefined)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-3 sm:px-4 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 sm:mr-1.5 shrink-0" />
                <span><span className="hidden xs:inline">Import to</span> Panel</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
