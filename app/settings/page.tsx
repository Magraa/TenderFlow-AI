'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Firm, Settings, PurposeMapping, HindiMapping, PlaceMapping, VersioningSettings, DocumentPhraseMapping, CustomTemplate } from '@/types';

import { dataService } from '@/services/dataService';
import {
  defaultVersioningSettings,
  normalizeVersioningSettings,
  validateVersioningSetting,
} from '@/services/versioningSettings';
import {
  createPasswordAuthSettings,
  hasSitePassword,
  SITE_PASSWORD_SESSION_KEY,
  validateNewPassword,
  verifySitePassword,
} from '@/services/passwordAuthService';
import { toHindiUnit } from '@/lib/unitUtils';
import { getSampleBillTemplate } from '@/templates/default/billTemplate';
import { TEMPLATE_FONTS_GOOGLE_IMPORT_URL, getFontStyleAdjustments } from '@/lib/templateFonts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddPlaceDialog } from '@/components/forms/Location/AddPlaceDialog';
import { PdfDownloadFolderCard } from '@/components/settings/pdfDownloadFolderCard';
import { Sparkles, FileText, Languages, Package, ChevronDown, ChevronUp, Search, X, Lock } from 'lucide-react';

import { Textarea } from '@/components/ui/textarea';

type DictionaryType = 'purpose' | 'itemHindi' | 'vendorHindi';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [versioningErrors, setVersioningErrors] = useState<Record<string, string>>({});

  // Mapping state
  const [purposeMappings, setPurposeMappings] = useState<PurposeMapping[]>([]);
  const [itemHindiMappings, setItemHindiMappings] = useState<HindiMapping[]>([]);
  const [vendorHindiMappings, setVendorHindiMappings] = useState<HindiMapping[]>([]);
  const [placeMappings, setPlaceMappings] = useState<PlaceMapping[]>([]);
  const [documentPhraseMappings, setDocumentPhraseMappings] = useState<DocumentPhraseMapping[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(false);

  // Search state for item mappings
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  const filteredItemHindiMappings = useMemo(() => {
    if (!itemSearchQuery.trim()) return itemHindiMappings;
    const q = itemSearchQuery.toLowerCase().trim();
    return itemHindiMappings.filter((m) => {
      const raw = (m.rawName || '').toLowerCase();
      const rawDesc = (m.rawDescription || '').toLowerCase();
      const eng = (m.englishName || '').toLowerCase();
      const engDesc = (m.englishDescription || '').toLowerCase();
      const hin = (m.hindiName || '').toLowerCase();
      const hinDesc = (m.hindiDescription || '').toLowerCase();
      const altHin1 = (m.altHindiName || '').toLowerCase();
      const altHin2 = (m.altHindiName2 || '').toLowerCase();
      const altEng1 = (m.altEnglishName1 || '').toLowerCase();
      const altEng2 = (m.altEnglishName2 || '').toLowerCase();

      return (
        raw.includes(q) ||
        rawDesc.includes(q) ||
        eng.includes(q) ||
        engDesc.includes(q) ||
        hin.includes(q) ||
        hinDesc.includes(q) ||
        altHin1.includes(q) ||
        altHin2.includes(q) ||
        altEng1.includes(q) ||
        altEng2.includes(q)
      );
    });
  }, [itemHindiMappings, itemSearchQuery]);

  // Phrase pack dialog state
  const [phraseDialogOpen, setPhraseDialogOpen] = useState(false);
  const [phraseDialogMode, setPhraseDialogMode] = useState<'add' | 'edit'>('add');
  const [currentPhrase, setCurrentPhrase] = useState<DocumentPhraseMapping | null>(null);
  const [phraseFormData, setPhraseFormData] = useState<any>({});
  const [generatingPhrasePack, setGeneratingPhrasePack] = useState(false);
  const [expandedPhraseId, setExpandedPhraseId] = useState<string | null>(null);

  // Custom template state
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateDialogMode, setTemplateDialogMode] = useState<'add' | 'edit'>('add');
  const [currentTemplate, setCurrentTemplate] = useState<CustomTemplate | null>(null);
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    docType: 'quotation_main' as any,
    language: 'hindi' as any,
    content: '',
    fontFamily: 'Noto Sans Devanagari',
    textColor: '#1e293b',
  });
  const [templateFormErrors, setTemplateFormErrors] = useState<Record<string, string>>({});

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
      const [purposes, items, vendors, places, phrasePacks, templatesList] = await Promise.all([
        dataService.purposeMappings.list(),
        dataService.itemHindiMappings.list(),
        dataService.vendorHindiMappings.list(),
        dataService.placeMappings.list(),
        dataService.documentPhraseMappings.list(),
        dataService.customTemplates.list(),
      ]);

      let finalPurposes = purposes;
      if (purposes.length === 0) {
        const defaults = [
          { category: 'water_supply', professionalPurpose: 'जल प्रदाय कार्य हेतु आवश्यक सामग्री', language: 'hindi' as const },
          { category: 'water_supply', professionalPurpose: 'Materials required for water supply works', language: 'english' as const },
          { category: 'fire_fighting', professionalPurpose: 'अग्निशमन कार्य हेतु आवश्यक सामग्री', language: 'hindi' as const },
          { category: 'fire_fighting', professionalPurpose: 'Materials required for fire fighting work', language: 'english' as const },
          { category: 'office_stationery', professionalPurpose: 'कार्यालयीन उपयोग हेतु स्टेशनरी एवं प्रिंटिंग सामग्री', language: 'hindi' as const },
          { category: 'office_stationery', professionalPurpose: 'Stationery and printing materials for office use', language: 'english' as const },
          { category: 'cleaning_materials', professionalPurpose: 'स्वच्छता अभियान एवं सफाई कार्य हेतु आवश्यक सामग्री', language: 'hindi' as const },
          { category: 'cleaning_materials', professionalPurpose: 'Materials required for cleanliness and sanitation work', language: 'english' as const },
          { category: 'street_light', professionalPurpose: 'विद्युत एवं प्रकाश व्यवस्था हेतु आवश्यक सामग्री', language: 'hindi' as const },
          { category: 'street_light', professionalPurpose: 'Materials required for electrical and street lighting work', language: 'english' as const },
          { category: 'construction', professionalPurpose: 'निर्माण एवं मरम्मत कार्य हेतु आवश्यक सामग्री', language: 'hindi' as const },
          { category: 'construction', professionalPurpose: 'Materials required for construction and repair work', language: 'english' as const },
          { category: 'computers', professionalPurpose: 'कम्प्यूटर, प्रिंटर एवं आईटी उपकरण क्रय कार्य', language: 'hindi' as const },
          { category: 'computers', professionalPurpose: 'Computers, printers, and IT equipment procurement', language: 'english' as const }
        ];
        
        await Promise.all(defaults.map(d => dataService.purposeMappings.create({
          ...d,
          usageCount: 0,
          isAutoGenerated: true
        })));
        
        finalPurposes = await dataService.purposeMappings.list();
      }

      setPurposeMappings(finalPurposes);
      setItemHindiMappings(items);
      setVendorHindiMappings(vendors);
      setPlaceMappings(places);
      setDocumentPhraseMappings(phrasePacks);
      setCustomTemplates(templatesList);

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

  const handlePasswordChange = async () => {
    if (!settings) return;

    setPasswordSaving(true);
    setPasswordError('');
    try {
      if (hasSitePassword(settings)) {
        if (!settings.passwordAuth) {
          setPasswordError('Password settings are missing. Refresh and try again.');
          return;
        }
        const oldPasswordValid = await verifySitePassword(passwordForm.oldPassword, settings.passwordAuth);
        if (!oldPasswordValid) {
          setPasswordError('Old password is incorrect.');
          return;
        }
      }

      const validationError = validateNewPassword(passwordForm.newPassword);
      if (validationError) {
        setPasswordError(validationError);
        return;
      }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setPasswordError('New passwords do not match.');
        return;
      }

      const passwordAuth = await createPasswordAuthSettings(passwordForm.newPassword);
      const updated = await dataService.settings.update({ passwordAuth });
      sessionStorage.setItem(SITE_PASSWORD_SESSION_KEY, passwordAuth.passwordHash);
      setSettings(updated);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Website password updated.');
      setTimeout(() => setSuccess(''), 2500);
    } finally {
      setPasswordSaving(false);
    }
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
      rawName: '',
      rawDescription: '',
      englishName: '',
      hindiName: '',
      englishDescription: '',
      hindiDescription: '',
      altHindiName: '',
      altHindiName2: '',
      altEnglishName1: '',
      altEnglishName2: '',
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
        rawName: mapping.rawName || '',
        rawDescription: mapping.rawDescription || '',
        englishName: mapping.englishName,
        hindiName: mapping.hindiName,
        englishDescription: mapping.englishDescription || '',
        hindiDescription: mapping.hindiDescription || '',
        altHindiName: mapping.altHindiName || '',
        altHindiName2: mapping.altHindiName2 || '',
        altEnglishName1: mapping.altEnglishName1 || '',
        altEnglishName2: mapping.altEnglishName2 || '',
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

  // Helper to extract text color from root tag's inline styles in HTML
  const getTextColorFromHTML = (html: string): string | null => {
    if (!html) return null;
    const firstTagMatch = html.match(/^<([a-z1-6]+)\s*([^>]*)/i);
    if (!firstTagMatch) return null;
    
    const tagAttributes = firstTagMatch[2];
    const styleMatch = tagAttributes.match(/style=["']([^"']*)["']/i);
    if (!styleMatch) return null;
    
    const styleContent = styleMatch[1];
    const colorMatch = styleContent.match(/color\s*:\s*([^;]+)/i);
    return colorMatch ? colorMatch[1].trim() : null;
  };

  // Helper to update text color in root tag's inline styles in HTML
  const updateHTMLColor = (html: string, newColor: string): string => {
    if (!html) return html;
    
    const firstTagMatch = html.match(/^<([a-z1-6]+)\s*([^>]*)/i);
    if (!firstTagMatch) return html;
    
    const tagName = firstTagMatch[1];
    let tagAttributes = firstTagMatch[2];
    
    const styleMatch = tagAttributes.match(/style=["']([^"']*)["']/i);
    
    if (styleMatch) {
      let styleContent = styleMatch[1];
      const colorMatch = styleContent.match(/color\s*:\s*([^;]+)/i);
      
      if (colorMatch) {
        styleContent = styleContent.replace(/color\s*:\s*([^;]+)/i, `color: ${newColor}`);
      } else {
        styleContent = styleContent.trim();
        if (styleContent && !styleContent.endsWith(';')) {
          styleContent += ';';
        }
        styleContent += ` color: ${newColor};`;
      }
      
      tagAttributes = tagAttributes.replace(/style=["']([^"']*)["']/i, `style="${styleContent}"`);
    } else {
      tagAttributes = `${tagAttributes} style="color: ${newColor};"`.trim();
    }
    
    const remainingHTML = html.slice(firstTagMatch[0].length + 1);
    return `<${tagName} ${tagAttributes}>${remainingHTML}`;
  };

  // Custom Template Handlers
  const openAddTemplateDialog = () => {
    setTemplateDialogMode('add');
    setCurrentTemplate(null);
    setTemplateFormData({
      name: '',
      docType: 'quotation_main',
      language: 'hindi',
      content: getSampleQuotationTemplate('hindi'),
      fontFamily: 'Noto Sans Devanagari',
      textColor: '#1e293b',
    });
    setTemplateFormErrors({});
    setTemplateDialogOpen(true);
  };

  const openEditTemplateDialog = (template: any) => {
    setTemplateDialogMode('edit');
    setCurrentTemplate(template);
    setTemplateFormData({
      name: template.name,
      docType: template.docType,
      language: template.language,
      content: template.content,
      fontFamily: template.fontFamily || 'Noto Sans Devanagari',
      textColor: template.textColor || getTextColorFromHTML(template.content) || '#1e293b',
    });
    setTemplateFormErrors({});
    setTemplateDialogOpen(true);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await dataService.customTemplates.delete(id);
      setCustomTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Error deleting template:', err);
      alert('Failed to delete template');
    }
  };

  const validateTemplateForm = () => {
    const errors: Record<string, string> = {};
    if (!templateFormData.name?.trim()) errors.name = 'Name is required';
    if (!templateFormData.content?.trim()) errors.content = 'Content is required';
    setTemplateFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveTemplate = async () => {
    if (!validateTemplateForm()) return;
    try {
      if (templateDialogMode === 'add') {
        const created = await dataService.customTemplates.create({
          name: templateFormData.name.trim(),
          docType: templateFormData.docType,
          language: templateFormData.language,
          content: templateFormData.content,
          fontFamily: templateFormData.fontFamily,
          textColor: templateFormData.textColor,
        });
        setCustomTemplates((prev) => [created, ...prev]);
      } else if (currentTemplate) {
        const updated = await dataService.customTemplates.update(currentTemplate.id, {
          name: templateFormData.name.trim(),
          docType: templateFormData.docType,
          language: templateFormData.language,
          content: templateFormData.content,
          fontFamily: templateFormData.fontFamily,
          textColor: templateFormData.textColor,
        });
        setCustomTemplates((prev) =>
          prev.map((t) => (t.id === currentTemplate.id ? (updated || t) : t))
        );
      }
      setTemplateDialogOpen(false);
    } catch (err) {
      console.error('Error saving template:', err);
      alert('Failed to save template');
    }
  };

  function getSampleQuotationTemplate(lang?: 'hindi' | 'english'): string {
    const isHindi = (lang || templateFormData.language) === 'hindi';
    if (isHindi) {
      return `<div class="quotation-body" style="font-family: 'Kruti Dev 010', 'Mangal', 'Noto Sans Devanagari', sans-serif; font-size: 16px; line-height: 1.8; color: #1e293b; padding: 20px 40px;">
  <div style="text-align: center; margin-bottom: 30px; font-weight: bold; line-height: 1.5;">
    <p style="font-size: 18px; margin: 0;">प्रति,</p>
    <p style="font-size: 18px; margin: 0; margin-left: 20px;">श्रीमान मुख्य नगर पालिका अधिकारी</p>
    <p style="font-size: 18px; margin: 0; margin-left: 20px;">नगर परिषद {{placeName}}</p>
    <p style="font-size: 18px; margin: 0; margin-left: 20px;">जिला {{districtName}} (म.प्र.)</p>
  </div>

  <div style="margin: 20px 0; font-weight: bold; font-size: 17px;">
    विषय:- {{subject}} बावत ।
  </div>

  <div style="margin: 15px 0;">
    महोदय,
    <p style="text-indent: 40px; margin-top: 5px;">
      उपरोक्त विषयांतर्गत निवेदन है कि आपकी संस्था द्वारा आवश्यक सामग्री प्रदाय करने हेतु आमंत्रित निविदा सूचना/कोटेशन आमंत्रण सूचना क्रमांक {{tenderNumber}} के तारतम्य में हमारी फर्म द्वारा सामग्री की न्यूनतम दरें निम्नानुसार प्रस्तुत हैं:-
    </p>
  </div>

  <div style="margin: 25px 0 20px 20px; border-left: 2px solid #e2e8f0; padding-left: 15px;">
    {{items}}
  </div>

  <div style="margin: 20px 0; font-weight: bold;">
    शर्तें:-
    <ol style="margin: 5px 0 0 20px; font-weight: normal; list-style-type: decimal;">
      <li>जी.एस.टी. अलग से देय होगा।</li>
      <li>सामग्री की आपूर्ति आदेशानुसार समयावधि में कर दी जावेगी।</li>
    </ol>
  </div>

  <div style="margin-top: 40px; float: right; text-align: center; min-width: 220px;">
    <p style="margin-bottom: 30px;">भवदीय,</p>
    <p style="font-weight: bold; margin: 0;">कृते: {{firmName}}</p>
    <p style="font-size: 14px; color: #64748b; margin: 0;">(अधिकृत हस्ताक्षरकर्ता)</p>
  </div>
  <div style="clear: both;"></div>
</div>`;
    } else {
      return `<div class="quotation-body" style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.7; color: #000; padding: 30px 50px;">

  <div style="margin-bottom: 20px;">
    <p style="margin: 0; font-size: 15px;">To,</p>
  </div>

  <div style="text-align: center; margin-bottom: 30px; line-height: 1.8;">
    <p style="margin: 0; font-size: 15px;">Chief Municipal Officer</p>
    <p style="margin: 0; font-size: 15px;">City Council {{placeName}}</p>
    <p style="margin: 0; font-size: 15px;">Distt. {{districtName}} (M.P.)</p>
  </div>

  <div style="margin: 24px 0 20px 0; font-size: 15px; text-decoration: underline;">
    <strong>Subject :</strong>&nbsp; {{subject}}
  </div>

  <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 15px;">
    <thead>
      <tr>
        <th style="border: 1px solid #000; padding: 6px 10px; text-align: center; width: 60px; font-weight: bold;">S.No.</th>
        <th style="border: 1px solid #000; padding: 6px 10px; text-align: left; font-weight: bold;">Item Name</th>
        <th style="border: 1px solid #000; padding: 6px 10px; text-align: center; width: 100px; font-weight: bold;">Qty.</th>
        <th style="border: 1px solid #000; padding: 6px 10px; text-align: left; width: 130px; font-weight: bold;">Rate</th>
      </tr>
    </thead>
    <tbody>
      {{itemRows}}
    </tbody>
  </table>

  <div style="text-align: right; margin: 10px 0 30px 0; font-size: 15px;">
    Note: GST Extra
  </div>

  <div style="margin-top: 40px; float: right; text-align: center; min-width: 220px;">
    <p style="margin-bottom: 30px; font-size: 15px;">Sincerely yours,</p>
    <p style="font-weight: bold; margin: 0; font-size: 15px;">For: {{firmName}}</p>
    <p style="font-size: 13px; color: #64748b; margin: 0;">(Authorized Signatory)</p>
  </div>
  <div style="clear: both;"></div>
</div>`;
    }
  }

  const getCompiledPreviewHTML = () => {
    const rawContent = templateFormData.content || '';
    const isHindi = templateFormData.language === 'hindi';
    
    const mockContext = {
      tenderNumber: 'TEND-2026-9876',
      placeName: isHindi ? 'दतिया' : 'Datia',
      districtName: isHindi ? 'दतिया' : 'Datia',
      subject: isHindi 
        ? 'सफाई सामग्री (डस्टबिन) प्रदाय करने हेतु न्यूनतम दरें प्रस्तुत करने बावत।' 
        : 'Submission of lowest rates for supply of materials.',
      firmName: isHindi 
        ? 'माग्रा इंडस्ट्रियल सप्लायर्स' 
        : 'Magra Industrial Suppliers',
      items: isHindi ? [
        { 
          productName: 'हाथ कचरा गाड़ी M.S', 
          description: 'साइज़ 990x533x355 mm, फ्रेम एंगल साइज़ 32x32x3 mm, एक्सल रौड एसएस 20 mm, व्हील 2 नग 457 mm, व्हील चैनल रबड़ सहित, 14 नग तान 10 mm, नगर पालिका का नाम और क्रम संख्या अंकित ।',
          rate: 10300, 
          unit: 'नग' 
        },
        { 
          productName: 'डस्टबिन (घरेलू उपयोग हेतु वितरण)', 
          description: 'क्षमता: 12 लीटर, सामग्री: प्रथम श्रेणी HDPE प्लास्टिक, रंग: हरा एवं नीला',
          rate: 165, 
          unit: 'नग' 
        }
      ] : [
        { 
          productName: 'Hand Garbage Cart M.S', 
          description: 'Size 990x533x355 mm, frame angle size 32x32x3 mm, axle rod SS 20 mm, wheel 2 nos 457 mm, with wheel channel rubber, 14 nos spokes 10 mm, municipal name and serial number marked.',
          rate: 10300, 
          unit: 'Nos' 
        },
        { 
          productName: 'Dustbin (Domestic Distribution)', 
          description: 'Capacity: 12 Liters, material: first grade HDPE plastic, color: green and blue',
          rate: 165, 
          unit: 'Nos' 
        }
      ]
    };

    const itemsListHTML = mockContext.items.map((item, idx) => {
      const rateText = isHindi
        ? `Rs. ${item.rate.toLocaleString('en-IN')} प्रति ${toHindiUnit(item.unit)}`
        : `Rs. ${item.rate.toLocaleString('en-IN')} per ${item.unit || 'Nos'}`;
      
      const specLabel = isHindi ? 'स्पेसिफिकेशन:-' : 'Specification:';
      const specHTML = item.description 
        ? `<div style="font-size: 15px; color: #334155; margin-top: 4px; line-height: 1.5; font-weight: normal; max-width: 70%; text-align: left;">
             <strong style="color: #0f172a; text-decoration: underline;">${specLabel}</strong> ${item.description}
           </div>`
        : '';

      return `
        <div style="margin-bottom: 24px; font-family: sans-serif;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="font-size: 16px; font-weight: bold; color: #0f172a; flex: 1; text-align: left;">
              ${idx + 1}. ${item.productName}
            </div>
            <div style="text-align: right; min-width: 220px; font-weight: bold; font-size: 16px; color: #0f172a; margin-left: 20px;">
              ${rateText}
            </div>
          </div>
          ${specHTML}
        </div>
      `;
    }).join('');

    const itemRowsHTML = mockContext.items.map((item, idx) => {
      const quantity = 1;
      const unit = item.unit || 'piece';
      const descHTML = item.description
        ? `<div style="margin-top: 3px; font-weight: normal; font-size: 13px; line-height: 1.5;">Specification: - ${item.description}</div>`
        : '';
      return `
        <tr>
          <td style="border: 1px solid #000; padding: 4px 8px; text-align: center; vertical-align: top; font-weight: bold;">${idx + 1}.</td>
          <td style="border: 1px solid #000; padding: 4px 8px; vertical-align: top;">
            <div style="font-weight: bold;">${item.productName}</div>
            ${descHTML}
          </td>
          <td style="border: 1px solid #000; padding: 4px 8px; text-align: center; vertical-align: middle;">${quantity} ${unit}</td>
          <td style="border: 1px solid #000; padding: 4px 8px; text-align: left; vertical-align: middle;">Rs. ${item.rate.toLocaleString('en-IN')}</td>
        </tr>
      `;
    }).join('');

    const compiled = rawContent
      .replace(/\{\{tenderNumber\}\}/g, mockContext.tenderNumber)
      .replace(/\{\{placeName\}\}/g, mockContext.placeName)
      .replace(/\{\{districtName\}\}/g, mockContext.districtName)
      .replace(/\{\{subject\}\}/g, mockContext.subject)
      .replace(/\{\{firmName\}\}/g, mockContext.firmName)
      .replace(/\{\{items\}\}/g, itemsListHTML)
      .replace(/\{\{itemRows\}\}/g, itemRowsHTML)
      .replace(/\{\{invoiceNumber\}\}/g, '922')
      .replace(/\{\{invoiceDate\}\}/g, '18/07/2026')
      .replace(/\{\{recipientDesignation\}\}/g, isHindi ? 'मुख्य नगर पालिका अधिकारी' : 'Chief Municipal Officer')
      .replace(/\{\{recipientDepartment\}\}/g, isHindi ? 'नगर परिषद बैराड़' : 'City Council Bairad')
      .replace(/\{\{recipientDistrict\}\}/g, isHindi ? 'जिला शिवपुरी' : 'Distt. Shivpuri')
      .replace(/\{\{bankName\}\}/g, 'State Bank of India')
      .replace(/\{\{bankBranch\}\}/g, 'Transport Nagar, Gwalior')
      .replace(/\{\{ifscCode\}\}/g, 'SBIN0016593')
      .replace(/\{\{accountNumber\}\}/g, '63049227111')
      .replace(/\{\{panNumber\}\}/g, 'CJWPA8633G')
      .replace(/\{\{subtotal\}\}/g, '53,100.0')
      .replace(/\{\{sgstPercent\}\}/g, '9.0')
      .replace(/\{\{sgstAmount\}\}/g, '4,779.0')
      .replace(/\{\{cgstPercent\}\}/g, '9.0')
      .replace(/\{\{cgstAmount\}\}/g, '4,779.0')
      .replace(/\{\{igstPercent\}\}/g, '0.0')
      .replace(/\{\{igstAmount\}\}/g, '')
      .replace(/\{\{grandTotal\}\}/g, '62,658.0')
      .replace(/\{\{amountInWords\}\}/g, 'Sixty Two Thousand Six Hundred Fifty Eight only')
      .replace(/\{\{signatureHTML\}\}/g, '<span style="font-size:12px; color:#64748b;">[Signature]</span>');

    const activeFont = templateFormData.fontFamily || 'Noto Sans Devanagari';

    return `
      <div class="custom-template-preview-wrapper" style="width: 100%;">
        <style>
          @import url('${TEMPLATE_FONTS_GOOGLE_IMPORT_URL}');

          .custom-template-preview-wrapper,
          .custom-template-preview-wrapper *,
          .quotation-body,
          .quotation-body * {
            font-family: '${activeFont}', sans-serif !important;
            ${getFontStyleAdjustments(activeFont)}
          }
        </style>
        ${compiled}
      </div>
    `;
  };

  const getTemplatePreviewHTML = (template: CustomTemplate) => {
    const rawContent = template.content || '';
    const isHindi = template.language === 'hindi';
    
    const mockContext = {
      tenderNumber: 'TEND-2026-9876',
      placeName: isHindi ? 'दतिया' : 'Datia',
      districtName: isHindi ? 'दतिया' : 'Datia',
      subject: isHindi 
        ? 'सफाई सामग्री (डस्टबिन) प्रदाय करने हेतु न्यूनतम दरें प्रस्तुत करने बावत।' 
        : 'Submission of lowest rates for supply of materials.',
      firmName: isHindi 
        ? 'माग्रा इंडस्ट्रियल सप्लायर्स' 
        : 'Magra Industrial Suppliers',
      items: isHindi ? [
        { 
          productName: 'हाथ कचरा गाड़ी M.S', 
          description: 'साइज़ 990x533x355 mm, फ्रेम एंगल साइज़ 32x32x3 mm, एक्सल रौड एसएस 20 mm, व्हील 2 नग 457 mm, व्हील चैनल रबड़ सहित, 14 नग तान 10 mm, नगर पालिका का नाम और क्रम संख्या अंकित ।',
          rate: 10300, 
          unit: 'नग' 
        },
        { 
          productName: 'डस्टबिन (घरेलू उपयोग हेतु वितरण)', 
          description: 'क्षमता: 12 लीटर, सामग्री: प्रथम श्रेणी HDPE प्लास्टिक, रंग: हरा एवं नीला',
          rate: 165, 
          unit: 'नग' 
        }
      ] : [
        { 
          productName: 'Hand Garbage Cart M.S', 
          description: 'Size 990x533x355 mm, frame angle size 32x32x3 mm, axle rod SS 20 mm, wheel 2 nos 457 mm, with wheel channel rubber, 14 nos spokes 10 mm, municipal name and serial number marked.',
          rate: 10300, 
          unit: 'Nos' 
        },
        { 
          productName: 'Dustbin (Domestic Distribution)', 
          description: 'Capacity: 12 Liters, material: first grade HDPE plastic, color: green and blue',
          rate: 165, 
          unit: 'Nos' 
        }
      ]
    };

    const itemsListHTML = mockContext.items.map((item, idx) => {
      const rateText = isHindi
        ? `Rs. ${item.rate.toLocaleString('en-IN')} प्रति ${toHindiUnit(item.unit)}`
        : `Rs. ${item.rate.toLocaleString('en-IN')} per ${item.unit || 'Nos'}`;
      
      const specLabel = isHindi ? 'स्पेसिफिकेशन:-' : 'Specification:';
      const specHTML = item.description 
        ? `<div style="font-size: 13px; color: #475569; margin-top: 3px; line-height: 1.4; font-weight: normal; max-width: 75%; text-align: left;">
             <strong style="color: #334155;">${specLabel}</strong> ${item.description}
           </div>`
        : '';

      return `
        <div style="margin-bottom: 16px; font-family: sans-serif; font-size: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="font-weight: bold; color: #0f172a; flex: 1; text-align: left;">
              ${idx + 1}. ${item.productName}
            </div>
            <div style="text-align: right; min-width: 160px; font-weight: bold; color: #0f172a; margin-left: 10px;">
              ${rateText}
            </div>
          </div>
          ${specHTML}
        </div>
      `;
    }).join('');

    const itemRowsHTML = mockContext.items.map((item, idx) => {
      const quantity = 1;
      const unit = item.unit || 'piece';
      const descHTML = item.description
        ? `<div style="margin-top: 3px; font-weight: normal; font-size: 13px; line-height: 1.5;">Specification: - ${item.description}</div>`
        : '';
      return `
        <tr>
          <td style="border: 1px solid #000; padding: 4px 8px; text-align: center; vertical-align: top; font-weight: bold;">${idx + 1}.</td>
          <td style="border: 1px solid #000; padding: 4px 8px; vertical-align: top;">
            <div style="font-weight: bold;">${item.productName}</div>
            ${descHTML}
          </td>
          <td style="border: 1px solid #000; padding: 4px 8px; text-align: center; vertical-align: middle;">${quantity} ${unit}</td>
          <td style="border: 1px solid #000; padding: 4px 8px; text-align: left; vertical-align: middle;">Rs. ${item.rate.toLocaleString('en-IN')}</td>
        </tr>
      `;
    }).join('');

    const compiled = rawContent
      .replace(/\{\{tenderNumber\}\}/g, mockContext.tenderNumber)
      .replace(/\{\{placeName\}\}/g, mockContext.placeName)
      .replace(/\{\{districtName\}\}/g, mockContext.districtName)
      .replace(/\{\{subject\}\}/g, mockContext.subject)
      .replace(/\{\{firmName\}\}/g, mockContext.firmName)
      .replace(/\{\{items\}\}/g, itemsListHTML)
      .replace(/\{\{itemRows\}\}/g, itemRowsHTML);

    const activeFont = template.fontFamily || 'Noto Sans Devanagari';

    return `
      <div class="custom-template-card-preview-wrapper" style="width: 100%;">
        <style>
          @import url('${TEMPLATE_FONTS_GOOGLE_IMPORT_URL}');

          .custom-template-card-preview-wrapper,
          .custom-template-card-preview-wrapper *,
          .quotation-body,
          .quotation-body * {
            font-family: '${activeFont}', sans-serif !important;
            ${getFontStyleAdjustments(activeFont)}
          }
        </style>
        ${compiled}
      </div>
    `;
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
      let transliteratedName = englishName;
      let transliteratedDesc = '';

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
          transliteratedName = parts[0]?.trim() || englishName;
          transliteratedDesc = parts[1]?.trim() || '';
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
          transliteratedName = data.transliteratedText;
        }
      }

      setFormData((prev: any) => ({
        ...prev,
        hindiName: transliteratedName,
        hindiDescription: transliteratedDesc,
      }));

      // Generate alternative names if this is an item
      if (dialogType === 'item') {
        try {
          const altResponse = await fetch('/api/ai/generate-alternates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemName: englishName,
              description: englishDesc || '',
            }),
          });
          if (altResponse.ok) {
            const altData = await altResponse.json();
            setFormData((prev: any) => ({
              ...prev,
              altHindiName: altData.altHindi || '',
              altEnglishName1: altData.altEnglish1 || '',
              altEnglishName2: altData.altEnglish2 || '',
            }));
          }
        } catch (altError) {
          console.error('Failed to generate alt names in settings dialog:', altError);
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

  const handleGenerateEnglishFromHindi = async () => {
    const hindiName = formData.hindiName?.trim();
    const hindiDesc = formData.hindiDescription?.trim();
    if (!hindiName && !hindiDesc) return;

    setGeneratingHindi(true);
    try {
      let transliteratedName = '';
      let transliteratedDesc = '';

      const sourceText = hindiDesc
        ? `${hindiName || ''} ||| ${hindiDesc}`
        : (hindiName || '');

      const response = await fetch('/api/ai/transliterate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sourceText,
          sourceLanguage: 'hindi',
          targetLanguage: 'english',
        }),
      });

      if (!response.ok) throw new Error('Transliteration failed');

      const data = await response.json();
      if (data.transliteratedText) {
        if (hindiDesc) {
          const parts = data.transliteratedText.split('|||');
          transliteratedName = parts[0]?.trim() || '';
          transliteratedDesc = parts[1]?.trim() || '';
        } else {
          transliteratedName = data.transliteratedText.trim();
        }
      }

      setFormData((prev: any) => ({
        ...prev,
        englishName: transliteratedName || prev.englishName,
        englishDescription: transliteratedDesc || prev.englishDescription,
      }));

      // Also generate alternative names from the resolved English name
      if (dialogType === 'item' && transliteratedName) {
        try {
          const altResponse = await fetch('/api/ai/generate-alternates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemName: transliteratedName,
              description: transliteratedDesc || '',
            }),
          });
          if (altResponse.ok) {
            const altData = await altResponse.json();
            setFormData((prev: any) => ({
              ...prev,
              altHindiName: altData.altHindi || prev.altHindiName || '',
              altEnglishName1: altData.altEnglish1 || prev.altEnglishName1 || '',
              altEnglishName2: altData.altEnglish2 || prev.altEnglishName2 || '',
            }));
          }
        } catch (altError) {
          console.error('Failed to generate alt names from Hindi:', altError);
        }
      }

      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.englishName;
        return next;
      });
    } catch (error) {
      console.error('Error generating English from Hindi:', error);
      alert('Failed to generate English from Hindi. Please enter manually.');
    } finally {
      setGeneratingHindi(false);
    }
  };

  const handleGenerateAllFromRaw = async () => {
    const rawName = (formData.rawName || formData.englishName || formData.hindiName || '').trim();
    const rawDesc = (formData.rawDescription || formData.englishDescription || formData.hindiDescription || '').trim();

    if (!rawName) {
      alert('Please enter Raw Original Item Name first.');
      return;
    }

    setGeneratingHindi(true);
    try {
      const res = await fetch('/api/ai/generate-alternates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawName, rawDescription: rawDesc, itemName: rawName, description: rawDesc }),
      });

      if (res.ok) {
        const data = await res.json();
        setFormData((prev: any) => ({
          ...prev,
          rawName,
          rawDescription: rawDesc,
          englishName: data.englishName || prev.englishName || rawName,
          englishDescription: data.englishDescription || prev.englishDescription || rawDesc,
          hindiName: data.hindiName || prev.hindiName || rawName,
          hindiDescription: data.hindiDescription || prev.hindiDescription || rawDesc,
          altHindiName: data.altHindiName || data.altHindi || prev.altHindiName || '',
          altHindiName2: data.altHindiName2 || prev.altHindiName2 || '',
          altEnglishName1: data.altEnglishName1 || data.altEnglish1 || prev.altEnglishName1 || '',
          altEnglishName2: data.altEnglishName2 || data.altEnglish2 || prev.altEnglishName2 || '',
        }));
      }
    } catch (err) {
      console.error('Failed to generate full item mapping pack:', err);
      alert('Failed to generate with AI. Please fill fields manually.');
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
          rawName: formData.rawName?.trim() || '',
          rawDescription: formData.rawDescription?.trim() || '',
          englishName: formData.englishName.trim(),
          hindiName: formData.hindiName.trim(),
          englishDescription: formData.englishDescription?.trim() || '',
          hindiDescription: formData.hindiDescription?.trim() || '',
          altHindiName: formData.altHindiName?.trim() || '',
          altHindiName2: formData.altHindiName2?.trim() || '',
          altEnglishName1: formData.altEnglishName1?.trim() || '',
          altEnglishName2: formData.altEnglishName2?.trim() || '',
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
              rawName: formData.rawName?.trim() || '',
              rawDescription: formData.rawDescription?.trim() || '',
              englishName: formData.englishName.trim(),
              hindiName: formData.hindiName.trim(),
              englishDescription: formData.englishDescription?.trim() || '',
              hindiDescription: formData.hindiDescription?.trim() || '',
              altHindiName: formData.altHindiName?.trim() || '',
              altHindiName2: formData.altHindiName2?.trim() || '',
              altEnglishName1: formData.altEnglishName1?.trim() || '',
              altEnglishName2: formData.altEnglishName2?.trim() || '',
              updatedAt: new Date().toISOString(),
            });
          } else {
            await dataService.vendorHindiMappings.update(currentMapping.id, {
              englishName: formData.englishName.trim(),
              hindiName: formData.hindiName.trim(),
              englishDescription: formData.englishDescription?.trim() || '',
              hindiDescription: formData.hindiDescription?.trim() || '',
              altHindiName: formData.altHindiName?.trim() || '',
              altEnglishName1: formData.altEnglishName1?.trim() || '',
              altEnglishName2: formData.altEnglishName2?.trim() || '',
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-slate-600" />
                Website Password
              </CardTitle>
              <CardDescription>Change the private access password for this website.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasSitePassword(settings) && (
                <div className="space-y-2">
                  <Label htmlFor="oldSitePassword">Old Password</Label>
                  <Input
                    id="oldSitePassword"
                    type="password"
                    autoComplete="current-password"
                    value={passwordForm.oldPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, oldPassword: event.target.value }))
                    }
                  />
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newSitePassword">New Password</Label>
                  <Input
                    id="newSitePassword"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmSitePassword">Confirm Password</Label>
                  <Input
                    id="confirmSitePassword"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))
                    }
                  />
                </div>
              </div>

              {passwordError && <p className="text-sm font-medium text-red-600">{passwordError}</p>}

              <Button onClick={handlePasswordChange} loading={passwordSaving} disabled={passwordSaving}>
                Update Password
              </Button>
            </CardContent>
          </Card>

          <PdfDownloadFolderCard />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Master Dictionaries</CardTitle>
            <CardDescription>Manage purpose mappings and Hindi transliteration dictionaries.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="phrasepacks" className="w-full">
              <TabsList className="grid w-full grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl">
                <TabsTrigger value="purpose" className="rounded-lg text-xs font-semibold py-1.5">Purpose Library</TabsTrigger>
                <TabsTrigger value="item" className="rounded-lg text-xs font-semibold py-1.5">Item Mappings</TabsTrigger>
                <TabsTrigger value="phrasepacks" className="flex items-center gap-1.5 rounded-lg text-xs font-semibold py-1.5">
                  <Package className="h-3.5 w-3.5" />
                  Phrase Packs
                </TabsTrigger>
                <TabsTrigger value="locations" className="rounded-lg text-xs font-semibold py-1.5">Locations</TabsTrigger>
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
              
              <TabsContent value="item" className="space-y-4 pt-2">
                {/* Header & Main Actions */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Package className="h-4 w-4 text-emerald-600" />
                      Item Mappings & Raw Library
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Manage English item names, raw JSON imported names, and Hindi transliterations.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openExportDialog('itemHindi')}
                      disabled={exporting || itemHindiMappings.length === 0}
                      className="h-8 text-xs bg-white"
                    >
                      Export
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openImportDialog('itemHindi')}
                      disabled={importing}
                      className="h-8 text-xs bg-white"
                    >
                      Import
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => openAddDialog('item')}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      + Add Mapping
                    </Button>
                  </div>
                </div>

                {/* Search Bar & Summary Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by Raw Item Name, English Name, Hindi, or Specification..."
                      value={itemSearchQuery}
                      onChange={(e) => setItemSearchQuery(e.target.value)}
                      className="pl-9 pr-8 h-9 border-slate-300 rounded-lg text-xs bg-white focus-visible:ring-emerald-500 shadow-2xs"
                    />
                    {itemSearchQuery && (
                      <button
                        onClick={() => setItemSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0 self-center sm:self-auto">
                    <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                      Showing {filteredItemHindiMappings.length} of {itemHindiMappings.length} items
                    </span>
                  </div>
                </div>

                {/* Scrollable Items Container */}
                {loadingMappings ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                    Loading item mappings...
                  </div>
                ) : itemHindiMappings.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center text-slate-500 text-sm">
                    No item mappings configured.
                  </div>
                ) : filteredItemHindiMappings.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-sm space-y-2">
                    <p className="font-medium text-slate-700">{`No items match "${itemSearchQuery}"`}</p>
                    <Button variant="outline" size="sm" onClick={() => setItemSearchQuery('')} className="h-7 text-xs">


                      Clear Search
                    </Button>
                  </div>
                ) : (
                  <div className="max-h-[550px] overflow-y-auto pr-1.5 space-y-2.5 custom-scrollbar border border-slate-200 rounded-xl p-2.5 bg-slate-50/40">
                    {filteredItemHindiMappings.map((mapping) => (
                      <div 
                        key={mapping.id} 
                        className="rounded-xl border border-slate-200/90 bg-white p-3.5 text-sm shadow-2xs hover:border-slate-300 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                          <div className="flex-1 space-y-1.5 min-w-0">
                            {/* Raw Name Pill if present */}
                            {mapping.rawName && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-semibold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200 inline-flex items-center gap-1">
                                  <span className="text-[10px] font-extrabold uppercase text-amber-600">Raw Item:</span>
                                  {mapping.rawName} {mapping.rawDescription ? `(${mapping.rawDescription})` : ''}
                                </span>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-[10px]">English Name</p>
                                <p className="font-medium text-slate-800 text-xs sm:text-sm">
                                  {mapping.englishName || <span className="text-slate-400 italic">Not set (Raw item stored)</span>}
                                </p>
                                {mapping.englishDescription && (
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {mapping.englishDescription}
                                  </p>
                                )}
                              </div>

                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Hindi Transliteration</p>
                                <p className="font-medium text-slate-800 text-xs sm:text-sm">
                                  {mapping.hindiName || <span className="text-slate-400 italic">Not set (Pending AI)</span>}
                                </p>
                                {mapping.hindiDescription && (
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {mapping.hindiDescription}
                                  </p>
                                )}
                              </div>
                            </div>

                            {(mapping.altHindiName || mapping.altHindiName2 || mapping.altEnglishName1 || mapping.altEnglishName2) && (
                              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                                {(mapping.altHindiName || mapping.altHindiName2) && (
                                  <span>
                                    <strong className="text-blue-600 font-semibold">Alt Hindi:</strong> {[mapping.altHindiName, mapping.altHindiName2].filter(Boolean).join(' | ')}
                                  </span>
                                )}
                                {(mapping.altEnglishName1 || mapping.altEnglishName2) && (
                                  <span>
                                    <strong className="text-blue-600 font-semibold">Alt English:</strong> {[mapping.altEnglishName1, mapping.altEnglishName2].filter(Boolean).join(' | ')}
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                              <span>Usage: <strong className="text-slate-600 font-semibold">{mapping.usageCount}</strong></span>
                              <span>•</span>
                              <span>Auto-generated: {mapping.isAutoGenerated ? 'Yes (AI)' : 'No (Raw/Manual)'}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-start pt-2 sm:pt-0">
                            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={() => openEditDialog('item', mapping)}>
                              Edit
                            </Button>
                            <Button variant="destructive" size="sm" className="h-7 text-xs px-2.5" onClick={() => deleteMapping('item', mapping.id)}>
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
                        englishDescription: '',
                        supplyOrderSubject: '',
                        quotationMainEnglish: '',
                        quotationMainHindi: '',
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
                                  englishDescription: pack.englishDescription || '',
                                  supplyOrderSubject: pack.phrases.supplyOrder.subject,
                                  quotationMainEnglish: pack.phrases.quotationMain?.english || '',
                                  quotationMainHindi: pack.phrases.quotationMain?.hindi || '',
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

        {/* Custom HTML Layout Templates Card */}
        <Card className="mt-6">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-1 text-left">
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                Custom HTML Templates
              </CardTitle>
              <CardDescription className="text-slate-500 text-sm font-medium">
                Manage custom HTML layouts for quotation and bidding documents.
              </CardDescription>
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm shrink-0" onClick={openAddTemplateDialog}>
              Add Custom Template
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {loadingMappings ? (
              <p className="text-sm text-slate-500">Loading templates...</p>
            ) : customTemplates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center">
                <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-600">No custom templates yet</p>
                <p className="text-xs text-slate-400 mt-1">Add a custom template above to design your own quotation layouts.</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {customTemplates.map((template) => (
                  <div key={template.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3">
                        <p className="font-semibold text-slate-800 text-sm text-left">
                          {template.name}
                        </p>
                        <div className="flex flex-wrap gap-1.5 shrink-0 justify-end max-w-[200px]">
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wider">
                            {template.docType === 'quotation_main'
                              ? 'Main'
                              : template.docType === 'quotation_alt_1'
                              ? 'Alt A'
                              : 'Alt B'}
                          </span>
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wider">
                            {template.language}
                          </span>
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 text-violet-600 border border-violet-100 uppercase tracking-wider">
                            {template.fontFamily || 'Noto Sans Devanagari'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Rendered HTML Live Preview inside the card */}
                      <div className="mt-4 border border-slate-200/80 rounded-xl bg-slate-50/50 p-4 h-[250px] overflow-y-auto shadow-inner">
                        <div 
                          className="w-full text-slate-800 text-xs text-left"
                          dangerouslySetInnerHTML={{ __html: getTemplatePreviewHTML(template) }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openEditTemplateDialog(template)}>
                        Edit Template
                      </Button>
                      <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => handleDeleteTemplate(template.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
        <DialogContent className={`${dialogType === 'purpose' ? 'max-w-md' : 'max-w-5xl'} w-[95vw] border-0 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden transition-all duration-300`}>
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
          
          <div className="space-y-5 px-6 py-6 bg-white overflow-y-auto max-h-[70vh]">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Width Top Section: Raw original inputs */}
                <div className="md:col-span-2 space-y-4 p-4 bg-amber-50/40 rounded-xl border border-amber-200/60 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Raw Original Input (Given by User)</h4>
                    <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-medium">Original Input</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1 space-y-1.5">
                      <Label htmlFor="rawName" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Raw Item Name
                      </Label>
                      <Input
                        id="rawName"
                        className="focus-visible:ring-amber-500 border-amber-200 h-9 rounded-lg bg-white shadow-xs text-xs font-medium"
                        value={formData.rawName || ''}
                        onChange={(e) => setFormData({ ...formData, rawName: e.target.value })}
                        placeholder="e.g., Safety goggles 30 nos HDPE..."
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <Label htmlFor="rawDescription" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Raw Description <span className="text-slate-400 font-normal">(Optional)</span>
                      </Label>
                      <Textarea
                        id="rawDescription"
                        className="focus-visible:ring-amber-500 border-amber-200 rounded-lg bg-white shadow-xs min-h-[36px] h-9 py-2 text-xs"
                        value={formData.rawDescription || ''}
                        onChange={(e) => setFormData({ ...formData, rawDescription: e.target.value })}
                        placeholder="Raw description or specs as typed by user..."
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-9 border-amber-300 hover:border-amber-400 hover:bg-amber-100 text-amber-900 font-bold rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 text-xs"
                    loading={generatingHindi}
                    disabled={generatingHindi}
                    onClick={handleGenerateAllFromRaw}
                  >
                    {!generatingHindi && <Sparkles className="h-4 w-4 text-amber-600" />}
                    Generate Full Item Pack with AI (English, Hindi & Alternates)
                  </Button>
                </div>

                {/* Column 1: Primary English Details */}
                <div className="space-y-4">
                  <div className="space-y-4 p-4 bg-slate-50/50 rounded-xl border border-slate-100/80 shadow-xs">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-1 border-b border-slate-100">Primary English Section</h4>
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
                        className="focus-visible:ring-blue-500 border-slate-200 rounded-lg bg-white shadow-sm min-h-[80px]"
                        value={formData.englishDescription}
                        onChange={(e) => setFormData({ ...formData, englishDescription: e.target.value })}
                        placeholder="e.g., Fire fighting hose made of synthetic rubber..."
                      />
                    </div>
                  </div>

                  {formData.englishName?.trim() && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-9 border-blue-200 hover:border-blue-300 hover:bg-blue-50 text-blue-600 font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-xs"
                      loading={generatingHindi}
                      disabled={generatingHindi}
                      onClick={handleGenerateAllHindi}
                    >
                      {!generatingHindi && <Sparkles className="h-4 w-4 text-blue-500" />}
                      Generate Hindi Transliteration
                    </Button>
                  )}
                </div>

                {/* Column 2: Primary Hindi Details & Alternates */}
                <div className="space-y-4">
                  <div className="space-y-4 p-4 bg-slate-50/50 rounded-xl border border-slate-100/80 shadow-xs">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-1 border-b border-slate-100">Primary Hindi Section</h4>
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
                        className="focus-visible:ring-blue-500 border-slate-200 rounded-lg bg-white shadow-sm min-h-[80px]"
                        value={formData.hindiDescription}
                        onChange={(e) => setFormData({ ...formData, hindiDescription: e.target.value })}
                        placeholder="e.g., सिंथेटिक रबर से बना अग्निशमन नली..."
                      />
                    </div>
                  </div>

                  {(formData.hindiName?.trim() || formData.hindiDescription?.trim()) && !formData.englishName?.trim() && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-9 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 text-emerald-700 font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-xs"
                      loading={generatingHindi}
                      disabled={generatingHindi}
                      onClick={handleGenerateEnglishFromHindi}
                    >
                      {!generatingHindi && <Sparkles className="h-4 w-4 text-emerald-500" />}
                      Generate English from Hindi
                    </Button>
                  )}

                  {dialogType === 'item' && (
                    <div className="space-y-4 p-4 bg-blue-50/20 rounded-xl border border-blue-100/80 shadow-xs">
                      <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider pb-1 border-b border-blue-50">Alternative Names (for competing bids)</h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="altHindiName" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Alt Hindi 1 <span className="text-slate-400 font-normal">(Medium)</span>
                          </Label>
                          <Input
                            id="altHindiName"
                            className="focus-visible:ring-blue-500 border-slate-200 h-9 rounded-lg bg-white shadow-xs text-xs"
                            value={formData.altHindiName || ''}
                            onChange={(e) => setFormData({ ...formData, altHindiName: e.target.value })}
                            placeholder="e.g., प्लास्टिक डस्टबिन"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="altHindiName2" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Alt Hindi 2 <span className="text-slate-400 font-normal">(Short)</span>
                          </Label>
                          <Input
                            id="altHindiName2"
                            className="focus-visible:ring-blue-500 border-slate-200 h-9 rounded-lg bg-white shadow-xs text-xs"
                            value={formData.altHindiName2 || ''}
                            onChange={(e) => setFormData({ ...formData, altHindiName2: e.target.value })}
                            placeholder="e.g., डस्टबिन 12L"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="altEnglishName1" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Alt Eng 1 <span className="text-slate-400 font-normal">(Medium)</span>
                          </Label>
                          <Input
                            id="altEnglishName1"
                            className="focus-visible:ring-blue-500 border-slate-200 h-9 rounded-lg bg-white shadow-xs text-xs"
                            value={formData.altEnglishName1 || ''}
                            onChange={(e) => setFormData({ ...formData, altEnglishName1: e.target.value })}
                            placeholder="e.g., Plastic Waste Bin"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="altEnglishName2" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Alt Eng 2 <span className="text-slate-400 font-normal">(Short)</span>
                          </Label>
                          <Input
                            id="altEnglishName2"
                            className="focus-visible:ring-blue-500 border-slate-200 h-9 rounded-lg bg-white shadow-xs text-xs"
                            value={formData.altEnglishName2 || ''}
                            onChange={(e) => setFormData({ ...formData, altEnglishName2: e.target.value })}
                            placeholder="e.g., 12L Garbage Bin"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
                    englishDescription: phraseFormData.englishDescription || '',
                  });
                  setDocumentPhraseMappings((prev) => [created, ...prev]);
                } else if (currentPhrase) {
                  const updated = await dataService.documentPhraseMappings.update(currentPhrase.id, {
                    categoryName: phraseFormData.categoryName.trim(),
                    categoryId: slug,
                    keywords: Array.from(new Set([slug, ...keywords])),
                    phrases,
                    approved: true,
                    englishDescription: phraseFormData.englishDescription || '',
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

      {/* Custom Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[1240px] w-[95vw] p-0 overflow-hidden bg-slate-50/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl">
          <DialogHeader className="bg-white/80 border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-xl">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-800">
                  {templateDialogMode === 'add' ? 'Create Custom Template' : 'Edit Custom Template'}
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Design layouts for quotation and bidding documents. Code HTML on the left and see the rendered results live on the right.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 bg-white max-h-[72vh] overflow-hidden">
            {/* Left Side: Editor Form */}
            <div className="p-6 space-y-4 overflow-y-auto border-r border-slate-100 max-h-[72vh]">
              <div className="space-y-1.5">
                <Label htmlFor="tplName" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Template Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="tplName"
                  className="focus-visible:ring-blue-500 border-slate-200 h-9 rounded-lg bg-white shadow-sm"
                  value={templateFormData.name}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                  placeholder="e.g., Nagar Parishad Standard Quotation Layout"
                />
                {templateFormErrors.name && (
                  <p className="text-xs text-red-500 font-medium">{templateFormErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tplDocType" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Document Type
                  </Label>
                  <select
                    id="tplDocType"
                    className="w-full focus-visible:ring-blue-500 border border-slate-200 h-9 rounded-lg bg-white px-3 shadow-sm text-sm"
                    value={templateFormData.docType}
                    onChange={(e) => {
                      const newDocType = e.target.value as any;
                      const isTargetBill = newDocType === 'firm_bill';
                      const isPrevBill = templateFormData.docType === 'firm_bill';
                      
                      let newContent = templateFormData.content;
                      let newColor = templateFormData.textColor;
                      if (isTargetBill && !isPrevBill) {
                        newContent = getSampleBillTemplate();
                        newColor = '#000000';
                      } else if (!isTargetBill && isPrevBill) {
                        newContent = getSampleQuotationTemplate(templateFormData.language);
                        newColor = templateFormData.language === 'hindi' ? '#1e293b' : '#000000';
                      }

                      setTemplateFormData({
                        ...templateFormData,
                        docType: newDocType,
                        content: newContent,
                        textColor: newColor,
                      });
                    }}
                  >
                    <option value="quotation_main">Quotation - Main</option>
                    <option value="quotation_alt_1">Quotation - Alt A</option>
                    <option value="quotation_alt_2">Quotation - Alt B</option>
                    <option value="firm_bill">Bill / Invoice</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tplLanguage" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Language
                  </Label>
                  <select
                    id="tplLanguage"
                    className="w-full focus-visible:ring-blue-500 border border-slate-200 h-9 rounded-lg bg-white px-3 shadow-sm text-sm"
                    value={templateFormData.language}
                    onChange={(e) => {
                      const newLang = e.target.value as any;
                      const prevLang = templateFormData.language;
                      const isBill = templateFormData.docType === 'firm_bill';
                      const prevDefault = isBill ? getSampleBillTemplate() : getSampleQuotationTemplate(prevLang);
                      const shouldAutoSwitch = !templateFormData.content?.trim() || templateFormData.content.trim() === prevDefault.trim();
                      
                      // Auto-switch default font based on language choice too
                      const targetFont = newLang === 'hindi' ? 'Noto Sans Devanagari' : 'Inter';
                      const targetColor = newLang === 'hindi' ? '#1e293b' : '#000000';
                      
                      setTemplateFormData({
                        ...templateFormData,
                        language: newLang,
                        content: shouldAutoSwitch ? (isBill ? getSampleBillTemplate() : getSampleQuotationTemplate(newLang)) : templateFormData.content,
                        fontFamily: targetFont,
                        textColor: shouldAutoSwitch ? targetColor : templateFormData.textColor,
                      });
                    }}
                  >
                    <option value="hindi">Hindi</option>
                    <option value="english">English</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tplFontFamily" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Font Family
                  </Label>
                  <select
                    id="tplFontFamily"
                    className="w-full focus-visible:ring-blue-500 border border-slate-200 h-9 rounded-lg bg-white px-3 shadow-sm text-sm"
                    value={templateFormData.fontFamily}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, fontFamily: e.target.value })}
                  >
                    <optgroup label="Hindi Professional Fonts">
                      <option value="Noto Sans Devanagari">Noto Sans Devanagari</option>
                      <option value="Poppins">Poppins</option>
                      <option value="Montserrat">Montserrat</option>
                      <option value="Kruti Dev 010">Kruti Dev 010</option>
                    </optgroup>
                    <optgroup label="English Professional Fonts">
                      <option value="Inter">Inter</option>
                      <option value="Arial">Arial</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Times New Roman">Times New Roman</option>
                    </optgroup>
                    <optgroup label="Handwriting Style">
                      <option value="Kalam">Kalam (Hindi + English handwriting)</option>
                      <option value="Caveat">Caveat (English handwriting)</option>
                    </optgroup>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tplTextColor" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Text Color
                  </Label>
                  <div className="flex gap-2 items-center">
                    <input
                      id="tplTextColor"
                      type="color"
                      className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer p-0 bg-transparent shrink-0"
                      value={templateFormData.textColor || '#1e293b'}
                      onChange={(e) => {
                        const newColor = e.target.value;
                        const updatedContent = updateHTMLColor(templateFormData.content, newColor);
                        setTemplateFormData({
                          ...templateFormData,
                          textColor: newColor,
                          content: updatedContent,
                        });
                      }}
                    />
                    <Input
                      type="text"
                      className="focus-visible:ring-blue-500 border-slate-200 h-9 rounded-lg bg-white shadow-xs font-mono text-xs uppercase"
                      value={templateFormData.textColor || '#1e293b'}
                      onChange={(e) => {
                        const newColor = e.target.value;
                        const updatedContent = updateHTMLColor(templateFormData.content, newColor);
                        setTemplateFormData({
                          ...templateFormData,
                          textColor: newColor,
                          content: updatedContent,
                        });
                      }}
                      placeholder="#1e293b"
                    />
                  </div>
                </div>
              </div>

              {/* Helper box for placeholders */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Available Variables (Click to copy)</p>
                <div className="flex flex-wrap gap-1.5">
                  {(templateFormData.docType === 'firm_bill' ? [
                    { tag: '{{invoiceNumber}}', desc: 'Invoice No' },
                    { tag: '{{invoiceDate}}', desc: 'Invoice Date' },
                    { tag: '{{recipientDesignation}}', desc: 'Recipient Designation' },
                    { tag: '{{recipientDepartment}}', desc: 'Recipient Dept' },
                    { tag: '{{recipientDistrict}}', desc: 'Recipient Distt' },
                    { tag: '{{firmName}}', desc: 'Firm Name' },
                    { tag: '{{bankName}}', desc: 'Bank Name' },
                    { tag: '{{bankBranch}}', desc: 'Bank Branch' },
                    { tag: '{{ifscCode}}', desc: 'IFSC Code' },
                    { tag: '{{accountNumber}}', desc: 'Account No' },
                    { tag: '{{panNumber}}', desc: 'PAN No' },
                    { tag: '{{itemRows}}', desc: 'Item Rows' },
                    { tag: '{{subtotal}}', desc: 'Subtotal' },
                    { tag: '{{grandTotal}}', desc: 'Grand Total' },
                    { tag: '{{amountInWords}}', desc: 'Amount in Words' },
                  ] : [
                    { tag: '{{tenderNumber}}', desc: 'Tender No' },
                    { tag: '{{placeName}}', desc: 'Location' },
                    { tag: '{{districtName}}', desc: 'District' },
                    { tag: '{{subject}}', desc: 'Subject' },
                    { tag: '{{firmName}}', desc: 'Firm Name' },
                    { tag: '{{items}}', desc: 'Items List' },
                  ]).map((item) => (
                    <button
                      key={item.tag}
                      type="button"
                      title={`Click to copy: ${item.desc}`}
                      onClick={() => {
                        navigator.clipboard.writeText(item.tag);
                        alert(`Copied ${item.tag} to clipboard!`);
                      }}
                      className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md px-2 py-0.5 text-xs font-mono transition-colors shadow-xs"
                    >
                      <span className="font-bold text-blue-600">{item.tag}</span>
                      <span className="text-[9px] text-slate-400">({item.desc})</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tplContent" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  HTML Content <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="tplContent"
                  className="font-mono text-xs border-slate-200 rounded-lg bg-slate-900 text-slate-100 shadow-sm min-h-[260px] focus-visible:ring-blue-500 focus-visible:border-slate-800"
                  value={templateFormData.content}
                  onChange={(e) => {
                    const newContent = e.target.value;
                    const extractedColor = getTextColorFromHTML(newContent);
                    setTemplateFormData({
                      ...templateFormData,
                      content: newContent,
                      textColor: extractedColor || templateFormData.textColor,
                    });
                  }}
                  placeholder="Write HTML skeleton here..."
                />
                {templateFormErrors.content && (
                  <p className="text-xs text-red-500 font-medium">{templateFormErrors.content}</p>
                )}
              </div>
            </div>

            {/* Right Side: Live Preview Panel */}
            <div className="p-6 bg-slate-100/50 flex flex-col max-h-[72vh] overflow-hidden">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 shrink-0">Rendered Live Preview</p>
              <div className="flex-1 rounded-xl border border-slate-200 bg-white overflow-y-auto shadow-inner p-4 max-h-[64vh]">
                <div 
                  className="w-full h-full min-h-[500px]"
                  dangerouslySetInnerHTML={{ __html: getCompiledPreviewHTML() }}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex gap-2">
            <Button
              variant="outline"
              className="rounded-lg h-10 border-slate-200 hover:bg-slate-100 font-medium"
              onClick={() => setTemplateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-lg h-10 bg-blue-600 hover:bg-blue-700 font-medium"
              onClick={handleSaveTemplate}
            >
              {templateDialogMode === 'add' ? 'Create Template' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </div>
  );
}
