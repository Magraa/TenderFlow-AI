'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Firm, Settings, PurposeMapping, HindiMapping, VersioningSettings } from '@/types';
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
  const [loadingMappings, setLoadingMappings] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [dialogType, setDialogType] = useState<'purpose' | 'item' | 'vendor'>('purpose');
  const [currentMapping, setCurrentMapping] = useState<any>(null);

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
      const [purposes, items, vendors] = await Promise.all([
        dataService.purposeMappings.list(),
        dataService.itemHindiMappings.list(),
        dataService.vendorHindiMappings.list(),
      ]);
      setPurposeMappings(purposes);
      setItemHindiMappings(items);
      setVendorHindiMappings(vendors);
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
              updatedAt: new Date().toISOString(),
            });
          } else {
            await dataService.vendorHindiMappings.update(currentMapping.id, {
              hindiName: formData.hindiName.trim(),
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
            <Tabs defaultValue="purpose" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="purpose">Purpose Library</TabsTrigger>
                <TabsTrigger value="item">Item Hindi Mappings</TabsTrigger>
                <TabsTrigger value="vendor">Vendor Hindi Mappings</TabsTrigger>
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
                            <p className="mt-1">
                              <span className="text-slate-500">Hindi:</span> {mapping.hindiName}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
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
              
              <TabsContent value="vendor" className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <p className="text-sm text-slate-500">Map English vendor names to Hindi transliterations.</p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openExportDialog('vendorHindi')}
                      disabled={exporting || vendorHindiMappings.length === 0}
                    >
                      Export
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openImportDialog('vendorHindi')}
                      disabled={importing}
                    >
                      Import
                    </Button>
                    <Button onClick={() => openAddDialog('vendor')}>
                      Add Mapping
                    </Button>
                  </div>
                </div>
                {loadingMappings ? (
                  <p className="text-sm text-slate-500">Loading mappings...</p>
                ) : vendorHindiMappings.length === 0 ? (
                  <p className="text-sm text-slate-500">No vendor Hindi mappings configured.</p>
                ) : (
                  <div className="space-y-2">
                    {vendorHindiMappings.map((mapping) => (
                      <div key={mapping.id} className="rounded border border-slate-200 p-3 text-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">
                              <span className="text-slate-500">English:</span> {mapping.englishName}
                            </p>
                            <p className="mt-1">
                              <span className="text-slate-500">Hindi:</span> {mapping.hindiName}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              Usage: {mapping.usageCount} | Auto-generated: {mapping.isAutoGenerated ? 'Yes' : 'No'}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => openEditDialog('vendor', mapping)}>
                              Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => deleteMapping('vendor', mapping.id)}>
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
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
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import {selectedDictionary === 'purpose' ? 'Purpose' : selectedDictionary === 'itemHindi' ? 'Item Hindi' : 'Vendor Hindi'} Mappings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="importFile">JSON File</Label>
              <Input
                id="importFile"
                type="file"
                accept=".json"
                onChange={handleFileChange}
                disabled={importing}
              />
            </div>
            
            {importError && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{importError}</AlertDescription>
              </Alert>
            )}
            
            <p className="text-sm text-slate-500">
              Select a JSON file containing an array of mappings. Each mapping should have the appropriate fields for the dictionary type.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)} disabled={importing}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export {selectedDictionary === 'purpose' ? 'Purpose' : selectedDictionary === 'itemHindi' ? 'Item Hindi' : 'Vendor Hindi'} Mappings</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-slate-500">
              Are you sure you want to export the {selectedDictionary === 'purpose' ? 'purpose' : selectedDictionary === 'itemHindi' ? 'item Hindi' : 'vendor Hindi'} mappings?
            </p>
            
            <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium">Export Details:</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-slate-600">
                <li>Type: {selectedDictionary === 'purpose' ? 'Purpose Mappings' : selectedDictionary === 'itemHindi' ? 'Item Hindi Mappings' : 'Vendor Hindi Mappings'}</li>
                <li>
                  Count: {selectedDictionary === 'purpose' ? purposeMappings.length : selectedDictionary === 'itemHindi' ? itemHindiMappings.length : vendorHindiMappings.length}
                </li>
                <li>Format: JSON</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)} disabled={exporting}>
              Cancel
            </Button>
            <Button onClick={handleExport} loading={exporting} disabled={exporting}>
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Mapping Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'add' ? 'Add' : 'Edit'} {dialogType === 'purpose' ? 'Purpose' : `${dialogType.charAt(0).toUpperCase() + dialogType.slice(1)} Hindi Mapping`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {dialogType === 'purpose' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., fire_fighting"
                  />
                  {formErrors.category && <p className="text-sm text-red-500">{formErrors.category}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="professionalPurpose">Professional Purpose</Label>
                  <Input
                    id="professionalPurpose"
                    value={formData.professionalPurpose}
                    onChange={(e) => setFormData({ ...formData, professionalPurpose: e.target.value })}
                    placeholder="e.g., अग्निशमन एवं जल आपूर्ति कार्य हेतु आवश्यक सामग्री"
                  />
                  {formErrors.professionalPurpose && <p className="text-sm text-red-500">{formErrors.professionalPurpose}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <select
                    id="language"
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <div className="space-y-2">
                  <Label htmlFor="englishName">English Name</Label>
                  <Input
                    id="englishName"
                    value={formData.englishName}
                    onChange={(e) => setFormData({ ...formData, englishName: e.target.value })}
                    placeholder="e.g., Fire Hose"
                  />
                  {formErrors.englishName && <p className="text-sm text-red-500">{formErrors.englishName}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="hindiName">Hindi Name</Label>
                  <Input
                    id="hindiName"
                    value={formData.hindiName}
                    onChange={(e) => setFormData({ ...formData, hindiName: e.target.value })}
                    placeholder="e.g., अग्निशमन होस"
                  />
                  {formErrors.hindiName && <p className="text-sm text-red-500">{formErrors.hindiName}</p>}
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMapping}>
              {dialogMode === 'add' ? 'Add' : 'Save'} Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </div>
  );
}
