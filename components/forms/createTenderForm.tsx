'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DepartmentProfile, Firm, TenderItem } from '@/types';
import { dataService } from '@/services/dataService';
import { tenderUtility } from '@/services/tenderUtility';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MultiProductItemManager } from '@/components/MultiProductItemManager';

function uniqueFirmIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

export function CreateTenderForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [firms, setFirms] = useState<Firm[]>([]);
  const [departments, setDepartments] = useState<DepartmentProfile[]>([]);
  const [items, setItems] = useState<TenderItem[]>([]);
  const [tempTenderId] = useState(`temp-${Date.now()}`);
  const [formData, setFormData] = useState({
    title: '',
    departmentProfileId: '',
    language: 'english' as 'hindi' | 'english',
    mainFirmId: '',
    alternateFirmAId: '',
    alternateFirmBId: '',
    status: 'draft' as 'draft' | 'final',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loadedFirms, loadedDepartments] = await Promise.all([
        dataService.firms.list(),
        dataService.departmentProfiles.list(),
      ]);
      if (cancelled) return;
      setFirms(loadedFirms);
      setDepartments(loadedDepartments);
      setFormData((previous) => ({
        ...previous,
        departmentProfileId: previous.departmentProfileId || loadedDepartments[0]?.id || '',
        mainFirmId: previous.mainFirmId || loadedFirms[0]?.id || '',
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const gstTotal = items.reduce((sum, item) => sum + ((item.quantity * item.rate) * item.gstPercent) / 100, 0);
    return {
      subtotal,
      gstTotal,
      grandTotal: subtotal + gstTotal,
    };
  }, [items]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.title.trim()) {
        throw new Error('Tender title is required.');
      }
      if (!formData.departmentProfileId) {
        throw new Error('Department selection is required.');
      }
      if (!formData.mainFirmId) {
        throw new Error('Main firm is required.');
      }
      if (items.length === 0) {
        throw new Error('At least one item is required.');
      }
      if (items.some((item) => !item.productName.trim())) {
        throw new Error('Each item must include a product name.');
      }

      const alternateFirms = uniqueFirmIds([formData.alternateFirmAId, formData.alternateFirmBId]).filter(
        (firmId) => firmId !== formData.mainFirmId
      );
      const now = new Date().toISOString();
      const tenderNumber = await tenderUtility.generateTenderNumber();

      const tender = await dataService.tenders.create({
        title: formData.title.trim(),
        tenderNumber,
        departmentProfileId: formData.departmentProfileId,
        mainFirmId: formData.mainFirmId,
        alternateFirms,
        items: items.map((item) => ({
          ...item,
          tenderId: '',
          totalAmount: Math.round(item.quantity * item.rate * 100) / 100,
          createdAt: item.createdAt || now,
          updatedAt: now,
        })),
        language: formData.language,
        status: formData.status,
        version: 1,
        description: '',
        notes: '',
      });

      router.push(`/tenders/${tender.id}`);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Failed to create tender.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create New Tender</CardTitle>
          <CardDescription>Manual product entry, fixed GST slabs, and letterhead-ready firm selection.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="space-y-4 rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold">1. Tender Details</h3>
              <div className="space-y-2">
                <Label htmlFor="title">Tender Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                  placeholder="e.g., Supply of PVC Pipes"
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="departmentProfileId">Department Name</Label>
                  <select
                    id="departmentProfileId"
                    className="h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={formData.departmentProfileId}
                    onChange={(event) => setFormData({ ...formData, departmentProfileId: event.target.value })}
                  >
                    <option value="">Select department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <select
                    id="language"
                    className="h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={formData.language}
                    onChange={(event) =>
                      setFormData({ ...formData, language: event.target.value as 'hindi' | 'english' })
                    }
                  >
                    <option value="english">English</option>
                    <option value="hindi">Hindi</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex rounded-md border border-slate-300 p-1">
                    <Button
                      type="button"
                      variant={formData.status === 'draft' ? 'default' : 'ghost'}
                      className="flex-1"
                      onClick={() => setFormData({ ...formData, status: 'draft' })}
                    >
                      Draft
                    </Button>
                    <Button
                      type="button"
                      variant={formData.status === 'final' ? 'default' : 'ghost'}
                      className="flex-1"
                      onClick={() => setFormData({ ...formData, status: 'final' })}
                    >
                      Final
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold">2. Items Table</h3>
              <MultiProductItemManager tenderId={tempTenderId} items={items} onItemsChange={setItems} />
            </section>

            <section className="space-y-4 rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold">3. Firm Selection</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="mainFirmId">Main Firm</Label>
                  <select
                    id="mainFirmId"
                    className="h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={formData.mainFirmId}
                    onChange={(event) => setFormData({ ...formData, mainFirmId: event.target.value })}
                  >
                    <option value="">Select main firm</option>
                    {firms.map((firm) => (
                      <option key={firm.id} value={firm.id}>
                        {firm.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alternateFirmAId">Alternate Firm A</Label>
                  <select
                    id="alternateFirmAId"
                    className="h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={formData.alternateFirmAId}
                    onChange={(event) => setFormData({ ...formData, alternateFirmAId: event.target.value })}
                  >
                    <option value="">None</option>
                    {firms.map((firm) => (
                      <option key={firm.id} value={firm.id}>
                        {firm.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alternateFirmBId">Alternate Firm B</Label>
                  <select
                    id="alternateFirmBId"
                    className="h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={formData.alternateFirmBId}
                    onChange={(event) => setFormData({ ...formData, alternateFirmBId: event.target.value })}
                  >
                    <option value="">None</option>
                    {firms.map((firm) => (
                      <option key={firm.id} value={firm.id}>
                        {firm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>Subtotal: Rs. {totals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                <span>GST Total: Rs. {totals.gstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                <span className="font-semibold">
                  Grand Total: Rs. {totals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
            </section>

            <div className="flex gap-3">
              <Button type="submit" loading={loading} disabled={loading}>
                Create Tender
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard')} disabled={loading}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
