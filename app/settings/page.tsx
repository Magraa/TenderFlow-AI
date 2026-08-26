'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Firm, 
  Settings, 
  PurposeMapping, 
  HindiMapping, 
  PlaceMapping, 
  VersioningSettings, 
  DocumentPhraseMapping, 
  CustomTemplate,
  AISettings
} from '@/types';

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

import { Button } from '@/components/ui/button';
import { AddPlaceDialog } from '@/components/forms/Location/AddPlaceDialog';

// Modular Redesigned Settings Components
import { SettingsNavigation, SettingsTabId } from '@/components/settings/SettingsNavigation';
import { GeneralSettingsSection } from '@/components/settings/sections/GeneralSettingsSection';
import { FirmLetterheadsSection } from '@/components/settings/sections/FirmLetterheadsSection';
import { SecuritySettingsSection } from '@/components/settings/sections/SecuritySettingsSection';
import { AISettingsSection } from '@/components/settings/sections/AISettingsSection';
import { DictionariesSection } from '@/components/settings/sections/DictionariesSection';
import { PhrasePacksSection } from '@/components/settings/sections/PhrasePacksSection';
import { TemplatesSection } from '@/components/settings/sections/TemplatesSection';
import { VersioningSection } from '@/components/settings/sections/VersioningSection';

// Dialogs
import { PurposeMappingDialog } from '@/components/settings/dialogs/PurposeMappingDialog';
import { ItemMappingDialog } from '@/components/settings/dialogs/ItemMappingDialog';
import { PhrasePackDialog } from '@/components/settings/dialogs/PhrasePackDialog';
import { TemplateEditorDialog } from '@/components/settings/dialogs/TemplateEditorDialog';
import { DictionaryImportExportModal, DictionaryType } from '@/components/settings/dialogs/DictionaryImportExportModal';

