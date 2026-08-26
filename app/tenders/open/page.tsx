'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  FileText,
  Download,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  Sparkles,
  ArrowLeft,
  Star,
  MapPin,
  Bot,
} from 'lucide-react';
import {
  GeMSearchFilters,
  GeMTender,
  GeMSearchResponse,
  GeMSearchType,
  GeMStarredTender,
  GeMAIAnalysis,
} from '@/types/gem';
import { db } from '@/services/db';
import { aiUsageService } from '@/services/aiUsageService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { TenderAIAnalysisModal } from '@/components/tender/TenderAIAnalysisModal';
import { AutoScannerModal } from '@/components/tender/AutoScannerModal';
import { AiJobQueueDrawer, AiAnalysisJob } from '@/components/tender/AiJobQueueDrawer';

// Helper to compute default dates (1 month previous to current date & 1 month after current date)
function getDefaultDates() {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const formatYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    from: formatYMD(prevMonth),
    to: formatYMD(nextMonth),
  };
}

/**
 * Extracts Town & District badge information (e.g. "Porsa (Morena)")
 */
function getPlaceBadgeInfo(
  analysis?: GeMAIAnalysis | null,
  tender?: GeMTender | GeMStarredTender
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

  // Fallback pattern matching on Office, Department, Ministry, Address
  const combined = `${analysis?.officeName || ''} ${analysis?.buyerAddress || ''} ${tender?.departmentName || ''} ${tender?.ministryName || ''}`.toLowerCase();
  if (combined.includes('porsa')) {
    return 'Porsa (Morena)';
  }
  if (combined.includes('morena')) {
    return 'Morena';
  }

  return null;
}

/**
 * Calculates Estimated Value from 1% EMD if official value is undisclosed.
 */
function getEstimatedValueInfo(analysis?: GeMAIAnalysis | null) {
  if (!analysis) return { text: 'Undisclosed', isCalculated: false, rawNumber: 0 };

  // 1. If official estimated bid value is available
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

  // 2. If EMD amount is known, calculate Est. Value = EMD * 100 (1% EMD rule)
  const emdVal = analysis.emdAmount?.amount || 0;
  if (emdVal > 0) {
    const calculatedValue = emdVal * 100;
    return {
      text: `₹ ${calculatedValue.toLocaleString('en-IN')}`,
      isCalculated: true,
      rawNumber: calculatedValue,
      note: 'Est. from 1% EMD',
    };
  }

  return {
    text: analysis.estimatedBidValue?.rawText || 'Undisclosed',
    isCalculated: false,
    rawNumber: 0,
  };
}

