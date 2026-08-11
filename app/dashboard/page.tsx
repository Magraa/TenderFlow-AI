'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Plus,
  Settings,
  Inbox,
  Eye,
  Trash2,
  FileText,
  Calendar,
  Hash,
  Receipt,
  Building2,
  Search,
  Copy,
  Printer,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  MapPin,
  Wallet,
  Percent,
  Clock,
  Languages,
  Package,
} from 'lucide-react';
import { Bill, Firm, Tender } from '@/types';
import { dataService } from '@/services/dataService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function getTenderGrandTotal(tender: Tender): number {
  const subtotal = tender.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const gst = tender.items.reduce((sum, item) => sum + (item.quantity * item.rate * item.gstPercent) / 100, 0);
  return subtotal + gst;
}

/** Parses a tender's submission date and classifies how urgent it is, for the dashboard's deadline chip. */
function getDeadlineUrgency(dateStr?: string): { label: string; classes: string } | null {
  if (!dateStr || !dateStr.trim()) return null;
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(parsed);
  target.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const formatted = format(parsed, 'dd/MM/yyyy');
  if (daysLeft < 0) return { label: `Overdue — was ${formatted}`, classes: 'bg-red-50 text-red-700 border-red-200' };
  if (daysLeft === 0) return { label: `Due today (${formatted})`, classes: 'bg-red-50 text-red-700 border-red-200' };
  if (daysLeft <= 3) return { label: `Due in ${daysLeft}d (${formatted})`, classes: 'bg-amber-50 text-amber-800 border-amber-200' };
  return { label: `Due ${formatted}`, classes: 'bg-slate-50 text-slate-600 border-slate-200' };
}

/**
 * Parse invoice date string to timestamp for clean sorting
 */
