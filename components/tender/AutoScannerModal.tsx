'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Bot,
  Play,
  Plus,
  Trash2,
  Edit2,
  Check,
  Clock,
  MapPin,
  Building2,
  Sparkles,
  RefreshCw,
  Server,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  HelpCircle,
  Tag,
} from 'lucide-react';
import { GeMScanProfile, GeMScanLog } from '@/types/gem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db } from '@/services/db';

// Fallback Indian States & UTs (Always available immediately)
const DEFAULT_INDIAN_STATES = [
  { value: 'MADHYA PRADESH', label: 'MADHYA PRADESH' },
  { value: 'UTTAR PRADESH', label: 'UTTAR PRADESH' },
  { value: 'RAJASTHAN', label: 'RAJASTHAN' },
  { value: 'MAHARASHTRA', label: 'MAHARASHTRA' },
  { value: 'DELHI', label: 'DELHI' },
  { value: 'GUJARAT', label: 'GUJARAT' },
  { value: 'BIHAR', label: 'BIHAR' },
  { value: 'HARYANA', label: 'HARYANA' },
  { value: 'PUNJAB', label: 'PUNJAB' },
  { value: 'CHHATTISGARH', label: 'CHHATTISGARH' },
  { value: 'JHARKHAND', label: 'JHARKHAND' },
  { value: 'KARNATAKA', label: 'KARNATAKA' },
  { value: 'TAMIL NADU', label: 'TAMIL NADU' },
  { value: 'WEST BENGAL', label: 'WEST BENGAL' },
  { value: 'ODISHA', label: 'ODISHA' },
  { value: 'ANDHRA PRADESH', label: 'ANDHRA PRADESH' },
  { value: 'TELANGANA', label: 'TELANGANA' },
  { value: 'KERALA', label: 'KERALA' },
  { value: 'UTTARAKHAND', label: 'UTTARAKHAND' },
  { value: 'HIMACHAL PRADESH', label: 'HIMACHAL PRADESH' },
  { value: 'JAMMU AND KASHMIR', label: 'JAMMU AND KASHMIR' },
  { value: 'ASSAM', label: 'ASSAM' },
  { value: 'GOA', label: 'GOA' },
  { value: 'TRIPURA', label: 'TRIPURA' },
  { value: 'MANIPUR', label: 'MANIPUR' },
  { value: 'MEGHALAYA', label: 'MEGHALAYA' },
  { value: 'NAGALAND', label: 'NAGALAND' },
  { value: 'MIZORAM', label: 'MIZORAM' },
  { value: 'SIKKIM', label: 'SIKKIM' },
  { value: 'ARUNACHAL PRADESH', label: 'ARUNACHAL PRADESH' },
  { value: 'CHANDIGARH', label: 'CHANDIGARH' },
  { value: 'LADAKH', label: 'LADAKH' },
  { value: 'PUDUCHERRY', label: 'PUDUCHERRY' },
  { value: 'ANDAMAN AND NICOBAR ISLANDS', label: 'ANDAMAN AND NICOBAR ISLANDS' },
  { value: 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU', label: 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU' },
  { value: 'LAKSHADWEEP', label: 'LAKSHADWEEP' },
];

const COMMON_DEPARTMENTS = [
  'Urban Development And Environment Department',
  'Public Works Department (PWD)',
  'Health and Family Welfare',
  'School Education Department',
  'Panchayat and Rural Development',
  'Police Housing & Infrastructure',
  'Revenue Department',
  'Energy and Renewable Energy',
  'Water Resources Department',
];

const INTERVAL_OPTIONS = [
  { value: 15, label: 'Every 15 Minutes' },
  { value: 30, label: 'Every 30 Minutes' },
  { value: 60, label: 'Every 1 Hour (Recommended)' },
  { value: 180, label: 'Every 3 Hours' },
  { value: 360, label: 'Every 6 Hours' },
  { value: 720, label: 'Every 12 Hours' },
  { value: 1440, label: 'Once Daily (24 Hours)' },
];

interface AutoScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

