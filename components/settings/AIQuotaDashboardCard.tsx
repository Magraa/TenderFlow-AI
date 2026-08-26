'use client';

import { useEffect, useState } from 'react';
import {
  Sparkles,
  Clock,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Sliders,
  RotateCcw,
  History,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { aiUsageService } from '@/services/aiUsageService';
import { AIQuotaInfo, AISettings, AIUsageLog, Settings } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AIQuotaDashboardCardProps {
  settings: Settings;
  onUpdateSettings: (newAiSettings: AISettings) => Promise<void>;
  saving?: boolean;
}

export function AIQuotaDashboardCard({
  settings,
  onUpdateSettings,
  saving = false,
}: AIQuotaDashboardCardProps) {
  const [quota, setQuota] = useState<AIQuotaInfo | null>(null);
  const [recentLogs, setRecentLogs] = useState<AIUsageLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    latencyMs?: number;
    message?: string;
    status?: string;
    details?: any;
  } | null>(null);

  // Local form state for AI settings
  const [aiConfig, setAiConfig] = useState<AISettings>({
    showQuotaPill: settings.aiSettings?.showQuotaPill ?? true,
    pillPosition: settings.aiSettings?.pillPosition ?? 'bottom-right',
    warningThresholdPercent: settings.aiSettings?.warningThresholdPercent ?? 20,
    customDailyLimit: settings.aiSettings?.customDailyLimit,
  });

  // Sync settings when parent changes
  useEffect(() => {
    if (settings.aiSettings) {
      setAiConfig({
        showQuotaPill: settings.aiSettings.showQuotaPill ?? true,
        pillPosition: settings.aiSettings.pillPosition ?? 'bottom-right',
        warningThresholdPercent: settings.aiSettings.warningThresholdPercent ?? 20,
        customDailyLimit: settings.aiSettings.customDailyLimit,
      });
    }
  }, [settings.aiSettings]);

  // Load and subscribe to real-time quota updates
  useEffect(() => {
    const refreshData = () => {
      const currentQuota = aiUsageService.getQuotaInfo(
        aiConfig.customDailyLimit,
        aiConfig.warningThresholdPercent || 20
      );
      setQuota(currentQuota);
      setRecentLogs(aiUsageService.getRecentLogs());
    };

    refreshData();
    const unsub = aiUsageService.onUsageChange(refreshData);
    const interval = setInterval(refreshData, 30000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [aiConfig.customDailyLimit, aiConfig.warningThresholdPercent]);

  const handleTestKey = async () => {
    setTestingKey(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/ai/health?t=${Date.now()}`);
      const data = await res.json();
      setTestResult({
        valid: data.valid,
        latencyMs: data.latencyMs,
        message: data.message,
        status: data.status,
        details: data.details,
      });
      // Refresh local quota
      setQuota(
        aiUsageService.getQuotaInfo(aiConfig.customDailyLimit, aiConfig.warningThresholdPercent || 20)
      );
    } catch (e: any) {
      setTestResult({
        valid: false,
        message: e?.message || 'Failed to connect to AI health API',
        status: 'error',
      });
    } finally {
      setTestingKey(false);
    }
  };

  const handleResetCounter = () => {
    if (confirm('Are you sure you want to reset today\'s AI request counter back to 0?')) {
      aiUsageService.resetDailyUsage();
      setQuota(
        aiUsageService.getQuotaInfo(aiConfig.customDailyLimit, aiConfig.warningThresholdPercent || 20)
      );
    }
  };

  const handleSaveAISettings = async () => {
    await onUpdateSettings(aiConfig);
  };

  if (!quota) return null;

  const isHealthy = quota.status === 'healthy';
  const isWarning = quota.status === 'warning';
  const isExhausted = quota.status === 'exhausted';

  return (
    <Card className="overflow-hidden border-slate-200 shadow-md">
      <CardHeader className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/30">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg text-white">AI Free Limit & Quota Dashboard</CardTitle>
              <CardDescription className="text-indigo-200/75">
                Real-time tracking of daily API free tier limits, active health diagnostics, and UI visibility.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestKey}
              disabled={testingKey}
              className="border-indigo-400/30 bg-indigo-900/40 text-xs font-semibold text-white hover:bg-indigo-800/60"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${testingKey ? 'animate-spin' : ''}`} />
              {testingKey ? 'Testing...' : 'Test API Key'}
            </Button>

            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-400/30 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
            >
              <span>Google AI Studio</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {/* Main Quota Gauge & Statistics Card */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Left Main Gauge (2 cols) */}
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 p-5 shadow-xs md:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Remaining Free Quota
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      isHealthy
                        ? 'bg-emerald-100 text-emerald-800'
                        : isWarning
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
                        : isExhausted
                        ? 'bg-rose-100 text-rose-800 animate-pulse'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isHealthy ? 'bg-emerald-600' : isWarning ? 'bg-amber-600' : isExhausted ? 'bg-rose-600' : 'bg-slate-500'
                      }`}
                    />
                    {isHealthy ? 'Healthy Quota' : isWarning ? 'Low Quota Warning' : isExhausted ? 'Limit Reached' : 'Unconfigured'}
                  </span>
                </div>

                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                    {quota.requestsRemaining.toLocaleString()}
                  </span>
                  <span className="text-sm font-medium text-slate-500">
                    / {quota.dailyLimit.toLocaleString()} free requests left today
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white/90 px-3.5 py-2 text-right shadow-xs">
                <div className="flex items-center justify-end gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <Clock className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Resets in</span>
                </div>
                <div className="mt-0.5 font-mono text-base font-extrabold text-indigo-700">
                  {quota.resetTimeFormatted}
                </div>
                <div className="text-[10px] text-slate-400">00:00 UTC (05:30 AM IST)</div>
              </div>
            </div>

            {/* Gradient Progress Bar */}
            <div className="mt-4 space-y-1.5">
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200/80 shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    quota.percentRemaining > 30
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      : quota.percentRemaining > 10
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                      : 'bg-gradient-to-r from-rose-500 to-red-600'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, quota.percentRemaining))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>{quota.requestsUsedToday.toLocaleString()} requests used today</span>
                <span className="text-indigo-700">{quota.percentRemaining}% Free Capacity Left</span>
              </div>
            </div>
          </div>

          {/* Right Provider & Rate Limit Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Active Provider & Model
                </span>
                <div className="mt-0.5 text-sm font-bold text-slate-800">
                  {quota.provider.toUpperCase()}
                </div>
                <div className="font-mono text-xs text-indigo-600">{quota.model}</div>
              </div>

              <div className="border-t border-slate-100 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Rate Limit Gauge (RPM)
                </span>
                <div className="mt-0.5 flex items-baseline justify-between">
                  <span className="text-sm font-bold text-slate-800">
                    {quota.recentRpm} / {quota.requestsPerMinuteLimit} RPM
                  </span>
                  <span className="text-[11px] text-slate-500">60s rolling</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Tokens Consumed
                </span>
                <div className="mt-0.5 text-sm font-bold text-slate-800">
                  {quota.tokensUsedToday.toLocaleString()} tokens
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleResetCounter}
              className="mt-2 h-7 w-full justify-center text-[11px] text-slate-500 hover:text-slate-700"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Reset Daily Counter
            </Button>
          </div>
        </div>

        {/* Live Test Result Banner (if tested) */}
        {testResult && (
          <div
            className={`rounded-xl border p-4 text-xs ${
              testResult.valid
                ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                : 'border-rose-200 bg-rose-50 text-rose-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold">
                {testResult.valid ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-600" />
                )}
                <span className="text-sm">
                  {testResult.valid ? 'API Key Verified & Operational' : 'API Key Validation Failed'}
                </span>
              </div>
              {testResult.latencyMs !== undefined && (
                <span className="rounded-full bg-white/80 px-2.5 py-0.5 font-mono text-xs font-semibold shadow-xs">
                  ⚡ Latency: {testResult.latencyMs}ms
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs opacity-90">{testResult.message}</p>
          </div>
        )}

        {/* Feature Breakdown Table */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Feature Usage Breakdown (Today)
          </h4>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="text-xs text-slate-500">Tender Document Drafting</div>
              <div className="mt-1 text-lg font-bold text-slate-800">{quota.byFeature.draft || 0}</div>
              <div className="text-[10px] text-slate-400">Quotations, Vigyapti, Orders</div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="text-xs text-slate-500">Hindi Transliteration</div>
              <div className="mt-1 text-lg font-bold text-slate-800">{quota.byFeature.transliterate || 0}</div>
              <div className="text-[10px] text-slate-400">Items, Vendors, Titles</div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="text-xs text-slate-500">GeM PDF AI Analysis</div>
              <div className="mt-1 text-lg font-bold text-slate-800">{quota.byFeature.gem_analyze || 0}</div>
              <div className="text-[10px] text-slate-400">Bid documents & ATCs</div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="text-xs text-slate-500">AI Phrase Packs & Auto-Fill</div>
              <div className="mt-1 text-lg font-bold text-slate-800">
                {(quota.byFeature.phrase_pack || 0) + (quota.byFeature.alternates || 0) + (quota.byFeature.location || 0)}
              </div>
              <div className="text-[10px] text-slate-400">Descriptions & variations</div>
            </div>
          </div>
        </div>

        {/* Dashboard & UI Configuration Controls */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 shadow-xs">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-800">AI Dashboard & Pill Display Preferences</h4>
          </div>

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {/* Pill Visibility Toggle */}
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3.5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={aiConfig.showQuotaPill}
                  onChange={(e) => setAiConfig({ ...aiConfig, showQuotaPill: e.target.checked })}
                />
                <div>
                  <span className="block text-xs font-bold text-slate-800">
                    View AI Quota pill across Website & Homepage
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Shows a live status badge (e.g. &quot;🟢 1,482/1,500 left&quot;) with one-click full diagnostics.
                  </span>
                </div>
              </label>
            </div>

            {/* Pill Position */}
            <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-3.5">
              <Label className="text-xs font-bold text-slate-800">Pill Position on Screen</Label>
              <select
                value={aiConfig.pillPosition || 'bottom-right'}
                onChange={(e) => setAiConfig({ ...aiConfig, pillPosition: e.target.value as any })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-xs focus:border-indigo-500 focus:outline-none"
              >
                <option value="bottom-right">Floating at Bottom Right (Recommended)</option>
                <option value="bottom-left">Floating at Bottom Left</option>
                <option value="header">Top Navigation Bar / Header</option>
              </select>
            </div>

            {/* Warning Threshold */}
            <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-3.5">
              <Label className="text-xs font-bold text-slate-800">Low Quota Warning Threshold</Label>
              <select
                value={aiConfig.warningThresholdPercent || 20}
                onChange={(e) =>
                  setAiConfig({ ...aiConfig, warningThresholdPercent: Number(e.target.value) })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-xs focus:border-indigo-500 focus:outline-none"
              >
                <option value={10}>Warn when under 10% remaining (150 requests)</option>
                <option value={20}>Warn when under 20% remaining (300 requests - Recommended)</option>
                <option value={30}>Warn when under 30% remaining (450 requests)</option>
              </select>
            </div>

            {/* Custom Daily Limit Override */}
            <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-3.5">
              <Label className="text-xs font-bold text-slate-800">Custom Daily Limit Override (RPD)</Label>
              <Input
                type="number"
                placeholder="1500 (Default for Gemini 1.5 Flash)"
                value={aiConfig.customDailyLimit || ''}
                onChange={(e) =>
                  setAiConfig({
                    ...aiConfig,
                    customDailyLimit: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="h-8 text-xs"
              />
              <span className="text-[10px] text-slate-400">Leave blank to use provider default (1,500 for Gemini Free Tier).</span>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              size="sm"
              onClick={handleSaveAISettings}
              loading={saving}
              disabled={saving}
              className="bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Save AI Preferences
            </Button>
          </div>
        </div>

        {/* Collapsible Recent AI Activity Logs */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-800">Recent AI Request History Logs</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {recentLogs.length} logged
              </span>
            </div>
            {showLogs ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>

          {showLogs && (
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
              {recentLogs.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No AI requests logged yet today.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            log.success ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span className="font-semibold text-slate-700 capitalize">{log.feature}</span>
                        <span className="text-[11px] text-slate-400">({log.model})</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-500">
                        {log.tokensUsed && <span>{log.tokensUsed} tokens</span>}
                        {log.durationMs && <span className="font-mono text-[11px]">{log.durationMs}ms</span>}
                        <span className="text-[11px] text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
