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

interface FormData {
  title: string;
  departmentProfileId: string;
  language: 'hindi' | 'english';
  tenderType: string;
  placeName: string;
  districtName: string;
  publishDate: string;
  submissionDate: string;
  openingDate: string;
  mainFirmId: string;
  alternateFirmAId: string;
  alternateFirmBId: string;
  status: 'draft' | 'final';
  estimatedAmount: string;
}

function uniqueFirmIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

export function ProfessionalTenderForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [firms, setFirms] = useState<Firm[]>([]);
  const [departments, setDepartments] = useState<DepartmentProfile[]>([]);
  const [items, setItems] = useState<TenderItem[]>([]);
  const [tempTenderId] = useState(`temp-${Date.now()}`);
  
  const [formData, setFormData] = useState<FormData>({
    title: '',
    departmentProfileId: '',
    language: 'hindi',
    tenderType: 'Open Tender',
    placeName: '',
    districtName: '',
    publishDate: new Date().toISOString().split('T')[0],
    submissionDate: '',
    openingDate: '',
    mainFirmId: '',
    alternateFirmAId: '',
    alternateFirmBId: '',
    status: 'draft',
    estimatedAmount: '',
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [loadedFirms, loadedDepartmentsInitial] = await Promise.all([
        dataService.firms.list(),
        dataService.departmentProfiles.list(),
      ]);

      // Ensure Municipal Corporation is available as an option.
      const hasMunicipalCorp = loadedDepartmentsInitial.some((d) => d.name === 'Municipal Corporation');
      if (!hasMunicipalCorp) {
        await dataService.departmentProfiles.create({
          name: 'Municipal Corporation',
          address: '123 Government Road',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
          contactPerson: 'Department Head',
          email: 'municipal-corporation@govt.in',
          phone: '+91-11-XXXXX',
          headerStyle: 'govt',
          defaultLanguage: 'english',
        });
      }

      const loadedDepartments = hasMunicipalCorp
        ? loadedDepartmentsInitial
        : await dataService.departmentProfiles.list();

      if (cancelled) return;
      setFirms(loadedFirms);
      setDepartments(loadedDepartments);

      setFormData((prev) => ({
        ...prev,
        departmentProfileId: prev.departmentProfileId || loadedDepartments[0]?.id || '',
        mainFirmId: prev.mainFirmId || loadedFirms[0]?.id || '',
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

  // Place and District fields are now always visible for all government tenders

  // Check if Municipal Corporation is selected (hide Tender Type and Dates)
  const isMunicipalCorporation = departments.find(d => d.id === formData.departmentProfileId)?.name === 'Municipal Corporation';

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
      if (!formData.placeName.trim()) {
        throw new Error('Place name is required for government tender documents.');
      }
      if (!formData.districtName.trim()) {
        throw new Error('District name is required for government tender documents.');
      }
      if (!formData.mainFirmId) {
        throw new Error('Main firm is required.');
      }
      if (!formData.estimatedAmount) {
        throw new Error('Estimated amount is required.');
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
          estimatedAmount: item.estimatedAmount || Math.round(item.quantity * item.rate * 100) / 100,
          createdAt: item.createdAt || now,
          updatedAt: now,
        })),
        language: formData.language,
        status: formData.status,
        version: 1,
        description: '',
        notes: '',
        tenderType: formData.tenderType,
        placeName: formData.placeName,
        districtName: formData.districtName,
        publishDate: formData.publishDate,
        submissionDate: formData.submissionDate,
        openingDate: formData.openingDate,
        estimatedBudget: totals.grandTotal,
        estimatedAmount: formData.estimatedAmount ? parseFloat(formData.estimatedAmount) : undefined,
      });

      router.push(`/tenders/${tender.id}`);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Failed to create tender.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const canProceedToStep2 = formData.title.trim() && formData.departmentProfileId && formData.placeName.trim() && formData.districtName.trim();
  const canProceedToStep3 = items.length > 0;

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Header Section */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl">Create New Tender</CardTitle>
              <CardDescription className="mt-2">
                Professional government tender creation workflow
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-slate-500">Tender Number</div>
                <div className="text-sm font-mono font-semibold">
                  <span className="hidden sm:inline">TEND-</span>
                  <span className="sm:hidden">TEND-2605-001</span>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                {formData.status === 'draft' ? 'Draft' : 'Final'}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                    currentStep >= step
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {step}
                </div>
                <div className={`mt-2 text-xs font-medium ${currentStep >= step ? 'text-blue-600' : 'text-slate-500'}`}>
                  {step === 1 && 'Tender Info'}
                  {step === 2 && 'Items'}
                  {step === 3 && 'Firms'}
                </div>
              </div>
              {step < 3 && (
                <div
                  className={`h-1 flex-1 mx-2 transition-colors ${
                    currentStep > step ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        {/* Step 1: Tender Information */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Tender Information</CardTitle>
              <CardDescription>
                {isMunicipalCorporation 
                  ? 'Basic tender details (dates not required for Municipal Corporation)' 
                  : 'Basic tender details and dates'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Tender Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Supply of Electrical Materials"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departmentProfileId">Department *</Label>
                  <select
                    id="departmentProfileId"
                    className="h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={formData.departmentProfileId}
                    onChange={(e) => setFormData({ ...formData, departmentProfileId: e.target.value })}
                    required
                  >
                    <option value="">Select department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language *</Label>
                  <select
                    id="language"
                    className="h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value as 'hindi' | 'english' })}
                  >
                    <option value="hindi">Hindi (हिंदी)</option>
                    <option value="english">English</option>
                  </select>
                </div>

                {!isMunicipalCorporation && (
                  <div className="space-y-2">
                    <Label htmlFor="tenderType">Tender Type</Label>
                    <select
                      id="tenderType"
                      className="h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={formData.tenderType}
                      onChange={(e) => setFormData({ ...formData, tenderType: e.target.value })}
                    >
                      <option value="Open Tender">Open Tender</option>
                      <option value="Limited Tender">Limited Tender</option>
                      <option value="Single Tender">Single Tender</option>
                      <option value="Emergency Purchase">Emergency Purchase</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Place and District - Always Visible for Government Tenders */}
              <div className="grid gap-6 md:grid-cols-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="space-y-2">
                  <Label htmlFor="placeName">Place Name (स्थान का नाम) *</Label>
                  <Input
                    id="placeName"
                    value={formData.placeName}
                    onChange={(e) => setFormData({ ...formData, placeName: e.target.value })}
                    placeholder="e.g., सेवड़ा"
                    required
                  />
                  <p className="text-xs text-slate-500">
                    Enter the place/city name (e.g., सेवड़ा, ग्वालियर)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="districtName">District (जिला) *</Label>
                  <Input
                    id="districtName"
                    value={formData.districtName}
                    onChange={(e) => setFormData({ ...formData, districtName: e.target.value })}
                    placeholder="e.g., दतिया"
                    required
                  />
                  <p className="text-xs text-slate-500">
                    Enter the district name (e.g., दतिया, ग्वालियर)
                  </p>
                </div>
              </div>

              {/* Estimated Amount Field */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <Label htmlFor="estimatedAmount">अनुमानित राशि (Estimated Amount) *</Label>
                <div className="mt-2 space-y-2">
                  <select
                    id="estimatedAmount"
                    className="h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={formData.estimatedAmount}
                    onChange={(e) => setFormData({ ...formData, estimatedAmount: e.target.value })}
                    required
                  >
                    <option value="">Select estimated amount</option>
                    <option value="95000">₹95,000</option>
                    <option value="98000">₹98,000</option>
                    <option value="198000">₹1,98,000</option>
                    <option value="custom">Custom (Free Text)</option>
                  </select>
                  {formData.estimatedAmount === 'custom' && (
                    <Input
                      id="estimatedAmountCustom"
                      type="number"
                      placeholder="Enter custom amount (e.g., 150000)"
                      onChange={(e) => setFormData({ ...formData, estimatedAmount: e.target.value })}
                      className="mt-2"
                    />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Enter the total estimated budget for this tender
                </p>
              </div>

              {!isMunicipalCorporation && (
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="publishDate">Tender Publish Date</Label>
                    <Input
                      id="publishDate"
                      type="date"
                      value={formData.publishDate}
                      onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="submissionDate">Submission Last Date</Label>
                    <Input
                      id="submissionDate"
                      type="date"
                      value={formData.submissionDate}
                      onChange={(e) => setFormData({ ...formData, submissionDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="openingDate">Opening Date</Label>
                    <Input
                      id="openingDate"
                      type="date"
                      value={formData.openingDate}
                      onChange={(e) => setFormData({ ...formData, openingDate: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  disabled={!canProceedToStep2}
                >
                  Next: Add Items
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Item Management */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Item Management</CardTitle>
              <CardDescription>Add items with quantities, rates, and GST</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <MultiProductItemManager tenderId={tempTenderId} items={items} onItemsChange={setItems} />

              {/* Grand Total Panel */}
              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Subtotal</div>
                    <div className="text-xl font-bold">₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">GST Total</div>
                    <div className="text-xl font-bold">₹{totals.gstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Grand Total</div>
                    <div className="text-2xl font-bold text-blue-600">₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  disabled={!canProceedToStep3}
                >
                  Next: Select Firms
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Firm Selection */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Firm Selection</CardTitle>
              <CardDescription>Select main firm and optional alternate firms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                {/* Main Firm Card */}
                <div className="space-y-2">
                  <Label htmlFor="mainFirmId">Main Firm *</Label>
                  <select
                    id="mainFirmId"
                    className="h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={formData.mainFirmId}
                    onChange={(e) => setFormData({ ...formData, mainFirmId: e.target.value })}
                    required
                  >
                    <option value="">Select main firm</option>
                    {firms.map((firm) => (
                      <option key={firm.id} value={firm.id}>
                        {firm.name}
                      </option>
                    ))}
                  </select>
                  {formData.mainFirmId && (
                    <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200 text-xs">
                      {(() => {
                        const firm = firms.find(f => f.id === formData.mainFirmId);
                        return firm ? (
                          <>
                            <div><strong>City:</strong> {firm.firmCity || 'N/A'}</div>
                            <div><strong>GST:</strong> {firm.gstNumber || 'N/A'}</div>
                            <div><strong>Contact:</strong> {firm.mobileNumber || 'N/A'}</div>
                          </>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>

                {/* Alternate Firm A */}
                <div className="space-y-2">
                  <Label htmlFor="alternateFirmAId">Alternate Firm A</Label>
                  <select
                    id="alternateFirmAId"
                    className="h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={formData.alternateFirmAId}
                    onChange={(e) => setFormData({ ...formData, alternateFirmAId: e.target.value })}
                  >
                    <option value="">None</option>
                    {firms.map((firm) => (
                      <option key={firm.id} value={firm.id}>
                        {firm.name}
                      </option>
                    ))}
                  </select>
                  {formData.alternateFirmAId && (
                    <div className="mt-2 p-3 bg-slate-50 rounded border border-slate-200 text-xs">
                      {(() => {
                        const firm = firms.find(f => f.id === formData.alternateFirmAId);
                        return firm ? (
                          <>
                            <div><strong>City:</strong> {firm.firmCity || 'N/A'}</div>
                            <div><strong>GST:</strong> {firm.gstNumber || 'N/A'}</div>
                          </>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>

                {/* Alternate Firm B */}
                <div className="space-y-2">
                  <Label htmlFor="alternateFirmBId">Alternate Firm B</Label>
                  <select
                    id="alternateFirmBId"
                    className="h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={formData.alternateFirmBId}
                    onChange={(e) => setFormData({ ...formData, alternateFirmBId: e.target.value })}
                  >
                    <option value="">None</option>
                    {firms.map((firm) => (
                      <option key={firm.id} value={firm.id}>
                        {firm.name}
                      </option>
                    ))}
                  </select>
                  {formData.alternateFirmBId && (
                    <div className="mt-2 p-3 bg-slate-50 rounded border border-slate-200 text-xs">
                      {(() => {
                        const firm = firms.find(f => f.id === formData.alternateFirmBId);
                        return firm ? (
                          <>
                            <div><strong>City:</strong> {firm.firmCity || 'N/A'}</div>
                            <div><strong>GST:</strong> {firm.gstNumber || 'N/A'}</div>
                          </>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
                  Back
                </Button>
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    variant="outline"
                    loading={loading}
                    disabled={loading}
                    onClick={() => setFormData({ ...formData, status: 'draft' })}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    type="submit"
                    loading={loading}
                    disabled={loading}
                    onClick={() => setFormData({ ...formData, status: 'final' })}
                  >
                    Create Tender
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
