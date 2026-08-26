import { AIDailyUsage, AIQuotaInfo, AIUsageFeature, AIUsageLog } from '@/types';

const STORAGE_KEY = 'tender_app_ai_daily_usage';
const LOGS_STORAGE_KEY = 'tender_app_ai_usage_logs';
const AI_USAGE_EVENT = 'tender_app_ai_usage_updated';

export const DEFAULT_AI_LIMITS: Record<string, { dailyRequests: number; rpm: number; tpm: number }> = {
  // Google Gemini limits (Free Tier)
  'gemini-1.5-flash': { dailyRequests: 1500, rpm: 15, tpm: 1000000 },
  'gemini-2.0-flash': { dailyRequests: 1500, rpm: 15, tpm: 1000000 },
  'gemini-2.0-flash-lite': { dailyRequests: 1500, rpm: 30, tpm: 1000000 },
  'gemini-1.5-pro': { dailyRequests: 50, rpm: 2, tpm: 32000 },
  'gemini': { dailyRequests: 1500, rpm: 15, tpm: 1000000 },

  // Groq limits (Free Tier)
  'groq': { dailyRequests: 14400, rpm: 30, tpm: 6000 },
  'llama3-70b-8192': { dailyRequests: 14400, rpm: 30, tpm: 6000 },
  'llama3-8b-8192': { dailyRequests: 14400, rpm: 30, tpm: 6000 },

  // OpenAI
  'openai': { dailyRequests: 500, rpm: 3, tpm: 40000 },
  'gpt-3.5-turbo': { dailyRequests: 500, rpm: 3, tpm: 40000 },
  'gpt-4': { dailyRequests: 200, rpm: 3, tpm: 10000 },

  // NVIDIA
  'nvidia': { dailyRequests: 1000, rpm: 10, tpm: 50000 },

  // Mock
  'mock': { dailyRequests: 100000, rpm: 1000, tpm: 10000000 },
};

export function getTodayUTCDateString(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10); // YYYY-MM-DD in UTC
}

export function getTimeUntilUTCReset(): { ms: number; formatted: string } {
  const now = new Date();
  const nextReset = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  
  const diffMs = Math.max(0, nextReset.getTime() - now.getTime());
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    ms: diffMs,
    formatted: `${hours}h ${minutes}m`,
  };
}

function getEmptyDailyUsage(date: string = getTodayUTCDateString()): AIDailyUsage {
  return {
    date,
    requestsCount: 0,
    tokensCount: 0,
    byFeature: {
      draft: 0,
      transliterate: 0,
      gem_analyze: 0,
      alternates: 0,
      phrase_pack: 0,
      location: 0,
      test: 0,
      other: 0,
    },
  };
}

