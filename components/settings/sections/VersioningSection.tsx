'use client';

import { Settings, VersioningSettings } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PdfDownloadFolderCard } from '@/components/settings/pdfDownloadFolderCard';
import { History, RotateCcw, AlertTriangle } from 'lucide-react';

interface VersioningSectionProps {
  settings: Settings;
  versioningErrors: Record<string, string>;
  saving: boolean;
  onUpdateVersioning: (patch: Partial<VersioningSettings>) => void;
  onUpdateNumericSetting: (
    key: keyof Pick<VersioningSettings, 'maxVersions' | 'autoSaveInterval' | 'versionRetentionDays'>,
    val: string
  ) => void;
  onResetDefaults: () => void;
}

export function VersioningSection({
  settings,
  versioningErrors,
  saving,
  onUpdateVersioning,
  onUpdateNumericSetting,
  onResetDefaults,
}: VersioningSectionProps) {
  const versioning = settings.versioningSettings;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            Document Versioning & Storage Preferences
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Configure revision snapshots, auto-save timers, history retention limits, and local export paths.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Versioning Controls (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-slate-200/80 shadow-xs rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5">
              <CardTitle className="text-sm font-bold text-slate-800">
                Document Revision Snapshots
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Automatically capture point-in-time document revisions prior to recalculations or manual edits.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              {!versioning.enabled && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Versioning is Currently Disabled:</span> Documents will continue to
                    generate, but previous versions and change history will not be preserved.
                  </div>
                </div>
              )}

              {/* Master Enable Switch */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
                <div>
                  <Label className="text-xs font-bold text-slate-900 block">
                    Enable Document Version History
                  </Label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Preserves historical document snapshots for audit trails and undo rollback.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={versioning.enabled}
                  onClick={() => onUpdateVersioning({ enabled: !versioning.enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    versioning.enabled ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      versioning.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Numerical Parameters */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="maxVersions" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Max Saved Versions
                  </Label>
                  <Input
                    id="maxVersions"
                    type="number"
                    min="1"
                    max="1000"
                    disabled={!versioning.enabled}
                    value={versioning.maxVersions}
                    onChange={(e) => onUpdateNumericSetting('maxVersions', e.target.value)}
                    className="h-9 text-xs rounded-xl border-slate-200"
                  />
                  {versioningErrors.maxVersions && (
                    <p className="text-[11px] text-red-500">{versioningErrors.maxVersions}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="autoSaveInterval" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Auto-Save (Minutes)
                  </Label>
                  <Input
                    id="autoSaveInterval"
                    type="number"
                    min="1"
                    max="60"
                    disabled={!versioning.enabled || !versioning.autoSaveEnabled}
                    value={versioning.autoSaveInterval}
                    onChange={(e) => onUpdateNumericSetting('autoSaveInterval', e.target.value)}
                    className="h-9 text-xs rounded-xl border-slate-200"
                  />
                  {versioningErrors.autoSaveInterval && (
                    <p className="text-[11px] text-red-500">{versioningErrors.autoSaveInterval}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="retentionDays" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Retention Days
                  </Label>
                  <Input
                    id="retentionDays"
                    type="number"
                    min="7"
                    max="3650"
                    disabled={!versioning.enabled}
                    value={versioning.versionRetentionDays}
                    onChange={(e) => onUpdateNumericSetting('versionRetentionDays', e.target.value)}
                    className="h-9 text-xs rounded-xl border-slate-200"
                  />
                  {versioningErrors.versionRetentionDays && (
                    <p className="text-[11px] text-red-500">{versioningErrors.versionRetentionDays}</p>
                  )}
                </div>
              </div>

              {/* Checkbox Options */}
              <div className="grid gap-3 sm:grid-cols-3 pt-2">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/40 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!versioning.enabled}
                    checked={versioning.autoSaveEnabled}
                    onChange={(e) => onUpdateVersioning({ autoSaveEnabled: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Auto-save draft revisions</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/40 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!versioning.enabled}
                    checked={versioning.changeNotesRequired}
                    onChange={(e) => onUpdateVersioning({ changeNotesRequired: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Require change notes</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/40 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!versioning.enabled}
                    checked={versioning.enableVersionComparison}
                    onChange={(e) => onUpdateVersioning({ enableVersionComparison: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Side-by-side comparison</span>
                </label>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onResetDefaults}
                  disabled={saving}
                  className="rounded-xl h-8 text-xs border-slate-200"
                >
                  <RotateCcw className="h-3 w-3 mr-1.5 text-slate-400" />
                  Reset Versioning Defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Column: PDF Download Folder Card */}
        <div className="space-y-6">
          <PdfDownloadFolderCard />
        </div>
      </div>
    </div>
  );
}
