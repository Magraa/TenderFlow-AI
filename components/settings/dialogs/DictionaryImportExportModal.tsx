'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UploadCloud, DownloadCloud, AlertCircle } from 'lucide-react';

export type DictionaryType = 'purpose' | 'itemHindi' | 'vendorHindi';

interface DictionaryImportExportModalProps {
  importOpen: boolean;
  exportOpen: boolean;
  onImportOpenChange: (open: boolean) => void;
  onExportOpenChange: (open: boolean) => void;
  selectedDictionary: DictionaryType | null;
  itemsCount: number;
  onImport: (file: File) => Promise<void>;
  onExport: () => Promise<void>;
  importing: boolean;
  exporting: boolean;
  importError: string;
}

export function DictionaryImportExportModal({
  importOpen,
  exportOpen,
  onImportOpenChange,
  onExportOpenChange,
  selectedDictionary,
  itemsCount,
  onImport,
  onExport,
  importing,
  exporting,
  importError,
}: DictionaryImportExportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const getDictTitle = (type: DictionaryType | null) => {
    switch (type) {
      case 'purpose': return 'Purpose Library';
      case 'itemHindi': return 'Item Hindi Mappings';
      case 'vendorHindi': return 'Vendor Hindi Mappings';
      default: return 'Dictionary';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleExecuteImport = async () => {
    if (selectedFile) {
      await onImport(selectedFile);
      setSelectedFile(null);
    }
  };

  return (
    <>
      {/* ─── Import Dialog ─── */}
      <Dialog open={importOpen} onOpenChange={onImportOpenChange}>
        <DialogContent className="max-w-md w-full rounded-2xl p-0 border border-slate-200 bg-white shadow-2xl overflow-hidden animate-slide-up-mobile sm:animate-none">
          <DialogHeader className="bg-slate-50/70 border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-800">
                  Import {getDictTitle(selectedDictionary)}
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload a JSON file with formatted dictionary records.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jsonFileInput" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Choose JSON File
              </Label>
              <Input
                id="jsonFileInput"
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                disabled={importing}
                className="text-xs h-10 border-slate-200 rounded-xl file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {importError && (
              <Alert variant="destructive" className="rounded-xl text-xs py-2.5">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-xs font-bold">Import Failed</AlertTitle>
                <AlertDescription className="text-xs">{importError}</AlertDescription>
              </Alert>
            )}

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">File format requirement:</p>
              <p>Standard JSON array format matching exported dictionary schema.</p>
            </div>
          </div>

          <DialogFooter className="bg-slate-50/70 border-t border-slate-100 px-6 py-3.5 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl h-9 text-xs"
              onClick={() => onImportOpenChange(false)}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="rounded-xl h-9 text-xs bg-blue-600 hover:bg-blue-700 font-semibold"
              onClick={handleExecuteImport}
              loading={importing}
              disabled={importing || !selectedFile}
            >
              Start Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Export Dialog ─── */}
      <Dialog open={exportOpen} onOpenChange={onExportOpenChange}>
        <DialogContent className="max-w-md w-full rounded-2xl p-0 border border-slate-200 bg-white shadow-2xl overflow-hidden animate-slide-up-mobile sm:animate-none">
          <DialogHeader className="bg-slate-50/70 border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <DownloadCloud className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-800">
                  Export {getDictTitle(selectedDictionary)}
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Download all active records as a JSON backup.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-medium">Target Dataset:</span>
                <span className="font-bold text-slate-900">{getDictTitle(selectedDictionary)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-medium">Total Records:</span>
                <span className="font-mono font-bold text-blue-600">{itemsCount} entries</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-medium">Output Format:</span>
                <span className="font-mono text-slate-600">.json (UTF-8)</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Exported files can be restored anytime or migrated to another instance.
            </p>
          </div>

          <DialogFooter className="bg-slate-50/70 border-t border-slate-100 px-6 py-3.5 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl h-9 text-xs"
              onClick={() => onExportOpenChange(false)}
              disabled={exporting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="rounded-xl h-9 text-xs bg-blue-600 hover:bg-blue-700 font-semibold"
              onClick={onExport}
              loading={exporting}
              disabled={exporting || itemsCount === 0}
            >
              Download JSON
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
