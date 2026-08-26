'use client';

import Link from 'next/link';
import { Firm } from '@/types';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Plus, 
  ExternalLink, 
  Trash2, 
  FileSignature, 
  Check, 
  Landmark
} from 'lucide-react';

interface FirmLetterheadsSectionProps {
  firms: Firm[];
  onDeleteFirm: (id: string) => void;
}

export function FirmLetterheadsSection({
  firms,
  onDeleteFirm,
}: FirmLetterheadsSectionProps) {
  const getStyleProfileLabel = (profile?: string) => {
    switch (profile) {
      case 'govt_formal': return 'Govt Formal';
      case 'minimal_business': return 'Minimal';
      case 'bilingual': return 'Bilingual';
      case 'table_heavy': return 'Table Heavy';
      default: return 'Standard';
    }
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-blue-600" />
            Firm Letterheads & Visual Layouts
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Manage letterhead layout margins, digital stamps, signatures, and billing credentials.
          </p>
        </div>

        <Link href="/manage-firms">
          <Button
            size="sm"
            className="h-8 sm:h-9 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs flex items-center gap-1.5 w-full sm:w-auto justify-center"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Open Letterhead Studio</span>
          </Button>
        </Link>
      </div>

      {/* Firms Grid */}
      {firms.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-white space-y-3">
          <Building2 className="h-9 w-9 text-slate-300 mx-auto" />
          <div>
            <p className="text-xs font-bold text-slate-700">No firm letterheads configured</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Add your first company or firm profile to generate custom branded quotations and invoices.
            </p>
          </div>
          <Link href="/manage-firms">
            <Button
              size="sm"
              className="h-8 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
            >
              + Create First Firm
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-3.5 sm:gap-4 sm:grid-cols-2">
          {firms.map((firm) => (
            <div
              key={firm.id}
              className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
            >
              {/* Top Header Row */}
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {firm.name}
                      </h3>
                      {firm.vendorHindiName && (
                        <span className="text-[11px] font-semibold text-blue-700">
                          ({firm.vendorHindiName})
                        </span>
                      )}
                    </div>
                    {firm.firmCity && (
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {firm.firmCity} {firm.firmAddress ? `• ${firm.firmAddress}` : ''}
                      </p>
                    )}
                  </div>

                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider shrink-0">
                    {getStyleProfileLabel(firm.firmStyleProfile)}
                  </span>
                </div>

                {/* Spacing & Safe Zone Metrics Row */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100/80 text-slate-600 font-medium">
                    <span className="text-slate-400 mr-1">Header:</span>
                    <strong className="text-slate-800 font-mono">{firm.headerSpacing}px</strong>
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100/80 text-slate-600 font-medium">
                    <span className="text-slate-400 mr-1">Footer:</span>
                    <strong className="text-slate-800 font-mono">{firm.footerSpacing}px</strong>
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100/80 text-slate-600 font-medium">
                    <span className="text-slate-400 mr-1">Margin:</span>
                    <strong className="text-slate-800 font-mono">{firm.pageMargin}px</strong>
                  </span>
                </div>

                {/* Assets & Credentials Row */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
                  {firm.signatureImagePath ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/70 font-semibold">
                      <Check className="h-3 w-3" /> Signature
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-400">
                      No Signature
                    </span>
                  )}

                  {firm.stampImagePath ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/70 font-semibold">
                      <Check className="h-3 w-3" /> Stamp
                    </span>
                  ) : null}

                  {firm.gstNumber && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200/80 font-mono font-medium">
                      GST: {firm.gstNumber}
                    </span>
                  )}

                  {firm.bankName && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200/80 truncate max-w-[180px]">
                      <Landmark className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                      <span className="truncate">{firm.bankName}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Actions Row */}
              <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium"
                  onClick={() => onDeleteFirm(firm.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  <span>Delete</span>
                </Button>

                <Link href="/manage-firms">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs font-semibold rounded-lg border-slate-200 hover:bg-slate-50 flex items-center gap-1 text-blue-600 px-3"
                  >
                    <span>Edit in Studio</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
