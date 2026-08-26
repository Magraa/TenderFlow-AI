'use client';

import React from 'react';
import { 
  Building2, 
  Lock, 
  Sparkles, 
  BookOpen, 
  Package, 
  FileCode2, 
  History, 
  ChevronRight,
  FileSignature
} from 'lucide-react';

export type SettingsTabId = 
  | 'general'
  | 'firms'
  | 'security'
  | 'ai'
  | 'dictionaries'
  | 'phrases'
  | 'templates'
  | 'versioning';

interface NavItem {
  id: SettingsTabId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'general',
    label: 'General & Organization',
    description: 'Profile, contact info & tender defaults',
    icon: Building2,
  },
  {
    id: 'firms',
    label: 'Firm Letterheads',
    description: 'Letterhead layouts, signatures & stamps',
    icon: FileSignature,
  },
  {
    id: 'security',
    label: 'Security & Access',
    description: 'Private website password',
    icon: Lock,
  },
  {
    id: 'ai',
    label: 'AI & Intelligence',
    description: 'Gemini quotas, models & auto-fill',
    icon: Sparkles,
  },
  {
    id: 'dictionaries',
    label: 'Master Dictionaries',
    description: 'Purpose library & item transliterations',
    icon: BookOpen,
  },
  {
    id: 'phrases',
    label: 'Phrase Packs',
    description: 'Procurement clauses & AI generation',
    icon: Package,
  },
  {
    id: 'templates',
    label: 'HTML Templates',
    description: 'Custom quotation & bill layouts',
    icon: FileCode2,
  },
  {
    id: 'versioning',
    label: 'Versioning & Storage',
    description: 'Document history & PDF downloads',
    icon: History,
  },
];

interface SettingsNavigationProps {
  activeTab: SettingsTabId;
  onTabChange: (tab: SettingsTabId) => void;
  badgeCounts?: {
    firms?: number;
    dictionaries?: number;
    phrases?: number;
    templates?: number;
  };
}

export function SettingsNavigation({
  activeTab,
  onTabChange,
  badgeCounts = {},
}: SettingsNavigationProps) {
  return (
    <nav className="w-full space-y-1">
      {/* Mobile Horizontal Pill Scroll */}
      <div className="flex lg:hidden overflow-x-auto pb-2 gap-1.5 no-scrollbar scroll-smooth">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100/80 border border-slate-200/80'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop Sidebar Navigation */}
      <div className="hidden lg:flex flex-col gap-1 bg-white/80 backdrop-blur-sm p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="px-3 py-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Configuration
          </p>
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const count = 
            item.id === 'firms' ? badgeCounts.firms :
            item.id === 'dictionaries' ? badgeCounts.dictionaries :
            item.id === 'phrases' ? badgeCounts.phrases :
            item.id === 'templates' ? badgeCounts.templates : undefined;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`group flex items-center justify-between w-full p-3 rounded-xl text-left transition-all ${
                isActive
                  ? 'bg-blue-50/90 text-blue-700 font-semibold border border-blue-200/60 shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-2 rounded-lg transition-colors shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30'
                      : 'bg-slate-100 text-slate-600 group-hover:bg-white group-hover:text-blue-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-semibold truncate ${isActive ? 'text-blue-900' : 'text-slate-800'}`}>
                      {item.label}
                    </p>
                    {count !== undefined && count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? 'bg-blue-200/80 text-blue-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {count}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>
              <ChevronRight
                className={`h-4 w-4 shrink-0 transition-transform ${
                  isActive ? 'text-blue-600 translate-x-0.5' : 'text-slate-300 group-hover:text-slate-400'
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