export function AutoScannerModal({ isOpen, onClose, onRefreshData }: AutoScannerModalProps) {
  const [activeTab, setActiveTab] = useState<'profiles' | 'editor' | 'logs' | 'guide'>('profiles');
  const [profiles, setProfiles] = useState<GeMScanProfile[]>([]);
  const [logs, setLogs] = useState<GeMScanLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningProfileId, setRunningProfileId] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // States & Cities dropdown lists
  const [stateList, setStateList] = useState<{ value: string; label: string }[]>(DEFAULT_INDIAN_STATES);
  const [cityList, setCityList] = useState<{ value: string; label: string }[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // Editor Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formState, setFormState] = useState('');
  const [formCities, setFormCities] = useState<string[]>([]);
  const [customCityInput, setCustomCityInput] = useState('');
  const [formDepts, setFormDepts] = useState<string[]>([]);
  const [customDeptInput, setCustomDeptInput] = useState('');
  const [formDaysAhead, setFormDaysAhead] = useState(30);
  const [formInterval, setFormInterval] = useState(60);
  const [formAutoStar, setFormAutoStar] = useState(true);
  const [formAutoAnalyze, setFormAutoAnalyze] = useState(true);
  const [formEnabled, setFormEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch States from GeM API (merged with default fallback)
  useEffect(() => {
    async function fetchStates() {
      try {
        const res = await fetch('/api/gem/options?type=states');
        const data = await res.json();
        if (data.success && Array.isArray(data.states) && data.states.length > 0) {
          setStateList(data.states);
        }
      } catch (err) {
        console.warn('Using default states list as fallback:', err);
      }
    }
    fetchStates();
  }, []);

  // Fetch Cities when state changes in editor
  useEffect(() => {
    if (!formState) {
      setCityList([]);
      return;
    }
    async function fetchCities() {
      setLoadingCities(true);
      try {
        const res = await fetch(`/api/gem/options?type=cities&state=${encodeURIComponent(formState)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.cities)) {
          setCityList(data.cities);
        } else {
          setCityList([]);
        }
      } catch (err) {
        console.error('Failed to fetch cities:', err);
        setCityList([]);
      } finally {
        setLoadingCities(false);
      }
    }
    fetchCities();
  }, [formState]);

  // Load Profiles & Logs
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileList, logList] = await Promise.all([
        db.listGeMScanProfiles(),
        db.listGeMScanLogs(undefined, 30),
      ]);
      setProfiles(profileList || []);
      setLogs(logList || []);
    } catch (err) {
      console.error('Error loading scanner data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingId(null);
    setFormName('');
    setFormState('');
    setFormCities([]);
    setCustomCityInput('');
    setFormDepts([]);
    setCustomDeptInput('');
    setFormDaysAhead(30);
    setFormInterval(60);
    setFormAutoStar(true);
    setFormAutoAnalyze(true);
    setFormEnabled(true);
  };

  const handleOpenCreate = () => {
    resetForm();
    setActiveTab('editor');
  };

  const handleOpenEdit = (profile: GeMScanProfile) => {
    setEditingId(profile.id);
    setFormName(profile.name);
    setFormState(profile.consigneeState);

    // Populate multiple cities
    const initialCities = Array.isArray(profile.consigneeCities) && profile.consigneeCities.length > 0
      ? profile.consigneeCities
      : profile.consigneeCity
      ? [profile.consigneeCity]
      : [];
    setFormCities(initialCities);
    setCustomCityInput('');

    // Populate multiple departments
    const initialDepts = Array.isArray(profile.departments) && profile.departments.length > 0
      ? profile.departments
      : profile.department
      ? [profile.department]
      : [];
    setFormDepts(initialDepts);
    setCustomDeptInput('');

    setFormDaysAhead(profile.daysAhead || 30);
    setFormInterval(profile.intervalMinutes || 60);
    setFormAutoStar(profile.autoStar !== false);
    setFormAutoAnalyze(profile.autoAnalyze !== false);
    setFormEnabled(profile.enabled !== false);
    setActiveTab('editor');
  };

  const handleAddCity = (city: string) => {
    const trimmed = city.trim().toUpperCase();
    if (!trimmed) return;
    if (!formCities.includes(trimmed)) {
      setFormCities((prev) => [...prev, trimmed]);
    }
    setCustomCityInput('');
  };

  const handleRemoveCity = (cityToRemove: string) => {
    setFormCities((prev) => prev.filter((c) => c !== cityToRemove));
  };

  const handleAddDepartment = (dept: string) => {
    const trimmed = dept.trim();
    if (!trimmed) return;
    if (!formDepts.includes(trimmed)) {
      setFormDepts((prev) => [...prev, trimmed]);
    }
    setCustomDeptInput('');
  };

  const handleRemoveDepartment = (deptToRemove: string) => {
    setFormDepts((prev) => prev.filter((d) => d !== deptToRemove));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCities = formCities.map((c) => c.trim().toUpperCase()).filter(Boolean);

    if (!formName.trim()) {
      setScanMessage({ type: 'error', text: 'Scan Rule Name is required!' });
      return;
    }
    if (!formState.trim()) {
      setScanMessage({ type: 'error', text: 'Consignee State is required!' });
      return;
    }
    if (cleanCities.length === 0) {
      setScanMessage({ type: 'error', text: 'Please add at least one Consignee City!' });
      return;
    }

    setSaving(true);
    try {
      const cleanDepts = formDepts.map((d) => d.trim()).filter(Boolean);
      const profileToSave: Partial<GeMScanProfile> & { name: string; consigneeState: string } = {
        id: editingId || undefined,
        name: formName.trim(),
        consigneeState: formState.trim().toUpperCase(),
        consigneeCity: cleanCities[0],
        consigneeCities: cleanCities,
        department: cleanDepts.length === 1 ? cleanDepts[0] : undefined,
        departments: cleanDepts,
        daysAhead: Number(formDaysAhead) || 30,
        intervalMinutes: Number(formInterval) || 60,
        autoStar: formAutoStar,
        autoAnalyze: formAutoAnalyze,
        enabled: formEnabled,
      };

      const savedProfile = await db.saveGeMScanProfile(profileToSave);
      // Also sync to server API endpoint for background server jobs
      await fetch('/api/gem/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedProfile),
      }).catch(() => {});

      setScanMessage({ type: 'success', text: `Scan profile "${formName}" saved successfully!` });
      resetForm();
      setActiveTab('profiles');
      await loadData();
    } catch (err: any) {
      setScanMessage({ type: 'error', text: err?.message || 'Failed to save scan profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete scan rule "${name}"?`)) return;
    try {
      await db.deleteGeMScanProfile(id);
      await fetch(`/api/gem/profiles?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      setScanMessage({ type: 'success', text: `Scan rule "${name}" deleted.` });
    } catch (err: any) {
      setScanMessage({ type: 'error', text: err?.message || 'Failed to delete rule' });
    }
  };

  const handleToggleEnabled = async (profile: GeMScanProfile) => {
    const updated = { ...profile, enabled: !profile.enabled };
    try {
      await db.saveGeMScanProfile(updated);
      await fetch('/api/gem/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});
      setProfiles((prev) => prev.map((p) => (p.id === profile.id ? updated : p)));
    } catch (err: any) {
      console.error('Failed to toggle profile enabled:', err);
    }
  };

  const handleRunScanNow = async (profileId: string) => {
    const targetProfile = profiles.find((p) => p.id === profileId);
    setRunningProfileId(profileId);
    setScanMessage(null);
    try {
      const res = await fetch(`/api/cron/scan-tenders?secret=local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: targetProfile,
          profileId,
          force: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const result = data.result;
        setScanMessage({
          type: 'success',
          text: `Scan finished! Found ${result?.totalFound || 0} matching bids (${result?.newBidsCount || 0} brand-new, ${result?.analyzedCount || 0} AI-analyzed).`,
        });
        await loadData();
        if (onRefreshData) onRefreshData();
      } else {
        setScanMessage({
          type: 'error',
          text: data.error || 'Scan failed to execute on server',
        });
      }
    } catch (err: any) {
      setScanMessage({
        type: 'error',
        text: err?.message || 'Network error running scan',
      });
    } finally {
      setRunningProfileId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-400">
              <Bot className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">24/7 Server-Side Auto-Scanner</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Server className="w-3 h-3" /> Runs 100% Offline
                </span>
              </div>
              <p className="text-xs text-indigo-200/80">
                Autonomously monitors State, Multiple Cities, Multiple Departments, stars new tenders & executes AI deep analysis
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 bg-slate-50 border-b border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('profiles')}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'profiles'
                  ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Bot className="w-3.5 h-3.5" /> Active Rules ({profiles.length})
            </button>
            <button
              onClick={handleOpenCreate}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'editor'
                  ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> {editingId ? 'Edit Rule' : 'Create New Rule'}
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Server Logs ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'guide'
                  ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" /> 24/7 Cloud Setup
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="h-7 text-xs gap-1.5 text-gray-600"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {/* Status Message Alert */}
        {scanMessage && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center justify-between border-b ${
              scanMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {scanMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span>{scanMessage.text}</span>
            </div>
            <button onClick={() => setScanMessage(null)} className="text-gray-400 hover:text-gray-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">

          {/* 1. PROFILES TAB */}
          {activeTab === 'profiles' && (
            <div className="space-y-4">
              {profiles.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 p-8">
                  <Bot className="w-12 h-12 text-indigo-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-gray-800">No Auto-Scan Rules Configured Yet</h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-4">
                    Create a rule to scan your favorite State, Multiple Cities, and Departments (e.g. Morena, Gwalior & Bhopal) at scheduled intervals.
                  </p>
                  <Button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-sm">
                    <Plus className="w-3.5 h-3.5" /> Add First Scan Rule
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {profiles.map((p) => {
                    const isRunning = runningProfileId === p.id;
                    const citiesList = Array.isArray(p.consigneeCities) && p.consigneeCities.length > 0
                      ? p.consigneeCities
                      : p.consigneeCity
                      ? [p.consigneeCity]
                      : [];

                    const deptsList = Array.isArray(p.departments) && p.departments.length > 0
                      ? p.departments
                      : p.department
                      ? [p.department]
                      : [];

                    return (
                      <div
                        key={p.id}
                        className={`bg-white rounded-xl p-4 border transition-all shadow-sm ${
                          p.enabled ? 'border-indigo-100 hover:border-indigo-300' : 'border-gray-200 opacity-70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-gray-900 text-sm">{p.name}</h4>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  p.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {p.enabled ? 'ACTIVE' : 'PAUSED'}
                              </span>
                              {p.lastStatus === 'success' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                  Last Run: {p.lastFoundCount || 0} Found
                                </span>
                              )}
                              {p.lastStatus === 'failed' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                                  Failed
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-600">
                              <div className="flex items-center gap-1 text-gray-700 font-semibold">
                                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                                <span>{p.consigneeState}</span>
                              </div>

                              <div className="flex items-center gap-1 text-gray-500">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                <span>Interval: Every {p.intervalMinutes}m</span>
                              </div>

                              {p.autoAnalyze && (
                                <div className="flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                                  <Sparkles className="w-3 h-3 text-emerald-600" /> Auto-AI Analysis
                                </div>
                              )}
                            </div>

                            {/* Cities badges in card */}
                            {citiesList.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-semibold text-gray-500">Cities:</span>
                                {citiesList.map((c, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded-md text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold uppercase">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Departments chips in card */}
                            {deptsList.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-semibold text-gray-500">Depts:</span>
                                {deptsList.map((d, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                                    {d}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              disabled={isRunning}
                              onClick={() => handleRunScanNow(p.id)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 gap-1.5 shadow-sm"
                            >
                              <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                              {isRunning ? 'Scanning...' : 'Scan Now'}
                            </Button>

                            <button
                              onClick={() => handleToggleEnabled(p)}
                              title={p.enabled ? 'Pause Rule' : 'Resume Rule'}
                              className={`p-2 rounded-lg border text-xs font-semibold transition-colors ${
                                p.enabled
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              {p.enabled ? 'Pause' : 'Resume'}
                            </button>

                            <button
                              onClick={() => handleOpenEdit(p)}
                              title="Edit Rule"
                              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteProfile(p.id, p.name)}
                              title="Delete Rule"
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. CREATE / EDIT FORM TAB */}
          {activeTab === 'editor' && (
            <form onSubmit={handleSaveProfile} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-5">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-900">
                  {editingId ? 'Edit Scan Rule' : 'Configure New Automated Scan Rule'}
                </h3>
                <p className="text-xs text-gray-500">
                  The server will autonomously query GeM for these exact location and department filters.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rule Name */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Scan Rule Name *</label>
                  <Input
                    placeholder="e.g., Morena & Gwalior - Urban Development & PWD"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    className="text-xs h-9"
                  />
                </div>

                {/* State */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Consignee State *</label>
                  <select
                    value={formState}
                    onChange={(e) => {
                      setFormState(e.target.value);
                      setFormCities([]);
                    }}
                    required
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">-- Select State --</option>
                    {stateList.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Multi-City Selection Section */}
                <div className="md:col-span-2 space-y-2 p-3.5 bg-indigo-50/40 border border-indigo-100 rounded-xl">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      Consignee Cities * (Add Multiple Cities)
                    </label>
                    {formCities.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFormCities([])}
                        className="text-[11px] text-red-600 hover:text-red-800 font-medium"
                      >
                        Clear All Cities ({formCities.length})
                      </button>
                    )}
                  </div>

                  {/* Active Selected Cities Badges */}
                  {formCities.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-lg border border-indigo-200 min-h-[36px] items-center">
                      {formCities.map((city, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-600 text-white shadow-xs"
                        >
                          <MapPin className="w-3 h-3 text-indigo-200" />
                          <span>{city}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCity(city)}
                            className="text-indigo-200 hover:text-white ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                      ⚠️ Please select or type at least one city below to monitor (e.g. <strong>MORENA</strong>, <strong>GWALIOR</strong>).
                    </p>
                  )}

                  {/* Dropdown to pick and add a city */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-500 font-semibold block">
                        Pick from {formState || 'State'} city list {loadingCities && '(Loading...)'}:
                      </span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddCity(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        disabled={!formState || loadingCities}
                        className="w-full h-9 rounded-md border border-input bg-white px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">-- Click to Add City from List --</option>
                        {cityList.map((c) => (
                          <option key={c.value} value={c.value} disabled={formCities.includes(c.value.toUpperCase())}>
                            {formCities.includes(c.value.toUpperCase()) ? `✓ ${c.label}` : c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-500 font-semibold block">Or type custom city name:</span>
                      <div className="flex gap-1.5">
                        <Input
                          placeholder="e.g., MORENA"
                          value={customCityInput}
                          onChange={(e) => setCustomCityInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCity(customCityInput);
                            }
                          }}
                          className="text-xs h-9 uppercase bg-white"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddCity(customCityInput)}
                          disabled={!customCityInput.trim()}
                          className="text-xs h-9 gap-1 shrink-0 bg-white"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Multi-Department Filter Section */}
                <div className="md:col-span-2 space-y-2 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-amber-600" />
                      Department Filter (Optional - Add Multiple)
                    </label>
                    {formDepts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFormDepts([])}
                        className="text-[11px] text-red-600 hover:text-red-800 font-medium"
                      >
                        Clear All ({formDepts.length})
                      </button>
                    )}
                  </div>

                  {/* Active Selected Departments Badges */}
                  {formDepts.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-lg border border-gray-200 min-h-[36px] items-center">
                      {formDepts.map((dept, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs"
                        >
                          <Tag className="w-3 h-3 text-indigo-500" />
                          <span>{dept}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDepartment(dept)}
                            className="text-indigo-400 hover:text-red-600 ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-500 italic bg-white/60 p-2 rounded border border-dashed border-gray-200">
                      No specific departments selected. The scanner will monitor <strong>ALL</strong> departments in the selected cities.
                    </p>
                  )}

                  {/* Input for custom department */}
                  <div className="flex gap-2 pt-1">
                    <Input
                      placeholder="Type custom department name & press Add..."
                      value={customDeptInput}
                      onChange={(e) => setCustomDeptInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddDepartment(customDeptInput);
                        }
                      }}
                      className="text-xs h-9 bg-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddDepartment(customDeptInput)}
                      disabled={!customDeptInput.trim()}
                      className="text-xs h-9 gap-1 shrink-0 bg-white"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Dept
                    </Button>
                  </div>

                  {/* Quick Pick Popular Department Chips */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] text-gray-500 font-semibold block">Click to quick-add common departments:</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {COMMON_DEPARTMENTS.map((dept) => {
                        const isSelected = formDepts.includes(dept);
                        return (
                          <button
                            type="button"
                            key={dept}
                            onClick={() => {
                              if (isSelected) {
                                handleRemoveDepartment(dept);
                              } else {
                                handleAddDepartment(dept);
                              }
                            }}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors border ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white hover:bg-indigo-50 hover:text-indigo-700 border-gray-200 text-gray-700'
                            }`}
                          >
                            {isSelected ? `✓ ${dept}` : `+ ${dept}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Days Ahead (Rolling Window) */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                    <span>End Date Window (Rolling Days)</span>
                    <span className="text-xs font-bold text-indigo-600">{formDaysAhead} Days</span>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="90"
                    step="5"
                    value={formDaysAhead}
                    onChange={(e) => setFormDaysAhead(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-gray-400">Scans tenders ending between Today and next {formDaysAhead} days.</p>
                </div>

                {/* Scan Interval */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Scan Frequency / Interval</label>
                  <select
                    value={formInterval}
                    onChange={(e) => setFormInterval(Number(e.target.value))}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {INTERVAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Switches */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={formAutoStar}
                    onChange={(e) => setFormAutoStar(e.target.checked)}
                    className="rounded text-indigo-600 w-4 h-4"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-gray-800 block">Auto-Save / Star</span>
                    <span className="text-[10px] text-gray-500">Save new bids to dashboard</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 bg-indigo-50/60 rounded-lg border border-indigo-200 cursor-pointer hover:bg-indigo-100/60">
                  <input
                    type="checkbox"
                    checked={formAutoAnalyze}
                    onChange={(e) => setFormAutoAnalyze(e.target.checked)}
                    className="rounded text-indigo-600 w-4 h-4"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-indigo-900 block flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-600" /> Auto AI Analysis
                    </span>
                    <span className="text-[10px] text-indigo-700/80">Analyze tender PDF with AI</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={formEnabled}
                    onChange={(e) => setFormEnabled(e.target.checked)}
                    className="rounded text-indigo-600 w-4 h-4"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-gray-800 block">Enable Immediately</span>
                    <span className="text-[10px] text-gray-500">Start scanning on schedule</span>
                  </div>
                </label>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab('profiles')} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5">
                  <Check className="w-3.5 h-3.5" /> {saving ? 'Saving...' : editingId ? 'Update Rule' : 'Save & Activate Rule'}
                </Button>
              </div>
            </form>
          )}

          {/* 3. LOGS TAB */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              {logs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 p-8">
                  <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No server scan history recorded yet. Run a scan to see live logs.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-600 font-semibold">
                        <th className="py-2.5 px-4">Time</th>
                        <th className="py-2.5 px-4">Scan Rule</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4">Found / New</th>
                        <th className="py-2.5 px-4">AI Analyzed</th>
                        <th className="py-2.5 px-4">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {logs.map((l) => (
                        <tr key={l.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-2.5 px-4 text-gray-500 whitespace-nowrap">
                            {new Date(l.runAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: 'short',
                            })}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-gray-900">{l.profileName}</td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                l.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {l.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="font-semibold text-gray-800">{l.totalBidsFound}</span> total (
                            <span className="font-bold text-indigo-600">{l.newBidsCount} new</span>)
                          </td>
                          <td className="py-2.5 px-4">
                            {l.analyzedCount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                <Sparkles className="w-3 h-3 text-emerald-600" /> {l.analyzedCount}
                              </span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-gray-500">{(l.durationMs / 1000).toFixed(1)}s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 4. GUIDE / SETUP TAB */}
          {activeTab === 'guide' && (
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-4 text-xs text-gray-700">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" /> How 24/7 Cloud Background Execution Works
              </div>

              <p className="leading-relaxed">
                When you deploy this project to <strong>Vercel</strong> or any cloud host, Next.js cron triggers the scanning endpoint automatically in the background even when you are asleep and your computer is completely turned off.
              </p>

              <div className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-[11px] space-y-1">
                <div className="text-indigo-400 font-bold">// Cron Webhook Endpoint:</div>
                <div className="text-emerald-300 select-all">POST https://your-domain.com/api/cron/scan-tenders</div>
                <div className="text-gray-400 text-[10px] mt-1">// Configured automatically in vercel.json every 30 minutes</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100 space-y-1">
                  <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-indigo-600" /> 1. Vercel Cron
                  </div>
                  <p className="text-[11px] text-indigo-800/80">
                    Already included in `vercel.json`. Runs automatically on your deployed project every 30 minutes.
                  </p>
                </div>

                <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-100 space-y-1">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" /> 2. Free Cron-Job.org
                  </div>
                  <p className="text-[11px] text-amber-800/80">
                    You can also create a free recurring alarm on `cron-job.org` pointing to your `/api/cron/scan-tenders` endpoint.
                  </p>
                </div>

                <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 space-y-1">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" /> 3. Immediate Results
                  </div>
                  <p className="text-[11px] text-emerald-800/80">
                    Whenever you open your dashboard, newly detected and AI-analyzed tenders will be waiting right here.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-100 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>Active Rules: {profiles.filter((p) => p.enabled).length} of {profiles.length}</span>
          <Button size="sm" onClick={onClose} className="bg-slate-900 hover:bg-slate-800 text-white text-xs">
            Close
          </Button>
        </div>

      </div>
    </div>
  );
}
