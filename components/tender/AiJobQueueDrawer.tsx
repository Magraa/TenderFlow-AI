'use client';

import { useState } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface AiAnalysisJob {
  id: string; // bidNumber or unique id
  bidNumber: string;
  title: string;
  categoryName?: string;
  pdfUrl?: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  stepMessage?: string;
  error?: string;
  enqueuedAt: number;
  completedAt?: number;
}

interface AiJobQueueDrawerProps {
  jobs: AiAnalysisJob[];
  onClearCompleted: () => void;
  onViewAnalysis?: (bidNumber: string) => void;
  onCancelJob?: (jobId: string) => void;
}

export function AiJobQueueDrawer({
  jobs,
  onClearCompleted,
  onViewAnalysis,
  onCancelJob,
}: AiJobQueueDrawerProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!jobs || jobs.length === 0) {
    return null;
  }

  const runningCount = jobs.filter((j) => j.status === 'running').length;
  const queuedCount = jobs.filter((j) => j.status === 'queued').length;
  const completedCount = jobs.filter((j) => j.status === 'completed').length;
  const failedCount = jobs.filter((j) => j.status === 'failed').length;
  const totalCount = jobs.length;
  const activeCount = runningCount + queuedCount;

  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Mini Floating Pill when minimized
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-3 sm:right-5 z-40 animate-in slide-in-from-bottom-3 duration-200 max-w-[calc(100vw-1.5rem)]">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 sm:gap-3 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full bg-slate-900/95 text-white shadow-2xl border border-indigo-500/40 backdrop-blur-md hover:bg-slate-800 transition-all hover:scale-105 group"
        >
          <div className="relative shrink-0">
            <Sparkles className={`w-4 h-4 text-indigo-400 ${runningCount > 0 ? 'animate-spin' : ''}`} />
            {runningCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold truncate">
            <span className="hidden xs:inline">AI Worker:</span>
            {activeCount > 0 ? (
              <span className="text-amber-300 font-mono text-[11px] sm:text-xs">
                {runningCount > 0 ? `${runningCount} active` : ''}
                {queuedCount > 0 ? ` (${queuedCount} q)` : ''}
              </span>
            ) : (
              <span className="text-emerald-400 text-[11px] sm:text-xs">Done ({completedCount})</span>
            )}
          </div>

          <div className="w-12 sm:w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden shrink-0">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-white shrink-0" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:right-5 sm:w-96 z-40 max-w-full bg-slate-900/95 text-white rounded-2xl shadow-2xl border border-indigo-500/30 backdrop-blur-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="px-3.5 py-3 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border-b border-indigo-800/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-400/30">
            <Sparkles className={`w-4 h-4 ${runningCount > 0 ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold tracking-tight text-white">AI Analysis Job Queue</h4>
              {runningCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Activity className="w-2.5 h-2.5 animate-pulse" /> Active
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-300">
              {activeCount > 0
                ? `Analyzing in background (${runningCount} active, ${queuedCount} queued)`
                : 'All queued analyses completed'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          {completedCount > 0 && (
            <button
              onClick={onClearCompleted}
              title="Clear Completed Jobs"
              className="p-1.5 hover:text-white hover:bg-white/10 rounded-md transition-colors text-[10px] flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsMinimized(true)}
            title="Minimize"
            className="p-1.5 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar & Status Pill */}
      <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-3 font-mono">
          <span className="text-emerald-400 font-semibold">{completedCount} done</span>
          {runningCount > 0 && <span className="text-indigo-400 font-semibold">{runningCount} analyzing</span>}
          {queuedCount > 0 && <span className="text-amber-400 font-semibold">{queuedCount} queued</span>}
          {failedCount > 0 && <span className="text-red-400 font-semibold">{failedCount} failed</span>}
        </div>

        <span className="text-[10px] text-slate-400 font-mono">{progressPercent}%</span>
      </div>

      <div className="w-full h-1 bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-blue-400 to-emerald-400 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Job Items List */}
      <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
        {jobs.map((job) => {
          const isRunning = job.status === 'running';
          const isQueued = job.status === 'queued';
          const isDone = job.status === 'completed';
          const isFailed = job.status === 'failed';

          return (
            <div
              key={job.id}
              className={`p-2.5 rounded-xl transition-all ${
                isRunning
                  ? 'bg-indigo-950/40 border border-indigo-500/30'
                  : 'bg-slate-800/40 hover:bg-slate-800/80 border border-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {isRunning && <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin shrink-0" />}
                    {isQueued && <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    {isFailed && <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}

                    <span className="font-mono font-bold text-xs text-slate-200 truncate">
                      {job.bidNumber}
                    </span>

                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        isRunning
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : isQueued
                          ? 'bg-amber-500/20 text-amber-300'
                          : isDone
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {job.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {job.title || job.categoryName || 'Tender Document'}
                  </p>

                  {job.stepMessage && (
                    <p className="text-[10px] text-indigo-300/90 font-mono mt-1 flex items-center gap-1 truncate">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                      {job.stepMessage}
                    </p>
                  )}

                  {job.error && (
                    <p className="text-[10px] text-red-400 font-mono mt-0.5 truncate">
                      ⚠️ {job.error}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-1">
                  {isDone && onViewAnalysis && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewAnalysis(job.bidNumber)}
                      className="h-6 px-2 text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    >
                      View Insights
                    </Button>
                  )}
                  {isQueued && onCancelJob && (
                    <button
                      onClick={() => onCancelJob(job.id)}
                      className="text-slate-500 hover:text-red-400 p-1 text-[10px]"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