export const aiUsageService = {
  /**
   * Get current daily usage stats (auto-resets if new UTC day)
   */
  getDailyUsage(): AIDailyUsage {
    const today = getTodayUTCDateString();
    if (typeof window === 'undefined') {
      return getEmptyDailyUsage(today);
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return getEmptyDailyUsage(today);

      const parsed: AIDailyUsage = JSON.parse(raw);
      if (parsed.date !== today) {
        // Daily reset (new UTC day)
        const fresh = getEmptyDailyUsage(today);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        return fresh;
      }

      // Ensure all features exist
      const defaultFeatures = getEmptyDailyUsage(today).byFeature;
      return {
        ...parsed,
        byFeature: { ...defaultFeatures, ...parsed.byFeature },
      };
    } catch (e) {
      console.warn('Failed to parse AI daily usage from localStorage:', e);
      return getEmptyDailyUsage(today);
    }
  },

  /**
   * Record a completed or attempted AI request
   */
  recordUsage(params: {
    feature: AIUsageFeature;
    provider?: string;
    model?: string;
    tokensUsed?: number;
    success?: boolean;
    durationMs?: number;
    error?: string;
  }): AIDailyUsage {
    const today = getTodayUTCDateString();
    const current = this.getDailyUsage();
    const provider = params.provider || (process.env.NEXT_PUBLIC_AI_PROVIDER || 'gemini');
    const model = params.model || (process.env.NEXT_PUBLIC_AI_MODEL || 'gemini-1.5-flash');
    const tokens = params.tokensUsed || 0;
    const nowIso = new Date().toISOString();

    const updated: AIDailyUsage = {
      date: today,
      requestsCount: current.requestsCount + 1,
      tokensCount: current.tokensCount + tokens,
      byFeature: {
        ...current.byFeature,
        [params.feature]: (current.byFeature[params.feature] || 0) + 1,
      },
      lastRequestAt: nowIso,
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        // Also add to recent logs
        const logEntry: AIUsageLog = {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: nowIso,
          feature: params.feature,
          provider,
          model,
          tokensUsed: tokens > 0 ? tokens : undefined,
          success: params.success !== false,
          durationMs: params.durationMs,
          error: params.error,
        };

        const existingLogsRaw = localStorage.getItem(LOGS_STORAGE_KEY);
        const existingLogs: AIUsageLog[] = existingLogsRaw ? JSON.parse(existingLogsRaw) : [];
        const newLogs = [logEntry, ...existingLogs].slice(0, 50); // keep last 50
        localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(newLogs));

        // Dispatch reactive event
        window.dispatchEvent(new CustomEvent(AI_USAGE_EVENT, { detail: updated }));
      } catch (e) {
        console.warn('Failed to save AI usage in localStorage:', e);
      }
    }

    return updated;
  },

  /**
   * Calculate rolling RPM (requests in last 60 seconds)
   */
  getRecentRPM(): number {
    if (typeof window === 'undefined') return 0;
    try {
      const raw = localStorage.getItem(LOGS_STORAGE_KEY);
      if (!raw) return 0;
      const logs: AIUsageLog[] = JSON.parse(raw);
      const oneMinuteAgo = Date.now() - 60 * 1000;
      return logs.filter((log) => new Date(log.timestamp).getTime() > oneMinuteAgo).length;
    } catch {
      return 0;
    }
  },

  /**
   * Get comprehensive Quota Info
   */
  getQuotaInfo(customLimit?: number, warningThresholdPercent: number = 20): AIQuotaInfo {
    const provider = (process.env.NEXT_PUBLIC_AI_PROVIDER || 'gemini').toLowerCase();
    const model = process.env.NEXT_PUBLIC_AI_MODEL || (provider === 'gemini' ? 'gemini-1.5-flash' : 'default');
    
    // Resolve daily limit
    const matchedLimit = DEFAULT_AI_LIMITS[model] || DEFAULT_AI_LIMITS[provider] || { dailyRequests: 1500, rpm: 15, tpm: 1000000 };
    const dailyLimit = customLimit && customLimit > 0 ? customLimit : matchedLimit.dailyRequests;
    
    const usage = this.getDailyUsage();
    const requestsUsedToday = usage.requestsCount;
    const requestsRemaining = Math.max(0, dailyLimit - requestsUsedToday);
    const percentRemaining = dailyLimit > 0 ? Math.max(0, Math.round(((dailyLimit - requestsUsedToday) / dailyLimit) * 1000) / 10) : 0;
    
    const { ms: timeUntilResetMs, formatted: resetTimeFormatted } = getTimeUntilUTCReset();
    const recentRpm = this.getRecentRPM();

    let status: AIQuotaInfo['status'] = 'healthy';
    if (!process.env.NEXT_PUBLIC_AI_API_KEY && provider !== 'mock') {
      status = 'unconfigured';
    } else if (requestsRemaining === 0) {
      status = 'exhausted';
    } else if (percentRemaining <= warningThresholdPercent || recentRpm >= matchedLimit.rpm) {
      status = 'warning';
    }

    return {
      provider,
      model,
      dailyLimit,
      requestsUsedToday,
      requestsRemaining,
      percentRemaining,
      tokensUsedToday: usage.tokensCount,
      requestsPerMinuteLimit: matchedLimit.rpm,
      tokensPerMinuteLimit: matchedLimit.tpm,
      recentRpm,
      timeUntilResetMs,
      resetTimeFormatted,
      status,
      byFeature: usage.byFeature,
      lastRequestAt: usage.lastRequestAt,
    };
  },

  /**
   * Get recent logs
   */
  getRecentLogs(): AIUsageLog[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(LOGS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Reset today's usage counter (for user manual calibration)
   */
  resetDailyUsage(): AIDailyUsage {
    const today = getTodayUTCDateString();
    const fresh = getEmptyDailyUsage(today);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      window.dispatchEvent(new CustomEvent(AI_USAGE_EVENT, { detail: fresh }));
    }
    return fresh;
  },

  /**
   * Clear recent logs
   */
  clearLogs(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOGS_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent(AI_USAGE_EVENT));
    }
  },

  /**
   * Subscribe to usage updates
   */
  onUsageChange(callback: () => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const handler = () => callback();
    window.addEventListener(AI_USAGE_EVENT, handler);
    window.addEventListener('storage', handler);

    return () => {
      window.removeEventListener(AI_USAGE_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  },
};
