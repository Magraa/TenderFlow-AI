'use client';

import { Settings } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Phone, Mail, Hash, Sparkles, ShieldCheck } from 'lucide-react';

interface GeneralSettingsSectionProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  onSave: () => void;
  saving: boolean;
}

export function GeneralSettingsSection({
  settings,
  onSettingsChange,
  onSave,
  saving,
}: GeneralSettingsSectionProps) {
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Organization & System Defaults
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Configure primary organization identity, procurement contact metadata, and automated tender presets.
          </p>
        </div>
        <Button 
          onClick={onSave} 
          loading={saving} 
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold px-5 h-9 text-xs"
        >
          Save Changes
        </Button>
      </div>

      <div className="space-y-6">
        {/* Main Organization Profile Card */}
        <Card className="border border-slate-200/80 shadow-xs rounded-2xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5">
            <CardTitle className="text-sm font-bold text-slate-800">
              Organization Profile
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Primary organization metadata applied to generated quotations, bills, and purchase orders.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="orgName" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Organization / Department Name
              </Label>
              <div className="relative">
                <Input
                  id="orgName"
                  value={settings.organizationName || ''}
                  onChange={(e) => onSettingsChange({ ...settings, organizationName: e.target.value })}
                  placeholder="e.g. Nagar Parishad Datia / Municipal Council"
                  className="h-10 text-xs font-medium border-slate-200 rounded-xl focus-visible:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deptAddress" className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                Official Department Address
              </Label>
              <textarea
                id="deptAddress"
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-2xs"
                value={settings.departmentAddress || ''}
                onChange={(e) => onSettingsChange({ ...settings, departmentAddress: e.target.value })}
                placeholder="Enter full address, city, district, and pincode..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contactPerson" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Contact Person / Designation
                </Label>
                <Input
                  id="contactPerson"
                  value={settings.contactPerson || ''}
                  onChange={(e) => onSettingsChange({ ...settings, contactPerson: e.target.value })}
                  placeholder="e.g. Chief Municipal Officer (CMO)"
                  className="h-9 text-xs font-medium border-slate-200 rounded-xl focus-visible:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  value={settings.phone || ''}
                  onChange={(e) => onSettingsChange({ ...settings, phone: e.target.value })}
                  placeholder="e.g. +91 9876543210"
                  className="h-9 text-xs font-medium border-slate-200 rounded-xl focus-visible:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email || ''}
                  onChange={(e) => onSettingsChange({ ...settings, email: e.target.value })}
                  placeholder="e.g. procurement@municipality.gov.in"
                  className="h-9 text-xs font-medium border-slate-200 rounded-xl focus-visible:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tenderPrefix" className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-slate-400" />
                  Tender Number Prefix
                </Label>
                <Input
                  id="tenderPrefix"
                  value={settings.tenderNumberPrefix || ''}
                  onChange={(e) => onSettingsChange({ ...settings, tenderNumberPrefix: e.target.value })}
                  placeholder="e.g. TEND- / NIT-"
                  className="h-9 text-xs font-mono font-medium border-slate-200 rounded-xl focus-visible:ring-blue-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Features & Automation Preferences */}
        <Card className="border border-slate-200/80 shadow-xs rounded-2xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              Automation & Intelligence Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200/80 hover:bg-slate-50/80 transition-colors cursor-pointer bg-slate-50/40">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                checked={settings.enableLocationAIAutofill || false}
                onChange={(e) => onSettingsChange({ ...settings, enableLocationAIAutofill: e.target.checked })}
              />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-800 block">
                  Enable Location AI Auto-Fill
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Automatically infers destination Tehsil and District based on uploaded documents or place names.
                </span>
              </div>
            </label>
          </CardContent>
        </Card>

        {/* Info Card */}
        <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/50 text-blue-900 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-800">
            <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
            <span>Offline-First Safe Architecture</span>
          </div>
          <p className="text-[11px] text-blue-700/90 leading-relaxed">
            All organization settings and preferences are synchronized directly with your local database and cloud backup for instant load times.
          </p>
        </div>
      </div>
    </div>
  );
}
