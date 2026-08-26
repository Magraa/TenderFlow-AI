'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Languages, Sparkles, Layers } from 'lucide-react';

interface ItemMappingDialogProps {
  open: boolean;
  mode: 'add' | 'edit';
  formData: any;
  formErrors: Record<string, string>;
  generatingHindi: boolean;
  onOpenChange: (open: boolean) => void;
  onFormDataChange: (data: any) => void;
  onGenerateAllFromRaw: () => void;
  onGenerateEnglishFromHindi: () => void;
  onSave: () => void;
}

export function ItemMappingDialog({
  open,
  mode,
  formData,
  formErrors,
  generatingHindi,
  onOpenChange,
  onFormDataChange,
  onGenerateAllFromRaw,
  onGenerateEnglishFromHindi,
  onSave,
}: ItemMappingDialogProps) {
  const hasDescription = Boolean(
    formData.rawDescription?.trim() ||
    formData.englishDescription?.trim() ||
    formData.hindiDescription?.trim()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[94vh] sm:max-h-[88vh] rounded-t-2xl sm:rounded-2xl p-0 border border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden animate-slide-up-mobile sm:animate-none">
        {/* Mobile drag handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2 sm:hidden shrink-0" />

        <DialogHeader className="bg-slate-50/80 border-b border-slate-100 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <Languages className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-800">
                {mode === 'add' ? 'Add Item Transliteration Pack' : 'Edit Item Transliteration Pack'}
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure primary English/Hindi item names and variations for quotation rotation.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5 bg-white overflow-y-auto max-h-[70vh]">
          {/* Top Section: Raw Original User Input + AI Generation */}
          <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/70 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                Raw Original Input (Instant AI Generator)
              </h4>
              <span className="text-[10px] text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full font-bold">
                Auto-Transliterate & Alternates
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1 space-y-1.5">
                <Label htmlFor="rawName" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Raw Item Name
                </Label>
                <Input
                  id="rawName"
                  className="h-9 text-xs font-medium border-amber-200 bg-white rounded-xl focus-visible:ring-amber-500"
                  value={formData.rawName || ''}
                  onChange={(e) => onFormDataChange({ ...formData, rawName: e.target.value })}
                  placeholder="e.g., Safety goggles 30 nos HDPE..."
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="rawDescription" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Raw Description <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Textarea
                  id="rawDescription"
                  className="rounded-xl border-amber-200 bg-white min-h-[36px] h-9 py-2 text-xs focus-visible:ring-amber-500"
                  value={formData.rawDescription || ''}
                  onChange={(e) => onFormDataChange({ ...formData, rawDescription: e.target.value })}
                  placeholder="Raw description or technical specs..."
                />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-9 border-amber-300 bg-amber-100/60 hover:bg-amber-100 text-amber-900 font-bold rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2 text-xs"
              loading={generatingHindi}
              disabled={generatingHindi}
              onClick={onGenerateAllFromRaw}
            >
              {!generatingHindi && <Sparkles className="h-4 w-4 text-amber-600" />}
              Generate Full Item Pack with AI (English, Hindi & Alternates)
            </Button>
          </div>

          {/* Primary English & Hindi Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Column 1: Primary English */}
            <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-200/60">
                Primary English
              </h4>
              <div className="space-y-1.5">
                <Label htmlFor="englishName" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  English Item Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="englishName"
                  className="h-9 text-xs font-medium border-slate-200 bg-white rounded-xl focus-visible:ring-blue-500"
                  value={formData.englishName || ''}
                  onChange={(e) => onFormDataChange({ ...formData, englishName: e.target.value })}
                  placeholder="e.g. Fire Hose"
                />
                {formErrors.englishName && <p className="text-xs text-red-500 font-medium">{formErrors.englishName}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="englishDescription" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  English Description <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Textarea
                  id="englishDescription"
                  className="rounded-xl border-slate-200 bg-white min-h-[70px] text-xs focus-visible:ring-blue-500"
                  value={formData.englishDescription || ''}
                  onChange={(e) => onFormDataChange({ ...formData, englishDescription: e.target.value })}
                  placeholder="e.g. Fire fighting synthetic rubber hose..."
                />
              </div>
            </div>

            {/* Column 2: Primary Hindi */}
            <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-200/60">
                Primary Hindi (हिंदी)
              </h4>
              <div className="space-y-1.5">
                <Label htmlFor="hindiName" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Hindi Transliteration <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="hindiName"
                  className="h-9 text-xs font-medium border-slate-200 bg-white rounded-xl focus-visible:ring-blue-500"
                  value={formData.hindiName || ''}
                  onChange={(e) => onFormDataChange({ ...formData, hindiName: e.target.value })}
                  placeholder="e.g. अग्निशमन होस"
                />
                {formErrors.hindiName && <p className="text-xs text-red-500 font-medium">{formErrors.hindiName}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hindiDescription" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Hindi Description <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Textarea
                  id="hindiDescription"
                  className="rounded-xl border-slate-200 bg-white min-h-[70px] text-xs focus-visible:ring-blue-500"
                  value={formData.hindiDescription || ''}
                  onChange={(e) => onFormDataChange({ ...formData, hindiDescription: e.target.value })}
                  placeholder="e.g. सिंथेटिक रबर से बना अग्निशमन नली..."
                />
              </div>

              {(formData.hindiName?.trim() || formData.hindiDescription?.trim()) && !formData.englishName?.trim() && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-8 text-xs font-semibold border-emerald-300 text-emerald-800 bg-emerald-50 rounded-xl"
                  loading={generatingHindi}
                  disabled={generatingHindi}
                  onClick={onGenerateEnglishFromHindi}
                >
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600 mr-1.5" />
                  Generate English from Hindi
                </Button>
              )}
            </div>
          </div>

          {/* Alternative Variations for Bidding Rotation */}
          <div className="p-4 bg-blue-50/30 rounded-2xl border border-blue-100 space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-blue-100">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-blue-600" />
                Alternative Variations (For Quotation Bidding Rotation)
              </h4>
              {hasDescription && (
                <span className="text-[10px] text-blue-700 bg-blue-100/90 px-2 py-0.5 rounded-full font-medium">
                  Description-aware variations enabled
                </span>
              )}
            </div>

            {/* Alt Hindi 1 & Alt Hindi 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="altHindiName" className="text-xs font-semibold text-slate-700">
                    Alt Hindi 1 <span className="text-slate-400 font-normal">(Medium)</span>
                  </Label>
                  <Input
                    id="altHindiName"
                    className="h-8 text-xs border-slate-200 rounded-lg"
                    value={formData.altHindiName || ''}
                    onChange={(e) => onFormDataChange({ ...formData, altHindiName: e.target.value })}
                    placeholder="e.g. प्लास्टिक डस्टबिन"
                  />
                </div>
                {hasDescription && (
                  <div className="space-y-1 pt-1">
                    <Label htmlFor="altHindiDescription1" className="text-[11px] font-medium text-slate-500">
                      Alt Hindi 1 Description
                    </Label>
                    <Textarea
                      id="altHindiDescription1"
                      className="rounded-lg border-slate-200 min-h-[50px] text-xs"
                      value={formData.altHindiDescription1 || ''}
                      onChange={(e) => onFormDataChange({ ...formData, altHindiDescription1: e.target.value })}
                      placeholder="e.g. उच्च गुणवत्ता प्लास्टिक..."
                    />
                  </div>
                )}
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="altHindiName2" className="text-xs font-semibold text-slate-700">
                    Alt Hindi 2 <span className="text-slate-400 font-normal">(Short)</span>
                  </Label>
                  <Input
                    id="altHindiName2"
                    className="h-8 text-xs border-slate-200 rounded-lg"
                    value={formData.altHindiName2 || ''}
                    onChange={(e) => onFormDataChange({ ...formData, altHindiName2: e.target.value })}
                    placeholder="e.g. डस्टबिन 12L"
                  />
                </div>
                {hasDescription && (
                  <div className="space-y-1 pt-1">
                    <Label htmlFor="altHindiDescription2" className="text-[11px] font-medium text-slate-500">
                      Alt Hindi 2 Description
                    </Label>
                    <Textarea
                      id="altHindiDescription2"
                      className="rounded-lg border-slate-200 min-h-[50px] text-xs"
                      value={formData.altHindiDescription2 || ''}
                      onChange={(e) => onFormDataChange({ ...formData, altHindiDescription2: e.target.value })}
                      placeholder="e.g. 12 लीटर क्षमता..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Alt English 1 & Alt English 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="altEnglishName1" className="text-xs font-semibold text-slate-700">
                    Alt English 1 <span className="text-slate-400 font-normal">(Medium)</span>
                  </Label>
                  <Input
                    id="altEnglishName1"
                    className="h-8 text-xs border-slate-200 rounded-lg"
                    value={formData.altEnglishName1 || ''}
                    onChange={(e) => onFormDataChange({ ...formData, altEnglishName1: e.target.value })}
                    placeholder="e.g. Plastic Waste Bin"
                  />
                </div>
                {hasDescription && (
                  <div className="space-y-1 pt-1">
                    <Label htmlFor="altEnglishDescription1" className="text-[11px] font-medium text-slate-500">
                      Alt English 1 Description
                    </Label>
                    <Textarea
                      id="altEnglishDescription1"
                      className="rounded-lg border-slate-200 min-h-[50px] text-xs"
                      value={formData.altEnglishDescription1 || ''}
                      onChange={(e) => onFormDataChange({ ...formData, altEnglishDescription1: e.target.value })}
                      placeholder="e.g. Heavy duty waste bin..."
                    />
                  </div>
                )}
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="altEnglishName2" className="text-xs font-semibold text-slate-700">
                    Alt English 2 <span className="text-slate-400 font-normal">(Short)</span>
                  </Label>
                  <Input
                    id="altEnglishName2"
                    className="h-8 text-xs border-slate-200 rounded-lg"
                    value={formData.altEnglishName2 || ''}
                    onChange={(e) => onFormDataChange({ ...formData, altEnglishName2: e.target.value })}
                    placeholder="e.g. 12L Garbage Bin"
                  />
                </div>
                {hasDescription && (
                  <div className="space-y-1 pt-1">
                    <Label htmlFor="altEnglishDescription2" className="text-[11px] font-medium text-slate-500">
                      Alt English 2 Description
                    </Label>
                    <Textarea
                      id="altEnglishDescription2"
                      className="rounded-lg border-slate-200 min-h-[50px] text-xs"
                      value={formData.altEnglishDescription2 || ''}
                      onChange={(e) => onFormDataChange({ ...formData, altEnglishDescription2: e.target.value })}
                      placeholder="e.g. 12 Liter capacity container..."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-slate-50/80 border-t border-slate-100 px-6 py-3.5 flex gap-2">
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
            {mode === 'add' ? 'Create Transliteration Pack' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
