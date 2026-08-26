'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText } from 'lucide-react';

interface PurposeMappingDialogProps {
  open: boolean;
  mode: 'add' | 'edit';
  formData: {
    category?: string;
    professionalPurpose?: string;
    language?: 'hindi' | 'english';
  };
  formErrors: Record<string, string>;
  onOpenChange: (open: boolean) => void;
  onFormDataChange: (data: any) => void;
  onSave: () => void;
}

export function PurposeMappingDialog({
  open,
  mode,
  formData,
  formErrors,
  onOpenChange,
  onFormDataChange,
  onSave,
}: PurposeMappingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full rounded-2xl p-0 border border-slate-200 bg-white shadow-2xl overflow-hidden animate-slide-up-mobile sm:animate-none">
        <DialogHeader className="bg-slate-50/70 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-800">
                {mode === 'add' ? 'Add Purpose Mapping' : 'Edit Purpose Mapping'}
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Map procurement category code to formal tender purpose statements.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="category" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Category Identifier <span className="text-red-500">*</span>
            </Label>
            <Input
              id="category"
              className="h-10 text-xs font-medium border-slate-200 rounded-xl focus-visible:ring-blue-500"
              value={formData.category || ''}
              onChange={(e) => onFormDataChange({ ...formData, category: e.target.value })}
              placeholder="e.g. water_supply, fire_fighting, cleaning_materials"
              disabled={mode === 'edit'}
            />
            {formErrors.category && <p className="text-xs text-red-500 font-medium">{formErrors.category}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="professionalPurpose" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Formal Purpose Statement <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="professionalPurpose"
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-2xs"
              value={formData.professionalPurpose || ''}
              onChange={(e) => onFormDataChange({ ...formData, professionalPurpose: e.target.value })}
              placeholder="e.g. जल प्रदाय एवं स्वच्छता कार्य हेतु आवश्यक सामग्री"
            />
            {formErrors.professionalPurpose && (
              <p className="text-xs text-red-500 font-medium">{formErrors.professionalPurpose}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="language" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Document Language
            </Label>
            <select
              id="language"
              className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.language || 'hindi'}
              onChange={(e) => onFormDataChange({ ...formData, language: e.target.value })}
              disabled={mode === 'edit'}
            >
              <option value="hindi">Hindi (हिंदी)</option>
              <option value="english">English</option>
            </select>
          </div>
        </div>

        <DialogFooter className="bg-slate-50/70 border-t border-slate-100 px-6 py-3.5 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl h-9 text-xs"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="rounded-xl h-9 text-xs bg-blue-600 hover:bg-blue-700 font-semibold"
            onClick={onSave}
          >
            {mode === 'add' ? 'Create Mapping' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
