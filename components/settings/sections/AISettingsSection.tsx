'use client';

import { Settings, AISettings } from '@/types';
import { AIQuotaDashboardCard } from '@/components/settings/AIQuotaDashboardCard';
import { Sparkles } from 'lucide-react';

interface AISettingsSectionProps {
  settings: Settings;
  onUpdateSettings: (newAiSettings: AISettings) => Promise<void>;
  saving: boolean;
}

export function AISettingsSection({
  settings,
  onUpdateSettings,
  saving,
}: AISettingsSectionProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI & Intelligence Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Monitor Gemini API token usage, configure automated fallback models, and adjust auto-fill prompts.
          </p>
        </div>
      </div>

      <AIQuotaDashboardCard
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        saving={saving}
      />
    </div>
  );
}
