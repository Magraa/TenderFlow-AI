'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Plus, Settings, Inbox, Eye, Trash2, FileText, Calendar, Hash, Receipt, Building2 } from 'lucide-react';
import { Bill, Tender } from '@/types';
import { dataService } from '@/services/dataService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function getTenderGrandTotal(tender: Tender): number {
  const subtotal = tender.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const gst = tender.items.reduce((sum, item) => sum + ((item.quantity * item.rate) * item.gstPercent) / 100, 0);
  return subtotal + gst;
}

export default function DashboardPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [tendersList, billsList] = await Promise.all([
        dataService.tenders.list(),
        dataService.bills.list(),
      ]);
      if (cancelled) return;
      setTenders(tendersList);
      setBills(billsList);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-screen-xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-4 py-8 sm:px-6 lg:px-8 bg-gradient-to-r from-slate-50 to-white">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              Tender Automation
            </h1>
            <p className="mt-2 text-sm text-slate-500 font-medium">
              Professional offline drafting engine for firm-branded documents & bills.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Left to New Tender: New Bill button */}
            <Link href="/bills/new">
              <Button
                variant="outline"
                className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 shadow-sm font-semibold"
              >
                <Receipt className="h-4 w-4 text-emerald-600" />
                New Bill
              </Button>
            </Link>

            <Link href="/tenders/new">
              <Button className="flex items-center gap-2 shadow-md">
                <Plus className="h-4 w-4" />
                New Tender
              </Button>
            </Link>

            <Link href="/manage-firms">
              <Button variant="outline" className="flex items-center gap-2 bg-white hover:bg-slate-50">
                <Building2 className="h-4 w-4 text-slate-600" />
                Manage Firms
              </Button>
            </Link>

            <Link href="/settings">
              <Button variant="outline" className="flex items-center gap-2 bg-white hover:bg-slate-50">
                <Settings className="h-4 w-4 text-slate-600" />
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            Loading your dashboard...
          </div>
        ) : (
          <Tabs defaultValue="tenders" className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <TabsList className="bg-slate-100 p-1">
                <TabsTrigger value="tenders" className="flex items-center gap-2 font-semibold">
                  <FileText className="h-4 w-4" />
                  Tenders ({tenders.length})
                </TabsTrigger>
                <TabsTrigger value="bills" className="flex items-center gap-2 font-semibold">
                  <Receipt className="h-4 w-4 text-emerald-600" />
                  Bills & Invoices ({bills.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ─── TENDERS TAB ─── */}
            <TabsContent value="tenders">
              {tenders.length === 0 ? (
                <Card className="border-dashed border-2 bg-transparent shadow-none hover:bg-slate-50/50 transition-colors">
                  <CardContent className="flex flex-col items-center justify-center pt-16 pb-16 text-center">
                    <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                      <Inbox className="h-10 w-10 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Tenders Found</h3>
                    <p className="mb-8 text-slate-500 max-w-sm">
                      You haven&apos;t created any tender documents yet. Start by creating a new tender draft.
                    </p>
                    <Link href="/tenders/new">
                      <Button size="lg" className="flex items-center gap-2 shadow-md hover:scale-105 transition-transform duration-200">
                        <Plus className="h-5 w-5" />
                        Create First Tender
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 animate-in fade-in-up">
                  {tenders.map((tender) => (
                    <Card key={tender.id} className="group overflow-hidden transition-all hover:border-slate-300">
                      <CardHeader className="bg-slate-50/50 pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-xl font-bold text-slate-800">{tender.title}</CardTitle>
                            <CardDescription className="flex flex-wrap items-center gap-3 mt-1.5 font-medium">
                              <span className="flex items-center gap-1 text-slate-600">
                                <Hash className="h-3.5 w-3.5" />
                                {tender.tenderNumber}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span>{tender.items.length} items</span>
                            </CardDescription>
                          </div>
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase ${
                              tender.status === 'final'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {tender.status}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="mb-6 grid gap-4 text-sm sm:grid-cols-4">
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Language</p>
                            <p className="font-medium capitalize text-slate-900">{tender.language}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Items</p>
                            <p className="font-medium text-slate-900">{tender.items.length}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Grand Total</p>
                            <p className="font-medium text-slate-900">₹{getTenderGrandTotal(tender).toLocaleString('en-IN')}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> Created
                            </p>
                            <p className="font-medium text-slate-900">{format(new Date(tender.createdAt), 'dd/MM/yyyy')}</p>
                          </div>
                        </div>

                        <div className="flex gap-3 justify-end border-t border-slate-100 pt-5">
                          <Link href={`/tenders/${tender.id}`}>
                            <Button size="sm" className="flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              View Documents
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteTender(tender.id)}
                            className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 opacity-80 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ─── BILLS TAB ─── */}
            <TabsContent value="bills">
              {bills.length === 0 ? (
                <Card className="border-dashed border-2 bg-transparent shadow-none hover:bg-slate-50/50 transition-colors">
                  <CardContent className="flex flex-col items-center justify-center pt-16 pb-16 text-center">
                    <div className="h-20 w-20 rounded-full bg-emerald-50 flex items-center justify-center mb-6">
                      <Receipt className="h-10 w-10 text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Bills Created Yet</h3>
                    <p className="mb-8 text-slate-500 max-w-sm">
                      Create standalone tax bills and invoices with custom templates and firm bank details.
                    </p>
                    <Link href="/bills/new">
                      <Button size="lg" className="flex items-center gap-2 shadow-md bg-emerald-600 hover:bg-emerald-700 hover:scale-105 transition-all">
                        <Receipt className="h-5 w-5" />
                        Create First Bill
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 animate-in fade-in-up">
                  {bills.map((bill) => (
                    <Card key={bill.id} className="group overflow-hidden transition-all hover:border-emerald-300">
                      <CardHeader className="bg-emerald-50/30 pb-4 border-b border-slate-100">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                              <Receipt className="h-5 w-5 text-emerald-600" />
                              Invoice No. {bill.invoiceNumber || 'Draft'}
                            </CardTitle>
                            <CardDescription className="flex flex-wrap items-center gap-3 mt-1.5 font-medium text-slate-600">
                              <span>Recipient: {bill.recipientDesignation}, {bill.recipientDepartment}</span>
                              <span className="text-slate-300">•</span>
                              <span>Date: {bill.invoiceDate}</span>
                            </CardDescription>
                          </div>
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase ${
                              bill.status === 'final'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {bill.status}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="mb-6 grid gap-4 text-sm sm:grid-cols-4">
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Items Count</p>
                            <p className="font-medium text-slate-900">{bill.items.length} items</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Subtotal</p>
                            <p className="font-medium text-slate-900">₹{bill.totalAmount.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Grand Total</p>
                            <p className="font-bold text-emerald-700">₹{bill.grandTotal.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> Created
                            </p>
                            <p className="font-medium text-slate-900">{format(new Date(bill.createdAt), 'dd/MM/yyyy')}</p>
                          </div>
                        </div>

                        <div className="flex gap-3 justify-end border-t border-slate-100 pt-5">
                          <Link href={`/bills/${bill.id}`}>
                            <Button size="sm" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
                              <Eye className="h-4 w-4" />
                              View Bill & Print
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteBill(bill.id)}
                            className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 opacity-80 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