import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('general');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  // Password state
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [versioningErrors, setVersioningErrors] = useState<Record<string, string>>({});

  // Mappings state
  const [purposeMappings, setPurposeMappings] = useState<PurposeMapping[]>([]);
  const [itemHindiMappings, setItemHindiMappings] = useState<HindiMapping[]>([]);
  const [vendorHindiMappings, setVendorHindiMappings] = useState<HindiMapping[]>([]);
  const [placeMappings, setPlaceMappings] = useState<PlaceMapping[]>([]);
  const [documentPhraseMappings, setDocumentPhraseMappings] = useState<DocumentPhraseMapping[]>([]);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(false);

  // Purpose & Item Dialog States
  const [purposeDialogOpen, setPurposeDialogOpen] = useState(false);
  const [purposeDialogMode, setPurposeDialogMode] = useState<'add' | 'edit'>('add');
  const [currentPurpose, setCurrentPurpose] = useState<PurposeMapping | null>(null);
  const [purposeFormData, setPurposeFormData] = useState<any>({});
  const [purposeFormErrors, setPurposeFormErrors] = useState<Record<string, string>>({});

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemDialogMode, setItemDialogMode] = useState<'add' | 'edit'>('add');
  const [currentItem, setCurrentItem] = useState<HindiMapping | null>(null);
  const [itemFormData, setItemFormData] = useState<any>({});
  const [itemFormErrors, setItemFormErrors] = useState<Record<string, string>>({});
  const [generatingHindi, setGeneratingHindi] = useState(false);

  // Place dialog state
  const [placeDialogOpen, setPlaceDialogOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<PlaceMapping | null>(null);

  // Phrase pack dialog state
  const [phraseDialogOpen, setPhraseDialogOpen] = useState(false);
  const [phraseDialogMode, setPhraseDialogMode] = useState<'add' | 'edit'>('add');
  const [currentPhrase, setCurrentPhrase] = useState<DocumentPhraseMapping | null>(null);
  const [phraseFormData, setPhraseFormData] = useState<any>({});

  // Template dialog state
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

  // Import / Export state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedDictionary, setSelectedDictionary] = useState<DictionaryType | null>(null);
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Load initial settings and firms
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [loadedSettings, loadedFirms] = await Promise.all([
          dataService.settings.get(),
          dataService.firms.list(),
        ]);
        if (cancelled) return;
        setSettings(loadedSettings);
        setFirms(loadedFirms);
        setLoading(false);
        loadMappings();
      } catch (err) {
        console.error('Failed to load initial settings:', err);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMappings = async () => {
    setLoadingMappings(true);
    try {
      const [purposes, items, vendors, places, phrasePacks, templatesList, firmsList] = await Promise.all([
        dataService.purposeMappings.list(),
        dataService.itemHindiMappings.list(),
        dataService.vendorHindiMappings.list(),
        dataService.placeMappings.list(),
        dataService.documentPhraseMappings.list(),
        dataService.customTemplates.list(),
        dataService.firms.list(),
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
          { category: 'computers', professionalPurpose: 'Computers, printers, and IT equipment procurement', language: 'english' as const },
        ];

        await Promise.all(
          defaults.map((d) =>
            dataService.purposeMappings.create({
              ...d,
              usageCount: 0,
              isAutoGenerated: true,
            })
          )
        );

        finalPurposes = await dataService.purposeMappings.list();
      }

      setPurposeMappings(finalPurposes);
      setItemHindiMappings(items);
      setVendorHindiMappings(vendors);
      setPlaceMappings(places);
      setDocumentPhraseMappings(phrasePacks);
      setCustomTemplates(templatesList);
      setFirms(firmsList);
    } catch (error) {
      console.error('Error loading mappings:', error);
    } finally {
      setLoadingMappings(false);
    }
  };

  // ─── General Settings Handlers ───
  const handleSaveGeneral = async () => {
    if (!settings) return;
    setSaving(true);
    try {
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
        aiSettings: settings.aiSettings,
      });
      setSettings(updated);
      setSuccess('Organization & system settings saved.');
      setTimeout(() => setSuccess(''), 2500);
    } catch (err: any) {
      alert('Failed to save settings: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAISettings = async (newAiSettings: AISettings): Promise<void> => {
    if (!settings) return;
    setSaving(true);
    try {
      const cleanAiSettings: AISettings = {
        showQuotaPill: newAiSettings.showQuotaPill ?? true,
        pillPosition: newAiSettings.pillPosition || 'bottom-right',
        warningThresholdPercent: newAiSettings.warningThresholdPercent || 20,
      };
      if (newAiSettings.customDailyLimit && Number(newAiSettings.customDailyLimit) > 0) {
        cleanAiSettings.customDailyLimit = Number(newAiSettings.customDailyLimit);
      }

      const updated = await dataService.settings.update({
        aiSettings: cleanAiSettings,
      });
      setSettings(updated);
      setSuccess('AI preferences updated.');
      setTimeout(() => setSuccess(''), 2500);
    } catch (err: any) {
      alert('Failed to save AI preferences: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  // ─── Firm Deletion Handler ───
  const handleDeleteFirm = async (id: string) => {
    if (!confirm('Are you sure you want to delete this firm profile? This cannot be undone.')) return;
    try {
      await dataService.firms.delete(id);
      setFirms((prev) => prev.filter((f) => f.id !== id));
      setSuccess('Firm profile deleted.');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Failed to delete firm:', err);
      alert('Failed to delete firm profile');
    }
  };

  // ─── Security Password Handlers ───
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
      setSuccess('Website private password updated.');
      setTimeout(() => setSuccess(''), 2500);
    } finally {
      setPasswordSaving(false);
    }
  };

  // ─── Versioning Handlers ───
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
    setVersioningErrors((prev) => ({ ...prev, [key]: error }));
    if (error) return;
    await updateVersioningSettings({ [key]: value } as Partial<VersioningSettings>);
  };

  const resetVersioningSettings = () => updateVersioningSettings(defaultVersioningSettings);

  // ─── Purpose Dialog Handlers ───
  const handleOpenAddPurpose = () => {
    setPurposeDialogMode('add');
    setCurrentPurpose(null);
    setPurposeFormData({ category: '', professionalPurpose: '', language: 'hindi' });
    setPurposeFormErrors({});
    setPurposeDialogOpen(true);
  };

  const handleOpenEditPurpose = (mapping: PurposeMapping) => {
    setPurposeDialogMode('edit');
    setCurrentPurpose(mapping);
    setPurposeFormData({
      category: mapping.category,
      professionalPurpose: mapping.professionalPurpose,
      language: mapping.language,
    });
    setPurposeFormErrors({});
    setPurposeDialogOpen(true);
  };

  const handleSavePurpose = async () => {
    const errors: Record<string, string> = {};
    if (!purposeFormData.category?.trim()) errors.category = 'Category identifier is required';
    if (!purposeFormData.professionalPurpose?.trim()) errors.professionalPurpose = 'Purpose statement is required';
    if (Object.keys(errors).length > 0) {
      setPurposeFormErrors(errors);
      return;
    }

    try {
      if (purposeDialogMode === 'add') {
        await dataService.purposeMappings.create({
          category: purposeFormData.category.trim(),
          professionalPurpose: purposeFormData.professionalPurpose.trim(),
          language: purposeFormData.language as 'hindi' | 'english',
          usageCount: 0,
          isAutoGenerated: false,
        });
      } else if (currentPurpose) {
        await dataService.purposeMappings.update(currentPurpose.id, {
          professionalPurpose: purposeFormData.professionalPurpose.trim(),
        });
      }
      setPurposeDialogOpen(false);
      loadMappings();
      setSuccess('Purpose library updated.');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Error saving purpose:', err);
      alert('Failed to save purpose mapping');
    }
  };

  const handleDeletePurpose = async (id: string) => {
    if (!confirm('Are you sure you want to delete this purpose statement?')) return;
    try {
      await dataService.purposeMappings.delete(id);
      setPurposeMappings((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Error deleting purpose:', err);
      alert('Failed to delete purpose mapping');
    }
  };

  // ─── Item Transliteration Dialog Handlers ───
  const handleOpenAddItem = () => {
    setItemDialogMode('add');
    setCurrentItem(null);
    setItemFormData({
      rawName: '',
      rawDescription: '',
      englishName: '',
      hindiName: '',
      englishDescription: '',
      hindiDescription: '',
      altHindiName: '',
      altHindiName2: '',
      altHindiName3: '',
      altHindiName4: '',
      altEnglishName1: '',
      altEnglishName2: '',
      altEnglishName3: '',
      altEnglishName4: '',
      altHindiDescription1: '',
      altHindiDescription2: '',
      altEnglishDescription1: '',
      altEnglishDescription2: '',
      type: 'item',
    });
    setItemFormErrors({});
    setItemDialogOpen(true);
  };

  const handleOpenEditItem = (item: HindiMapping) => {
    setItemDialogMode('edit');
    setCurrentItem(item);
    const rawDesc = item.rawDescription || item.englishDescription || item.hindiDescription || '';
    setItemFormData({
      rawName: item.rawName || item.englishName || '',
      rawDescription: rawDesc,
      englishName: item.englishName || '',
      hindiName: item.hindiName || '',
      englishDescription: item.englishDescription || rawDesc,
      hindiDescription: item.hindiDescription || rawDesc,
      altHindiName: item.altHindiName || '',
      altHindiName2: item.altHindiName2 || '',
      altHindiName3: item.altHindiName3 || '',
      altHindiName4: item.altHindiName4 || '',
      altEnglishName1: item.altEnglishName1 || '',
      altEnglishName2: item.altEnglishName2 || '',
      altEnglishName3: item.altEnglishName3 || '',
      altEnglishName4: item.altEnglishName4 || '',
      altHindiDescription1: item.altHindiDescription1 || '',
      altHindiDescription2: item.altHindiDescription2 || '',
      altEnglishDescription1: item.altEnglishDescription1 || '',
      altEnglishDescription2: item.altEnglishDescription2 || '',
      type: item.type || 'item',
    });
    setItemFormErrors({});
    setItemDialogOpen(true);
  };

  const handleGenerateAllFromRaw = async () => {
    const rawName = (itemFormData.rawName || itemFormData.englishName || itemFormData.hindiName || '').trim();
    const rawDesc = (itemFormData.rawDescription || itemFormData.englishDescription || itemFormData.hindiDescription || '').trim();

    if (!rawName) {
      alert('Please enter Raw Item Name first.');
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
        setItemFormData((prev: any) => ({
          ...prev,
          rawName,
          rawDescription: rawDesc,
          englishName: data.englishName || prev.englishName || rawName,
          englishDescription: data.englishDescription || prev.englishDescription || rawDesc,
          hindiName: data.hindiName || prev.hindiName || rawName,
          hindiDescription: data.hindiDescription || prev.hindiDescription || rawDesc,
          altHindiName: data.altHindiName || data.altHindi || prev.altHindiName || '',
          altHindiName2: data.altHindiName2 || prev.altHindiName2 || '',
          altHindiName3: data.altHindiName3 || prev.altHindiName3 || '',
          altHindiName4: data.altHindiName4 || prev.altHindiName4 || '',
          altEnglishName1: data.altEnglishName1 || data.altEnglish1 || prev.altEnglishName1 || '',
          altEnglishName2: data.altEnglishName2 || data.altEnglish2 || prev.altEnglishName2 || '',
          altEnglishName3: data.altEnglishName3 || prev.altEnglishName3 || '',
          altEnglishName4: data.altEnglishName4 || prev.altEnglishName4 || '',
          altHindiDescription1: data.altHindiDescription1 || prev.altHindiDescription1 || '',
          altHindiDescription2: data.altHindiDescription2 || prev.altHindiDescription2 || '',
          altEnglishDescription1: data.altEnglishDescription1 || prev.altEnglishDescription1 || '',
          altEnglishDescription2: data.altEnglishDescription2 || prev.altEnglishDescription2 || '',
        }));
      }
    } catch (err) {
      console.error('Failed to generate full item pack:', err);
      alert('Failed to generate with AI. Please fill fields manually.');
    } finally {
      setGeneratingHindi(false);
    }
  };

  const handleGenerateEnglishFromHindi = async () => {
    const hindiName = itemFormData.hindiName?.trim();
    const hindiDesc = itemFormData.hindiDescription?.trim();
    if (!hindiName && !hindiDesc) return;

    setGeneratingHindi(true);
    try {
      let transliteratedName = '';
      let transliteratedDesc = '';
      const sourceText = hindiDesc ? `${hindiName || ''} ||| ${hindiDesc}` : (hindiName || '');

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

      setItemFormData((prev: any) => ({
        ...prev,
        englishName: transliteratedName || prev.englishName,
        englishDescription: transliteratedDesc || prev.englishDescription,
      }));
    } catch (err) {
      console.error('Failed to transliterate Hindi to English:', err);
      alert('Failed to transliterate Hindi to English');
    } finally {
      setGeneratingHindi(false);
    }
  };

  const handleSaveItem = async () => {
    const errors: Record<string, string> = {};
    if (!itemFormData.englishName?.trim()) errors.englishName = 'English name is required';
    if (!itemFormData.hindiName?.trim()) errors.hindiName = 'Hindi name is required';
    if (Object.keys(errors).length > 0) {
      setItemFormErrors(errors);
      return;
    }

    const mappingData = {
      rawName: itemFormData.rawName?.trim() || '',
      rawDescription: itemFormData.rawDescription?.trim() || '',
      englishName: itemFormData.englishName.trim(),
      hindiName: itemFormData.hindiName.trim(),
      englishDescription: itemFormData.englishDescription?.trim() || '',
      hindiDescription: itemFormData.hindiDescription?.trim() || '',
      altHindiName: itemFormData.altHindiName?.trim() || '',
      altHindiName2: itemFormData.altHindiName2?.trim() || '',
      altHindiName3: itemFormData.altHindiName3?.trim() || '',
      altHindiName4: itemFormData.altHindiName4?.trim() || '',
      altEnglishName1: itemFormData.altEnglishName1?.trim() || '',
      altEnglishName2: itemFormData.altEnglishName2?.trim() || '',
      altEnglishName3: itemFormData.altEnglishName3?.trim() || '',
      altEnglishName4: itemFormData.altEnglishName4?.trim() || '',
      altHindiDescription1: itemFormData.altHindiDescription1?.trim() || '',
      altHindiDescription2: itemFormData.altHindiDescription2?.trim() || '',
      altEnglishDescription1: itemFormData.altEnglishDescription1?.trim() || '',
      altEnglishDescription2: itemFormData.altEnglishDescription2?.trim() || '',
      type: 'item' as const,
      usageCount: 0,
      isAutoGenerated: false,
    };

    try {
      if (itemDialogMode === 'add') {
        await dataService.itemHindiMappings.create(mappingData);
      } else if (currentItem) {
        await dataService.itemHindiMappings.update(currentItem.id, {
          ...mappingData,
          updatedAt: new Date().toISOString(),
        });
      }
      setItemDialogOpen(false);
      loadMappings();
      setSuccess('Item transliteration saved.');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Failed to save item mapping:', err);
      alert('Failed to save item mapping');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item transliteration?')) return;
    try {
      await dataService.itemHindiMappings.delete(id);
      setItemHindiMappings((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error('Failed to delete item:', err);
      alert('Failed to delete item mapping');
    }
  };

  // ─── Location Handlers ───
  const handleOpenAddPlace = () => {
    setEditingPlace(null);
    setPlaceDialogOpen(true);
  };

  const handleOpenEditPlace = (place: PlaceMapping) => {
    setEditingPlace(place);
    setPlaceDialogOpen(true);
  };

  const handleDeletePlace = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    try {
      await dataService.placeMappings.delete(id);
      setPlaceMappings((places) => places.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to delete location:', err);
      alert('Failed to delete location');
    }
  };

  // ─── Phrase Pack Handlers ───
  const handleOpenAddPhrase = () => {
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
  };

  const handleOpenEditPhrase = (pack: DocumentPhraseMapping) => {
    setPhraseDialogMode('edit');
    setCurrentPhrase(pack);
    setPhraseFormData({
      categoryName: pack.categoryName,
      keywords: pack.keywords ? pack.keywords.join(', ') : '',
      englishDescription: pack.englishDescription || '',
      supplyOrderSubject: pack.phrases?.supplyOrder?.subject || '',
      quotationMainEnglish: pack.phrases?.quotationMain?.english || '',
      quotationMainHindi: pack.phrases?.quotationMain?.hindi || '',
      quotationPurchaseLine: pack.phrases?.quotation?.purchaseLine || '',
      quotationAltHindi: pack.phrases?.quotationAltHindi?.subject || '',
      quotationAltEnglish: pack.phrases?.quotationAltEnglish?.subject || '',
      billItemDescription: pack.phrases?.bill?.itemDescription || '',
    });
    setPhraseDialogOpen(true);
  };

  const handleSavePhrase = async () => {
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

    try {
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
          prev.map((p) => (p.id === currentPhrase.id ? updated || p : p))
        );
      }
      setPhraseDialogOpen(false);
      setSuccess('Phrase pack saved.');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Failed to save phrase pack:', err);
      alert('Failed to save phrase pack');
    }
  };

  const handleDeletePhrase = async (id: string) => {
    if (!confirm('Are you sure you want to delete this phrase pack?')) return;
    try {
      await dataService.documentPhraseMappings.delete(id);
      setDocumentPhraseMappings((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to delete phrase pack:', err);
      alert('Failed to delete phrase pack');
    }
  };

  // ─── Custom Template Handlers ───
  const handleOpenAddTemplate = () => {
    setTemplateDialogMode('add');
    setCurrentTemplate(null);
    setTemplateFormData({
      name: '',
      docType: 'quotation_main',
      language: 'hindi',
      content: '',
      fontFamily: 'Noto Sans Devanagari',
      textColor: '#1e293b',
    });
    setTemplateFormErrors({});
    setTemplateDialogOpen(true);
  };

  const handleOpenEditTemplate = (template: CustomTemplate) => {
    setTemplateDialogMode('edit');
    setCurrentTemplate(template);
    setTemplateFormData({
      name: template.name,
      docType: template.docType,
      language: template.language,
      content: template.content,
      fontFamily: template.fontFamily || 'Noto Sans Devanagari',
      textColor: template.textColor || '#1e293b',
    });
    setTemplateFormErrors({});
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    const errors: Record<string, string> = {};
    if (!templateFormData.name?.trim()) errors.name = 'Layout name is required';
    if (!templateFormData.content?.trim()) errors.content = 'HTML content is required';
    if (Object.keys(errors).length > 0) {
      setTemplateFormErrors(errors);
      return;
    }

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
          prev.map((t) => (t.id === currentTemplate.id ? updated || t : t))
        );
      }
      setTemplateDialogOpen(false);
      setSuccess('Custom HTML layout saved.');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Error saving template:', err);
      alert('Failed to save layout template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template layout?')) return;
    try {
      await dataService.customTemplates.delete(id);
      setCustomTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Failed to delete template:', err);
      alert('Failed to delete template');
    }
  };

  // ─── Import & Export Handlers ───
  const handleOpenImport = (type: DictionaryType) => {
    setSelectedDictionary(type);
    setImportDialogOpen(true);
    setImportError('');
  };

  const handleOpenExport = (type: DictionaryType) => {
    setSelectedDictionary(type);
    setExportDialogOpen(true);
  };

  const handleExecuteExport = async () => {
    if (!selectedDictionary) return;
    setExporting(true);
    try {
      let data: any[] = [];
      let filename = '';
      if (selectedDictionary === 'purpose') {
        data = purposeMappings;
        filename = 'purpose-mappings.json';
      } else if (selectedDictionary === 'itemHindi') {
        data = itemHindiMappings;
        filename = 'item-hindi-mappings.json';
      } else {
        data = vendorHindiMappings;
        filename = 'vendor-hindi-mappings.json';
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
    } catch (err) {
      console.error('Error exporting data:', err);
      alert('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleExecuteImport = async (file: File) => {
    setImporting(true);
    setImportError('');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid JSON format: Expected a non-empty array.');
      }

      let importedCount = 0;
      if (selectedDictionary === 'purpose') {
        for (const mapping of data) {
          if (mapping.category && mapping.professionalPurpose) {
            await dataService.purposeMappings.create({
              category: mapping.category,
              professionalPurpose: mapping.professionalPurpose,
              language: mapping.language || 'hindi',
              usageCount: mapping.usageCount || 0,
              isAutoGenerated: mapping.isAutoGenerated || false,
            });
            importedCount++;
          }
        }
      } else if (selectedDictionary === 'itemHindi') {
        for (const mapping of data) {
          if (mapping.englishName && mapping.hindiName) {
            await dataService.itemHindiMappings.create({
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
              type: 'item',
              usageCount: 0,
              isAutoGenerated: false,
            });
            importedCount++;
          }
        }
      }

      setImportDialogOpen(false);
      loadMappings();
      setSuccess(`Successfully imported ${importedCount} records.`);
      setTimeout(() => setSuccess(''), 2500);
    } catch (err: any) {
      setImportError(err.message || 'Failed to parse and import JSON file.');
    } finally {
      setImporting(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Loading settings & rules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl text-slate-500 hover:text-slate-900">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                <span>Settings & Rules Console</span>
              </h1>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Manage organization defaults, firm letterheads, security, AI quotas, and templates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="h-8 text-xs font-semibold px-3 rounded-xl border-slate-200">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container with 2-Column Sidebar Layout */}
      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 space-y-4">
        {/* Success Toast / Alert */}
        {success && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Navigation Sidebar (3 cols on desktop) */}
          <aside className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-20">
            <SettingsNavigation
              activeTab={activeTab}
              onTabChange={setActiveTab}
              badgeCounts={{
                firms: firms.length,
                dictionaries: itemHindiMappings.length + purposeMappings.length,
                phrases: documentPhraseMappings.length,
                templates: customTemplates.length,
              }}
            />
          </aside>

          {/* Active Content Panel (8-9 cols on desktop) */}
          <section className="lg:col-span-8 xl:col-span-9 min-w-0">
            {activeTab === 'general' && (
              <GeneralSettingsSection
                settings={settings}
                onSettingsChange={setSettings}
                onSave={handleSaveGeneral}
                saving={saving}
              />
            )}

            {activeTab === 'firms' && (
              <FirmLetterheadsSection
                firms={firms}
                onDeleteFirm={handleDeleteFirm}
              />
            )}

            {activeTab === 'security' && (
              <SecuritySettingsSection
                settings={settings}
                passwordForm={passwordForm as any}
                passwordSaving={passwordSaving}
                passwordError={passwordError}
                onPasswordFormChange={setPasswordForm}
                onPasswordSubmit={handlePasswordChange}
              />
            )}

            {activeTab === 'ai' && (
              <AISettingsSection
                settings={settings}
                onUpdateSettings={handleUpdateAISettings}
                saving={saving}
              />
            )}

            {activeTab === 'dictionaries' && (
              <DictionariesSection
                purposeMappings={purposeMappings}
                itemHindiMappings={itemHindiMappings}
                placeMappings={placeMappings}
                loadingMappings={loadingMappings}
                onOpenAddPurpose={handleOpenAddPurpose}
                onOpenEditPurpose={handleOpenEditPurpose}
                onDeletePurpose={handleDeletePurpose}
                onOpenAddItem={handleOpenAddItem}
                onOpenEditItem={handleOpenEditItem}
                onDeleteItem={handleDeleteItem}
                onOpenAddPlace={handleOpenAddPlace}
                onOpenEditPlace={handleOpenEditPlace}
                onDeletePlace={handleDeletePlace}
                onOpenImport={handleOpenImport}
                onOpenExport={handleOpenExport}
              />
            )}

            {activeTab === 'phrases' && (
              <PhrasePacksSection
                phrasePacks={documentPhraseMappings}
                loading={loadingMappings}
                onOpenAdd={handleOpenAddPhrase}
                onOpenEdit={handleOpenEditPhrase}
                onDelete={handleDeletePhrase}
              />
            )}

            {activeTab === 'templates' && (
              <TemplatesSection
                customTemplates={customTemplates}
                loading={loadingMappings}
                onOpenAdd={handleOpenAddTemplate}
                onOpenEdit={handleOpenEditTemplate}
                onDelete={handleDeleteTemplate}
              />
            )}

            {activeTab === 'versioning' && (
              <VersioningSection
                settings={settings}
                versioningErrors={versioningErrors}
                saving={saving}
                onUpdateVersioning={updateVersioningSettings}
                onUpdateNumericSetting={updateNumericVersioningSetting}
                onResetDefaults={resetVersioningSettings}
              />
            )}
          </section>
        </div>
      </main>

      {/* ─── Global Modals & Dialogs ─── */}
      <PurposeMappingDialog
        open={purposeDialogOpen}
        mode={purposeDialogMode}
        formData={purposeFormData}
        formErrors={purposeFormErrors}
        onOpenChange={setPurposeDialogOpen}
        onFormDataChange={setPurposeFormData}
        onSave={handleSavePurpose}
      />

      <ItemMappingDialog
        open={itemDialogOpen}
        mode={itemDialogMode}
        formData={itemFormData}
        formErrors={itemFormErrors}
        generatingHindi={generatingHindi}
        onOpenChange={setItemDialogOpen}
        onFormDataChange={setItemFormData}
        onGenerateAllFromRaw={handleGenerateAllFromRaw}
        onGenerateEnglishFromHindi={handleGenerateEnglishFromHindi}
        onSave={handleSaveItem}
      />

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

      <PhrasePackDialog
        open={phraseDialogOpen}
        mode={phraseDialogMode}
        formData={phraseFormData}
        onOpenChange={setPhraseDialogOpen}
        onFormDataChange={setPhraseFormData}
        onSave={handleSavePhrase}
      />

      <TemplateEditorDialog
        open={templateDialogOpen}
        mode={templateDialogMode}
        formData={templateFormData}
        formErrors={templateFormErrors}
        onOpenChange={setTemplateDialogOpen}
        onFormDataChange={setTemplateFormData}
        onSave={handleSaveTemplate}
      />

      <DictionaryImportExportModal
        importOpen={importDialogOpen}
        exportOpen={exportDialogOpen}
        onImportOpenChange={setImportDialogOpen}
        onExportOpenChange={setExportDialogOpen}
        selectedDictionary={selectedDictionary}
        itemsCount={
          selectedDictionary === 'purpose'
            ? purposeMappings.length
            : itemHindiMappings.length
        }
        onImport={handleExecuteImport}
        onExport={handleExecuteExport}
        importing={importing}
        exporting={exporting}
        importError={importError}
      />
    </div>
  );
}
