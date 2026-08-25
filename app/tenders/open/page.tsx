'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  FileText,
  Download,
  Building2,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { GeMSearchFilters, GeMTender, GeMSearchResponse, GeMSearchType } from '@/types/gem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

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

export default function OpenTendersPage() {
  const router = useRouter();

  // Search Type & Filters
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

  // Corrigendum Modal State
  const [corrigendumModalOpen, setCorrigendumModalOpen] = useState(false);
  const [corrigendumLoading, setCorrigendumLoading] = useState(false);
  const [corrigendumHtml, setCorrigendumHtml] = useState<string>('');
  const [selectedBidForCorrigendum, setSelectedBidForCorrigendum] = useState<GeMTender | null>(null);

  // Copied state tracker
  const [copiedId, setCopiedId] = useState<number | null>(null);

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
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">Closed</span>;
      }
      if (diffDays === 0) {
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 animate-pulse">Ends Today</span>;
      }
      if (diffDays <= 3) {
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">{diffDays} Days Left</span>;
      }
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">{diffDays} Days Left</span>;
    } catch {
      return null;
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
  const copyBidNumber = (bidNum: string, id: number) => {
    navigator.clipboard.writeText(bidNum);
    setCopiedId(id);
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

  // Import Tender into Site's Tender Automation
  const handleImportTender = (tender: GeMTender) => {
    const importPayload = {
      title: tender.categoryName || `Tender ${tender.bidNumber}`,
      tenderNumber: tender.bidNumber,
      submissionDate: tender.endDate ? tender.endDate.split('T')[0] : '',
      departmentName: tender.departmentName || tender.ministryName || '',
      items: tender.items.map((itemName) => ({
        productName: itemName,
        quantity: tender.totalQuantity || 1,
        rate: 0,
        gstPercent: 18,
      })),
      notes: `Imported from GeM Bid: ${tender.bidNumber}\nMinistry: ${tender.ministryName || 'N/A'}\nDepartment: ${tender.departmentName || 'N/A'}\nPDF URL: ${tender.pdfUrl}`,
    };

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('gem_import_tender', JSON.stringify(importPayload));
      router.push('/tenders/new');
    }
  };

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
                <span>GeM Open Tenders Explorer</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                  Live Scraping
                </span>
              </h1>
              <p className="text-slate-300 text-sm mt-1 max-w-2xl">
                Browse, search, and import active tenders and reverse auctions from Government e-Marketplace (GeM).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => fetchBids(currentPage)}
                disabled={loading}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs sm:text-sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh Bids
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
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
            {searchResponse?.bids.map((tender) => (
              <Card
                key={tender.id}
                className="border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all rounded-xl bg-white overflow-hidden"
              >
                <div className="p-5 sm:p-6">
                  {/* Top Row: Bid Number, Badges, Status */}
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

                      {/* Type Badges */}
                      {tender.isRA && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700">
                          Reverse Auction (RA)
                        </span>
                      )}
                      {tender.isBunch && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-700">
                          Bunch Bid
                        </span>
                      )}
                      {tender.isHighValue && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                          High Value
                        </span>
                      )}
                      {tender.isCustomItem && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-teal-100 text-teal-800">
                          Custom Item
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {getRemainingDaysBadge(tender.endDate)}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-4">
                    {/* Left 2 Cols: Title, Items, Ministry */}
                    <div className="lg:col-span-2 space-y-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug hover:text-blue-600 transition-colors">
                          {tender.categoryName || 'General Tender Requirement'}
                        </h3>
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="truncate">
                            <span className="text-slate-400 font-medium">Ministry:</span>{' '}
                            <span className="font-semibold text-slate-800">{tender.ministryName || 'Government Body'}</span>
                          </span>
                        </div>
                        {tender.departmentName && (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="truncate">
                              <span className="text-slate-400 font-medium">Dept:</span>{' '}
                              <span className="font-semibold text-slate-800">{tender.departmentName}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Col: Quantity, Dates & Key Metrics */}
                    <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-100 flex flex-col justify-between space-y-2 text-xs">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">Quantity:</span>
                          <span className="font-bold text-slate-800">{tender.totalQuantity.toLocaleString('en-IN')} Units</span>
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
                      <a
                        href={tender.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                        Download GeM PDF
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

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleImportTender(tender)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8 px-4 shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        Import into Tender Panel
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
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
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: Math.min(5, searchResponse.totalPages) }, (_, i) => {
                  let pageNum = currentPage;
                  if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= searchResponse.totalPages - 2) {
                    pageNum = searchResponse.totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  if (pageNum < 1 || pageNum > searchResponse.totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => fetchBids(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                        pageNum === currentPage
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
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
      </div>

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
    </div>
  );
}