function getInvoiceDateTimestamp(dateStr?: string): number {
  if (!dateStr || !dateStr.trim() || dateStr.includes('..')) return 0;
  const str = dateStr.trim();

  // Match DD/MM/YYYY or D/M/YY format
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (ddmmyyyy) {
    let day = parseInt(ddmmyyyy[1], 10);
    let month = parseInt(ddmmyyyy[2], 10) - 1;
    let year = parseInt(ddmmyyyy[3], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day).getTime();
  }

  const parsed = new Date(str).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Compare two bills according to selected sort option
 */
function compareBills(a: Bill, b: Bill, sortBy: string): number {
  if (sortBy === 'created_desc') {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }
  if (sortBy === 'created_asc') {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }
  if (sortBy === 'invoice_date_desc') {
    const tA = getInvoiceDateTimestamp(a.invoiceDate);
    const tB = getInvoiceDateTimestamp(b.invoiceDate);
    if (tA === tB) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return tB - tA;
  }
  if (sortBy === 'invoice_date_asc') {
    const tA = getInvoiceDateTimestamp(a.invoiceDate);
    const tB = getInvoiceDateTimestamp(b.invoiceDate);
    if (tA === 0 && tB !== 0) return 1;
    if (tB === 0 && tA !== 0) return -1;
    if (tA === tB) {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return tA - tB;
  }
  if (sortBy === 'invoice_num_asc') {
    const numA = parseInt((a.invoiceNumber || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt((b.invoiceNumber || '').replace(/\D/g, ''), 10) || 0;
    if (numA === numB) {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return numA - numB;
  }
  if (sortBy === 'invoice_num_desc') {
    const numA = parseInt((a.invoiceNumber || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt((b.invoiceNumber || '').replace(/\D/g, ''), 10) || 0;
    if (numA === numB) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return numB - numA;
  }
  return 0;
}

/**
 * Extract numeric portion from invoice string or compute next sequential number
 */
function getNextInvoiceNumber(currentNumber: string, existingBills: Bill[], firmId?: string): string {
  // If numeric e.g. "120" -> "121", "INV-901" -> "INV-902"
  const match = currentNumber.match(/(\d+)/);
  if (match) {
    const numStr = match[1];
    const nextNum = parseInt(numStr, 10) + 1;
    // Keep zero padding if original had padded zeroes
    const padded = nextNum.toString().padStart(numStr.length, '0');
    return currentNumber.replace(numStr, padded);
  }

  // Fallback: search all existing bills for this firm and find max numeric value
  const firmBills = existingBills.filter((b) => !firmId || b.firmId === firmId);
  let maxVal = 0;
  firmBills.forEach((b) => {
    const m = (b.invoiceNumber || '').match(/(\d+)/);
    if (m) {
      const v = parseInt(m[1], 10);
      if (v > maxVal) maxVal = v;
    }
  });

  return maxVal > 0 ? (maxVal + 1).toString() : '1';
}

export default function DashboardPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);

  // Active tab state
  const [activeTab, setActiveTab] = useState<'tenders' | 'bills'>('tenders');

  // Universal Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Shared Filters
  const [selectedFirmId, setSelectedFirmId] = useState<string>('all');

  // Tender specific filters
  const [tenderStatusFilter, setTenderStatusFilter] = useState<string>('all');
  const [tenderLangFilter, setTenderLangFilter] = useState<string>('all');

  // Bill specific filters
  const [billStatusFilter, setBillStatusFilter] = useState<string>('all');
  const [billDateFilter, setBillDateFilter] = useState<string>('all'); // 'all' | 'dated' | 'blank'
  const [billSortBy, setBillSortBy] = useState<string>('created_desc'); // 'created_desc' | 'created_asc' | 'invoice_date_desc' | 'invoice_date_asc' | 'invoice_num_asc' | 'invoice_num_desc'

  // Cascading Stack Cards toggle
  const [enableStacking, setEnableStacking] = useState(true);
  const [expandedStacks, setExpandedStacks] = useState<Record<string, boolean>>({});

  // Map for quick firm lookup
  const firmsMap = useMemo(() => {
    const map = new Map<string, Firm>();
    firms.forEach((f) => map.set(f.id, f));
    return map;
  }, [firms]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [tendersList, billsList, firmsList] = await Promise.all([
        dataService.tenders.list(),
        dataService.bills.list(),
        dataService.firms.list(),
      ]);
      if (cancelled) return;
      setTenders(tendersList);
      setBills(billsList);
      setFirms(firmsList);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Actions
  const handleDeleteTender = async (id: string) => {
    if (!confirm('Delete this tender?')) return;
    await dataService.tenders.delete(id);
    setTenders((previous) => previous.filter((tender) => tender.id !== id));
  };

  const handleDeleteBill = async (id: string) => {
    if (!confirm('Delete this bill?')) return;
    await dataService.bills.delete(id);
    setBills((previous) => previous.filter((bill) => bill.id !== id));
  };

  // Duplicate Bill (Exact clone)
  const handleDuplicateBill = async (billToDuplicate: Bill) => {
    try {
      const { id, createdAt, updatedAt, ...copyData } = billToDuplicate;
      const created = await dataService.bills.create({
        ...copyData,
        status: 'final',
        notes: `Duplicated from Invoice ${billToDuplicate.invoiceNumber || ''}`,
      });
      if (created) {
        setBills((prev) => [created, ...prev]);
        setActiveTab('bills');
      }
    } catch (err) {
      console.error('Error duplicating bill:', err);
      alert('Failed to duplicate bill.');
    }
  };

  // Duplicate Bill + 1 (Increment invoice number)
  const handleIncrementDuplicateBill = async (billToDuplicate: Bill) => {
    try {
      const { id, createdAt, updatedAt, ...copyData } = billToDuplicate;
      const nextInvNo = getNextInvoiceNumber(billToDuplicate.invoiceNumber || '1', bills, billToDuplicate.firmId);

      const created = await dataService.bills.create({
        ...copyData,
        invoiceNumber: nextInvNo,
        status: 'final',
        notes: `Created via +1 Increment from Invoice ${billToDuplicate.invoiceNumber || ''}`,
      });
      if (created) {
        setBills((prev) => [created, ...prev]);
        setActiveTab('bills');
      }
    } catch (err) {
      console.error('Error duplicating bill with +1:', err);
      alert('Failed to duplicate bill with incremented invoice number.');
    }
  };

  const toggleStackExpand = (stackKey: string) => {
    setExpandedStacks((prev) => ({
      ...prev,
      [stackKey]: !prev[stackKey],
    }));
  };

  // ─── FILTERING LOGIC ───────────────────────────────────────────────────────
  const q = searchQuery.toLowerCase().trim();

  // Filtered Tenders
  const filteredTenders = useMemo(() => {
    return tenders.filter((tender) => {
      // Firm match
      if (selectedFirmId !== 'all' && tender.mainFirmId !== selectedFirmId) return false;
      // Status match
      if (tenderStatusFilter !== 'all' && tender.status !== tenderStatusFilter) return false;
      // Language match
      if (tenderLangFilter !== 'all' && tender.language !== tenderLangFilter) return false;

      // Search Query match
      if (!q) return true;

      const firmName = firmsMap.get(tender.mainFirmId || '')?.name || '';
      const titleMatch = (tender.title || '').toLowerCase().includes(q);
      const numberMatch = (tender.tenderNumber || '').toLowerCase().includes(q);
      const districtMatch = (tender.districtName || '').toLowerCase().includes(q);
      const placeMatch = (tender.placeName || '').toLowerCase().includes(q);
      const firmMatch = firmName.toLowerCase().includes(q);

      // Item names & specs match
      const itemsMatch = tender.items.some((it) =>
        (it.productName || '').toLowerCase().includes(q) ||
        (it.description || '').toLowerCase().includes(q) ||
        (it.category || '').toLowerCase().includes(q)
      );

      return titleMatch || numberMatch || districtMatch || placeMatch || firmMatch || itemsMatch;
    });
  }, [tenders, selectedFirmId, tenderStatusFilter, tenderLangFilter, q, firmsMap]);

  // Filtered Bills
  const filteredBills = useMemo(() => {
    const list = bills.filter((bill) => {
      // Firm match
      if (selectedFirmId !== 'all' && bill.firmId !== selectedFirmId) return false;
      // Status match
      if (billStatusFilter !== 'all' && bill.status !== billStatusFilter) return false;

      // Date Option match
      if (billDateFilter === 'dated' && (!bill.invoiceDate || !bill.invoiceDate.trim())) return false;
      if (billDateFilter === 'blank' && bill.invoiceDate && bill.invoiceDate.trim().length > 0) return false;

      // Search Query match
      if (!q) return true;

      const firmName = firmsMap.get(bill.firmId || '')?.name || '';
      const invMatch = (bill.invoiceNumber || '').toLowerCase().includes(q);
      const addrMatch = (bill.recipientAddress || '').toLowerCase().includes(q);
      const deptMatch = (bill.recipientDepartment || '').toLowerCase().includes(q);
      const desigMatch = (bill.recipientDesignation || '').toLowerCase().includes(q);
      const distMatch = (bill.recipientDistrict || '').toLowerCase().includes(q);
      const dateMatch = (bill.invoiceDate || '').toLowerCase().includes(q);
      const firmMatch = firmName.toLowerCase().includes(q);

      // Item names match
      const itemsMatch = bill.items.some((it) =>
        (it.productName || '').toLowerCase().includes(q) ||
        (it.description || '').toLowerCase().includes(q)
      );

      return invMatch || addrMatch || deptMatch || desigMatch || distMatch || dateMatch || firmMatch || itemsMatch;
    });

    return list.sort((a, b) => compareBills(a, b, billSortBy));
  }, [bills, selectedFirmId, billStatusFilter, billDateFilter, billSortBy, q, firmsMap]);

  // ─── STACKING LOGIC FOR BILLS ────────────────────────────────────────────────
  // Stack bills that have same firm, same place, same items ("everything same"), and consecutive invoice numbers
  const stackedBillGroups = useMemo(() => {
    if (!enableStacking) {
      // Return individual items as single-element stacks
      return filteredBills.map((b) => ({ key: b.id, bills: [b] }));
    }

    // 1. Group bills by (firmId + recipient address/place + items signature)
    const signatureGroupsMap = new Map<string, Bill[]>();

    filteredBills.forEach((bill) => {
      const firmKey = bill.firmId || 'no-firm';
      const placeKey = (
        bill.recipientAddress ||
        `${bill.recipientDesignation || ''}_${bill.recipientDepartment || ''}_${bill.recipientDistrict || ''}`
      )
        .trim()
        .toLowerCase();

      // Items signature: productName + qty + unit + rate
      const itemsKey = (bill.items || [])
        .map(
          (it) =>
            `${(it.productName || '').trim().toLowerCase()}:${it.quantity}:${(it.unit || '').trim().toLowerCase()}:${it.rate}`
        )
        .join(';');

      const signature = `${firmKey}::${placeKey}::${itemsKey}`;

      if (!signatureGroupsMap.has(signature)) {
        signatureGroupsMap.set(signature, []);
      }
      signatureGroupsMap.get(signature)!.push(bill);
    });

    const result: { key: string; bills: Bill[] }[] = [];

    // 2. For each signature group, split into consecutive invoice number runs
    signatureGroupsMap.forEach((billsInGroup) => {
      // Parse invoice numbers for sorting & consecutive checking
      const parsedBills = billsInGroup.map((bill) => {
        const numMatch = (bill.invoiceNumber || '').match(/\d+/);
        const invNum = numMatch ? parseInt(numMatch[0], 10) : -1;
        return { bill, invNum };
      });

      // Sort by invoice number ascending (if valid) or created date
      parsedBills.sort((a, b) => {
        if (a.invNum !== -1 && b.invNum !== -1) {
          return a.invNum - b.invNum;
        }
        return new Date(a.bill.createdAt).getTime() - new Date(b.bill.createdAt).getTime();
      });

      // Break into consecutive runs
      let currentRun: typeof parsedBills = [];

      parsedBills.forEach((item) => {
        if (currentRun.length === 0) {
          currentRun.push(item);
        } else {
          const lastItem = currentRun[currentRun.length - 1];
          // Check if invoice number is equal or consecutive (e.g. 1009 & 1009, or 1009 & 1010)
          const isConsecutive =
            item.invNum !== -1 &&
            lastItem.invNum !== -1 &&
            (item.invNum === lastItem.invNum || item.invNum === lastItem.invNum + 1);

          if (isConsecutive) {
            currentRun.push(item);
          } else {
            // Finalize current run as a stack
            if (currentRun.length > 0) {
              const runBills = currentRun.map((r) => r.bill);
              result.push({ key: `stack_${runBills[0].id}`, bills: runBills });
            }
            currentRun = [item];
          }
        }
      });

      if (currentRun.length > 0) {
        const runBills = currentRun.map((r) => r.bill);
        result.push({ key: `stack_${runBills[0].id}`, bills: runBills });
      }
    });

    // 3. Sort inside each stack run and outer stack result according to billSortBy
    result.forEach((group) => {
      group.bills.sort((a, b) => compareBills(a, b, billSortBy));
    });

    result.sort((a, b) => compareBills(a.bills[0], b.bills[0], billSortBy));

    return result;
  }, [filteredBills, enableStacking, billSortBy]);

  const hasActiveFilters =
    searchQuery ||
    selectedFirmId !== 'all' ||
    tenderStatusFilter !== 'all' ||
    tenderLangFilter !== 'all' ||
    billStatusFilter !== 'all' ||
    billDateFilter !== 'all' ||
    billSortBy !== 'created_desc';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedFirmId('all');
    setTenderStatusFilter('all');
    setTenderLangFilter('all');
    setBillStatusFilter('all');
    setBillDateFilter('all');
    setBillSortBy('created_desc');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Top Header */}
      <div className="border-b bg-white shadow-xs">
        <div className="mx-auto flex max-w-screen-xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-4 py-6 sm:px-6 lg:px-8 bg-gradient-to-r from-slate-50 via-white to-emerald-50/20">
          <div>
            <h1 className="text-2.5xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
              <FileText className="h-7 w-7 text-primary" />
              Tender & Bill Automation
            </h1>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Offline drafting, firm letterheads, tax bills, & AI item transliterations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {/* New Bill Button */}
            <Link href="/bills/new">
              <Button
                variant="outline"
                className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-xs font-semibold text-xs h-9"
              >
                <Receipt className="h-4 w-4 text-emerald-600" />
                New Bill
              </Button>
            </Link>

            {/* New Tender Button */}
            <Link href="/tenders/new">
              <Button className="flex items-center gap-2 shadow-sm text-xs h-9 font-semibold">
                <Plus className="h-4 w-4" />
                New Tender
              </Button>
            </Link>

            <Link href="/manage-firms">
              <Button variant="outline" className="flex items-center gap-2 bg-white hover:bg-slate-50 text-xs h-9">
                <Building2 className="h-4 w-4 text-slate-600" />
                Firms
              </Button>
            </Link>

            <Link href="/settings">
              <Button variant="outline" className="flex items-center gap-2 bg-white hover:bg-slate-50 text-xs h-9">
                <Settings className="h-4 w-4 text-slate-600" />
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">

        {/* ─── SEARCH & FILTER SECTION ─── */}
        <Card className="bg-white border border-slate-200 shadow-xs overflow-hidden">
          <CardContent className="p-4 sm:p-5 space-y-4">
            {/* Search Input Bar */}
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by Item Name, Invoice/Tender No, Recipient, Department, or Firm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 h-10 border-slate-300 rounded-xl focus-visible:ring-emerald-500 text-sm shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Tailored Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                  Filters:
                </span>

                {/* Firm Filter (Shared) */}
                <div className="flex items-center gap-1.5">
                  <Label className="text-slate-600 font-medium">Firm:</Label>
                  <select
                    value={selectedFirmId}
                    onChange={(e) => setSelectedFirmId(e.target.value)}
                    className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">All Firms ({firms.length})</option>
                    {firms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tab Specific Filters */}
                {activeTab === 'tenders' ? (
                  <>
                    {/* Tender Status */}
                    <div className="flex items-center gap-1.5">
                      <Label className="text-slate-600 font-medium">Status:</Label>
                      <select
                        value={tenderStatusFilter}
                        onChange={(e) => setTenderStatusFilter(e.target.value)}
                        className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="all">All Statuses</option>
                        <option value="final">Final Only</option>
                        <option value="draft">Draft Only</option>
                      </select>
                    </div>

                    {/* Language Filter */}
                    <div className="flex items-center gap-1.5">
                      <Label className="text-slate-600 font-medium">Language:</Label>
                      <select
                        value={tenderLangFilter}
                        onChange={(e) => setTenderLangFilter(e.target.value)}
                        className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="all">All Languages</option>
                        <option value="hindi">Hindi</option>
                        <option value="english">English</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Date Type Filter */}
                    <div className="flex items-center gap-1.5">
                      <Label className="text-slate-600 font-medium">Date:</Label>
                      <select
                        value={billDateFilter}
                        onChange={(e) => setBillDateFilter(e.target.value)}
                        className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="all">All Bills</option>
                        <option value="dated">Dated Bills Only</option>
                        <option value="blank">Blank Date (_________) Only</option>
                      </select>
                    </div>

                    {/* Sort By Filter */}
                    <div className="flex items-center gap-1.5">
                      <Label className="text-slate-600 font-medium flex items-center gap-1">
                        <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                        Sort:
                      </Label>
                      <select
                        value={billSortBy}
                        onChange={(e) => setBillSortBy(e.target.value)}
                        className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                      >
                        <option value="created_desc">Created Date (Newest First)</option>
                        <option value="created_asc">Created Date (Oldest First)</option>
                        <option value="invoice_date_desc">Invoice Date (Newest First)</option>
                        <option value="invoice_date_asc">Invoice Date (Oldest First)</option>
                        <option value="invoice_num_asc">Invoice No (Low to High)</option>
                        <option value="invoice_num_desc">Invoice No (High to Low)</option>
                      </select>
                    </div>

                    {/* Stack View Toggle */}
                    <label className="flex items-center gap-1.5 cursor-pointer select-none bg-emerald-50/60 text-emerald-900 px-2.5 py-1 rounded-lg border border-emerald-200 font-medium">
                      <input
                        type="checkbox"
                        checked={enableStacking}
                        onChange={(e) => setEnableStacking(e.target.checked)}
                        className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                      />
                      <Layers className="h-3.5 w-3.5 text-emerald-600" />
                      Cascade Stack Bills
                    </label>
                  </>
                )}

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 px-2"
                  >
                    Reset Filters
                  </Button>
                )}
              </div>

              {/* Active Results Summary */}
              <div className="text-slate-500 font-medium text-xs">
                Showing{' '}
                <span className="font-bold text-slate-900">
                  {activeTab === 'tenders' ? filteredTenders.length : filteredBills.length}
                </span>{' '}
                {activeTab === 'tenders' ? 'tenders' : 'bills'}
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            Loading dashboard items...
          </div>
        ) : (
          <Tabs defaultValue="tenders" className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <TabsList className="bg-slate-100 p-1">
                <TabsTrigger
                  value="tenders"
                  onClick={() => setActiveTab('tenders')}
                  className="flex items-center gap-2 font-semibold"
                >
                  <FileText className="h-4 w-4" />
                  Tenders ({filteredTenders.length})
                </TabsTrigger>
                <TabsTrigger
                  value="bills"
                  onClick={() => setActiveTab('bills')}
                  className="flex items-center gap-2 font-semibold"
                >
                  <Receipt className="h-4 w-4 text-emerald-600" />
                  Bills & Invoices ({filteredBills.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ─── TENDERS TAB ─── */}
            <TabsContent value="tenders">
              {filteredTenders.length === 0 ? (
                <Card className="border-dashed border-2 bg-transparent shadow-none hover:bg-slate-50/50 transition-colors">
                  <CardContent className="flex flex-col items-center justify-center pt-16 pb-16 text-center">
                    <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                      <Inbox className="h-10 w-10 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Tenders Found</h3>
                    <p className="mb-8 text-slate-500 max-w-sm text-sm">
                      {hasActiveFilters ? 'No tenders match your active search filters.' : 'You haven\'t created any tender documents yet.'}
                    </p>
                    {hasActiveFilters ? (
                      <Button variant="outline" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    ) : (
                      <Link href="/tenders/new">
                        <Button size="lg" className="flex items-center gap-2 shadow-md">
                          <Plus className="h-5 w-5" />
                          Create First Tender
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 animate-in fade-in-up">
                  {filteredTenders.map((tender) => {
                    const firm = firmsMap.get(tender.mainFirmId || '');
                    // Main Item Name of first item
                    const mainItem = tender.items[0];
                    const mainItemName = mainItem?.productName || 'No items specified';
                    const deadline = getDeadlineUrgency(tender.submissionDate);

                    return (
                      <Card
                        key={tender.id}
                        className={`group overflow-hidden border-l-4 transition-all hover:border-slate-300 hover:shadow-md ${
                          tender.status === 'final' ? 'border-l-emerald-400' : 'border-l-amber-400'
                        }`}
                      >
                        <CardHeader className="bg-slate-50/60 pb-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <CardTitle className="text-lg font-bold text-slate-800 sm:text-xl">{tender.title}</CardTitle>
                              <CardDescription className="flex flex-wrap items-center gap-2 mt-1.5 font-medium text-xs sm:gap-2.5">
                                <span className="flex items-center gap-1 text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">
                                  <Hash className="h-3 w-3 text-slate-400" />
                                  {tender.tenderNumber}
                                </span>
                                {firm && (
                                  <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                                    <Building2 className="h-3 w-3 text-blue-600" />
                                    {firm.name}
                                  </span>
                                )}
                                <span className="hidden text-slate-300 sm:inline">•</span>
                                <span className="text-slate-600">{tender.items.length} items</span>
                                {deadline && (
                                  <span className={`flex items-center gap-1 rounded border px-2 py-0.5 font-semibold ${deadline.classes}`}>
                                    <Clock className="h-3 w-3" />
                                    {deadline.label}
                                  </span>
                                )}
                              </CardDescription>
                            </div>
                            <span
                              className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase ${
                                tender.status === 'final'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {tender.status}
                            </span>
                          </div>

                          {/* Item Highlight Section */}
                          <div className="mt-3.5 pt-3 border-t border-slate-200/70 flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                              Main Item Name:
                            </span>
                            <span className="font-semibold text-slate-900 bg-amber-50 text-amber-900 px-2.5 py-1 rounded-md border border-amber-200/80">
                              {mainItemName}
                            </span>
                            {tender.items.length > 1 && (
                              <span className="text-slate-500 font-medium text-[11px]">
                                (+{tender.items.length - 1} more items)
                              </span>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="pt-5">
                          <div className="mb-6 grid grid-cols-2 gap-2.5 text-sm sm:gap-4 sm:grid-cols-4">
                            <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <Languages className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Language</p>
                                <p className="font-medium capitalize text-slate-900 truncate">{tender.language}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Location</p>
                                <p className="font-medium text-slate-900 truncate">{tender.districtName || tender.placeName || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <Wallet className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Grand Total</p>
                                <p className="font-bold text-slate-900 truncate">₹{getTenderGrandTotal(tender).toLocaleString('en-IN')}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <Calendar className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Created</p>
                                <p className="font-medium text-slate-900 truncate">{format(new Date(tender.createdAt), 'dd/MM/yyyy')}</p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 sm:flex sm:justify-end sm:gap-2.5">
                            {/* View Documents Button */}
                            <Link href={`/tenders/${tender.id}`} className="contents">
                              <Button size="sm" className="flex items-center justify-center gap-2 shadow-xs">
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline">View Documents</span>
                                <span className="sm:hidden">View</span>
                              </Button>
                            </Link>

                            {/* Direct Print Button */}
                            <Link href={`/tenders/${tender.id}`} className="contents">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center justify-center gap-1.5 bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                title="Print Tender Documents"
                              >
                                <Printer className="h-4 w-4 text-slate-600" />
                                Print
                              </Button>
                            </Link>

                            {/* Delete Button */}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteTender(tender.id)}
                              className="flex items-center justify-center gap-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sm:hidden">Delete</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ─── BILLS TAB ─── */}
            <TabsContent value="bills">
              {filteredBills.length === 0 ? (
                <Card className="border-dashed border-2 bg-transparent shadow-none hover:bg-slate-50/50 transition-colors">
                  <CardContent className="flex flex-col items-center justify-center pt-16 pb-16 text-center">
                    <div className="h-20 w-20 rounded-full bg-emerald-50 flex items-center justify-center mb-6">
                      <Receipt className="h-10 w-10 text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Bills Found</h3>
                    <p className="mb-8 text-slate-500 max-w-sm text-sm">
                      {hasActiveFilters ? 'No bills match your active search filters.' : 'Create standalone tax bills with custom firm letterheads.'}
                    </p>
                    {hasActiveFilters ? (
                      <Button variant="outline" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    ) : (
                      <Link href="/bills/new">
                        <Button size="lg" className="flex items-center gap-2 shadow-md bg-emerald-600 hover:bg-emerald-700">
                          <Receipt className="h-5 w-5" />
                          Create First Bill
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-8 animate-in fade-in-up">
                  {stackedBillGroups.map(({ key: stackKey, bills: stackBillsList }) => {
                    const isStacked = enableStacking && stackBillsList.length > 1;
                    const isExpanded = expandedStacks[stackKey] ?? false;
                    const primaryBill = stackBillsList[0];
                    const firm = firmsMap.get(primaryBill.firmId || '');
                    const subBills = isStacked ? stackBillsList.slice(1) : [];

                    // Renders an individual bill card
                    const renderBillCard = (bill: Bill, isStackChild = false) => {
                      const cardFirm = firmsMap.get(bill.firmId || '');
                      const firstItem = bill.items[0];
                      const primaryItemName = firstItem?.productName || 'No items';

                      const isDateBlank = !bill.invoiceDate || !bill.invoiceDate.trim();
                      const dateDisplay = isDateBlank ? '_____________' : bill.invoiceDate;
                      const gstAmount = (bill.sgstAmount || 0) + (bill.cgstAmount || 0) + (bill.igstAmount || 0);

                      return (
                        <Card
                          key={bill.id}
                          className={`group border-l-4 transition-all ${
                            bill.status === 'final' ? 'border-l-emerald-400' : 'border-l-amber-400'
                          } ${
                            isStackChild
                              ? 'border-emerald-200/80 bg-white shadow-xs hover:border-emerald-400'
                              : 'hover:border-emerald-300 shadow-sm hover:shadow-md'
                          }`}
                        >
                          <CardHeader className="bg-emerald-50/40 pb-3.5 border-b border-slate-100">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2 sm:text-xl">
                                  <Receipt className="h-5 w-5 shrink-0 text-emerald-600" />
                                  Invoice No. {bill.invoiceNumber || 'Draft'}
                                </CardTitle>
                                <CardDescription className="flex flex-wrap items-center gap-2 mt-1.5 font-medium text-xs text-slate-600">
                                  {cardFirm && (
                                    <span className="bg-emerald-100/70 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                                      <Building2 className="h-3 w-3 text-emerald-700" />
                                      {cardFirm.name}
                                    </span>
                                  )}
                                  <span className="hidden text-slate-300 sm:inline">•</span>
                                  <span>
                                    Recipient:{' '}
                                    <strong className="text-slate-800">
                                      {bill.recipientDesignation || bill.recipientDepartment || 'N/A'}
                                    </strong>
                                  </span>
                                  <span className="hidden text-slate-300 sm:inline">•</span>
                                  <span>
                                    Date: <strong className="text-slate-800">{dateDisplay}</strong>
                                  </span>
                                </CardDescription>
                              </div>

                              <div className="flex shrink-0 items-center gap-2">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${
                                    bill.status === 'final'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                                  }`}
                                >
                                  {bill.status}
                                </span>
                                {isStacked && !isStackChild && (
                                  <button
                                    onClick={() => toggleStackExpand(stackKey)}
                                    className="flex items-center gap-1.5 bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-full text-xs font-bold hover:bg-emerald-200 transition-colors"
                                  >
                                    <Layers className="h-3.5 w-3.5 text-emerald-700" />
                                    <span>Stack ({stackBillsList.length})</span>
                                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Item Highlight Banner */}
                            <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                                Item Name:
                              </span>
                              <span className="font-semibold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                                {primaryItemName}
                              </span>
                              {bill.items.length > 1 && (
                                <span className="text-slate-500 font-medium text-[11px]">
                                  (+{bill.items.length - 1} more items)
                                </span>
                              )}
                            </div>
                          </CardHeader>

                          <CardContent className="pt-5">
                            <div className="mb-6 grid grid-cols-2 gap-2.5 text-sm sm:gap-4 sm:grid-cols-4">
                              <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <Wallet className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Subtotal</p>
                                  <p className="font-medium text-slate-900 truncate">₹{bill.totalAmount.toLocaleString('en-IN')}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <Percent className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">GST</p>
                                  <p className="font-medium text-slate-900 truncate">₹{gstAmount.toLocaleString('en-IN')}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 bg-emerald-50/60 p-3 rounded-lg border border-emerald-100">
                                <Package className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-emerald-700/70 uppercase tracking-wider mb-1">Grand Total</p>
                                  <p className="font-bold text-emerald-700 truncate">₹{bill.grandTotal.toLocaleString('en-IN')}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <Calendar className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Created</p>
                                  <p className="font-medium text-slate-900 truncate">{format(new Date(bill.createdAt), 'dd/MM/yyyy')}</p>
                                </div>
                              </div>
                            </div>

                            {/* Actions Bar */}
                            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 sm:flex sm:flex-wrap sm:justify-end">
                              {/* View, Edit & Print Button */}
                              <Link href={`/bills/${bill.id}`} className="col-span-2 contents sm:col-span-1">
                                <Button size="sm" className="col-span-2 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 shadow-2xs text-xs font-semibold sm:col-span-1">
                                  <Eye className="h-3.5 w-3.5" />
                                  View, Edit & Print
                                </Button>
                              </Link>

                              {/* Duplicate Bill Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDuplicateBill(bill)}
                                className="flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 text-xs"
                                title="Duplicate exact copy of this bill"
                              >
                                <Copy className="h-3.5 w-3.5 text-blue-600" />
                                Duplicate
                              </Button>

                              {/* +1 Invoice Copy Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleIncrementDuplicateBill(bill)}
                                className="flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 font-semibold text-xs"
                                title="Duplicate copy with Invoice No. +1"
                              >
                                <Copy className="h-3.5 w-3.5 text-amber-700" />
                                <span>+1 Copy</span>
                              </Button>

                              {/* Delete Button */}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteBill(bill.id)}
                                className="col-span-2 flex items-center justify-center gap-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 text-xs sm:col-span-1"
                                title="Delete Bill"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="sm:hidden">Delete</span>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    };

                    // Stacked Cascade Cards Renderer
                    return (
                      <div key={stackKey} className="relative">
                        {isStacked ? (
                          <div className="space-y-3">
                            {/* Top Cascading Shadow Stack Layering (When Collapsed) */}
                            {!isExpanded && subBills.length > 0 && (
                              <div className={`relative ${subBills.length > 1 ? 'pt-16' : 'pt-9'}`}>
                                {/* Back Card 2 (3rd invoice layer peeking highest at top) */}
                                {subBills.length > 1 && (
                                  <div
                                    onClick={() => toggleStackExpand(stackKey)}
                                    className="absolute top-0 left-6 right-6 h-12 bg-slate-200/90 border border-slate-300 rounded-t-xl shadow-2xs cursor-pointer hover:bg-slate-300/90 transition-colors z-0 flex items-start justify-between px-4 pt-2 text-xs font-bold text-slate-700"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <Receipt className="h-3.5 w-3.5 text-slate-600" />
                                      Invoice No. {subBills[1]?.invoiceNumber || 'Draft'}
                                    </span>
                                    {subBills.length > 2 && (
                                      <span className="text-[11px] text-slate-500 font-medium">
                                        +{subBills.length - 2} more older bills
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Back Card 1 (2nd invoice layer peeking at top) */}
                                <div
                                  onClick={() => toggleStackExpand(stackKey)}
                                  className={`absolute left-3 right-3 h-12 bg-emerald-100/95 border border-emerald-300 rounded-t-xl shadow-xs cursor-pointer hover:bg-emerald-200/90 transition-colors z-10 flex items-start justify-between px-4 pt-2 text-xs font-bold text-emerald-900 ${
                                    subBills.length > 1 ? 'top-7' : 'top-0'
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5">
                                    <Receipt className="h-3.5 w-3.5 text-emerald-700" />
                                    Invoice No. {subBills[0]?.invoiceNumber || 'Draft'}
                                  </span>
                                  <span className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                                    <Layers className="h-3.5 w-3.5 text-emerald-700" /> Stacked Behind
                                  </span>
                                </div>

                                {/* Primary Top Active Card */}
                                <div className="relative z-20 shadow-md rounded-xl bg-white">{renderBillCard(primaryBill, false)}</div>
                              </div>
                            )}

                            {/* Expanded Stack View */}
                            {isExpanded && (
                              <div className="space-y-4 bg-slate-50/80 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
                                <div className="flex items-center justify-between px-1 pb-2 border-b border-emerald-200">
                                  <div className="flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-emerald-700" />
                                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                      Stacked Bill Series for {firm?.name || 'Firm'} ({stackBillsList.length} Invoices)
                                    </h4>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => toggleStackExpand(stackKey)}
                                    className="h-7 text-xs text-slate-600 hover:text-slate-900"
                                  >
                                    Collapse Stack <ChevronUp className="h-3.5 w-3.5 ml-1" />
                                  </Button>
                                </div>
                                <div className="space-y-4 pl-2 border-l-3 border-emerald-500">
                                  {stackBillsList.map((bill) => renderBillCard(bill, true))}
                                </div>
                              </div>
                            )}

                            {!isExpanded && subBills.length === 0 && renderBillCard(primaryBill, false)}
                          </div>
                        ) : (
                          renderBillCard(primaryBill, false)
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
