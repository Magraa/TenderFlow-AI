'use client';

import { CustomTemplate } from '@/types';
import { Button } from '@/components/ui/button';
import { FileCode2, Plus, Edit3, Trash2 } from 'lucide-react';
import { TEMPLATE_FONTS_GOOGLE_IMPORT_URL, getFontStyleAdjustments } from '@/lib/templateFonts';
import { toHindiUnit } from '@/lib/unitUtils';

interface TemplatesSectionProps {
  customTemplates: CustomTemplate[];
  loading: boolean;
  onOpenAdd: () => void;
  onOpenEdit: (template: CustomTemplate) => void;
  onDelete: (id: string) => void;
}

export function TemplatesSection({
  customTemplates,
  loading,
  onOpenAdd,
  onOpenEdit,
  onDelete,
}: TemplatesSectionProps) {
  const getTemplatePreviewHTML = (template: CustomTemplate) => {
    const rawContent = template.content || '';
    const isHindi = template.language === 'hindi';

    const mockContext = {
      tenderNumber: 'TEND-2026-9876',
      placeName: isHindi ? 'दतिया' : 'Datia',
      districtName: isHindi ? 'दतिया' : 'Datia',
      subject: isHindi
        ? 'सफाई सामग्री (डस्टबिन) प्रदाय करने हेतु न्यूनतम दरें प्रस्तुत करने बावत।'
        : 'Submission of lowest rates for supply of materials.',
      firmName: isHindi ? 'माग्रा इंडस्ट्रियल सप्लायर्स' : 'Magra Industrial Suppliers',
      items: isHindi
        ? [
            {
              productName: 'हाथ कचरा गाड़ी M.S',
              description: 'साइज़ 990x533x355 mm, एंगल 32x32x3 mm...',
              rate: 10300,
              unit: 'नग',
            },
            {
              productName: 'डस्टबिन (घरेलू उपयोग)',
              description: 'क्षमता: 12 लीटर, सामग्री: HDPE प्लास्टिक...',
              rate: 165,
              unit: 'नग',
            },
          ]
        : [
            {
              productName: 'Hand Garbage Cart M.S',
              description: 'Size 990x533x355 mm, angle 32x32x3 mm...',
              rate: 10300,
              unit: 'Nos',
            },
            {
              productName: 'Dustbin (Domestic Distribution)',
              description: 'Capacity: 12 Liters, material: HDPE plastic...',
              rate: 165,
              unit: 'Nos',
            },
          ],
    };

    const itemsListHTML = mockContext.items
      .map((item, idx) => {
        const rateText = isHindi
          ? `Rs. ${item.rate.toLocaleString('en-IN')} प्रति ${toHindiUnit(item.unit)}`
          : `Rs. ${item.rate.toLocaleString('en-IN')} per ${item.unit || 'Nos'}`;

        const specLabel = isHindi ? 'स्पेसिफिकेशन:-' : 'Specification:';
        const specHTML = item.description
          ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;">
               <strong>${specLabel}</strong> ${item.description}
             </div>`
          : '';

        return `
        <div style="margin-bottom: 12px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <div style="font-weight: bold; color: #0f172a;">${idx + 1}. ${item.productName}</div>
            <div style="font-weight: bold; color: #0f172a;">${rateText}</div>
          </div>
          ${specHTML}
        </div>
      `;
      })
      .join('');

    const itemRowsHTML = mockContext.items
      .map((item, idx) => {
        const quantity = 1;
        const unit = item.unit || 'piece';
        return `
        <tr>
          <td style="border: 1px solid #000; padding: 2px 4px; text-align: center;">${idx + 1}.</td>
          <td style="border: 1px solid #000; padding: 2px 4px;">${item.productName}</td>
          <td style="border: 1px solid #000; padding: 2px 4px; text-align: center;">${quantity} ${unit}</td>
          <td style="border: 1px solid #000; padding: 2px 4px;">Rs. ${item.rate.toLocaleString('en-IN')}</td>
        </tr>
      `;
      })
      .join('');

    const compiled = rawContent
      .replace(/\{\{tenderNumber\}\}/g, mockContext.tenderNumber)
      .replace(/\{\{placeName\}\}/g, mockContext.placeName)
      .replace(/\{\{districtName\}\}/g, mockContext.districtName)
      .replace(/\{\{subject\}\}/g, mockContext.subject)
      .replace(/\{\{firmName\}\}/g, mockContext.firmName)
      .replace(/\{\{items\}\}/g, itemsListHTML)
      .replace(/\{\{itemRows\}\}/g, itemRowsHTML);

    const activeFont = template.fontFamily || 'Noto Sans Devanagari';

    return `
      <div class="custom-template-card-preview-wrapper" style="width: 100%;">
        <style>
          @import url('${TEMPLATE_FONTS_GOOGLE_IMPORT_URL}');
          .custom-template-card-preview-wrapper,
          .custom-template-card-preview-wrapper *,
          .quotation-body,
          .quotation-body * {
            font-family: '${activeFont}', sans-serif !important;
            ${getFontStyleAdjustments(activeFont)}
          }
        </style>
        ${compiled}
      </div>
    `;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileCode2 className="h-5 w-5 text-blue-600" />
            HTML Document Layout Studio
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Custom HTML/CSS layout templates for generating official quotation sheets and billing invoices.
          </p>
        </div>

        <Button
          size="sm"
          className="h-9 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
          onClick={onOpenAdd}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Custom Template
        </Button>
      </div>

      {/* Template Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs font-medium">
          Loading layout templates...
        </div>
      ) : customTemplates.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-white space-y-3">
          <FileCode2 className="h-10 w-10 text-slate-300 mx-auto" />
          <div>
            <p className="text-xs font-bold text-slate-700">No custom templates yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Create your first layout template to customize quotations and bills.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs rounded-xl font-semibold border-slate-200"
            onClick={onOpenAdd}
          >
            + Create Template
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {customTemplates.map((template) => (
            <div
              key={template.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{template.name}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 shrink-0 justify-end">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase font-mono">
                      {template.docType === 'quotation_main'
                        ? 'Main'
                        : template.docType === 'quotation_alt_1'
                        ? 'Alt A'
                        : template.docType === 'quotation_alt_2'
                        ? 'Alt B'
                        : 'Bill'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                      {template.language}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-100">
                      {template.fontFamily || 'Noto Sans'}
                    </span>
                  </div>
                </div>

                {/* Rendered Live Mini Preview */}
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 h-[220px] overflow-y-auto shadow-inner text-xs">
                  <div dangerouslySetInnerHTML={{ __html: getTemplatePreviewHTML(template) }} />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs rounded-xl border-slate-200"
                  onClick={() => onOpenEdit(template)}
                >
                  <Edit3 className="h-3 w-3 sm:mr-1" />
                  <span>Edit</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 text-xs rounded-xl"
                  onClick={() => onDelete(template.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
