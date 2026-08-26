'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Package, Sparkles } from 'lucide-react';

interface PhrasePackDialogProps {
  open: boolean;
  mode: 'add' | 'edit';
  formData: any;
  onOpenChange: (open: boolean) => void;
  onFormDataChange: (data: any) => void;
  onSave: () => void;
}

export function PhrasePackDialog({
  open,
  mode,
  formData,
  onOpenChange,
  onFormDataChange,
  onSave,
}: PhrasePackDialogProps) {
  const [generating, setGenerating] = useState(false);

  const handleGenerateAI = async () => {
    if (!formData.categoryName?.trim()) {
      alert('Please enter a Category Name first.');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-phrase-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: formData.categoryName,
          description: formData.englishDescription,
        }),
      });

      if (!response.ok) throw new Error('Generation failed');
      const data = await response.json();

      onFormDataChange({
        ...formData,
        keywords: [
          ...new Set([
            ...(formData.keywords ? formData.keywords.split(',').map((k: string) => k.trim()) : []),
            ...(data.keywords || []),
          ]),
        ].join(', '),
        supplyOrderSubject: data.phrases?.supplyOrder?.subject || formData.supplyOrderSubject,
        quotationMainEnglish: data.phrases?.quotationMain?.english || formData.quotationMainEnglish,
        quotationMainHindi: data.phrases?.quotationMain?.hindi || formData.quotationMainHindi,
        quotationPurchaseLine: data.phrases?.quotation?.purchaseLine || formData.quotationPurchaseLine,
        quotationAltHindi: data.phrases?.quotationAltHindi?.subject || formData.quotationAltHindi,
        quotationAltEnglish: data.phrases?.quotationAltEnglish?.subject || formData.quotationAltEnglish,
        billItemDescription: data.phrases?.bill?.itemDescription || formData.billItemDescription,
      });
    } catch {
      alert('Failed to generate phrase pack with AI. Please fill in fields manually.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full max-h-[92vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl p-0 border border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden animate-slide-up-mobile sm:animate-none">
        {/* Mobile drag handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2 sm:hidden shrink-0" />

        <DialogHeader className="bg-slate-50/80 border-b border-slate-100 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-800">
                {mode === 'add' ? 'Add Phrase Pack' : 'Edit Phrase Pack'}
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Standardize legal & procurement clauses for quotation, bidding, and bills.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5 bg-white overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phraseCategory" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Category Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phraseCategory"
                className="h-9 text-xs font-medium border-slate-200 rounded-xl focus-visible:ring-blue-500"
                value={formData.categoryName || ''}
                onChange={(e) => onFormDataChange({ ...formData, categoryName: e.target.value })}
                placeholder="e.g. Dustbin, Street Light"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phraseKeywords" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Keywords <span className="text-slate-400 font-normal">(Comma separated)</span>
              </Label>
              <Input
                id="phraseKeywords"
                className="h-9 text-xs font-medium border-slate-200 rounded-xl focus-visible:ring-blue-500"
                value={formData.keywords || ''}
                onChange={(e) => onFormDataChange({ ...formData, keywords: e.target.value })}
                placeholder="dustbin, waste bin, garbage container"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="phraseEnglishDesc" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                English Description <span className="text-slate-400 font-normal">(Improves AI generation)</span>
              </Label>
              <Textarea
                id="phraseEnglishDesc"
                className="min-h-[50px] text-xs rounded-xl border-slate-200 focus-visible:ring-blue-500"
                value={formData.englishDescription || ''}
                onChange={(e) => onFormDataChange({ ...formData, englishDescription: e.target.value })}
                placeholder="e.g. HDPE 12 liter domestic dustbin for sanitation works..."
              />
            </div>
          </div>

          {/* AI Generator button */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-9 border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-700 font-bold rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2 text-xs"
            loading={generating}
            disabled={!formData.categoryName?.trim() || generating}
            onClick={handleGenerateAI}
          >
            {!generating && <Sparkles className="h-4 w-4 text-purple-600" />}
            Generate All Document Phrases with AI
          </Button>

          <div className="border-t border-slate-100 pt-4 space-y-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Supply Order Subject
              </Label>
              <Textarea
                className="min-h-[45px] text-xs rounded-xl border-slate-200 focus-visible:ring-blue-500"
                value={formData.supplyOrderSubject || ''}
                onChange={(e) => onFormDataChange({ ...formData, supplyOrderSubject: e.target.value })}
                placeholder="e.g. स्वच्छता हेतु डस्टबिन सप्लाई करने बाबत।"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Main Quotation (English)
                </Label>
                <Textarea
                  className="min-h-[45px] text-xs rounded-xl border-slate-200 focus-visible:ring-blue-500"
                  value={formData.quotationMainEnglish || ''}
                  onChange={(e) => onFormDataChange({ ...formData, quotationMainEnglish: e.target.value })}
                  placeholder="e.g. To submit the Quotations of Dustbin."
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Main Quotation (Hindi)
                </Label>
                <Textarea
                  className="min-h-[45px] text-xs rounded-xl border-slate-200 focus-visible:ring-blue-500"
                  value={formData.quotationMainHindi || ''}
                  onChange={(e) => onFormDataChange({ ...formData, quotationMainHindi: e.target.value })}
                  placeholder="e.g. डस्टबिन के कोटेशन प्रस्तुत करने हेतु।"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Quotation Purchase Line
              </Label>
              <Textarea
                className="min-h-[45px] text-xs rounded-xl border-slate-200 focus-visible:ring-blue-500"
                value={formData.quotationPurchaseLine || ''}
                onChange={(e) => onFormDataChange({ ...formData, quotationPurchaseLine: e.target.value })}
                placeholder="e.g. स्वच्छता अभियान अंतर्गत डस्टबिन क्रय किया जाना है।"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Alt Quotation (Hindi)
                </Label>
                <Textarea
                  className="min-h-[45px] text-xs rounded-xl border-slate-200 focus-visible:ring-blue-500"
                  value={formData.quotationAltHindi || ''}
                  onChange={(e) => onFormDataChange({ ...formData, quotationAltHindi: e.target.value })}
                  placeholder="e.g. सफाई सामग्री के कोटेशन बावत।"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Alt Quotation (English)
                </Label>
                <Textarea
                  className="min-h-[45px] text-xs rounded-xl border-slate-200 focus-visible:ring-blue-500"
                  value={formData.quotationAltEnglish || ''}
                  onChange={(e) => onFormDataChange({ ...formData, quotationAltEnglish: e.target.value })}
                  placeholder="e.g. Submission of quotation for sanitation items."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Bill / Invoice Description
              </Label>
              <Textarea
                className="min-h-[45px] text-xs rounded-xl border-slate-200 focus-visible:ring-blue-500"
                value={formData.billItemDescription || ''}
                onChange={(e) => onFormDataChange({ ...formData, billItemDescription: e.target.value })}
                placeholder="e.g. स्वच्छता सामग्री डस्टबिन की आपूर्ति हेतु।"
              />
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
            {mode === 'add' ? 'Create Phrase Pack' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
