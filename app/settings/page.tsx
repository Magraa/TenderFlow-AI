'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Firm, Settings, PurposeMapping, HindiMapping, PlaceMapping, VersioningSettings, DocumentPhraseMapping } from '@/types';

import { dataService } from '@/services/dataService';
import {
  defaultVersioningSettings,
  normalizeVersioningSettings,
  validateVersioningSetting,
} from '@/services/versioningSettings';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddPlaceDialog } from '@/components/forms/Location/AddPlaceDialog';
import { Sparkles, FileText, Languages, Package, ChevronDown, ChevronUp } from 'lucide-react';

import { Textarea } from '@/components/ui/textarea';

type DictionaryType = 'purpose' | 'itemHindi' | 'vendorHindi';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [versioningErrors, setVersioningErrors] = useState<Record<string, string>>({});

  // Mapping state
  const [purposeMappings, setPurposeMappings] = useState<PurposeMapping[]>([]);
  const [itemHindiMappings, setItemHindiMappings] = useState<HindiMapping[]>([]);
  const [vendorHindiMappings, setVendorHindiMappings] = useState<HindiMapping[]>([]);
  const [placeMappings, setPlaceMappings] = useState<PlaceMapping[]>([]);
  const [documentPhraseMappings, setDocumentPhraseMappings] = useState<DocumentPhraseMapping[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(false);

  // Phrase pack dialog state
  const [phraseDialogOpen, setPhraseDialogOpen] = useState(false);
  const [phraseDialogMode, setPhraseDialogMode] = useState<'add' | 'edit'>('add');
  const [currentPhrase, setCurrentPhrase] = useState<DocumentPhraseMapping | null>(null);
  const [phraseFormData, setPhraseFormData] = useState<any>({});
  const [generatingPhrasePack, setGeneratingPhrasePack] = useState(false);
  const [expandedPhraseId, setExpandedPhraseId] = useState<string | null>(null);


  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [placeDialogOpen, setPlaceDialogOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<PlaceMapping | null>(null);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [dialogType, setDialogType] = useState<'purpose' | 'item' | 'vendor'>('purpose');
  const [currentMapping, setCurrentMapping] = useState<any>(null);
  const [generatingHindi, setGeneratingHindi] = useState(false);

  // Form state
  const [formData, setFormData] = useState<any>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Bulk import/export state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedDictionary, setSelectedDictionary] = useState<DictionaryType | null>(null);
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loadedSettings, loadedFirms] = await Promise.all([
        dataService.settings.get(),
        dataService.firms.list(),
      ]);
      if (cancelled) return;
      setSettings(loadedSettings);
      setFirms(loadedFirms);
      setLoading(false);
      loadMappings();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load mappings when tab is active
  useEffect(() => {
    if (dialogOpen) {
      loadMappings();
    }
  }, [dialogOpen]);

  const loadMappings = async () => {
    setLoadingMappings(true);
    try {
      const [purposes, items, vendors, places, phrasePacks] = await Promise.all([
        dataService.purposeMappings.list(),
        dataService.itemHindiMappings.list(),
        dataService.vendorHindiMappings.list(),
        dataService.placeMappings.list(),
        dataService.documentPhraseMappings.list(),
      ]);
      setPurposeMappings(purposes);
      setItemHindiMappings(items);
      setVendorHindiMappings(vendors);
      setPlaceMappings(places);
      setDocumentPhraseMappings(phrasePacks);

    } catch (error) {
      console.error('Error loading mappings:', error);
    } finally {
      setLoadingMappings(false);
    }
  };

  // Bulk import/export functions
  const handleExport = async () => {
    if (!selectedDictionary) return;
    
    setExporting(true);
    try {
      let data: any[] = [];
      let filename = '';
      
      switch (selectedDictionary) {
        case 'purpose':
          data = purposeMappings;
          filename = 'purpose-mappings.json';
          break;
        case 'itemHindi':
          data = itemHindiMappings;
          filename = 'item-hindi-mappings.json';
          break;
        case 'vendorHindi':
          data = vendorHindiMappings;
          filename = 'vendor-hindi-mappings.json';
          break;
      }
      
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setExportDialogOpen(false);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportError('');
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid file format: Expected an array of mappings');
      }
      
      if (data.length === 0) {
        throw new Error('Invalid file format: Empty array');
      }
      
      // Validate the data structure based on dictionary type
      if (selectedDictionary === 'purpose') {
        data.forEach((item) => {
          if (!item.category || !item.professionalPurpose || !item.language) {
            throw new Error('Invalid purpose mapping format');
          }
        });
      } else {
        data.forEach((item) => {
          if (!item.englishName || !item.hindiName || !item.type) {
            throw new Error('Invalid Hindi mapping format');
          }
        });
      }
      
      // Import the data
      let importedCount = 0;
      
      if (selectedDictionary === 'purpose') {
        for (const mapping of data) {
          await dataService.purposeMappings.create({
            category: mapping.category,
            professionalPurpose: mapping.professionalPurpose,
            language: mapping.language,
            usageCount: mapping.usageCount || 0,
            isAutoGenerated: mapping.isAutoGenerated || false,
          });
          importedCount++;
        }
      } else if (selectedDictionary === 'itemHindi') {
        for (const mapping of data) {
          await dataService.itemHindiMappings.create({
            englishName: mapping.englishName,
            hindiName: mapping.hindiName,
            type: mapping.type,
            usageCount: mapping.usageCount || 0,
            isAutoGenerated: mapping.isAutoGenerated || false,
          });
          importedCount++;
        }
      } else if (selectedDictionary === 'vendorHindi') {
        for (const mapping of data) {
          await dataService.vendorHindiMappings.create({
            englishName: mapping.englishName,
            hindiName: mapping.hindiName,
            type: mapping.type,
            usageCount: mapping.usageCount || 0,
            isAutoGenerated: mapping.isAutoGenerated || false,
          });
          importedCount++;
        }
      }
      
      alert(`Successfully imported ${importedCount} mappings`);
      setImportDialogOpen(false);
      loadMappings();
    } catch (error) {
      console.error('Error importing data:', error);
      setImportError(error instanceof Error ? error.message : 'Failed to import data');
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImport(file);
    }
  };

  const openImportDialog = (type: DictionaryType) => {
    setSelectedDictionary(type);
    setImportDialogOpen(true);
    setImportError('');
  };

  const openExportDialog = (type: DictionaryType) => {
    setSelectedDictionary(type);
    setExportDialogOpen(true);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const updated = await dataService.settings.update({
      organizationName: settings.organizationName,
      departmentAddress: settings.departmentAddress,
      contactPerson: settings.contactPerson,
      email: settings.email,
      phone: settings.phone,
      defaultLanguage: settings.defaultLanguage,
      headerSafeZonePx: settings.headerSafeZonePx,
      tenderNumberPrefix: settings.tenderNumberPrefix,
      enableLocationAIAutofill: settings.enableLocationAIAutofill,
      versioningSettings: settings.versioningSettings,
    });
    setSettings(updated);
    setSaving(false);
    setSuccess('Settings saved.');
    setTimeout(() => setSuccess(''), 2500);
  };

  const updateVersioningSettings = async (patch: Partial<VersioningSettings>) => {
    if (!settings) return;
    const nextVersioningSettings = normalizeVersioningSettings({
      ...settings.versioningSettings,
      ...patch,
    });
    const nextSettings = { ...settings, versioningSettings: nextVersioningSettings };
    setSettings(nextSettings);
    setSaving(true);
    try {
      const updated = await dataService.settings.update({ versioningSettings: nextVersioningSettings });
      setSettings(updated);
      setSuccess('Versioning settings saved.');
      setTimeout(() => setSuccess(''), 1800);
    } finally {
      setSaving(false);
    }
  };

  const updateNumericVersioningSetting = async (
    key: keyof Pick<VersioningSettings, 'maxVersions' | 'autoSaveInterval' | 'versionRetentionDays'>,
    rawValue: string
  ) => {
    if (!settings) return;
    const value = Number(rawValue);
    const error = validateVersioningSetting(key, value);
    setVersioningErrors((previous) => ({ ...previous, [key]: error }));
    if (error) return;
    await updateVersioningSettings({ [key]: value } as Partial<VersioningSettings>);
  };

  const resetVersioningSettings = () => updateVersioningSettings(defaultVersioningSettings);

  // Mapping management handlers
  const openAddDialog = (type: 'purpose' | 'item' | 'vendor') => {
    setDialogMode('add');
    setDialogType(type);
    setCurrentMapping(null);
    setFormData({
      category: '',
      professionalPurpose: '',
      englishName: '',
      hindiName: '',
      language: 'hindi',
      type: type === 'purpose' ? undefined : type,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (type: 'purpose' | 'item' | 'vendor', mapping: any) => {
    setDialogMode('edit');
    setDialogType(type);
    setCurrentMapping(mapping);
    
    if (type === 'purpose') {
      setFormData({
        category: mapping.category,
        professionalPurpose: mapping.professionalPurpose,
        language: mapping.language,
      });
    } else {
      setFormData({
        englishName: mapping.englishName,
        hindiName: mapping.hindiName,
        type: mapping.type,
      });
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const deleteMapping = async (type: 'purpose' | 'item' | 'vendor', id: string) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return;
    
    try {
      if (type === 'purpose') {
        await dataService.purposeMappings.delete(id);
        setPurposeMappings(purposes => purposes.filter(p => p.id !== id));
      } else if (type === 'item') {
        await dataService.itemHindiMappings.delete(id);
        setItemHindiMappings(items => items.filter(i => i.id !== id));
      } else {
        await dataService.vendorHindiMappings.delete(id);
        setVendorHindiMappings(vendors => vendors.filter(v => v.id !== id));
      }
    } catch (error) {
      console.error('Error deleting mapping:', error);
      alert('Failed to delete mapping');
    }
  };

  const openAddPlaceDialog = () => {
    setEditingPlace(null);
    setPlaceDialogOpen(true);
  };

  const openEditPlaceDialog = (place: PlaceMapping) => {
    setEditingPlace(place);
    setPlaceDialogOpen(true);
  };

  const deletePlaceMapping = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      await dataService.placeMappings.delete(id);
      setPlaceMappings((places) => places.filter((place) => place.id !== id));
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('Failed to delete location');
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (dialogType === 'purpose') {
      if (!formData.category?.trim()) errors.category = 'Category is required';
      if (!formData.professionalPurpose?.trim()) errors.professionalPurpose = 'Professional purpose is required';
    } else {
      if (!formData.englishName?.trim()) errors.englishName = 'English name is required';
      if (!formData.hindiName?.trim()) errors.hindiName = 'Hindi name is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGenerateAllHindi = async () => {
    const englishName = formData.englishName?.trim();
    const englishDesc = formData.englishDescription?.trim();
    if (!englishName) return;

    setGeneratingHindi(true);
    try {
      if (englishName && englishDesc) {
        // Send both in a single request with a separator
        const combinedText = `${englishName} ||| ${englishDesc}`;
        const response = await fetch('/api/ai/transliterate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: combinedText,
            sourceLanguage: 'english',
            targetLanguage: 'hindi',
          }),
        });

        if (!response.ok) {
          throw new Error('Transliteration failed');
        }

        const data = await response.json();
        if (data.transliteratedText) {
          const parts = data.transliteratedText.split('|||');
          const transliteratedName = parts[0]?.trim() || englishName;
          const transliteratedDesc = parts[1]?.trim() || '';

          setFormData((prev: any) => ({
            ...prev,
            hindiName: transliteratedName,
            hindiDescription: transliteratedDesc,
          }));
        }
      } else {
        // Send name only
        const response = await fetch('/api/ai/transliterate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: englishName,
            sourceLanguage: 'english',
            targetLanguage: 'hindi',
          }),
        });

        if (!response.ok) {
          throw new Error('Transliteration failed');
        }

        const data = await response.json();
        if (data.transliteratedText) {
          setFormData((prev: any) => ({
            ...prev,
            hindiName: data.transliteratedText,
          }));
        }
      }

      // Clear any previous hindiName error if resolved
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.hindiName;
        return next;
      });
    } catch (error) {
      console.error('Error generating Hindi transliteration:', error);
      alert('Failed to generate Hindi transliteration. Please enter manually.');
    } finally {
      setGeneratingHindi(false);
    }
  };

  const handleSaveMapping = async () => {
    if (!validateForm()) return;
    
    try {
      if (dialogType === 'purpose') {
        if (dialogMode === 'add') {
          await dataService.purposeMappings.create({
            category: formData.category.trim(),
            professionalPurpose: formData.professionalPurpose.trim(),
            language: formData.language as 'hindi' | 'english',
            usageCount: 0,
            isAutoGenerated: false,
          });
        } else if (currentMapping) {
          await dataService.purposeMappings.update(currentMapping.id, {
            professionalPurpose: formData.professionalPurpose.trim(),
          });
        }
      } else {
        const mappingData = {
          englishName: formData.englishName.trim(),
          hindiName: formData.hindiName.trim(),
          englishDescription: formData.englishDescription?.trim() || '',
          hindiDescription: formData.hindiDescription?.trim() || '',
          type: dialogType as 'item' | 'vendor',
          usageCount: 0,
          isAutoGenerated: false,
        };
        
        if (dialogMode === 'add') {
          if (dialogType === 'item') {
            await dataService.itemHindiMappings.create(mappingData);
          } else {
            await dataService.vendorHindiMappings.create(mappingData);
          }
        } else if (currentMapping) {
          if (dialogType === 'item') {
            await dataService.itemHindiMappings.update(currentMapping.id, {
              hindiName: formData.hindiName.trim(),
              englishDescription: formData.englishDescription?.trim() || '',
              hindiDescription: formData.hindiDescription?.trim() || '',
              updatedAt: new Date().toISOString(),
            });
          } else {
            await dataService.vendorHindiMappings.update(currentMapping.id, {
              hindiName: formData.hindiName.trim(),
              englishDescription: formData.englishDescription?.trim() || '',
              hindiDescription: formData.hindiDescription?.trim() || '',
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }
      
      setDialogOpen(false);
      loadMappings();
    } catch (error) {
      console.error('Error saving mapping:', error);
      alert('Failed to save mapping');
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {success && (
          <Alert variant="success">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>General offline panel defaults.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input
                  id="organizationName"
                  value={settings.organizationName}
                  onChange={(event) => setSettings({ ...settings, organizationName: event.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="departmentAddress">Address</Label>
                <textarea
                  id="departmentAddress"
                  className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={settings.departmentAddress}
                  onChange={(event) => setSettings({ ...settings, departmentAddress: event.target.value })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    value={settings.contactPerson}
                    onChange={(event) => setSettings({ ...settings, contactPerson: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={settings.phone}
                    onChange={(event) => setSettings({ ...settings, phone: event.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(event) => setSettings({ ...settings, email: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenderNumberPrefix">Tender Prefix</Label>
                  <Input
                    id="tenderNumberPrefix"
                    value={settings.tenderNumberPrefix}
                    onChange={(event) => setSettings({ ...settings, tenderNumberPrefix: event.target.value })}
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded border border-slate-200 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={settings.enableLocationAIAutofill}
                  onChange={(event) => setSettings({ ...settings, enableLocationAIAutofill: event.target.checked })}
                />
                <span>
                  <span className="block font-medium">Enable location AI auto-fill</span>
                  <span className="text-slate-500">Temporarily keep this off while location auto-fill is refined.</span>
                </span>
              </label>

              <Button onClick={handleSave} loading={saving} disabled={saving}>
                Save Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Firms</CardTitle>
              <CardDescription>Letterhead-only firm profiles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/manage-firms">
                <Button>Open Manage Firms</Button>
              </Link>
              <div className="space-y-2">
                {firms.length === 0 ? (
                  <p className="text-sm text-slate-500">No firms configured.</p>
                ) : (
                  firms.map((firm) => (
                    <div key={firm.id} className="rounded border border-slate-200 p-3 text-sm">
                      <p className="font-medium">{firm.name}</p>
                      <p className="text-slate-500">
                        Header: {firm.headerSpacing}px, Footer: {firm.footerSpacing}px, Margins: {firm.pageMargin}px
                      </p>
                      <p className="text-slate-500">
                        fitMode: {firm.fitLetterheadMode}, style: {firm.firmStyleProfile}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Master Dictionaries</CardTitle>
            <CardDescription>Manage purpose mappings and Hindi transliteration dictionaries.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="phrasepacks" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="purpose">Purpose Library</TabsTrigger>
                <TabsTrigger value="item">Item Hindi Mappings</TabsTrigger>
                <TabsTrigger value="phrasepacks" className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  Phrase Packs
                </TabsTrigger>
                <TabsTrigger value="locations">Locations</TabsTrigger>
              </TabsList>

              
              <TabsContent value="purpose" className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <p className="text-sm text-slate-500">Map procurement categories to professional procurement purposes.</p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openExportDialog('purpose')}
                      disabled={exporting || purposeMappings.length === 0}
                    >
                      Export
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openImportDialog('purpose')}
                      disabled={importing}
                    >
                      Import
                    </Button>
                    <Button onClick={() => openAddDialog('purpose')}>
                      Add Mapping
                    </Button>
                  </div>
                </div>
                {loadingMappings ? (
                  <p className="text-sm text-slate-500">Loading mappings...</p>
                ) : purposeMappings.length === 0 ? (
                  <p className="text-sm text-slate-500">No purpose mappings configured.</p>
                ) : (
                  <div className="space-y-2">
                    {purposeMappings.map((mapping) => (
                      <div key={mapping.id} className="rounded border border-slate-200 p-3 text-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">
                              <span className="text-slate-500">Category:</span> {mapping.category}
                            </p>
                            <p className="mt-1">
                              <span className="text-slate-500">Purpose:</span> {mapping.professionalPurpose}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              Language: {mapping.language} | Usage: {mapping.usageCount}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => openEditDialog('purpose', mapping)}>
                              Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => deleteMapping('purpose', mapping.id)}>
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="item" className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <p className="text-sm text-slate-500">Map English item names to Hindi transliterations.</p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openExportDialog('itemHindi')}
                      disabled={exporting || itemHindiMappings.length === 0}
                    >
                      Export
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openImportDialog('itemHindi')}
                      disabled={importing}
                    >
                      Import
                    </Button>
                    <Button onClick={() => openAddDialog('item')}>
                      Add Mapping
                    </Button>
                  </div>
                </div>
                {loadingMappings ? (
                  <p className="text-sm text-slate-500">Loading mappings...</p>
                ) : itemHindiMappings.length === 0 ? (
                  <p className="text-sm text-slate-500">No item Hindi mappings configured.</p>
                ) : (
                  <div className="space-y-2">
                    {itemHindiMappings.map((mapping) => (
                      <div key={mapping.id} className="rounded border border-slate-200 p-3 text-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">
                              <span className="text-slate-500">English:</span> {mapping.englishName}
                            </p>
                            {mapping.englishDescription && (
                              <p className="text-xs text-slate-500 mt-0.5 ml-4">
                                <span className="font-medium text-slate-400">Desc:</span> {mapping.englishDescription}
                              </p>
                            )}
                            <p className="mt-1.5 font-medium">
                              <span className="text-slate-500">Hindi:</span> {mapping.hindiName}
                            </p>
                            {mapping.hindiDescription && (
                              <p className="text-xs text-slate-500 mt-0.5 ml-4">
                                <span className="font-medium text-slate-400">विवरण:</span> {mapping.hindiDescription}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-slate-400">
                              Usage: {mapping.usageCount} | Auto-generated: {mapping.isAutoGenerated ? 'Yes' : 'No'}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => openEditDialog('item', mapping)}>
                              Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => deleteMapping('item', mapping.id)}>
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ─── Phrase Packs Tab ─────────────────────────────────────────── */}
              <TabsContent value="phrasepacks" className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Document Phrase Packs</p>
                    <p className="text-xs text-slate-500 mt-0.5">Each category stores reusable Hindi phrases for all tender document types. Generated once by AI, reused forever.</p>
                  </div>
                  <Button
                    onClick={() => {
                      setPhraseDialogMode('add');
                      setCurrentPhrase(null);
                      setPhraseFormData({
                        categoryName: '',
                        keywords: '',
                        supplyOrderSubject: '',
                        quotationPurchaseLine: '',
                        quotationAltHindi: '',
                        quotationAltEnglish: '',
                        billItemDescription: '',
                      });
                      setPhraseDialogOpen(true);
                    }}
                    className="shrink-0"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Add Phrase Pack
                  </Button>
                </div>

                {loadingMappings ? (
                  <p className="text-sm text-slate-500">Loading phrase packs...</p>
                ) : documentPhraseMappings.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center">
                    <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-600">No phrase packs yet</p>
                    <p className="text-xs text-slate-400 mt-1">Create a tender and the system will auto-generate phrase packs, or add one manually above.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documentPhraseMappings.map((pack) => (
                      <div
                        key={pack.id}
                        className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                      >
                        {/* Header row */}
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                              <Package className="h-4.5 w-4.5 text-blue-500" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{pack.categoryName}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {pack.keywords.slice(0, 4).join(', ')}{pack.keywords.length > 4 ? ` +${pack.keywords.length - 4}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {pack.generatedByAI && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-600">
                                <Sparkles className="h-3 w-3" /> AI
                              </span>
                            )}
                            {pack.approved && (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600">Approved</span>
                            )}
                            <span className="text-xs text-slate-400">Used {pack.usageCount}×</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPhraseDialogMode('edit');
                                setCurrentPhrase(pack);
                                setPhraseFormData({
                                  categoryName: pack.categoryName,
                                  keywords: pack.keywords.join(', '),
                                  supplyOrderSubject: pack.phrases.supplyOrder.subject,
                                  quotationPurchaseLine: pack.phrases.quotation.purchaseLine,
                                  quotationAltHindi: pack.phrases.quotationAltHindi.subject,
                                  quotationAltEnglish: pack.phrases.quotationAltEnglish.subject,
                                  billItemDescription: pack.phrases.bill.itemDescription,
                                });
                                setPhraseDialogOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={async () => {
                                if (!confirm(`Delete phrase pack "${pack.categoryName}"?`)) return;
                                await dataService.documentPhraseMappings.delete(pack.id);
                                setDocumentPhraseMappings((prev) => prev.filter((p) => p.id !== pack.id));
                              }}
                            >
                              Delete
                            </Button>
                            <button
                              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                              onClick={() => setExpandedPhraseId(expandedPhraseId === pack.id ? null : pack.id)}
                            >
                              {expandedPhraseId === pack.id
                                ? <ChevronUp className="h-4 w-4 text-slate-400" />
                                : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded phrase detail */}
                        {expandedPhraseId === pack.id && (
                          <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1 sm:col-span-2">
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Supply Order Subject</p>
                              <p className="text-sm text-slate-700 bg-white rounded-lg border border-slate-200 px-3 py-2">{pack.phrases.supplyOrder.subject || <span className="text-slate-300 italic">—</span>}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Main Quotation (English)</p>
                              <p className="text-sm text-slate-700 bg-white rounded-lg border border-slate-200 px-3 py-2">{pack.phrases.quotationMain?.english || <span className="text-slate-300 italic">—</span>}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Main Quotation (Hindi)</p>
                              <p className="text-sm text-slate-700 bg-white rounded-lg border border-slate-200 px-3 py-2">{pack.phrases.quotationMain?.hindi || <span className="text-slate-300 italic">—</span>}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quotation Purchase Line</p>
                              <p className="text-sm text-slate-700 bg-white rounded-lg border border-slate-200 px-3 py-2">{pack.phrases.quotation.purchaseLine || <span className="text-slate-300 italic">—</span>}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Alt Quotation (Hindi)</p>
                              <p className="text-sm text-slate-700 bg-white rounded-lg border border-slate-200 px-3 py-2">{pack.phrases.quotationAltHindi.subject || <span className="text-slate-300 italic">—</span>}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Alt Quotation (English)</p>
                              <p className="text-sm text-slate-700 bg-white rounded-lg border border-slate-200 px-3 py-2">{pack.phrases.quotationAltEnglish.subject || <span className="text-slate-300 italic">—</span>}</p>
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bill / Invoice Description</p>
                              <p className="text-sm text-slate-700 bg-white rounded-lg border border-slate-200 px-3 py-2">{pack.phrases.bill.itemDescription || <span className="text-slate-300 italic">—</span>}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="locations" className="space-y-4">

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <p className="text-sm text-slate-500">Manage place, district, and local body mappings.</p>
                  <Button onClick={openAddPlaceDialog}>Add Place</Button>
                </div>
                {loadingMappings ? (
                  <p className="text-sm text-slate-500">Loading locations...</p>
                ) : placeMappings.length === 0 ? (
                  <p className="text-sm text-slate-500">No locations configured.</p>
                ) : (
                  <div className="overflow-hidden rounded border border-slate-200">
                    <div className="grid grid-cols-5 gap-3 bg-slate-100 px-3 py-2 text-xs font-semibold uppercase text-slate-600">
                      <span>Place</span>
                      <span>District</span>
                      <span>Local Body</span>
                      <span>Final Line</span>
                      <span>Actions</span>
                    </div>
                    {placeMappings.map((place) => {
                      const finalLine = `${[place.localBodyTypeHindi || place.localBodyType, place.hindiName || place.englishName]
                        .filter(Boolean)
                        .join(' ')}${place.districtHindiName || place.districtName ? ` जिला ${place.districtHindiName || place.districtName}` : ''}`.trim();
                      return (
                        <div key={place.id} className="grid grid-cols-5 gap-3 border-t border-slate-200 px-3 py-2 text-sm">
                          <span>
                            {place.hindiName || place.englishName}
                            {place.englishName && place.hindiName ? ` (${place.englishName})` : ''}
                          </span>
                          <span>
                            {place.districtHindiName || place.districtName}
                            {place.districtName && place.districtHindiName ? ` (${place.districtName})` : ''}
                          </span>
                          <span>
                            {place.localBodyTypeHindi || place.localBodyType || 'N/A'}
                            {place.localBodyType && place.localBodyTypeHindi ? ` (${place.localBodyType})` : ''}
                          </span>
                          <span className="font-medium text-slate-900">{finalLine || 'N/A'}</span>
                          <span className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditPlaceDialog(place)}>
                              Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => deletePlaceMapping(place.id)}>
                              Delete
                            </Button>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Versioning Settings</CardTitle>
            <CardDescription>Configure document history, auto-save, cleanup, and comparison behavior.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!settings.versioningSettings.enabled && (
              <Alert variant="warning">
                <AlertTitle>Versioning Disabled</AlertTitle>
                <AlertDescription>Documents will continue to generate, but previous versions will not be saved.</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between rounded border border-slate-200 p-4">
              <div>
                <Label className="font-medium">Enable Versioning</Label>
                <p className="text-sm text-slate-500">Save document history before regeneration or manual edits.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.versioningSettings.enabled}
                onClick={() => updateVersioningSettings({ enabled: !settings.versioningSettings.enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.versioningSettings.enabled ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.versioningSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="maxVersions">Maximum Versions</Label>
                <Input
                  id="maxVersions"
                  type="number"
                  min="1"
                  max="1000"
                  disabled={!settings.versioningSettings.enabled}
                  value={settings.versioningSettings.maxVersions}
                  onChange={(event) => updateNumericVersioningSetting('maxVersions', event.target.value)}
                />
                {versioningErrors.maxVersions && <p className="text-xs text-red-500">{versioningErrors.maxVersions}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="autoSaveInterval">Auto-save Interval (minutes)</Label>
                <Input
                  id="autoSaveInterval"
                  type="number"
                  min="1"
                  max="60"
                  disabled={!settings.versioningSettings.enabled || !settings.versioningSettings.autoSaveEnabled}
                  value={settings.versioningSettings.autoSaveInterval}
                  onChange={(event) => updateNumericVersioningSetting('autoSaveInterval', event.target.value)}
                />
                {versioningErrors.autoSaveInterval && <p className="text-xs text-red-500">{versioningErrors.autoSaveInterval}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="versionRetentionDays">Retention Days</Label>
                <Input
                  id="versionRetentionDays"
                  type="number"
                  min="7"
                  max="3650"
                  disabled={!settings.versioningSettings.enabled}
                  value={settings.versioningSettings.versionRetentionDays}
                  onChange={(event) => updateNumericVersioningSetting('versionRetentionDays', event.target.value)}
                />
                {versioningErrors.versionRetentionDays && <p className="text-xs text-red-500">{versioningErrors.versionRetentionDays}</p>}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="flex items-center gap-2 rounded border border-slate-200 p-3 text-sm">
                <input
                  type="checkbox"
                  disabled={!settings.versioningSettings.enabled}
                  checked={settings.versioningSettings.autoSaveEnabled}
                  onChange={(event) => updateVersioningSettings({ autoSaveEnabled: event.target.checked })}
                />
                Auto-save document versions
              </label>
              <label className="flex items-center gap-2 rounded border border-slate-200 p-3 text-sm">
                <input
                  type="checkbox"
                  disabled={!settings.versioningSettings.enabled}
                  checked={settings.versioningSettings.changeNotesRequired}
                  onChange={(event) => updateVersioningSettings({ changeNotesRequired: event.target.checked })}
                />
                Require change notes
              </label>
              <label className="flex items-center gap-2 rounded border border-slate-200 p-3 text-sm">
                <input
                  type="checkbox"
                  disabled={!settings.versioningSettings.enabled}
                  checked={settings.versioningSettings.enableVersionComparison}
                  onChange={(event) => updateVersioningSettings({ enableVersionComparison: event.target.checked })}
                />
                Enable version comparison
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t pt-4">
              <Button type="button" variant="outline" onClick={resetVersioningSettings} disabled={saving}>
                Reset Versioning Defaults
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Dialog */}
      <AddPlaceDialog
        open={placeDialogOpen}
        initialName=""
        place={editingPlace}
        onOpenChange={setPlaceDialogOpen}
        onCreated={(place) => setPlaceMappings((current) => [place, ...current])}
        onUpdated={(updatedPlace) =>
          setPlaceMappings((current) =>
            current.map((place) => (place.id === updatedPlace.id ? updatedPlace : place))
          )
        }
      />

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-md border-0 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden transition-all duration-300">
          <DialogHeader className="bg-slate-50/50 border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-800">
                  Import {selectedDictionary === 'purpose' ? 'Purpose' : 'Item Hindi'} Mappings
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Upload a JSON file containing mapping records.
                </p>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 px-6 py-5 bg-white">
            <div className="space-y-1.5">
              <Label htmlFor="importFile" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                JSON File
              </Label>
              <Input
                id="importFile"
                type="file"
                accept=".json"
                className="focus-visible:ring-blue-500 border-slate-200 rounded-lg shadow-sm"
                onChange={handleFileChange}
                disabled={importing}
              />
            </div>
            
            {importError && (
              <Alert variant="destructive" className="rounded-lg">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{importError}</AlertDescription>
              </Alert>
            )}
            
            <p className="text-xs text-slate-400">
              Select a JSON file containing an array of mappings. Each mapping should have the appropriate fields for the dictionary type.
            </p>
          </div>
          
          <DialogFooter className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex gap-2">
            <Button 
              variant="outline" 
              className="rounded-lg h-10 border-slate-200 hover:bg-slate-100 font-medium"
              onClick={() => setImportDialogOpen(false)} 
              disabled={importing}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-md border-0 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden transition-all duration-300">
          <DialogHeader className="bg-slate-50/50 border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-800">
                  Export {selectedDictionary === 'purpose' ? 'Purpose' : 'Item Hindi'} Mappings
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Download mappings as a JSON file.
                </p>
              </div>
            </div>
          </DialogHeader>
          
          <div className="px-6 py-5 bg-white">
            <p className="text-sm text-slate-600">
              Are you sure you want to export the {selectedDictionary === 'purpose' ? 'purpose' : 'item Hindi'} mappings?
            </p>
            
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-sm shadow-inner">
              <p className="font-semibold text-slate-700">Export Details:</p>
              <ul className="mt-2 list-inside list-disc space-y-1.5 text-slate-600">
                <li>Type: {selectedDictionary === 'purpose' ? 'Purpose Mappings' : 'Item Hindi Mappings'}</li>
                <li>
                  Count: {selectedDictionary === 'purpose' ? purposeMappings.length : itemHindiMappings.length}
                </li>
                <li>Format: JSON</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex gap-2">
            <Button 
              variant="outline" 
              className="rounded-lg h-10 border-slate-200 hover:bg-slate-100 font-medium"
              onClick={() => setExportDialogOpen(false)} 
              disabled={exporting}
            >
              Cancel
            </Button>
            <Button 
              className="rounded-lg h-10 bg-blue-600 hover:bg-blue-700 font-medium"
              onClick={handleExport} 
              loading={exporting} 
              disabled={exporting}
            >
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Mapping Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md border-0 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden transition-all duration-300">
          <DialogHeader className="bg-slate-50/50 border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                {dialogType === 'purpose' ? (
                  <FileText className="h-5 w-5" />
                ) : (
                  <Languages className="h-5 w-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-800">
                  {dialogMode === 'add' ? 'Add New' : 'Edit'} {dialogType === 'purpose' ? 'Purpose Mapping' : 'Item Hindi Mapping'}
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-1">
                  {dialogType === 'purpose' 
                    ? 'Map categories to professional Hindi/English purpose statements.' 
                    : 'Transliterate English item names to Hindi script for automatic translation.'}
                </p>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-5 px-6 py-6 bg-white">
            {dialogType === 'purpose' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Category Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="category"
                    className="focus-visible:ring-blue-500 border-slate-200 h-10 rounded-lg shadow-sm"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., fire_fighting"
                  />
                  {formErrors.category && <p className="text-xs text-red-500 font-medium">{formErrors.category}</p>}
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="professionalPurpose" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Professional Purpose (Hindi/English) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="professionalPurpose"
                    className="focus-visible:ring-blue-500 border-slate-200 h-10 rounded-lg shadow-sm"
                    value={formData.professionalPurpose}
                    onChange={(e) => setFormData({ ...formData, professionalPurpose: e.target.value })}
                    placeholder="e.g., अग्निशमन एवं जल आपूर्ति कार्य हेतु आवश्यक सामग्री"
                  />
                  {formErrors.professionalPurpose && <p className="text-xs text-red-500 font-medium">{formErrors.professionalPurpose}</p>}
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="language" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Language
                  </Label>
                  <select
                    id="language"
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value as 'hindi' | 'english' })}
                  >
                    <option value="hindi">Hindi</option>
                    <option value="english">English</option>
                  </select>
                </div>
              </>
            )}
            
            {dialogType !== 'purpose' && (
              <>
                <div className="space-y-4 p-3 bg-slate-50/50 rounded-xl border border-slate-100/80">
                  <div className="space-y-1.5">
                    <Label htmlFor="englishName" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      English Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="englishName"
                      className="focus-visible:ring-blue-500 border-slate-200 h-10 rounded-lg bg-white shadow-sm"
                      value={formData.englishName}
                      onChange={(e) => setFormData({ ...formData, englishName: e.target.value })}
                      placeholder="e.g., Fire Hose"
                    />
                    {formErrors.englishName && <p className="text-xs text-red-500 font-medium">{formErrors.englishName}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="englishDescription" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      English Description <span className="text-slate-400 font-normal">(Optional)</span>
                    </Label>
                    <Textarea
                      id="englishDescription"
                      className="focus-visible:ring-blue-500 border-slate-200 rounded-lg bg-white shadow-sm min-h-[60px]"
                      value={formData.englishDescription}
                      onChange={(e) => setFormData({ ...formData, englishDescription: e.target.value })}
                      placeholder="e.g., Fire fighting hose made of synthetic rubber..."
                    />
                  </div>
                </div>

                <div className="flex justify-center py-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-10 border-blue-200 hover:border-blue-300 hover:bg-blue-50 text-blue-600 font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                    loading={generatingHindi}
                    disabled={!formData.englishName?.trim() || generatingHindi}
                    onClick={handleGenerateAllHindi}
                  >
                    {!generatingHindi && <Sparkles className="h-4 w-4 text-blue-500" />}
                    Generate Hindi Transliteration
                  </Button>
                </div>

                <div className="space-y-4 p-3 bg-slate-50/50 rounded-xl border border-slate-100/80">
                  <div className="space-y-1.5">
                    <Label htmlFor="hindiName" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Hindi Transliteration <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="hindiName"
                      className="focus-visible:ring-blue-500 border-slate-200 h-10 rounded-lg bg-white shadow-sm"
                      value={formData.hindiName}
                      onChange={(e) => setFormData({ ...formData, hindiName: e.target.value })}
                      placeholder="e.g., अग्निशमन होस"
                    />
                    {formErrors.hindiName && <p className="text-xs text-red-500 font-medium">{formErrors.hindiName}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="hindiDescription" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Hindi Description <span className="text-slate-400 font-normal">(Optional)</span>
                    </Label>
                    <Textarea
                      id="hindiDescription"
                      className="focus-visible:ring-blue-500 border-slate-200 rounded-lg bg-white shadow-sm min-h-[60px]"
                      value={formData.hindiDescription}
                      onChange={(e) => setFormData({ ...formData, hindiDescription: e.target.value })}
                      placeholder="e.g., सिंथेटिक रबर से बना अग्निशमन नली..."
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex gap-2">
            <Button 
              variant="outline" 
              className="rounded-lg h-10 border-slate-200 hover:bg-slate-100 font-medium"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="rounded-lg h-10 bg-blue-600 hover:bg-blue-700 font-medium"
              onClick={handleSaveMapping}
            >
              {dialogMode === 'add' ? 'Add Mapping' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Phrase Pack Add / Edit Dialog ──────────────────────────────── */}
      <Dialog open={phraseDialogOpen} onOpenChange={setPhraseDialogOpen}>
        <DialogContent className="max-w-2xl border-0 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden">
          <DialogHeader className="bg-slate-50/50 border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-800">
                  {phraseDialogMode === 'add' ? 'Add' : 'Edit'} Phrase Pack
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Define reusable Hindi phrases for all tender document types in this category.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 px-6 py-5 bg-white overflow-y-auto max-h-[70vh]">
            {/* Category + AI Generate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="phraseCategory" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Category Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phraseCategory"
                  className="focus-visible:ring-blue-500 border-slate-200 h-10 rounded-lg bg-white shadow-sm"
                  value={phraseFormData.categoryName || ''}
                  onChange={(e) => setPhraseFormData({ ...phraseFormData, categoryName: e.target.value })}
                  placeholder="e.g., Dustbin"
                />
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="phraseKeywords" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Keywords <span className="text-slate-400 font-normal">(comma separated)</span>
                </Label>
                <Input
                  id="phraseKeywords"
                  className="focus-visible:ring-blue-500 border-slate-200 h-10 rounded-lg bg-white shadow-sm"
                  value={phraseFormData.keywords || ''}
                  onChange={(e) => setPhraseFormData({ ...phraseFormData, keywords: e.target.value })}
                  placeholder="dustbin, waste bin, pedal bin"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="phraseEnglishDescription" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  English Description <span className="text-slate-400 font-normal">(Optional - improves AI generation accuracy)</span>
                </Label>
                <Textarea
                  id="phraseEnglishDescription"
                  className="focus-visible:ring-blue-500 border-slate-200 rounded-lg bg-white shadow-sm min-h-[60px]"
                  value={phraseFormData.englishDescription || ''}
                  onChange={(e) => setPhraseFormData({ ...phraseFormData, englishDescription: e.target.value })}
                  placeholder="e.g., Fire fighting hose made of synthetic rubber, or 12 liter HDPE garbage bin..."
                />
              </div>
            </div>

            {/* AI Generate button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-10 border-purple-200 hover:border-purple-300 hover:bg-purple-50 text-purple-600 font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
              loading={generatingPhrasePack}
              disabled={!phraseFormData.categoryName?.trim() || generatingPhrasePack}
              onClick={async () => {
                setGeneratingPhrasePack(true);
                try {
                  const response = await fetch('/api/ai/generate-phrase-pack', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      itemName: phraseFormData.categoryName,
                      description: phraseFormData.englishDescription,
                    }),
                  });
                  if (!response.ok) throw new Error('Generation failed');
                  const data = await response.json();
                  setPhraseFormData((prev: any) => ({
                    ...prev,
                    keywords: [...new Set([...(prev.keywords ? prev.keywords.split(',').map((k: string) => k.trim()) : []), ...(data.keywords || [])])].join(', '),
                    supplyOrderSubject: data.phrases?.supplyOrder?.subject || prev.supplyOrderSubject,
                    quotationMainEnglish: data.phrases?.quotationMain?.english || prev.quotationMainEnglish,
                    quotationMainHindi: data.phrases?.quotationMain?.hindi || prev.quotationMainHindi,
                    quotationPurchaseLine: data.phrases?.quotation?.purchaseLine || prev.quotationPurchaseLine,
                    quotationAltHindi: data.phrases?.quotationAltHindi?.subject || prev.quotationAltHindi,
                    quotationAltEnglish: data.phrases?.quotationAltEnglish?.subject || prev.quotationAltEnglish,
                    billItemDescription: data.phrases?.bill?.itemDescription || prev.billItemDescription,
                  }));
                } catch {
                  alert('Failed to generate phrase pack. Please fill in manually.');
                } finally {
                  setGeneratingPhrasePack(false);
                }
              }}
            >
              {!generatingPhrasePack && <Sparkles className="h-4 w-4 text-purple-500" />}
              Generate All Phrases with AI
            </Button>

            <div className="border-t border-slate-100 pt-4 space-y-4">
              {/* Supply Order */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Supply Order Subject
                </Label>
                <Textarea
                  className="focus-visible:ring-blue-500 border-slate-200 rounded-lg bg-white shadow-sm min-h-[52px]"
                  value={phraseFormData.supplyOrderSubject || ''}
                  onChange={(e) => setPhraseFormData({ ...phraseFormData, supplyOrderSubject: e.target.value })}
                  placeholder="e.g., स्वच्छता हेतु डस्टबिन सप्लाई करने बाबत।"
                />
              </div>

              {/* Main Quotation English & Hindi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Main Quotation (English)
                  </Label>
                  <Textarea
                    className="focus-visible:ring-blue-500 border-slate-200 rounded-lg bg-white shadow-sm min-h-[52px]"
                    value={phraseFormData.quotationMainEnglish || ''}
                    onChange={(e) => setPhraseFormData({ ...phraseFormData, quotationMainEnglish: e.target.value })}
                    placeholder="e.g., To give the Quotations of Dustbin."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Main Quotation (Hindi)
                  </Label>
                  <Textarea
                    className="focus-visible:ring-blue-500 border-slate-200 rounded-lg bg-white shadow-sm min-h-[52px]"
                    value={phraseFormData.quotationMainHindi || ''}
                    onChange={(e) => setPhraseFormData({ ...phraseFormData, quotationMainHindi: e.target.value })}
                    placeholder="e.g., डस्टबिन के कोटेशन देने हेतु।"
                  />
                </div>
              </div>

              {/* Quotation */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Quotation Purchase Line
                </Label>
                <Textarea
                  className="focus-visible:ring-blue-500 border-slate-200 rounded-lg bg-white shadow-sm min-h-[52px]"
                  value={phraseFormData.quotationPurchaseLine || ''}
                  onChange={(e) => setPhraseFormData({ ...phraseFormData, quotationPurchaseLine: e.target.value })}
                  placeholder="e.g., स्वच्छता हेतु डस्टबिन क्रय किया जाना है।"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Alt Hindi */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Alt Quotation (Hindi)
                  </Label>
                  <Textarea
                    className="focus-visible:ring-blue-500 border-slate-200 rounded-lg bg-white shadow-sm min-h-[52px]"
                    value={phraseFormData.quotationAltHindi || ''}
                    onChange={(e) => setPhraseFormData({ ...phraseFormData, quotationAltHindi: e.target.value })}
                    placeholder="e.g., सफाई सामग्री के कुटेशन देने बाबत।"
                  />
                </div>
                {/* Alt English */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Alt Quotation (English)
                  </Label>
                  <Textarea
                    className="focus-visible:ring-blue-500 border-slate-200 rounded-lg bg-white shadow-sm min-h-[52px]"
                    value={phraseFormData.quotationAltEnglish || ''}
                    onChange={(e) => setPhraseFormData({ ...phraseFormData, quotationAltEnglish: e.target.value })}
                    placeholder="e.g., To give the Quotations of Cleaning Material."
                  />
                </div>
              </div>

              {/* Bill */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Bill / Invoice Description
                </Label>
                <Textarea
                  className="focus-visible:ring-blue-500 border-slate-200 rounded-lg bg-white shadow-sm min-h-[52px]"
                  value={phraseFormData.billItemDescription || ''}
                  onChange={(e) => setPhraseFormData({ ...phraseFormData, billItemDescription: e.target.value })}
                  placeholder="e.g., स्वच्छता सामग्री डस्टबिन की आपूर्ति हेतु।"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex gap-2">
            <Button
              variant="outline"
              className="rounded-lg h-10 border-slate-200 hover:bg-slate-100 font-medium"
              onClick={() => setPhraseDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-lg h-10 bg-blue-600 hover:bg-blue-700 font-medium"
              onClick={async () => {
                if (!phraseFormData.categoryName?.trim()) {
                  alert('Category name is required');
                  return;
                }
                const keywords = (phraseFormData.keywords || '')
                  .split(',')
                  .map((k: string) => k.trim().toLowerCase())
                  .filter(Boolean);
                const slug = phraseFormData.categoryName.trim().toLowerCase().replace(/\s+/g, '_');
                const phrases = {
                  supplyOrder: { subject: phraseFormData.supplyOrderSubject || '' },
                  quotationMain: {
                    english: phraseFormData.quotationMainEnglish || '',
                    hindi: phraseFormData.quotationMainHindi || '',
                  },
                  quotation: { purchaseLine: phraseFormData.quotationPurchaseLine || '' },
                  quotationAltHindi: { subject: phraseFormData.quotationAltHindi || '' },
                  quotationAltEnglish: { subject: phraseFormData.quotationAltEnglish || '' },
                  bill: { itemDescription: phraseFormData.billItemDescription || '' },
                };

                if (phraseDialogMode === 'add') {
                  const created = await dataService.documentPhraseMappings.create({
                    categoryName: phraseFormData.categoryName.trim(),
                    categoryId: slug,
                    keywords: Array.from(new Set([slug, ...keywords])),
                    phrases,
                    generatedByAI: false,
                    approved: true,
                    usageCount: 0,
                  });
                  setDocumentPhraseMappings((prev) => [created, ...prev]);
                } else if (currentPhrase) {
                  const updated = await dataService.documentPhraseMappings.update(currentPhrase.id, {
                    categoryName: phraseFormData.categoryName.trim(),
                    categoryId: slug,
                    keywords: Array.from(new Set([slug, ...keywords])),
                    phrases,
                    approved: true,
                  });
                  setDocumentPhraseMappings((prev) =>
                    prev.map((p) => (p.id === currentPhrase.id ? (updated || p) : p))
                  );
                }
                setPhraseDialogOpen(false);
              }}
            >
              {phraseDialogMode === 'add' ? 'Add Phrase Pack' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </div>
  );
}