export default function OpenTendersPage() {
  const router = useRouter();

  // Navigation Main View: 'live' | 'starred'
  const [viewMode, setViewMode] = useState<'live' | 'starred'>('live');

  // Search Type & Filters for Live Search
  const [searchType, setSearchType] = useState<GeMSearchType>('bidNumber');
  const [keyword, setKeyword] = useState('');
  const [bidNumber, setBidNumber] = useState('');
  const [bidEndFrom, setBidEndFrom] = useState(() => getDefaultDates().from);
  const [bidEndTo, setBidEndTo] = useState(() => getDefaultDates().to);

  // Ministry Search
  const [ministry, setMinistry] = useState('');
  const [department, setDepartment] = useState('');
  const [buyerState, setBuyerState] = useState('');
  const [ministryList, setMinistryList] = useState<{ value: string; label: string }[]>([]);

  // Location Search
  const [consigneeState, setConsigneeState] = useState('');
  const [consigneeCity, setConsigneeCity] = useState('');
  const [stateList, setStateList] = useState<{ value: string; label: string }[]>([]);
  const [cityList, setCityList] = useState<{ value: string; label: string }[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // BOQ Search
  const [boqTitle, setBoqTitle] = useState('');
  const [bidValue, setBidValue] = useState('');

  // Pagination & Results State
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResponse, setSearchResponse] = useState<GeMSearchResponse | null>(null);

  // Starred Tenders State (Stored in Firebase Firestore)
  const [starredTenders, setStarredTenders] = useState<GeMStarredTender[]>([]);
  const [starringKey, setStarringKey] = useState<string | null>(null);

  // Global AI Analyses Repository Map (Persists even when tender is unstarred)
  const [analysesMap, setAnalysesMap] = useState<Record<string, GeMAIAnalysis>>({});

  // Starred Archive Filter & Sort State
  const [starredSearchQuery, setStarredSearchQuery] = useState('');
  const [starredStatusFilter, setStarredStatusFilter] = useState<'all' | 'analyzed' | 'pending'>('all');
  const [starredMinistryFilter, setStarredMinistryFilter] = useState('');
  const [starredTownDistrictFilter, setStarredTownDistrictFilter] = useState('');
  const [starredSortBy, setStarredSortBy] = useState<'recent' | 'ending_soon' | 'est_value' | 'quantity' | 'bid_no'>('recent');

  // Summary Card State: Expand/Collapse & Language Selector per Tender
  const [expandedSummaries, setExpandedSummaries] = useState<Record<string, boolean>>({});
  const [summaryLanguages, setSummaryLanguages] = useState<Record<string, 'hindi' | 'english'>>({});

  // AI Analysis Modal & Execution State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [selectedTenderForAnalysis, setSelectedTenderForAnalysis] = useState<GeMTender | GeMStarredTender | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<GeMAIAnalysis | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);

  // Corrigendum Modal State
  const [corrigendumModalOpen, setCorrigendumModalOpen] = useState(false);
  const [corrigendumLoading, setCorrigendumLoading] = useState(false);
  const [corrigendumHtml, setCorrigendumHtml] = useState<string>('');
  const [selectedBidForCorrigendum, setSelectedBidForCorrigendum] = useState<GeMTender | null>(null);

  // Auto-Scanner 24/7 Modal State
  const [autoScannerOpen, setAutoScannerOpen] = useState(false);

  // Copied state tracker
  const [copiedId, setCopiedId] = useState<string | number | null>(null);

  // Helper to format Date to DD-MM-YYYY
  const formatDateToGeM = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    if (y && m && d) {
      return `${d}-${m}-${y}`;
    }
    return dateStr;
  };

  // Helper for human date display
  const formatDisplayDate = (isoStr: string) => {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  // Calculate Days Left
  const getRemainingDaysBadge = (endDateIso: string) => {
    if (!endDateIso) return null;
    try {
      const end = new Date(endDateIso).getTime();
      const now = Date.now();
      const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
            Closed
          </span>
        );
      }
      if (diffDays === 0) {
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 animate-pulse">
            Ends Today
          </span>
        );
      }
      if (diffDays <= 3) {
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
            {diffDays} Days Left
          </span>
        );
      }
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
          {diffDays} Days Left
        </span>
      );
    } catch {
      return null;
    }
  };

  // Load Starred Tenders from Firebase / DB
  const loadStarredTenders = useCallback(async () => {
    try {
      const list = await db.listStarredGeMTenders();
      if (Array.isArray(list)) {
        setStarredTenders(list);
      }
    } catch (err) {
      console.error('Failed to load starred tenders from Firestore/local DB:', err);
    }
  }, []);

  // Load Global Permanent AI Analyses Repository from Firebase / DB
  const loadGlobalAnalyses = useCallback(async () => {
    try {
      const allAnalyses = await db.listGeMAIAnalyses();
      if (allAnalyses && typeof allAnalyses === 'object') {
        setAnalysesMap((prev) => ({ ...prev, ...allAnalyses }));
      }
    } catch (err) {
      console.error('Failed to load global AI analyses repository:', err);
    }
  }, []);

  useEffect(() => {
    loadStarredTenders();
    loadGlobalAnalyses();
  }, [loadStarredTenders, loadGlobalAnalyses]);

  // Robust Starred Lookup Map (Multi-keyed by gemBidId, bidNumber, and docId)
  const starredMap = useMemo(() => {
    const map = new Map<string, GeMStarredTender>();
    starredTenders.forEach((st) => {
      if (st.gemBidId) map.set(String(st.gemBidId), st);
      if (st.bidNumber) map.set(st.bidNumber.trim().toUpperCase(), st);
      if (st.id) {
        map.set(st.id, st);
        map.set(st.id.replace('gem_', ''), st);
      }
    });
    return map;
  }, [starredTenders]);

  // Helper: Check if a tender is starred
  const isTenderStarred = useCallback(
    (tender: GeMTender | GeMStarredTender) => {
      if ('gemBidId' in tender && tender.gemBidId && starredMap.has(String(tender.gemBidId))) return true;
      if (tender.bidNumber && starredMap.has(tender.bidNumber.trim().toUpperCase())) return true;
      if (tender.id && (starredMap.has(String(tender.id)) || starredMap.has(String(tender.id).replace('gem_', '')))) return true;
      return false;
    },
    [starredMap]
  );

  // Helper: Retrieve Starred Record or Cached AI Analysis (Works in Live Search even when unstarred)
  const getTenderAnalysisData = useCallback(
    (tender: GeMTender | GeMStarredTender): GeMAIAnalysis | undefined => {
      const bidNumKey = tender.bidNumber ? tender.bidNumber.trim().toUpperCase() : '';
      const numericIdKey = 'gemBidId' in tender && tender.gemBidId ? String(tender.gemBidId) : tender.id ? String(tender.id) : '';

      // 1. From Global AI Analyses Repository (Firestore / DB)
      if (bidNumKey && analysesMap[bidNumKey]) return analysesMap[bidNumKey];
      if (numericIdKey && analysesMap[numericIdKey]) return analysesMap[numericIdKey];

      // 2. From Starred Tender record
      const byGemBidId = numericIdKey ? starredMap.get(numericIdKey) : undefined;
      const byBidNum = bidNumKey ? starredMap.get(bidNumKey) : undefined;
      const starredRecord = byGemBidId || byBidNum;

      if (starredRecord?.aiAnalysis) return starredRecord.aiAnalysis;
      if ('aiAnalysis' in tender && tender.aiAnalysis) return tender.aiAnalysis;

      // 3. From Local Analysis Cache
      if (typeof window !== 'undefined' && bidNumKey) {
        try {
          const cached = localStorage.getItem(`gem_ai_cache_${bidNumKey}`);
          if (cached) {
            return JSON.parse(cached);
          }
        } catch {
          // ignore parse error
        }
      }

      return undefined;
    },
    [analysesMap, starredMap]
  );

  // Toggle Star / Favourite status (Works seamlessly on both live bids & starred archive)
  const handleToggleStar = async (tender: GeMTender | GeMStarredTender, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const bidNumber = tender.bidNumber ? tender.bidNumber.trim() : '';
    const numericBidId = 'gemBidId' in tender && tender.gemBidId
      ? Number(tender.gemBidId)
      : typeof tender.id === 'number'
      ? tender.id
      : Number(String(tender.id || '').replace(/[^0-9]/g, '')) || 0;

    const opKey = bidNumber || String(numericBidId || tender.id);
    setStarringKey(opKey);

    const isStarred = isTenderStarred(tender);

    try {
      if (isStarred) {
        // Unstar & remove from Firebase & Local Storage
        if (numericBidId) await db.unstarGeMTender(numericBidId).catch(() => {});
        if (bidNumber) await db.unstarGeMTender(bidNumber).catch(() => {});
        if (tender.id) await db.unstarGeMTender(String(tender.id)).catch(() => {});

        // Remove from local state immediately
        setStarredTenders((prev) =>
          prev.filter((t) => {
            const matchBid = bidNumber && t.bidNumber && t.bidNumber.trim().toUpperCase() === bidNumber.toUpperCase();
            const matchNum = numericBidId > 0 && t.gemBidId === numericBidId;
            const matchId = String(t.id) === String(tender.id);
            return !matchBid && !matchNum && !matchId;
          })
        );
      } else {
        // Star & save in Firebase
        const rawTender: GeMTender = {
          id: numericBidId || (typeof tender.id === 'number' ? tender.id : 1),
          bidNumber: tender.bidNumber,
          categoryName: tender.categoryName,
          items: tender.items || [],
          totalQuantity: tender.totalQuantity || 1,
          startDate: tender.startDate || '',
          endDate: tender.endDate || '',
          ministryName: tender.ministryName || '',
          departmentName: tender.departmentName || '',
          buyerStatus: tender.buyerStatus || '',
          bidType: tender.bidType || 1,
          isRA: Boolean(tender.isRA),
          isBunch: Boolean(tender.isBunch),
          isHighValue: Boolean(tender.isHighValue),
          isCustomItem: Boolean(tender.isCustomItem),
          isSinglePacket: Boolean(tender.isSinglePacket),
          isGlobalTendering: Boolean(tender.isGlobalTendering),
          pdfUrl: tender.pdfUrl,
          corrigendumUrl: tender.corrigendumUrl || '',
        };

        const existingAnalysis = getTenderAnalysisData(tender);
        const newStarred = await db.starGeMTender(rawTender, existingAnalysis);

        setStarredTenders((prev) => [
          newStarred,
          ...prev.filter(
            (t) =>
              t.bidNumber?.trim().toUpperCase() !== bidNumber.toUpperCase() &&
              t.gemBidId !== numericBidId
          ),
        ]);
      }
    } catch (err) {
      console.error('Failed to toggle star status:', err);
    } finally {
      setStarringKey(null);
    }
  };

  // Toggle Summary Expand/Collapse
  const toggleSummaryExpand = (bidKey: string) => {
    setExpandedSummaries((prev) => ({
      ...prev,
      [bidKey]: !prev[bidKey],
    }));
  };

  // Switch Summary Language for a tender
  const switchSummaryLang = (bidKey: string, lang: 'hindi' | 'english') => {
    setSummaryLanguages((prev) => ({
      ...prev,
      [bidKey]: lang,
    }));
  };

  // AI Background Job Queue State
  const [aiJobs, setAiJobs] = useState<AiAnalysisJob[]>([]);
  const isProcessingQueueRef = useRef(false);
  const searchResponseRef = useRef(searchResponse);
  searchResponseRef.current = searchResponse;
  const starredTendersRef = useRef(starredTenders);
  starredTendersRef.current = starredTenders;
  const aiJobsRef = useRef(aiJobs);
  aiJobsRef.current = aiJobs;

  // Enqueue a tender into the background worker queue
  const enqueueAiJob = useCallback((tender: GeMTender | GeMStarredTender) => {
    const existingAnalysis = getTenderAnalysisData(tender);
    if (existingAnalysis) return; // Already analyzed

    const tenderKey = (tender.bidNumber || String(tender.id)).trim().toUpperCase();

    setAiJobs((prev) => {
      if (prev.some((j) => j.bidNumber.trim().toUpperCase() === tenderKey)) {
        return prev; // Already in queue
      }
      const newJob: AiAnalysisJob = {
        id: tenderKey,
        bidNumber: tender.bidNumber,
        title: tender.categoryName || `Tender ${tender.bidNumber}`,
        categoryName: tender.categoryName,
        pdfUrl: tender.pdfUrl,
        status: 'queued',
        stepMessage: 'Queued for background analysis...',
        enqueuedAt: Date.now(),
      };
      return [...prev, newJob];
    });
  }, [analysesMap, starredTenders]);

  // Background AI Queue Worker (Processes all queued jobs continuously in a robust loop)
  useEffect(() => {
    const hasQueued = aiJobs.some((j) => j.status === 'queued');
    if (!hasQueued || isProcessingQueueRef.current) return;

    isProcessingQueueRef.current = true;

    const runQueue = async () => {
      while (true) {
        // 1. Pick the next queued job from latest ref
        const nextJob = aiJobsRef.current.find((j) => j.status === 'queued');
        if (!nextJob) break;

        // 2. Mark this job as running
        setAiJobs((prev) =>
          prev.map((j) =>
            j.id === nextJob.id
              ? { ...j, status: 'running', stepMessage: '🤖 Extracting PDF & ATC documents with AI...' }
              : j
          )
        );

        try {
          const allKnownTenders = [...(searchResponseRef.current?.bids || []), ...starredTendersRef.current];
          const tenderObj = allKnownTenders.find(
            (t) => (t.bidNumber || String(t.id)).trim().toUpperCase() === nextJob.bidNumber.trim().toUpperCase()
          );

          const res = await fetch('/api/gem/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pdfUrl: nextJob.pdfUrl || tenderObj?.pdfUrl,
              bidNumber: nextJob.bidNumber,
              tender: tenderObj,
            }),
          });

          const data = await res.json();
          if (data.success && data.analysis) {
            aiUsageService.recordUsage({ feature: 'gem_analyze', success: true });

            // 1. Save to Global Permanent AI Analysis Repository
            await db.saveGeMAIAnalysis(
              nextJob.bidNumber,
              tenderObj?.id || 0,
              data.analysis
            ).catch(() => {});

            // 2. Update local state & cache
            const key = nextJob.bidNumber.trim().toUpperCase();
            setAnalysesMap((prev) => ({ ...prev, [key]: data.analysis }));
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem(`gem_ai_cache_${key}`, JSON.stringify(data.analysis));
              } catch {}
            }

            // If tender is starred, update its aiAnalysis in starredTenders state
            setStarredTenders((prev) =>
              prev.map((st) =>
                (st.bidNumber || String(st.id)).trim().toUpperCase() === key
                  ? { ...st, aiAnalysis: data.analysis }
                  : st
              )
            );

            // Update job to completed
            setAiJobs((prev) =>
              prev.map((j) =>
                j.id === nextJob.id
                  ? {
                      ...j,
                      status: 'completed',
                      stepMessage: '✅ Analysis completed successfully!',
                      completedAt: Date.now(),
                    }
                  : j
              )
            );
          } else {
            throw new Error(data.error || 'AI Analysis returned unsuccessful');
          }
        } catch (err: any) {
          setAiJobs((prev) =>
            prev.map((j) =>
              j.id === nextJob.id
                ? {
                    ...j,
                    status: 'failed',
                    error: err?.message || 'Failed to analyze tender',
                    completedAt: Date.now(),
                  }
                : j
            )
          );
        }

        // Safety delay between consecutive AI calls (1.5 seconds)
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      isProcessingQueueRef.current = false;
    };

    runQueue();
  }, [aiJobs]);

  // Handle single AI analysis button click (Inline execution without opening new tab)
  const handleRunAIAnalysis = (tender: GeMTender | GeMStarredTender) => {
    const existingAnalysis = getTenderAnalysisData(tender);

    if (existingAnalysis) {
      // If already analyzed, open the detailed AI insights modal right on the page!
      setSelectedTenderForAnalysis(tender);
      setCurrentAnalysis(existingAnalysis);
      setAiModalOpen(true);
      return;
    }

    // If not yet analyzed, enqueue it into the background worker queue
    enqueueAiJob(tender);
  };

  // Analyze All Unanalyzed Visible Bids
  const handleAnalyzeAllVisible = () => {
    const visibleList = viewMode === 'live' ? (searchResponse?.bids || []) : filteredStarredTenders;
    const unanalyzed = visibleList.filter((t) => !getTenderAnalysisData(t));
    if (unanalyzed.length === 0) {
      alert('All visible tenders already have AI Analysis completed!');
      return;
    }

    unanalyzed.forEach((t) => enqueueAiJob(t));
  };

  const handleClearCompletedJobs = () => {
    setAiJobs((prev) => prev.filter((j) => j.status === 'running' || j.status === 'queued'));
  };

  const handleCancelJob = (jobId: string) => {
    setAiJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  const handleViewJobAnalysis = (bidNumber: string) => {
    const allKnownTenders = [...(searchResponse?.bids || []), ...starredTenders];
    const tenderObj = allKnownTenders.find(
      (t) => (t.bidNumber || String(t.id)).trim().toUpperCase() === bidNumber.trim().toUpperCase()
    );
    if (!tenderObj) return;
    const analysis = getTenderAnalysisData(tenderObj);
    if (analysis) {
      setSelectedTenderForAnalysis(tenderObj);
      setCurrentAnalysis(analysis);
      setAiModalOpen(true);
    }
  };

  // Re-run AI Analysis
  const handleReanalyzeCurrent = async () => {
    if (!selectedTenderForAnalysis) return;
    setAiAnalysisLoading(true);

    try {
      const res = await fetch('/api/gem/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfUrl: selectedTenderForAnalysis.pdfUrl,
          bidNumber: selectedTenderForAnalysis.bidNumber,
          tender: selectedTenderForAnalysis,
        }),
      });

      const data = await res.json();
      if (data.success && data.analysis) {
        aiUsageService.recordUsage({ feature: 'gem_analyze', success: true });
        setCurrentAnalysis(data.analysis);

        // 1. Save to Global Permanent AI Analysis Repository
        await db.saveGeMAIAnalysis(
          selectedTenderForAnalysis.bidNumber,
          selectedTenderForAnalysis.id,
          data.analysis
        ).catch(() => {});

        // 2. Update local state & cache
        if (selectedTenderForAnalysis.bidNumber) {
          const key = selectedTenderForAnalysis.bidNumber.trim().toUpperCase();
          setAnalysesMap((prev) => ({ ...prev, [key]: data.analysis }));
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(`gem_ai_cache_${key}`, JSON.stringify(data.analysis));
            } catch {}
          }
        }

        const savedStarred = await db.starGeMTender(selectedTenderForAnalysis as GeMTender, data.analysis);
        setStarredTenders((prev) => {
          const filtered = prev.filter(
            (t) =>
              t.bidNumber?.trim().toUpperCase() !== selectedTenderForAnalysis.bidNumber?.trim().toUpperCase() &&
              t.gemBidId !== savedStarred.gemBidId
          );
          return [savedStarred, ...filtered];
        });
      } else {
        alert(data.error || 'Failed to re-run AI analysis.');
      }
    } catch (err: any) {
      console.error('Re-analysis error:', err);
      alert(err?.message || 'Error running re-analysis.');
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  // Fetch dropdown lists (ministries & states)
  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await fetch('/api/gem/options?type=all');
        const data = await res.json();
        if (data.success) {
          if (data.ministries) setMinistryList(data.ministries);
          if (data.states) setStateList(data.states);
        }
      } catch (err) {
        console.error('Failed to load GeM dropdown options:', err);
      }
    }
    loadOptions();
  }, []);

  // Fetch Cities when Consignee State changes
  useEffect(() => {
    if (!consigneeState) {
      setCityList([]);
      setConsigneeCity('');
      return;
    }

    let cancelled = false;
    setLoadingCities(true);
    setConsigneeCity('');

    fetch(`/api/gem/options?type=cities&state=${encodeURIComponent(consigneeState)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.cities) {
          setCityList(data.cities);
        }
      })
      .catch((err) => console.error('Failed to load cities for state:', consigneeState, err))
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });

    return () => {
      cancelled = true;
    };
  }, [consigneeState]);

  // Fetch Bids Function
  const fetchBids = useCallback(
    async (pageToLoad = 1) => {
      setLoading(true);
      setError(null);

      const payload: GeMSearchFilters = {
        searchType,
        page: pageToLoad,
      };

      if (searchType === 'bidNumber') {
        payload.category = keyword.trim() || undefined;
        payload.bidNumber = bidNumber.trim() || undefined;
        payload.bidEndFrom = formatDateToGeM(bidEndFrom) || undefined;
        payload.bidEndTo = formatDateToGeM(bidEndTo) || undefined;
      } else if (searchType === 'ministry-search') {
        payload.ministry = ministry || undefined;
        payload.department = department.trim() || undefined;
        payload.buyerState = buyerState || undefined;
        payload.bidEndFromMin = formatDateToGeM(bidEndFrom) || undefined;
        payload.bidEndToMin = formatDateToGeM(bidEndTo) || undefined;
      } else if (searchType === 'location-search') {
        payload.state_name_con = consigneeState || undefined;
        payload.city_name_con = consigneeCity || undefined;
        payload.bidEndFromCon = formatDateToGeM(bidEndFrom) || undefined;
        payload.bidEndToCon = formatDateToGeM(bidEndTo) || undefined;
      } else if (searchType === 'boq-search') {
        payload.boqtitle_con = boqTitle.trim() || undefined;
        payload.bidvalue = bidValue.trim() || undefined;
        payload.bidEndFromBoq = formatDateToGeM(bidEndFrom) || undefined;
        payload.bidEndToBoq = formatDateToGeM(bidEndTo) || undefined;
      }

      try {
        const res = await fetch('/api/gem/bids', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data: GeMSearchResponse = await res.json();
        if (data.success) {
          setSearchResponse(data);
          setCurrentPage(pageToLoad);
        } else {
          setError(data.error || 'Unable to retrieve bids from GeM. Please try again.');
        }
      } catch (err: any) {
        setError(err?.message || 'Network error while fetching open tenders.');
      } finally {
        setLoading(false);
      }
    },
    [
      searchType,
      keyword,
      bidNumber,
      bidEndFrom,
      bidEndTo,
      ministry,
      department,
      buyerState,
      consigneeState,
      consigneeCity,
      boqTitle,
      bidValue,
    ]
  );

  // Initial Load on mount
  useEffect(() => {
    fetchBids(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Search Submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBids(1);
  };

  // Reset Filters
  const handleReset = () => {
    const defaults = getDefaultDates();
    setKeyword('');
    setBidNumber('');
    setBidEndFrom(defaults.from);
    setBidEndTo(defaults.to);
    setMinistry('');
    setDepartment('');
    setBuyerState('');
    setConsigneeState('');
    setConsigneeCity('');
    setCityList([]);
    setBoqTitle('');
    setBidValue('');
    setCurrentPage(1);
  };

  // Copy Bid Number
  const copyBidNumber = (bidNum: string, key: string | number) => {
    navigator.clipboard.writeText(bidNum);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Corrigendum Details Modal
  const openCorrigendumModal = async (bid: GeMTender) => {
    setSelectedBidForCorrigendum(bid);
    setCorrigendumModalOpen(true);
    setCorrigendumLoading(true);
    setCorrigendumHtml('');

    try {
      const res = await fetch(`/api/gem/corrigendum?bidId=${bid.id}`);
      const data = await res.json();
      if (data.success && data.html) {
        setCorrigendumHtml(data.html);
      } else {
        setCorrigendumHtml('<p class="text-gray-500 py-4 text-center">No Corrigendum details found for this tender.</p>');
      }
    } catch {
      setCorrigendumHtml('<p class="text-red-500 py-4 text-center">Failed to load Corrigendum details.</p>');
    } finally {
      setCorrigendumLoading(false);
    }
  };

  // Enhanced Import Tender with AI Data
  const handleImportTender = (tender: GeMTender | GeMStarredTender, analysis?: GeMAIAnalysis) => {
    if (!analysis) {
      alert('Please perform AI Analysis first to extract complete specifications and items before importing.');
      return;
    }

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

  // Distinct Ministries in Starred Tenders for Filter Dropdown
  const starredMinistriesList = useMemo(() => {
    const set = new Set<string>();
    starredTenders.forEach((t) => {
      const min = t.aiAnalysis?.ministryName || t.ministryName;
      if (min) set.add(min);
    });
    return Array.from(set).sort();
  }, [starredTenders]);

  // Distinct Towns/Districts in Starred Tenders for Filter Dropdown
  const starredTownDistrictsList = useMemo(() => {
    const set = new Set<string>();
    starredTenders.forEach((t) => {
      const place = getPlaceBadgeInfo(t.aiAnalysis, t);
      if (place) set.add(place);
    });
    return Array.from(set).sort();
  }, [starredTenders]);

  // Filtered & Sorted Starred Tenders
  const filteredStarredTenders = useMemo(() => {
    let result = [...starredTenders];

    // 1. Search Query (Matches Bid, Category, Ministry, Dept, Office, Items, Town, District)
    if (starredSearchQuery.trim()) {
      const q = starredSearchQuery.toLowerCase();
      result = result.filter((t) => {
        const place = (getPlaceBadgeInfo(t.aiAnalysis, t) || '').toLowerCase();
        return (
          t.bidNumber.toLowerCase().includes(q) ||
          t.categoryName.toLowerCase().includes(q) ||
          (t.ministryName && t.ministryName.toLowerCase().includes(q)) ||
          (t.departmentName && t.departmentName.toLowerCase().includes(q)) ||
          (t.aiAnalysis?.officeName && t.aiAnalysis.officeName.toLowerCase().includes(q)) ||
          (t.aiAnalysis?.organisationName && t.aiAnalysis.organisationName.toLowerCase().includes(q)) ||
          (t.aiAnalysis?.townName && t.aiAnalysis.townName.toLowerCase().includes(q)) ||
          (t.aiAnalysis?.districtName && t.aiAnalysis.districtName.toLowerCase().includes(q)) ||
          place.includes(q) ||
          t.items.some((item) => item.toLowerCase().includes(q))
        );
      });
    }

    // 2. Status Filter
    if (starredStatusFilter === 'analyzed') {
      result = result.filter((t) => Boolean(t.aiAnalysis));
    } else if (starredStatusFilter === 'pending') {
      result = result.filter((t) => !t.aiAnalysis);
    }

    // 3. Ministry Filter
    if (starredMinistryFilter) {
      result = result.filter(
        (t) => (t.aiAnalysis?.ministryName || t.ministryName) === starredMinistryFilter
      );
    }

    // 4. Town / District Filter
    if (starredTownDistrictFilter) {
      result = result.filter((t) => {
        const place = getPlaceBadgeInfo(t.aiAnalysis, t);
        return place === starredTownDistrictFilter;
      });
    }

    // 5. Sorting
    result.sort((a, b) => {
      if (starredSortBy === 'ending_soon') {
        const dateA = new Date(a.endDate).getTime();
        const dateB = new Date(b.endDate).getTime();
        return dateA - dateB;
      }
      if (starredSortBy === 'est_value') {
        const valA = getEstimatedValueInfo(a.aiAnalysis).rawNumber;
        const valB = getEstimatedValueInfo(b.aiAnalysis).rawNumber;
        return valB - valA;
      }
      if (starredSortBy === 'quantity') {
        return (b.totalQuantity || 0) - (a.totalQuantity || 0);
      }
      if (starredSortBy === 'bid_no') {
        return a.bidNumber.localeCompare(b.bidNumber);
      }
      // 'recent' by default (starredAt)
      const timeA = new Date(a.starredAt || a.createdAt).getTime();
      const timeB = new Date(b.starredAt || b.createdAt).getTime();
      return timeB - timeA;
    });

    return result;
  }, [
    starredTenders,
    starredSearchQuery,
    starredStatusFilter,
    starredMinistryFilter,
    starredTownDistrictFilter,
    starredSortBy,
  ]);

  // Total accurately analyzed count (accounting for global cache & map)
  const totalAnalyzedCount = useMemo(() => {
    return starredTenders.filter((t) => Boolean(getTenderAnalysisData(t))).length;
  }, [starredTenders, analysesMap]);

  // Unanalyzed bids currently visible
  const unanalyzedVisibleBids = useMemo(() => {
    const list = viewMode === 'live' ? (searchResponse?.bids || []) : filteredStarredTenders;
    return list.filter((t) => !getTenderAnalysisData(t));
  }, [viewMode, searchResponse?.bids, filteredStarredTenders, analysesMap]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center text-xs font-medium text-blue-200 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Back to Dashboard
                </Link>
                <span className="text-blue-300">/</span>
                <span className="text-xs text-blue-300 font-medium">GeM Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
                <span>GeM Open Tenders & AI Analyzer</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                  Live Scraping & Multimodal AI
                </span>
              </h1>
              <p className="text-slate-300 text-sm mt-1 max-w-2xl">
                Browse, search, star favourite tenders in Firebase, and perform full multimodal AI PDF analysis for Buyer Added ATC, EMD, items, and department hierarchy.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {unanalyzedVisibleBids.length > 0 && (
                <Button
                  onClick={handleAnalyzeAllVisible}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border border-indigo-300/30 text-xs sm:text-sm font-bold shadow-md gap-1.5"
                >
                  <Sparkles className="w-4 h-4 animate-pulse text-indigo-200" />
                  Analyze All ({unanalyzedVisibleBids.length})
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => fetchBids(currentPage)}
                disabled={loading}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs sm:text-sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh Live Bids
              </Button>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setViewMode('live')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                viewMode === 'live'
                  ? 'bg-white text-blue-900 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Search className="w-4 h-4" />
              Live GeM Search
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode('starred');
                loadStarredTenders();
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                viewMode === 'starred'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Star className="w-4 h-4 fill-current text-amber-300" />
              Starred Tenders Archive
              <span className="bg-slate-900/60 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                {starredTenders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAutoScannerOpen(true)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-md border border-indigo-400/40 ml-auto"
            >
              <Bot className="w-4 h-4 animate-pulse" />
              24/7 Auto-Scanner
              <span className="bg-emerald-400 text-slate-950 px-2 py-0.2 rounded-full text-[10px] font-black uppercase tracking-wider">
                Server AI
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2">
        
        {/* VIEW 1: LIVE SEARCH */}
        {viewMode === 'live' && (
          <>
            {/* Search & Filter Card */}
            <Card className="shadow-lg border-slate-200 bg-white rounded-xl overflow-hidden mb-6">
              <div className="border-b border-slate-100 bg-slate-50/50 p-2 sm:p-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchType('bidNumber');
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      searchType === 'bidNumber'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Bid / Keyword Search
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchType('ministry-search');
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      searchType === 'ministry-search'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    By Ministry / Department
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchType('location-search');
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      searchType === 'location-search'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    By Consignee Location
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchType('boq-search');
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      searchType === 'boq-search'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    By BOQ Title
                  </button>
                </div>
              </div>

              <CardContent className="p-4 sm:p-6">
                <form onSubmit={handleSearch} className="space-y-4">
                  {/* Mode 1: Bid / Keyword */}
                  {searchType === 'bidNumber' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Keyword / Product Category</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            placeholder="e.g. Computers, Furniture, Security, Vehicles..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            className="pl-9 text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Bid / RA Number</label>
                        <Input
                          placeholder="e.g. GEM/2026/B/7153764"
                          value={bidNumber}
                          onChange={(e) => setBidNumber(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">End Date (From)</label>
                          <Input
                            type="date"
                            value={bidEndFrom}
                            onChange={(e) => setBidEndFrom(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">End Date (To)</label>
                          <Input
                            type="date"
                            value={bidEndTo}
                            onChange={(e) => setBidEndTo(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Ministry / Department */}
                  {searchType === 'ministry-search' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Ministry</label>
                        <select
                          value={ministry}
                          onChange={(e) => setMinistry(e.target.value)}
                          className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- All Ministries --</option>
                          {ministryList.map((m, idx) => (
                            <option key={`min-${m.value}-${idx}`} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                        <Input
                          placeholder="e.g. Department of Defence"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Buyer State</label>
                        <select
                          value={buyerState}
                          onChange={(e) => setBuyerState(e.target.value)}
                          className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- All States --</option>
                          {stateList.map((s, idx) => (
                            <option key={`buyer-state-${s.value}-${idx}`} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">End Date (From)</label>
                          <Input
                            type="date"
                            value={bidEndFrom}
                            onChange={(e) => setBidEndFrom(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">End Date (To)</label>
                          <Input
                            type="date"
                            value={bidEndTo}
                            onChange={(e) => setBidEndTo(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mode 3: Location */}
                  {searchType === 'location-search' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Consignee State</label>
                        <select
                          value={consigneeState}
                          onChange={(e) => setConsigneeState(e.target.value)}
                          className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Select State --</option>
                          {stateList.map((s, idx) => (
                            <option key={`consignee-state-${s.value}-${idx}`} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Consignee City {loadingCities && <span className="text-blue-500 font-normal">(Loading...)</span>}
                        </label>
                        <select
                          value={consigneeCity}
                          onChange={(e) => setConsigneeCity(e.target.value)}
                          disabled={!consigneeState || loadingCities}
                          className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">
                            {!consigneeState
                              ? '-- Select State First --'
                              : loadingCities
                              ? '-- Loading Cities... --'
                              : '-- All Cities / Select City --'}
                          </option>
                          {cityList.map((c, idx) => (
                            <option key={`city-${c.value}-${idx}`} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2 md:col-span-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">End Date (From)</label>
                          <Input
                            type="date"
                            value={bidEndFrom}
                            onChange={(e) => setBidEndFrom(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">End Date (To)</label>
                          <Input
                            type="date"
                            value={bidEndTo}
                            onChange={(e) => setBidEndTo(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mode 4: BOQ Title */}
                  {searchType === 'boq-search' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">BOQ Title</label>
                        <Input
                          placeholder="e.g. Supply and installation of solar panels..."
                          value={boqTitle}
                          onChange={(e) => setBoqTitle(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Bid Value (Rs.)</label>
                        <Input
                          placeholder="e.g. 500000"
                          value={bidValue}
                          onChange={(e) => setBidValue(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">End Date (From)</label>
                          <Input
                            type="date"
                            value={bidEndFrom}
                            onChange={(e) => setBidEndFrom(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">End Date (To)</label>
                          <Input
                            type="date"
                            value={bidEndTo}
                            onChange={(e) => setBidEndTo(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-blue-500" />
                      <span>Showing real-time results directly from GeM Advance Search engine.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="ghost" onClick={handleReset} className="text-xs h-9">
                        Clear Filters
                      </Button>
                      <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm h-9 px-5">
                        {loading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Search className="w-3.5 h-3.5 mr-2" />
                            Search Tenders
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Status / Errors */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Error fetching tenders</p>
                  <p className="text-xs text-red-600 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Results Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800">Open Tenders</h2>
                {searchResponse && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
                    {searchResponse.totalRecords.toLocaleString('en-IN')} tenders found
                  </span>
                )}
              </div>
              {searchResponse && searchResponse.totalPages > 1 && (
                <div className="text-xs text-slate-500">
                  Page <span className="font-semibold text-slate-800">{currentPage}</span> of{' '}
                  <span className="font-semibold text-slate-800">{searchResponse.totalPages}</span>
                </div>
              )}
            </div>

            {/* Tenders Grid / Cards */}
            {loading && !searchResponse ? (
              <div className="py-20 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
                <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-700">Connecting to GeM Portal...</h3>
                <p className="text-xs text-slate-400 mt-1">Extracting live active tenders and technical specifications.</p>
              </div>
            ) : searchResponse && searchResponse.bids.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-700">No tenders matched your search</h3>
                <p className="text-xs text-slate-400 mt-1">Try broadening your keywords or clearing date range filters.</p>
                <Button variant="outline" onClick={handleReset} className="mt-4 text-xs">
                  Reset Filters
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {searchResponse?.bids.map((tender) => {
                  const isStarred = isTenderStarred(tender);
                  const analysis = getTenderAnalysisData(tender);
                  const hasAiAnalysis = Boolean(analysis);
                  const tenderKey = tender.bidNumber || String(tender.id);
                  const bidKey = `live_${tenderKey}`;
                  const isExpanded = Boolean(expandedSummaries[bidKey]);
                  const activeLang = summaryLanguages[bidKey] || 'hindi';
                  const estValueInfo = getEstimatedValueInfo(analysis);
                  const placeBadge = getPlaceBadgeInfo(analysis, tender);
                  const isStarringThis = starringKey === tender.bidNumber || starringKey === String(tender.id);

                  return (
                    <Card
                      key={tender.id}
                      className={`border transition-all rounded-xl bg-white overflow-hidden ${
                        isStarred
                          ? 'border-amber-300 ring-1 ring-amber-200 shadow-md'
                          : 'border-slate-200 hover:border-blue-400 hover:shadow-md'
                      }`}
                    >
                      <div className="p-5 sm:p-6">
                        {/* Top Row: Bid Number, Badges, Star Button, Days left */}
                        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bid No:</span>
                            <span className="font-mono text-sm font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                              {tender.bidNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyBidNumber(tender.bidNumber, tender.id)}
                              className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors"
                              title="Copy Bid Number"
                            >
                              {copiedId === tender.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Starred Badge */}
                            {isStarred && (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                Starred
                              </span>
                            )}

                            {/* AI Analyzed Badge */}
                            {hasAiAnalysis && (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                AI Analyzed
                              </span>
                            )}

                            {/* Type Badges */}
                            {tender.isRA && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700">
                                RA
                              </span>
                            )}
                            {tender.isBunch && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-700">
                                Bunch
                              </span>
                            )}
                            {tender.isHighValue && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                                High Value
                              </span>
                            )}
                            {tender.isCustomItem && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-teal-100 text-teal-800">
                                Custom
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Star / Favourite Action Button */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleStar(tender, e)}
                              disabled={isStarringThis}
                              className={`p-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-semibold ${
                                isStarred
                                  ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-500 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50/50'
                              }`}
                              title={isStarred ? 'Click to Remove from Starred' : 'Add to Starred (Saved in Firebase)'}
                            >
                              <Star
                                className={`w-4 h-4 transition-transform ${
                                  isStarred
                                    ? 'fill-amber-400 text-amber-500 scale-110'
                                    : 'text-slate-400 group-hover:text-amber-500'
                                } ${isStarringThis ? 'animate-spin' : ''}`}
                              />
                              <span>
                                {isStarred ? 'Starred' : 'Star'}
                              </span>
                            </button>

                            {getRemainingDaysBadge(tender.endDate)}
                          </div>
                        </div>

                        {/* Body Content */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-4">
                          {/* Left 2 Cols: Title, Location Badge, Items, Ministry, Summary */}
                          <div className="lg:col-span-2 space-y-3">
                            <div>
                              {/* Title line with Town & District on the right */}
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-base font-bold text-slate-900 leading-snug hover:text-blue-600 transition-colors">
                                  {analysis?.itemTitle || tender.categoryName || 'General Tender Requirement'}
                                </h3>

                                {placeBadge && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-900 font-bold text-xs shadow-xs">
                                    <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                    <span>{placeBadge}</span>
                                  </span>
                                )}
                              </div>

                              {tender.items && tender.items.length > 1 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {tender.items.slice(0, 5).map((item, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-block text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium"
                                    >
                                      {item}
                                    </span>
                                  ))}
                                  {tender.items.length > 5 && (
                                    <span className="inline-block text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                                      +{tender.items.length - 5} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Ministry / Department details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                              <div>
                                <span className="text-slate-400 font-medium block">Ministry / State:</span>
                                <span className="font-semibold text-slate-800">{analysis?.ministryName || tender.ministryName || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-medium block">Department:</span>
                                <span className="font-semibold text-slate-800">{analysis?.departmentName || tender.departmentName || 'N/A'}</span>
                              </div>
                              {analysis?.organisationName && (
                                <div>
                                  <span className="text-slate-400 font-medium block">Organisation:</span>
                                  <span className="font-semibold text-slate-800">{analysis.organisationName}</span>
                                </div>
                              )}
                              {analysis?.officeName && (
                                <div>
                                  <span className="text-slate-400 font-medium block">Office:</span>
                                  <span className="font-semibold text-slate-800">{analysis.officeName}</span>
                                </div>
                              )}
                            </div>

                            {/* Collapsible / Expandable AI Summary Card */}
                            {analysis && (analysis.summaryHindi || analysis.summaryEnglish) && (
                              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 text-xs text-slate-800 transition-all">
                                <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-amber-200/60">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-amber-900 tracking-wide text-xs">Summary:</span>
                                    <div className="inline-flex rounded-lg bg-amber-100/80 p-0.5 border border-amber-200">
                                      {analysis.summaryHindi && (
                                        <button
                                          type="button"
                                          onClick={() => switchSummaryLang(bidKey, 'hindi')}
                                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                                            activeLang === 'hindi'
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
                                          onClick={() => switchSummaryLang(bidKey, 'english')}
                                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                                            activeLang === 'english'
                                              ? 'bg-white text-amber-950 shadow-xs'
                                              : 'text-amber-800 hover:text-amber-950'
                                          }`}
                                        >
                                          English
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => toggleSummaryExpand(bidKey)}
                                    className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-0.5"
                                  >
                                    <span>{isExpanded ? 'Show Less' : 'Read Full Summary'}</span>
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>
                                </div>

                                <div className={`leading-relaxed text-slate-800 ${isExpanded ? '' : 'line-clamp-2'}`}>
                                  {activeLang === 'hindi'
                                    ? analysis.summaryHindi || analysis.summaryEnglish
                                    : analysis.summaryEnglish || analysis.summaryHindi}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right Col: Quantity, EMD, Est Value, Dates */}
                          <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-100 flex flex-col justify-between space-y-2 text-xs">
                            <div className="space-y-2">
                              {analysis && (
                                <>
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-medium">EMD Amount:</span>
                                    <span className="font-bold text-emerald-700">
                                      {analysis.emdAmount?.required && analysis.emdAmount.amount > 0
                                        ? `₹ ${analysis.emdAmount.amount.toLocaleString('en-IN')}`
                                        : '₹ 0 (Nil)'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-medium">Est. Value:</span>
                                    <div className="text-right">
                                      <span className="font-bold text-slate-800 block">{estValueInfo.text}</span>
                                      {estValueInfo.isCalculated && (
                                        <span className="text-[10px] text-blue-600 font-semibold block">
                                          (1% EMD Est.)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-medium">Quantity:</span>
                                <span className="font-bold text-slate-800">
                                  {(analysis?.totalQuantity || tender.totalQuantity || 1).toLocaleString('en-IN')} Units
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-medium">Start Date:</span>
                                <span className="text-slate-700">{formatDisplayDate(tender.startDate)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-medium">Bid End Date:</span>
                                <span className="font-bold text-red-600">{formatDisplayDate(tender.endDate)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Action Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* AI Deep Analysis Button */}
                            {(() => {
                              const isJobActive = aiJobs.some(
                                (j) => j.bidNumber.trim().toUpperCase() === tenderKey && (j.status === 'running' || j.status === 'queued')
                              );
                              const activeJob = aiJobs.find((j) => j.bidNumber.trim().toUpperCase() === tenderKey);

                              return (
                                <Button
                                  size="sm"
                                  onClick={() => handleRunAIAnalysis(tender)}
                                  disabled={isJobActive}
                                  className={`text-xs font-semibold h-8 px-3 transition-all shadow-sm ${
                                    hasAiAnalysis
                                      ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white'
                                      : isJobActive
                                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white cursor-wait'
                                      : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white'
                                  }`}
                                >
                                  <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${isJobActive ? 'animate-spin' : ''}`} />
                                  {isJobActive
                                    ? activeJob?.status === 'running'
                                      ? 'Analyzing with AI...'
                                      : 'Queued in AI Worker...'
                                    : hasAiAnalysis
                                    ? 'View AI Insights'
                                    : 'AI Full Analysis'}
                                </Button>
                              );
                            })()}

                            <a
                              href={tender.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                              PDF
                            </a>

                            <button
                              type="button"
                              onClick={() => openCorrigendumModal(tender)}
                              className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                              Corrigendum
                            </button>
                          </div>

                          {/* Only show Import to Panel if AI analysis is complete */}
                          {hasAiAnalysis && analysis && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleImportTender(tender, analysis)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8 px-4 shadow-sm"
                              >
                                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                Import to Tender Panel
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Pagination Bar */}
            {searchResponse && searchResponse.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between bg-white px-4 py-3 border border-slate-200 rounded-xl shadow-sm">
                <div className="text-xs text-slate-500">
                  Showing page <span className="font-semibold text-slate-800">{currentPage}</span> of{' '}
                  <span className="font-semibold text-slate-800">{searchResponse.totalPages}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1 || loading}
                    onClick={() => fetchBids(currentPage - 1)}
                    className="text-xs"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= searchResponse.totalPages || loading}
                    onClick={() => fetchBids(currentPage + 1)}
                    className="text-xs"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* VIEW 2: STARRED TENDERS ARCHIVE (SAVED IN FIREBASE) */}
        {viewMode === 'starred' && (
          <div className="space-y-6">
            {/* Header, Search, Filter & Sort Control Card */}
            <Card className="shadow-lg border-slate-200 bg-white rounded-xl overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
                      Starred Tenders Archive
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {starredTenders.length} tenders saved in Firebase cloud database with AI document extraction.
                    </p>
                  </div>

                  {/* Summary Metric Chips */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-200">
                      Total: {starredTenders.length}
                    </span>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-800 font-semibold rounded-lg border border-emerald-200 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      AI Analyzed: {totalAnalyzedCount}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadStarredTenders}
                      className="h-8 px-3 text-xs"
                      title="Reload from Firestore"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                      Sync
                    </Button>
                  </div>
                </div>

                {/* Filter and Sort Control Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
                  {/* 1. Search Box */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search by bid, dept, item, office..."
                      value={starredSearchQuery}
                      onChange={(e) => setStarredSearchQuery(e.target.value)}
                      className="pl-9 text-xs h-9"
                    />
                  </div>

                  {/* 2. Town / District Filter */}
                  <div>
                    <select
                      value={starredTownDistrictFilter}
                      onChange={(e) => setStarredTownDistrictFilter(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Towns & Districts</option>
                      {starredTownDistrictsList.map((place, idx) => (
                        <option key={idx} value={place}>
                          📍 {place}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. AI Analysis Status Filter */}
                  <div>
                    <select
                      value={starredStatusFilter}
                      onChange={(e) => setStarredStatusFilter(e.target.value as any)}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All AI Status ({starredTenders.length})</option>
                      <option value="analyzed">AI Analyzed Only ({totalAnalyzedCount})</option>
                      <option value="pending">Pending AI Analysis ({starredTenders.length - totalAnalyzedCount})</option>
                    </select>
                  </div>

                  {/* 4. Ministry / State Filter */}
                  <div>
                    <select
                      value={starredMinistryFilter}
                      onChange={(e) => setStarredMinistryFilter(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All States & Ministries</option>
                      {starredMinistriesList.map((m, idx) => (
                        <option key={idx} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 5. Sort By */}
                  <div>
                    <select
                      value={starredSortBy}
                      onChange={(e) => setStarredSortBy(e.target.value as any)}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="recent">Sort: Recently Starred</option>
                      <option value="ending_soon">Sort: Ending Soonest</option>
                      <option value="est_value">Sort: Highest Est. Value / EMD</option>
                      <option value="quantity">Sort: Highest Quantity</option>
                      <option value="bid_no">Sort: Bid Number (A-Z)</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>

            {filteredStarredTenders.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <Star className="w-12 h-12 text-amber-200 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-700">No Starred Tenders Matched</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {starredSearchQuery || starredStatusFilter !== 'all' || starredMinistryFilter || starredTownDistrictFilter
                    ? 'No tenders match the selected filters or search keyword.'
                    : 'You haven’t starred any GeM tenders yet. Explore live tenders and click the Star button to save them.'}
                </p>
                {starredSearchQuery || starredStatusFilter !== 'all' || starredMinistryFilter || starredTownDistrictFilter ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStarredSearchQuery('');
                      setStarredStatusFilter('all');
                      setStarredMinistryFilter('');
                      setStarredTownDistrictFilter('');
                    }}
                    className="mt-4 text-xs"
                  >
                    Clear All Filters
                  </Button>
                ) : (
                  <Button
                    onClick={() => setViewMode('live')}
                    className="mt-4 bg-blue-600 text-white text-xs"
                  >
                    <Search className="w-3.5 h-3.5 mr-1.5" />
                    Explore Live GeM Tenders
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredStarredTenders.map((tender) => {
                  const analysis = getTenderAnalysisData(tender);
                  const hasAiAnalysis = Boolean(analysis);
                  const tenderKey = tender.bidNumber || String(tender.gemBidId || tender.id);
                  const bidKey = `starred_${tenderKey}`;
                  const isExpanded = Boolean(expandedSummaries[bidKey]);
                  const activeLang = summaryLanguages[bidKey] || 'hindi';
                  const estValueInfo = getEstimatedValueInfo(analysis);
                  const placeBadge = getPlaceBadgeInfo(analysis, tender);
                  const isStarringThis = starringKey === tender.bidNumber || starringKey === String(tender.gemBidId || tender.id);

                  return (
                    <Card
                      key={tender.id || tender.bidNumber}
                      className="border border-amber-200 ring-1 ring-amber-100 hover:border-amber-400 hover:shadow-md transition-all rounded-xl bg-white overflow-hidden"
                    >
                      <div className="p-5 sm:p-6">
                        {/* Top Strip: Bid No, AI Status Badge, Star Toggle */}
                        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bid No:</span>
                            <span className="font-mono text-sm font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                              {tender.bidNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyBidNumber(tender.bidNumber, tender.gemBidId || tender.id)}
                              className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors"
                              title="Copy Bid Number"
                            >
                              {copiedId === (tender.gemBidId || tender.id) ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {hasAiAnalysis ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                AI Analyzed
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 flex items-center gap-1">
                                Pending AI Analysis
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => handleToggleStar(tender, e)}
                              disabled={isStarringThis}
                              className="p-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm"
                              title="Click to Remove from Starred"
                            >
                              <Star className={`w-4 h-4 fill-amber-400 text-amber-500 ${isStarringThis ? 'animate-spin' : ''}`} />
                              <span>Starred</span>
                            </button>

                            {getRemainingDaysBadge(tender.endDate)}
                          </div>
                        </div>

                        {/* Middle Content */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-4">
                          <div className="lg:col-span-2 space-y-3">
                            {/* Title line with Town & District on the right */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h3 className="text-base font-bold text-slate-900 leading-snug">
                                {analysis?.itemTitle || tender.categoryName}
                              </h3>

                              {placeBadge && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-900 font-bold text-xs shadow-xs">
                                  <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                  <span>{placeBadge}</span>
                                </span>
                              )}
                            </div>

                            {/* Government Hierarchy Breakdown */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                              <div>
                                <span className="text-slate-400 font-medium block">Ministry / State:</span>
                                <span className="font-semibold text-slate-800">
                                  {analysis?.ministryName || tender.ministryName || 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-medium block">Department:</span>
                                <span className="font-semibold text-slate-800">
                                  {analysis?.departmentName || tender.departmentName || 'N/A'}
                                </span>
                              </div>
                              {analysis?.organisationName && (
                                <div>
                                  <span className="text-slate-400 font-medium block">Organisation:</span>
                                  <span className="font-semibold text-slate-800">{analysis.organisationName}</span>
                                </div>
                              )}
                              {analysis?.officeName && (
                                <div>
                                  <span className="text-slate-400 font-medium block">Office:</span>
                                  <span className="font-semibold text-slate-800">{analysis.officeName}</span>
                                </div>
                              )}
                            </div>

                            {/* Collapsible / Expandable AI Summary Card */}
                            {analysis && (analysis.summaryHindi || analysis.summaryEnglish) && (
                              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 text-xs text-slate-800 transition-all">
                                <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-amber-200/60">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-amber-900 tracking-wide text-xs">Summary:</span>
                                    <div className="inline-flex rounded-lg bg-amber-100/80 p-0.5 border border-amber-200">
                                      {analysis.summaryHindi && (
                                        <button
                                          type="button"
                                          onClick={() => switchSummaryLang(bidKey, 'hindi')}
                                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                                            activeLang === 'hindi'
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
                                          onClick={() => switchSummaryLang(bidKey, 'english')}
                                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                                            activeLang === 'english'
                                              ? 'bg-white text-amber-950 shadow-xs'
                                              : 'text-amber-800 hover:text-amber-950'
                                          }`}
                                        >
                                          English
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => toggleSummaryExpand(bidKey)}
                                    className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-0.5"
                                  >
                                    <span>{isExpanded ? 'Show Less' : 'Read Full Summary'}</span>
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>
                                </div>

                                <div className={`leading-relaxed text-slate-800 ${isExpanded ? '' : 'line-clamp-2'}`}>
                                  {activeLang === 'hindi'
                                    ? analysis.summaryHindi || analysis.summaryEnglish
                                    : analysis.summaryEnglish || analysis.summaryHindi}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Financials & Key Info Strip */}
                          <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-100 flex flex-col justify-between space-y-2 text-xs">
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-medium">EMD Amount:</span>
                                <span className="font-bold text-emerald-700">
                                  {analysis?.emdAmount?.required && analysis.emdAmount.amount > 0
                                    ? `₹ ${analysis.emdAmount.amount.toLocaleString('en-IN')}`
                                    : '₹ 0 (Nil)'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-medium">Est. Value:</span>
                                <div className="text-right">
                                  <span className="font-bold text-slate-800 block">{estValueInfo.text}</span>
                                  {estValueInfo.isCalculated && (
                                    <span className="text-[10px] text-blue-600 font-semibold block">
                                      (1% EMD Est.)
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-medium">Quantity:</span>
                                <span className="font-bold text-slate-800">
                                  {(analysis?.totalQuantity || tender.totalQuantity || 1).toLocaleString('en-IN')} Units
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-medium">Bid End Date:</span>
                                <span className="font-bold text-red-600">{formatDisplayDate(tender.endDate)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                          <div className="flex flex-wrap items-center gap-2">
                            {(() => {
                              const isJobActive = aiJobs.some(
                                (j) => j.bidNumber.trim().toUpperCase() === tenderKey && (j.status === 'running' || j.status === 'queued')
                              );
                              const activeJob = aiJobs.find((j) => j.bidNumber.trim().toUpperCase() === tenderKey);

                              return (
                                <Button
                                  size="sm"
                                  onClick={() => handleRunAIAnalysis(tender)}
                                  disabled={isJobActive}
                                  className={`font-semibold text-xs h-8 px-3.5 shadow-sm transition-all ${
                                    analysis
                                      ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white'
                                      : isJobActive
                                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white cursor-wait'
                                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                                  }`}
                                >
                                  <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${isJobActive ? 'animate-spin' : ''}`} />
                                  {isJobActive
                                    ? activeJob?.status === 'running'
                                      ? 'Analyzing with AI...'
                                      : 'Queued in AI Worker...'
                                    : analysis
                                    ? 'View AI Insights'
                                    : 'Run Full AI Analysis'}
                                </Button>
                              );
                            })()}

                            <a
                              href={tender.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                              GeM PDF
                            </a>
                          </div>

                          {/* Only show Import to Panel if AI analysis is complete */}
                          {hasAiAnalysis && analysis && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleImportTender(tender, analysis)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8 px-4 shadow-sm"
                              >
                                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                Import to Tender Panel
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Analysis Full Intelligence Modal */}
      {selectedTenderForAnalysis && (
        <TenderAIAnalysisModal
          isOpen={aiModalOpen}
          onClose={() => {
            setAiModalOpen(false);
            setSelectedTenderForAnalysis(null);
            setCurrentAnalysis(null);
          }}
          tender={selectedTenderForAnalysis}
          analysis={currentAnalysis}
          loading={aiAnalysisLoading}
          onReanalyze={handleReanalyzeCurrent}
          onImportToTender={(t, a) => handleImportTender(t, a)}
        />
      )}

      {/* Corrigendum Modal */}
      {corrigendumModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-base font-bold text-slate-800">Corrigendum Details</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedBidForCorrigendum?.bidNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setCorrigendumModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {corrigendumLoading ? (
                <div className="py-12 text-center">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Fetching latest corrigendum records...</p>
                </div>
              ) : (
                <div
                  className="prose prose-sm max-w-none text-slate-700"
                  dangerouslySetInnerHTML={{ __html: corrigendumHtml }}
                />
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setCorrigendumModalOpen(false)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 24/7 Server-Side Auto-Scanner Modal */}
      <AutoScannerModal
        isOpen={autoScannerOpen}
        onClose={() => setAutoScannerOpen(false)}
        onRefreshData={() => {
          loadStarredTenders();
          loadGlobalAnalyses();
        }}
      />

      {/* Background AI Analysis Job Queue Drawer */}
      <AiJobQueueDrawer
        jobs={aiJobs}
        onClearCompleted={handleClearCompletedJobs}
        onViewAnalysis={handleViewJobAnalysis}
        onCancelJob={handleCancelJob}
      />
    </div>
  );
}
