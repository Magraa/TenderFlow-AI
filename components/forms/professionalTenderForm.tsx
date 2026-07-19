'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DepartmentProfile, Firm, Settings, TenderItem, DocumentPhraseMapping } from '@/types';
import { dataService } from '@/services/dataService';
import { getOrGeneratePhrasePack } from '@/services/documentPhraseService';
import { getOrCreateItemMappingPack } from '@/services/mappingService';

import { tenderUtility } from '@/services/tenderUtility';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MultiProductItemManager } from '@/components/MultiProductItemManager';
import { AILocationHelper } from '@/components/forms/Location/AILocationHelper';
import { LocationSearchInput } from '@/components/forms/Location/LocationSearchInput';

interface FormData {
  title: string;
  departmentProfileId: string;
  language: 'hindi' | 'english';
  tenderType: string;
  placeName: string;
  districtName: string;
  localBodyType: string;
  localBodyTypeHindi: string;
  publishDate: string;
  submissionDate: string;
  openingDate: string;
  mainFirmId: string;
  alternateFirmAId: string;
  alternateFirmBId: string;
  estimatedAmount: string;
}

const ESTIMATED_AMOUNT_PRESETS = ['95000', '98000', '198000'];

function uniqueFirmIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

function formatMoney(value: number): string {
  return `Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ProfessionalTenderForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [firms, setFirms] = useState<Firm[]>([]);
  const [departments, setDepartments] = useState<DepartmentProfile[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [items, setItems] = useState<TenderItem[]>([]);
  const [tempTenderId] = useState(`temp-${Date.now()}`);

  // Document Phrase Pack States
  const [phrasePacks, setPhrasePacks] = useState<DocumentPhraseMapping[]>([]);
  const [phrasePackMode, setPhrasePackMode] = useState<'auto' | 'force' | 'manual'>('auto');
  const [selectedPhraseCategoryId, setSelectedPhraseCategoryId] = useState<string>('');


  const [formData, setFormData] = useState<FormData>({
    title: '',
    departmentProfileId: '',
    language: 'hindi',
    tenderType: 'Open Tender',
    placeName: '',
    districtName: '',
    localBodyType: '',
    localBodyTypeHindi: '',
    publishDate: new Date().toISOString().split('T')[0],
    submissionDate: '',
    openingDate: '',
    mainFirmId: '',
    alternateFirmAId: '',
    alternateFirmBId: '',
    estimatedAmount: '',
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [loadedFirms, loadedDepartmentsInitial, loadedSettings, loadedPhrasePacks] = await Promise.all([
        dataService.firms.list(),
        dataService.departmentProfiles.list(),
        dataService.settings.get(),
        dataService.documentPhraseMappings.list(),
      ]);

      // Deduplicate Municipal Corporation profiles in database
      const mcProfiles = loadedDepartmentsInitial.filter((department) => department.name === 'Municipal Corporation');
      if (mcProfiles.length === 0) {
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
      } else if (mcProfiles.length > 1) {
        const [keep, ...rest] = mcProfiles;
        for (const dupe of rest) {
          try {
            await dataService.departmentProfiles.delete(dupe.id);
          } catch (err) {
            console.error('Failed to delete duplicate department profile:', err);
          }
        }
      }

      // Ensure Others profile exists in database
      const othersProfiles = loadedDepartmentsInitial.filter((department) => department.name === 'Others');
      if (othersProfiles.length === 0) {
        await dataService.departmentProfiles.create({
          name: 'Others',
          address: 'Government Road',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
          contactPerson: 'Department Head',
          email: 'dept@govt.in',
          phone: '+91-11-XXXXX',
          headerStyle: 'govt',
          defaultLanguage: 'english',
        });
      } else if (othersProfiles.length > 1) {
        const [keep, ...rest] = othersProfiles;
        for (const dupe of rest) {
          try {
            await dataService.departmentProfiles.delete(dupe.id);
          } catch (err) {
            console.error('Failed to delete duplicate department profile:', err);
          }
        }
      }

      // Get updated departments list
      const loadedDepartments = await dataService.departmentProfiles.list();

      // Deduplicate by name for UI safety
      const uniqueDepts: DepartmentProfile[] = [];
      const seenNames = new Set<string>();
      for (const dept of loadedDepartments) {
        if (!seenNames.has(dept.name)) {
          seenNames.add(dept.name);
          uniqueDepts.push(dept);
        }
      }

      if (cancelled) return;
      setFirms(loadedFirms);
      setDepartments(uniqueDepts);
      setSettings(loadedSettings);
      setPhrasePacks(loadedPhrasePacks);

      // Default to Municipal Corporation if no department selected
      const municipalCorp = uniqueDepts.find((d) => d.name === 'Municipal Corporation');
      setFormData((previous) => ({
        ...previous,
        departmentProfileId: previous.departmentProfileId || (municipalCorp?.id || uniqueDepts[0]?.id || ''),
        mainFirmId: previous.mainFirmId || loadedFirms[0]?.id || '',
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const gstTotal = items.reduce((sum, item) => sum + (item.quantity * item.rate * item.gstPercent) / 100, 0);
    return {
      subtotal,
      gstTotal,
      grandTotal: subtotal + gstTotal,
    };
  }, [items]);

  const selectedDepartment = departments.find((department) => department.id === formData.departmentProfileId);
  const selectedMainFirm = firms.find((firm) => firm.id === formData.mainFirmId);
  const selectedAlternateFirmA = firms.find((firm) => firm.id === formData.alternateFirmAId);
  const selectedAlternateFirmB = firms.find((firm) => firm.id === formData.alternateFirmBId);
  const isMunicipalCorporation = selectedDepartment?.name === 'Municipal Corporation';
  const selectedAmountOption = ESTIMATED_AMOUNT_PRESETS.includes(formData.estimatedAmount)
    ? formData.estimatedAmount
    : formData.estimatedAmount
      ? 'custom'
      : '';
  const numericEstimatedAmount = Number(formData.estimatedAmount);
  const locationSummary = `${[formData.localBodyTypeHindi || formData.localBodyType, formData.placeName]
    .filter(Boolean)
    .join(' ')}${formData.districtName ? ` जिला ${formData.districtName}` : ''}`.trim();
  const isSubmitDisabled =
    loading ||
    !formData.title.trim() ||
    !formData.departmentProfileId ||
    !formData.placeName.trim() ||
    !formData.districtName.trim() ||
    !formData.mainFirmId ||
    !Number.isFinite(numericEstimatedAmount) ||
    numericEstimatedAmount <= 0 ||
    items.length === 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
      const nextStatus = submitter?.value === 'final' ? 'final' : 'draft';

      if (!formData.title.trim()) throw new Error('Tender title is required.');
      if (!formData.departmentProfileId) throw new Error('Department selection is required.');
      if (!formData.placeName.trim()) throw new Error('Place name is required for government tender documents.');
      if (!formData.districtName.trim()) throw new Error('District name is required for government tender documents.');
      if (!formData.mainFirmId) throw new Error('Main firm is required.');
      if (!Number.isFinite(numericEstimatedAmount) || numericEstimatedAmount <= 0) {
        throw new Error('Estimated amount is required.');
      }
      if (items.length === 0) throw new Error('At least one item is required.');
      if (items.some((item) => !item.productName.trim())) throw new Error('Each item must include a product name.');

      const alternateFirms = uniqueFirmIds([formData.alternateFirmAId, formData.alternateFirmBId]).filter(
        (firmId) => firmId !== formData.mainFirmId
      );
      const now = new Date().toISOString();
      const tenderNumber = await tenderUtility.generateTenderNumber();

      // Get/Generate phrase packs and AI item mappings for each tender item
      const itemsWithCategories = [];
      for (const item of items) {
        let categoryId = '';
        try {
          // Generate full AI mapping pack (englishName, hindiName, altHindiName1, altHindiName2) for Tender documents
          await getOrCreateItemMappingPack(item.productName, item.description);

          const pack = await getOrGeneratePhrasePack(item.productName, item.description, {
            mode: phrasePackMode,
            categoryId: selectedPhraseCategoryId,
          });
          if (pack) {
            categoryId = pack.categoryId;
          }
        } catch (err) {
          console.error('Failed to get/generate pack for item:', item.productName, err);
        }
        itemsWithCategories.push({
          ...item,
          category: categoryId,
        });
      }

      const tender = await dataService.tenders.create({
        title: formData.title.trim(),
        tenderNumber,
        departmentProfileId: formData.departmentProfileId,
        mainFirmId: formData.mainFirmId,
        alternateFirms,
        items: itemsWithCategories.map((item) => ({
          ...item,
          tenderId: '',
          totalAmount: Math.round(item.quantity * item.rate * 100) / 100,
          estimatedAmount: item.estimatedAmount || Math.round(item.quantity * item.rate * 100) / 100,
          createdAt: item.createdAt || now,
          updatedAt: now,
        })),

        language: formData.language,
        status: nextStatus,
        version: 1,
        description: '',
        notes: '',
        tenderType: formData.tenderType,
        placeName: formData.placeName,
        districtName: formData.districtName,
        localBodyType: formData.localBodyType,
        localBodyTypeHindi: formData.localBodyTypeHindi,
        publishDate: formData.publishDate,
        submissionDate: formData.submissionDate,
        openingDate: formData.openingDate,
        estimatedBudget: totals.grandTotal,
        estimatedAmount: numericEstimatedAmount,
      });

      // Save/transliterate items to Hindi mappings in the background
      for (const item of items) {
        const inputName = item.productName.trim();
        if (!inputName) continue;

        try {
          const isHindiPattern = /[\u0900-\u097F]/;
          const isInputHindi = isHindiPattern.test(inputName);

          const existingMappings = await dataService.itemHindiMappings.list();
          const matched = existingMappings.find((m) =>
            isInputHindi
              ? m.hindiName.trim() === inputName
              : m.englishName.toLowerCase().trim() === inputName.toLowerCase()
          );

          if (!matched) {
            let englishName = '';
            let hindiName = '';

            if (isInputHindi) {
              hindiName = inputName;
              // Transliterate Hindi to English
              const nameResponse = await fetch('/api/ai/transliterate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text: inputName,
                  sourceLanguage: 'hindi',
                  targetLanguage: 'english',
                }),
              });
              const nameData = await nameResponse.json();
              englishName = nameData.transliteratedText || inputName;
            } else {
              englishName = inputName;
              // Transliterate English to Hindi
              const nameResponse = await fetch('/api/ai/transliterate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text: inputName,
                  sourceLanguage: 'english',
                  targetLanguage: 'hindi',
                }),
              });
              const nameData = await nameResponse.json();
              hindiName = nameData.transliteratedText || inputName;
            }

            // Transliterate description if present
            let englishDescription = '';
            let hindiDescription = '';

            if (item.description?.trim()) {
              const inputDesc = item.description.trim();
              const isDescHindi = isHindiPattern.test(inputDesc);

              if (isDescHindi) {
                hindiDescription = inputDesc;
                const descResponse = await fetch('/api/ai/transliterate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    text: inputDesc,
                    sourceLanguage: 'hindi',
                    targetLanguage: 'english',
                  }),
                });
                const descData = await descResponse.json();
                englishDescription = descData.transliteratedText || '';
              } else {
                englishDescription = inputDesc;
                const descResponse = await fetch('/api/ai/transliterate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    text: inputDesc,
                    sourceLanguage: 'english',
                    targetLanguage: 'hindi',
                  }),
                });
                const descData = await descResponse.json();
                hindiDescription = descData.transliteratedText || '';
              }
            }

            // Generate alternative names and complete mapping pack using AI
            let altHindiName = '';
            let altHindiName2 = '';
            let altEnglishName1 = '';
            let altEnglishName2 = '';
            let genEnglishName = englishName;
            let genEnglishDesc = englishDescription;
            let genHindiName = hindiName;
            let genHindiDesc = hindiDescription;

            try {
              const altResponse = await fetch('/api/ai/generate-alternates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  rawName: inputName,
                  rawDescription: item.description?.trim() || '',
                  itemName: inputName,
                  description: item.description?.trim() || '',
                }),
              });
              if (altResponse.ok) {
                const altData = await altResponse.json();
                if (altData.englishName) genEnglishName = altData.englishName;
                if (altData.englishDescription) genEnglishDesc = altData.englishDescription;
                if (altData.hindiName) genHindiName = altData.hindiName;
                if (altData.hindiDescription) genHindiDesc = altData.hindiDescription;
                altHindiName = altData.altHindiName || altData.altHindi || '';
                altHindiName2 = altData.altHindiName2 || '';
                altEnglishName1 = altData.altEnglishName1 || altData.altEnglish1 || '';
                altEnglishName2 = altData.altEnglishName2 || altData.altEnglish2 || '';
              }
            } catch (err) {
              console.error('Failed to generate alternate names:', err);
            }

            // Save new item Hindi mapping
            await dataService.itemHindiMappings.create({
              rawName: inputName,
              rawDescription: item.description?.trim() || '',
              englishName: genEnglishName,
              hindiName: genHindiName,
              englishDescription: genEnglishDesc,
              hindiDescription: genHindiDesc,
              altHindiName,
              altHindiName2,
              altEnglishName1,
              altEnglishName2,
              type: 'item',
              usageCount: 1,
              isAutoGenerated: true,
            });
          } else {
            // Update usage count, and description if it wasn't present
            const patch: any = {
              usageCount: (matched.usageCount || 0) + 1,
            };
            if (!matched.rawName) patch.rawName = inputName;
            if (!matched.rawDescription && item.description) patch.rawDescription = item.description.trim();

            const inputDesc = item.description?.trim() || '';
            if (inputDesc && (!matched.englishDescription || !matched.hindiDescription)) {
              const isDescHindi = isHindiPattern.test(inputDesc);

              if (isDescHindi) {
                if (!matched.hindiDescription) patch.hindiDescription = inputDesc;
                if (!matched.englishDescription) {
                  const descResponse = await fetch('/api/ai/transliterate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      text: inputDesc,
                      sourceLanguage: 'hindi',
                      targetLanguage: 'english',
                    }),
                  });
                  const descData = await descResponse.json();
                  patch.englishDescription = descData.transliteratedText || '';
                }
              } else {
                if (!matched.englishDescription) patch.englishDescription = inputDesc;
                if (!matched.hindiDescription) {
                  const descResponse = await fetch('/api/ai/transliterate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      text: inputDesc,
                      sourceLanguage: 'english',
                      targetLanguage: 'hindi',
                    }),
                  });
                  const descData = await descResponse.json();
                  patch.hindiDescription = descData.transliteratedText || '';
                }
              }
            }

            // Generate alternative names if missing
            const needsAlternatesUpdate = !matched.altHindiName || !matched.altHindiName2 || !matched.altEnglishName1 || !matched.altEnglishName2;
            if (needsAlternatesUpdate) {
              try {
                const altResponse = await fetch('/api/ai/generate-alternates', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    rawName: matched.rawName || inputName,
                    rawDescription: matched.rawDescription || inputDesc,
                    itemName: matched.hindiName || inputName,
                    description: inputDesc || matched.englishDescription || '',
                  }),
                });
                if (altResponse.ok) {
                  const altData = await altResponse.json();
                  patch.altHindiName = altData.altHindiName || altData.altHindi || matched.altHindiName || '';
                  patch.altHindiName2 = altData.altHindiName2 || matched.altHindiName2 || '';
                  patch.altEnglishName1 = altData.altEnglishName1 || altData.altEnglish1 || matched.altEnglishName1 || '';
                  patch.altEnglishName2 = altData.altEnglishName2 || altData.altEnglish2 || matched.altEnglishName2 || '';
                }
              } catch (err) {
                console.error('Failed to update alternate names:', err);
              }
            }

            await dataService.itemHindiMappings.update(matched.id, patch);
          }
        } catch (mappingErr) {
          console.error('Failed to auto-save item Hindi mapping:', inputName, mappingErr);
        }
      }

      router.push(`/tenders/${tender.id}`);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Failed to create tender.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[95%] 2xl:max-w-[95%]">
      <div className="mb-6 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Create New Tender</h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter tender details, location, items, and firms in one reviewable workspace.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-xs text-slate-500">Items</div>
              <div className="text-base font-semibold text-slate-900">{items.length}</div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-xs text-slate-500">Estimate</div>
              <div className="text-base font-semibold text-slate-900">
                {Number.isFinite(numericEstimatedAmount) && numericEstimatedAmount > 0
                  ? `Rs. ${numericEstimatedAmount.toLocaleString('en-IN')}`
                  : 'Pending'}
              </div>
            </div>
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
              <div className="text-xs text-blue-700">Total</div>
              <div className="text-base font-semibold text-blue-900">
                Rs. {Math.round(totals.grandTotal).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card className="rounded-lg">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-lg">Tender Details</CardTitle>
              <CardDescription>
                {isMunicipalCorporation
                  ? 'Basic tender details. Dates are not required for Municipal Corporation.'
                  : 'Basic tender details, location, amount, and dates.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title">Tender Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                    placeholder="e.g., Supply of Electrical Materials"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departmentProfileId">Department *</Label>
                  <select
                    id="departmentProfileId"
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={formData.departmentProfileId}
                    onChange={(event) => setFormData({ ...formData, departmentProfileId: event.target.value })}
                    required
                  >
                    {departments
                      .filter((dept) => dept.name === 'Others')
                      .map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          Others
                        </option>
                      ))}
                    {departments
                      .filter((dept) => dept.name === 'Municipal Corporation')
                      .map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          Municipal Corporation
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language *</Label>
                  <select
                    id="language"
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={formData.language}
                    onChange={(event) => setFormData({ ...formData, language: event.target.value as 'hindi' | 'english' })}
                  >
                    <option value="hindi">Hindi</option>
                    <option value="english">English</option>
                  </select>
                </div>

                {!isMunicipalCorporation && (
                  <div className="space-y-2">
                    <Label htmlFor="tenderType">Tender Type</Label>
                    <select
                      id="tenderType"
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={formData.tenderType}
                      onChange={(event) => setFormData({ ...formData, tenderType: event.target.value })}
                    >
                      <option value="Open Tender">Open Tender</option>
                      <option value="Limited Tender">Limited Tender</option>
                      <option value="Single Tender">Single Tender</option>
                      <option value="Emergency Purchase">Emergency Purchase</option>
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="estimatedAmount">Estimated Amount *</Label>
                  <select
                    id="estimatedAmount"
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={selectedAmountOption}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        estimatedAmount: event.target.value === 'custom' ? 'custom' : event.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select estimated amount</option>
                    <option value="95000">Rs. 95,000</option>
                    <option value="98000">Rs. 98,000</option>
                    <option value="198000">Rs. 1,98,000</option>
                    <option value="custom">Custom</option>
                  </select>
                  {selectedAmountOption === 'custom' && (
                    <Input
                      id="estimatedAmountCustom"
                      type="number"
                      min="1"
                      placeholder="Enter custom amount"
                      value={formData.estimatedAmount === 'custom' ? '' : formData.estimatedAmount}
                      onChange={(event) => setFormData({ ...formData, estimatedAmount: event.target.value })}
                    />
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-blue-950">Location</h3>
                    <p className="text-xs text-blue-700">Search saved places or add a new district mapping.</p>
                  </div>
                  {locationSummary && (
                    <div className="rounded-md border border-blue-200 bg-white px-3 py-1 text-sm font-medium text-blue-900">
                      {locationSummary}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="placeName">Place Name *</Label>
                    <LocationSearchInput
                      id="placeName"
                      value={formData.placeName}
                      onChange={(value) => setFormData({ ...formData, placeName: value })}
                      onSelect={(place) =>
                        setFormData({
                          ...formData,
                          placeName: place.hindiName || place.englishName,
                          districtName: place.districtHindiName || place.districtName,
                          localBodyType: place.localBodyType || '',
                          localBodyTypeHindi: place.localBodyTypeHindi || '',
                        })
                      }
                    />
                    {settings?.enableLocationAIAutofill && (
                      <AILocationHelper
                        placeName={formData.placeName}
                        onAIFill={(data) =>
                          setFormData({
                            ...formData,
                            placeName: data.hindiName || data.englishName,
                            districtName: data.districtHindiName || data.districtName,
                          })
                        }
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="districtName">District *</Label>
                    <Input
                      id="districtName"
                      value={formData.districtName}
                      onChange={(event) => setFormData({ ...formData, districtName: event.target.value })}
                      placeholder="e.g., Datia"
                      required
                    />
                  </div>
                </div>
              </div>

              {!isMunicipalCorporation && (
                <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="publishDate">Publish Date</Label>
                    <Input
                      id="publishDate"
                      type="date"
                      value={formData.publishDate}
                      onChange={(event) => setFormData({ ...formData, publishDate: event.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="submissionDate">Submission Last Date</Label>
                    <Input
                      id="submissionDate"
                      type="date"
                      value={formData.submissionDate}
                      onChange={(event) => setFormData({ ...formData, submissionDate: event.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="openingDate">Opening Date</Label>
                    <Input
                      id="openingDate"
                      type="date"
                      value={formData.openingDate}
                      onChange={(event) => setFormData({ ...formData, openingDate: event.target.value })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <MultiProductItemManager tenderId={tempTenderId} items={items} onItemsChange={setItems} />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Card className="rounded-lg">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-lg">Firms</CardTitle>
              <CardDescription>Select the main firm and optional alternates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="space-y-2">
                <Label htmlFor="mainFirmId">Main Firm *</Label>
                <select
                  id="mainFirmId"
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={formData.mainFirmId}
                  onChange={(event) => setFormData({ ...formData, mainFirmId: event.target.value })}
                  required
                >
                  <option value="">Select main firm</option>
                  {firms.map((firm) => (
                    <option key={firm.id} value={firm.id}>
                      {firm.name}
                    </option>
                  ))}
                </select>
                {selectedMainFirm && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-slate-700">
                    <div><strong>City:</strong> {selectedMainFirm.firmCity || 'N/A'}</div>
                    <div><strong>GST:</strong> {selectedMainFirm.gstNumber || 'N/A'}</div>
                    <div><strong>Contact:</strong> {selectedMainFirm.mobileNumber || 'N/A'}</div>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="space-y-2">
                  <Label htmlFor="alternateFirmAId">Alternate Firm A</Label>
                  <select
                    id="alternateFirmAId"
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
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
                  {selectedAlternateFirmA && (
                    <p className="text-xs text-slate-500">{selectedAlternateFirmA.firmCity || 'City N/A'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alternateFirmBId">Alternate Firm B</Label>
                  <select
                    id="alternateFirmBId"
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
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
                  {selectedAlternateFirmB && (
                    <p className="text-xs text-slate-500">{selectedAlternateFirmB.firmCity || 'City N/A'}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-lg">Document Phrase Pack</CardTitle>
              <CardDescription>Configure phrase generation and assignment strategy for tender documents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="space-y-2">
                <Label htmlFor="phrasePackMode">Strategy</Label>
                <select
                  id="phrasePackMode"
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={phrasePackMode}
                  onChange={(event) => setPhrasePackMode(event.target.value as any)}
                >
                  <option value="auto">Auto-match (Generate with AI if category not found)</option>
                  <option value="force">Force new AI generation (Always generate new pack)</option>
                  <option value="manual">Assign manually to existing category</option>
                </select>
              </div>

              {phrasePackMode === 'manual' && (
                <div className="space-y-2">
                  <Label htmlFor="selectedPhraseCategoryId">Select Category</Label>
                  <select
                    id="selectedPhraseCategoryId"
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={selectedPhraseCategoryId}
                    onChange={(event) => setSelectedPhraseCategoryId(event.target.value)}
                  >
                    <option value="">Select existing category</option>
                    {phrasePacks.map((pack) => (
                      <option key={pack.categoryId} value={pack.categoryId}>
                        {pack.categoryName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>


          <Card className="rounded-lg">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-lg">Review</CardTitle>
              <CardDescription>Totals update as items are added.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Subtotal</div>
                  <div className="text-sm font-semibold text-slate-900">{formatMoney(totals.subtotal)}</div>
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">GST</div>
                  <div className="text-sm font-semibold text-slate-900">{formatMoney(totals.gstTotal)}</div>
                </div>
                <div className="rounded-md bg-blue-50 p-3">
                  <div className="text-xs text-blue-700">Total</div>
                  <div className="text-sm font-semibold text-blue-900">{formatMoney(totals.grandTotal)}</div>
                </div>
              </div>

              <div className="space-y-2 rounded-md border border-slate-200 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Department</span>
                  <span className="text-right font-medium text-slate-900">{selectedDepartment?.name || 'Not selected'}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Location</span>
                  <span className="text-right font-medium text-slate-900">{locationSummary || 'Not selected'}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Main firm</span>
                  <span className="text-right font-medium text-slate-900">{selectedMainFirm?.name || 'Not selected'}</span>
                </div>
              </div>

              <div className="grid gap-2">
                <Button type="submit" name="status" value="final" loading={loading} disabled={isSubmitDisabled}>
                  Create Tender
                </Button>
                <Button
                  type="submit"
                  name="status"
                  value="draft"
                  variant="outline"
                  loading={loading}
                  disabled={isSubmitDisabled}
                >
                  Save as Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </form>
    </div>
  );
}
