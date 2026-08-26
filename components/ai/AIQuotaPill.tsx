'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Clock,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Settings as SettingsIcon,
} from 'lucide-react';
import { aiUsageService } from '@/services/aiUsageService';
import { AIQuotaInfo, Settings } from '@/types';
import { dataService } from '@/services/dataService';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AIQuotaPillProps {
  forceShow?: boolean;
  inline?: boolean;
  className?: string;
}

export function AIQuotaPill({ forceShow = false, inline = false, className = '' }: AIQuotaPillProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [quota, setQuota] = useState<AIQuotaInfo | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    latencyMs?: number;
    message?: string;
    status?: string;
  } | null>(null);

  // Load settings & quota
  useEffect(() => {
    let cancelled = false;

    const refreshData = async () => {
      try {
        const loadedSettings = await dataService.settings.get().catch(() => null);
        if (!cancelled && loadedSettings) {
          setSettings(loadedSettings);
        }
      } catch {}

      if (!cancelled) {
        const currentQuota = aiUsageService.getQuotaInfo(
          settings?.aiSettings?.customDailyLimit,
          settings?.aiSettings?.warningThresholdPercent || 20
        );
        setQuota(currentQuota);
      }
    };

    refreshData();
    const unsub = aiUsageService.onUsageChange(refreshData);

    // Refresh reset timer every 30 seconds
    const interval = setInterval(refreshData, 30000);

    return () => {
      cancelled = true;
      unsub();
      clearInterval(interval);
    };
  }, [settings?.aiSettings?.customDailyLimit, settings?.aiSettings?.warningThresholdPercent]);

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
      });
      // Refresh local quota info
      setQuota(
        aiUsageService.getQuotaInfo(
          settings?.aiSettings?.customDailyLimit,
          settings?.aiSettings?.warningThresholdPercent || 20
        )
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

  if (!quota) return null;

  // Determine visibility: default to showing unless explicitly disabled in settings
  const shouldShow =
    forceShow ||
    inline ||
    settings?.aiSettings?.showQuotaPill === true ||
    settings?.aiSettings?.showQuotaPill === undefined;

  if (!shouldShow && !forceShow && !inline) return null;

  const isHealthy = quota.status === 'healthy';
  const isWarning = quota.status === 'warning';
  const isExhausted = quota.status === 'exhausted';
  const isUnconfigured = quota.status === 'unconfigured';

  const dotColor = isHealthy
    ? 'bg-emerald-500 shadow-emerald-500/50'
    : isWarning
    ? 'bg-amber-500 animate-pulse shadow-amber-500/50'
    : isExhausted
    ? 'bg-rose-500 animate-pulse shadow-rose-500/50'
    : 'bg-slate-400';

  const badgeBg = isHealthy
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-300'
    : isWarning
    ? 'bg-amber-50 text-amber-900 border-amber-300 hover:border-amber-400'
    : isExhausted
    ? 'bg-rose-50 text-rose-900 border-rose-300 hover:border-rose-400'
    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300';

  const positionClass = inline
    ? ''
    : settings?.aiSettings?.pillPosition === 'bottom-right'
    ? 'fixed bottom-4 right-24 sm:right-28 z-30'
    : settings?.aiSettings?.pillPosition === 'header'
    ? 'relative'
    : 'fixed bottom-4 left-4 z-30'; // default bottom-left for clean visibility

  // Floating button or inline badge
  const pillElement = (
    <button
      onClick={() => setOpenModal(true)}
      title="Click to view AI Free Limit & Quota Diagnostics"
      className={`group flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-all duration-150 hover:shadow-md active:scale-95 ${badgeBg} ${positionClass} ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {(isWarning || isExhausted) && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dotColor}`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full shadow-sm ${dotColor}`} />
      </span>

      <Sparkles className="h-3.5 w-3.5 opacity-80" />

      <span>
        {isUnconfigured ? (
          'AI: Mock / Key unset'
        ) : isExhausted ? (
          'AI Free Limit Reached'
        ) : (
          <>
            <span className="font-bold">{quota.requestsRemaining}</span>
            <span className="opacity-75">/{quota.dailyLimit} AI left</span>
            <span className="ml-1 opacity-60">({quota.percentRemaining}%)</span>
          </>
        )}
      </span>
    </button>
  );

  return (
    <>
      {pillElement}

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between pr-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900">
                    AI Free Limit & Quota Dashboard
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Real-time daily quota tracker & API diagnostics
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Top Quota Progress Card */}
            <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-indigo-50/30 p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Daily Free Quota
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isHealthy
                          ? 'bg-emerald-100 text-emerald-800'
                          : isWarning
                          ? 'bg-amber-100 text-amber-800'
                          : isExhausted
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {quota.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold tracking-tight text-slate-900">
                      {quota.requestsRemaining}
                    </span>
                    <span className="text-sm font-medium text-slate-500">
                      / {quota.dailyLimit} requests left today
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-xs font-medium text-slate-500">
                    <Clock className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Resets in</span>
                  </div>
                  <div className="mt-1 font-mono text-sm font-bold text-indigo-700">
                    {quota.resetTimeFormatted}
                  </div>
                  <div className="text-[10px] text-slate-400">Midnight UTC (05:30 IST)</div>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="mt-3">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      quota.percentRemaining > 30
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        : quota.percentRemaining > 10
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                        : 'bg-gradient-to-r from-rose-500 to-red-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, quota.percentRemaining))}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] font-medium text-slate-500">
                  <span>Used: {quota.requestsUsedToday} reqs</span>
                  <span className="font-bold text-slate-700">{quota.percentRemaining}% Remaining</span>
                </div>
              </div>
            </div>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm">
                <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Provider & Model</div>
                <div className="mt-0.5 truncate font-semibold text-slate-800" title={quota.model}>
                  {quota.provider.toUpperCase()}
                </div>
                <div className="truncate text-[10px] text-slate-400">{quota.model}</div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm">
                <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Rate Limit (RPM)</div>
                <div className="mt-0.5 font-semibold text-slate-800">
                  {quota.recentRpm} / {quota.requestsPerMinuteLimit} RPM
                </div>
                <div className="text-[10px] text-slate-400">Rolling 60s load</div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm">
                <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Tokens Used</div>
                <div className="mt-0.5 font-semibold text-slate-800">
                  {quota.tokensUsedToday > 0 ? quota.tokensUsedToday.toLocaleString() : '0'}
                </div>
                <div className="text-[10px] text-slate-400">Total today</div>
              </div>
            </div>

            {/* Feature Usage Breakdown */}
            <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Today's Feature Breakdown</span>
                <span className="text-[10px] text-slate-400">Total calls: {quota.requestsUsedToday}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <span className="text-slate-600">📄 Tender Drafting</span>
                  <span className="font-bold text-slate-800">{quota.byFeature.draft || 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <span className="text-slate-600">🌐 Transliteration</span>
                  <span className="font-bold text-slate-800">{quota.byFeature.transliterate || 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <span className="text-slate-600">📑 GeM PDF Analysis</span>
                  <span className="font-bold text-slate-800">{quota.byFeature.gem_analyze || 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <span className="text-slate-600">✨ Phrase Packs</span>
                  <span className="font-bold text-slate-800">{quota.byFeature.phrase_pack || 0}</span>
                </div>
              </div>
            </div>

            {/* Live API Key Health Tester */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">API Key Connection Test</div>
                  <div className="text-[11px] text-slate-500">Ping provider to verify credentials & latency</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestKey}
                  disabled={testingKey}
                  className="h-8 gap-1.5 text-xs bg-white shadow-xs"
                >
                  <RefreshCw className={`h-3 w-3 ${testingKey ? 'animate-spin' : ''}`} />
                  {testingKey ? 'Testing...' : 'Test API Key'}
                </Button>
              </div>

              {testResult && (
                <div
                  className={`mt-2.5 rounded-lg border p-2.5 text-xs ${
                    testResult.valid
                      ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900'
                      : 'border-rose-200 bg-rose-50/80 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    {testResult.valid ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    )}
                    <span>{testResult.valid ? 'API Key Active & Operational' : 'Connection Test Failed'}</span>
                    {testResult.latencyMs !== undefined && (
                      <span className="ml-auto font-mono text-[11px] font-normal opacity-75">
                        ⚡ {testResult.latencyMs}ms
                      </span>
                    )}
                  </div>
                  {testResult.message && <p className="mt-1 text-[11px] opacity-90">{testResult.message}</p>}
                </div>
              )}
            </div>

            {/* Footer Navigation & Links */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Google AI Studio Quota Console
                <ExternalLink className="h-3 w-3" />
              </a>

              <Link
                href="/settings"
                onClick={() => setOpenModal(false)}
                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-200"
              >
                <SettingsIcon className="h-3.5 w-3.5" />
                Settings & Controls
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
