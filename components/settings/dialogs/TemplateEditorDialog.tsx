'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CustomDropdown } from '@/components/ui/customDropdown';
import { FileCode2, Eye, Code, Check } from 'lucide-react';
import { TEMPLATE_FONTS_GOOGLE_IMPORT_URL, getFontStyleAdjustments } from '@/lib/templateFonts';
import { toHindiUnit } from '@/lib/unitUtils';
import { getSampleBillTemplate } from '@/templates/default/billTemplate';

interface TemplateEditorDialogProps {
  open: boolean;
  mode: 'add' | 'edit';
  formData: {
    name: string;
    docType: 'quotation_main' | 'quotation_alt_1' | 'quotation_alt_2' | 'firm_bill';
    language: 'hindi' | 'english';
    content: string;
    fontFamily: string;
    textColor: string;
  };
  formErrors: Record<string, string>;
  onOpenChange: (open: boolean) => void;
  onFormDataChange: (data: any) => void;
  onSave: () => void;
}

export function TemplateEditorDialog({
  open,
  mode,
  formData,
  formErrors,
  onOpenChange,
  onFormDataChange,
  onSave,
}: TemplateEditorDialogProps) {
  const [activeMobileTab, setActiveMobileTab] = useState<'editor' | 'preview'>('editor');
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Helper to extract text color from root tag's inline styles in HTML
  const getTextColorFromHTML = (html: string): string | null => {
    if (!html) return null;
    const firstTagMatch = html.match(/^<([a-z1-6]+)\s*([^>]*)/i);
    if (!firstTagMatch) return null;
    const tagAttributes = firstTagMatch[2];
    const styleMatch = tagAttributes.match(/style=["']([^"']*)["']/i);
    if (!styleMatch) return null;
    const styleContent = styleMatch[1];
    const colorMatch = styleContent.match(/color\s*:\s*([^;]+)/i);
    return colorMatch ? colorMatch[1].trim() : null;
  };

  // Helper to update text color in root tag's inline styles in HTML
  const updateHTMLColor = (html: string, newColor: string): string => {
    if (!html) return html;
    const firstTagMatch = html.match(/^<([a-z1-6]+)\s*([^>]*)/i);
    if (!firstTagMatch) return html;
    const tagName = firstTagMatch[1];
    let tagAttributes = firstTagMatch[2];
    const styleMatch = tagAttributes.match(/style=["']([^"']*)["']/i);

    if (styleMatch) {
      let styleContent = styleMatch[1];
      const colorMatch = styleContent.match(/color\s*:\s*([^;]+)/i);
      if (colorMatch) {
        styleContent = styleContent.replace(/color\s*:\s*([^;]+)/i, `color: ${newColor}`);
      } else {
        styleContent = styleContent.trim();
        if (styleContent && !styleContent.endsWith(';')) {
          styleContent += ';';
        }
        styleContent += ` color: ${newColor};`;
      }
      tagAttributes = tagAttributes.replace(/style=["']([^"']*)["']/i, `style="${styleContent}"`);
    } else {
      tagAttributes = `${tagAttributes} style="color: ${newColor};"`.trim();
    }
    const remainingHTML = html.slice(firstTagMatch[0].length + 1);
    return `<${tagName} ${tagAttributes}>${remainingHTML}`;
  };

  function getSampleQuotationTemplate(lang?: 'hindi' | 'english'): string {
    const isHindi = (lang || formData.language) === 'hindi';
    if (isHindi) {
      return `<div class="quotation-body" style="font-family: 'Kruti Dev 010', 'Mangal', 'Noto Sans Devanagari', sans-serif; font-size: 16px; line-height: 1.8; color: #1e293b; padding: 20px 40px;">
  <div style="text-align: center; margin-bottom: 30px; font-weight: bold; line-height: 1.5;">
    <p style="font-size: 18px; margin: 0;">प्रति,</p>
    <p style="font-size: 18px; margin: 0; margin-left: 20px;">श्रीमान मुख्य नगर पालिका अधिकारी</p>
    <p style="font-size: 18px; margin: 0; margin-left: 20px;">नगर परिषद {{placeName}}</p>
    <p style="font-size: 18px; margin: 0; margin-left: 20px;">जिला {{districtName}} (म.प्र.)</p>
  </div>

  <div style="margin: 20px 0; font-weight: bold; font-size: 17px;">
    विषय:- {{subject}} बावत ।
  </div>

  <div style="margin: 15px 0;">
    महोदय,
    <p style="text-indent: 40px; margin-top: 5px;">
      उपरोक्त विषयांतर्गत निवेदन है कि आपकी संस्था द्वारा आवश्यक सामग्री प्रदाय करने हेतु आमंत्रित निविदा सूचना/कोटेशन आमंत्रण सूचना क्रमांक {{tenderNumber}} के तारतम्य में हमारी फर्म द्वारा सामग्री की न्यूनतम दरें निम्नानुसार प्रस्तुत हैं:-
    </p>
  </div>

  <div style="margin: 25px 0 20px 20px; border-left: 2px solid #e2e8f0; padding-left: 15px;">
    {{items}}
  </div>

  <div style="margin: 20px 0; font-weight: bold;">
    शर्तें:-
    <ol style="margin: 5px 0 0 20px; font-weight: normal; list-style-type: decimal;">
      <li>जी.एस.टी. अलग से देय होगा।</li>
      <li>सामग्री की आपूर्ति आदेशानुसार समयावधि में कर दी जावेगी।</li>
    </ol>
  </div>

  <div style="margin-top: 40px; float: right; text-align: center; min-width: 220px;">
    <p style="margin-bottom: 30px;">भवदीय,</p>
    <p style="font-weight: bold; margin: 0;">कृते: {{firmName}}</p>
    <p style="font-size: 14px; color: #64748b; margin: 0;">(अधिकृत हस्ताक्षरकर्ता)</p>
  </div>
  <div style="clear: both;"></div>
</div>`;
    } else {
      return `<div class="quotation-body" style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.7; color: #000; padding: 30px 50px;">

  <div style="margin-bottom: 20px;">
    <p style="margin: 0; font-size: 15px;">To,</p>
  </div>

  <div style="text-align: center; margin-bottom: 30px; line-height: 1.8;">
    <p style="margin: 0; font-size: 15px;">Chief Municipal Officer</p>
    <p style="margin: 0; font-size: 15px;">City Council {{placeName}}</p>
    <p style="margin: 0; font-size: 15px;">Distt. {{districtName}} (M.P.)</p>
  </div>

  <div style="margin: 24px 0 20px 0; font-size: 15px; text-decoration: underline;">
    <strong>Subject :</strong>&nbsp; {{subject}}
  </div>

  <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 15px;">
    <thead>
      <tr>
        <th style="border: 1px solid #000; padding: 6px 10px; text-align: center; width: 60px; font-weight: bold;">S.No.</th>
        <th style="border: 1px solid #000; padding: 6px 10px; text-align: left; font-weight: bold;">Item Name</th>
        <th style="border: 1px solid #000; padding: 6px 10px; text-align: center; width: 100px; font-weight: bold;">Qty.</th>
        <th style="border: 1px solid #000; padding: 6px 10px; text-align: left; width: 130px; font-weight: bold;">Rate</th>
      </tr>
    </thead>
    <tbody>
      {{itemRows}}
    </tbody>
  </table>

  <div style="text-align: right; margin: 10px 0 30px 0; font-size: 15px;">
    Note: GST Extra
  </div>

  <div style="margin-top: 40px; float: right; text-align: center; min-width: 220px;">
    <p style="margin-bottom: 30px; font-size: 15px;">Sincerely yours,</p>
    <p style="font-weight: bold; margin: 0; font-size: 15px;">For: {{firmName}}</p>
    <p style="font-size: 13px; color: #64748b; margin: 0;">(Authorized Signatory)</p>
  </div>
  <div style="clear: both;"></div>
</div>`;
    }
  }

  const getCompiledPreviewHTML = () => {
    const rawContent = formData.content || '';
    const isHindi = formData.language === 'hindi';

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
              description: 'साइज़ 990x533x355 mm, एंगल 32x32x3 mm, एक्सल रौड 20 mm, 2 नग पहिये...',
              rate: 10300,
              unit: 'नग',
            },
            {
              productName: 'डस्टबिन (घरेलू उपयोग हेतु)',
              description: 'क्षमता: 12 लीटर, सामग्री: HDPE प्लास्टिक, रंग: हरा एवं नीला',
              rate: 165,
              unit: 'नग',
            },
          ]
        : [
            {
              productName: 'Hand Garbage Cart M.S',
              description: 'Size 990x533x355 mm, angle 32x32x3 mm, axle rod 20 mm, 2 wheels...',
              rate: 10300,
              unit: 'Nos',
            },
            {
              productName: 'Dustbin (Domestic Distribution)',
              description: 'Capacity: 12 Liters, material: HDPE plastic, color: green and blue',
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
          ? `<div style="font-size: 14px; color: #475569; margin-top: 4px; line-height: 1.4;">
               <strong style="color: #0f172a;">${specLabel}</strong> ${item.description}
             </div>`
          : '';

        return `
        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="font-size: 15px; font-weight: bold; color: #0f172a;">
              ${idx + 1}. ${item.productName}
            </div>
            <div style="text-align: right; min-width: 200px; font-weight: bold; font-size: 15px; color: #0f172a;">
              ${rateText}
            </div>
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
        const descHTML = item.description
          ? `<div style="margin-top: 3px; font-weight: normal; font-size: 13px;">Specification: - ${item.description}</div>`
          : '';
        return `
        <tr>
          <td style="border: 1px solid #000; padding: 4px 8px; text-align: center; vertical-align: top; font-weight: bold;">${idx + 1}.</td>
          <td style="border: 1px solid #000; padding: 4px 8px; vertical-align: top;">
            <div style="font-weight: bold;">${item.productName}</div>
            ${descHTML}
          </td>
          <td style="border: 1px solid #000; padding: 4px 8px; text-align: center; vertical-align: middle;">${quantity} ${unit}</td>
          <td style="border: 1px solid #000; padding: 4px 8px; text-align: left; vertical-align: middle;">Rs. ${item.rate.toLocaleString('en-IN')}</td>
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
      .replace(/\{\{itemRows\}\}/g, itemRowsHTML)
      .replace(/\{\{invoiceNumber\}\}/g, '922')
      .replace(/\{\{invoiceDate\}\}/g, '18/07/2026')
      .replace(/\{\{recipientDesignation\}\}/g, isHindi ? 'मुख्य नगर पालिका अधिकारी' : 'Chief Municipal Officer')
      .replace(/\{\{recipientDepartment\}\}/g, isHindi ? 'नगर परिषद बैराड़' : 'City Council Bairad')
      .replace(/\{\{recipientDistrict\}\}/g, isHindi ? 'जिला शिवपुरी' : 'Distt. Shivpuri')
      .replace(/\{\{bankName\}\}/g, 'State Bank of India')
      .replace(/\{\{bankBranch\}\}/g, 'Transport Nagar, Gwalior')
      .replace(/\{\{ifscCode\}\}/g, 'SBIN0016593')
      .replace(/\{\{accountNumber\}\}/g, '63049227111')
      .replace(/\{\{panNumber\}\}/g, 'CJWPA8633G')
      .replace(/\{\{subtotal\}\}/g, '53,100.0')
      .replace(/\{\{sgstPercent\}\}/g, '9.0')
      .replace(/\{\{sgstAmount\}\}/g, '4,779.0')
      .replace(/\{\{cgstPercent\}\}/g, '9.0')
      .replace(/\{\{cgstAmount\}\}/g, '4,779.0')
      .replace(/\{\{igstPercent\}\}/g, '0.0')
      .replace(/\{\{igstAmount\}\}/g, '')
      .replace(/\{\{grandTotal\}\}/g, '62,658.0')
      .replace(/\{\{amountInWords\}\}/g, 'Sixty Two Thousand Six Hundred Fifty Eight only')
      .replace(/\{\{signatureHTML\}\}/g, '<span style="font-size:12px; color:#64748b;">[Signature]</span>');

    const activeFont = formData.fontFamily || 'Noto Sans Devanagari';

    return `
      <div class="custom-template-preview-wrapper" style="width: 100%;">
        <style>
          @import url('${TEMPLATE_FONTS_GOOGLE_IMPORT_URL}');
          .custom-template-preview-wrapper,
          .custom-template-preview-wrapper *,
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

  const handleCopyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1280px] w-full max-h-[96vh] sm:max-h-[92vh] rounded-t-2xl sm:rounded-2xl p-0 border border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden animate-slide-up-mobile sm:animate-none">
        {/* Mobile drag handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2 sm:hidden shrink-0" />

        <DialogHeader className="bg-slate-50/80 border-b border-slate-100 px-6 py-4 shrink-0 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <FileCode2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-800">
                {mode === 'add' ? 'Create HTML Document Layout' : 'Edit HTML Document Layout'}
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Design quotation and bill skeletons with real-time responsive rendering.
              </p>
            </div>
          </div>

          {/* Mobile Tab Switcher */}
          <div className="flex lg:hidden items-center bg-slate-200/80 rounded-xl p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveMobileTab('editor')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                activeMobileTab === 'editor' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Code className="h-3.5 w-3.5" />
              <span>Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMobileTab('preview')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                activeMobileTab === 'preview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Preview</span>
            </button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 bg-white flex-1 overflow-hidden">
          {/* Left Side: Code & Options Form */}
          <div
            className={`p-6 space-y-4 overflow-y-auto border-r border-slate-100 max-h-[75vh] ${
              activeMobileTab === 'editor' ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="space-y-1.5">
              <Label htmlFor="tplName" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Template Layout Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tplName"
                className="h-9 text-xs font-medium border-slate-200 rounded-xl focus-visible:ring-blue-500"
                value={formData.name}
                onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
                placeholder="e.g., Nagar Parishad Standard Quotation Layout"
              />
              {formErrors.name && <p className="text-xs text-red-500 font-medium">{formErrors.name}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Document Type
                </Label>
                <CustomDropdown
                  value={formData.docType}
                  onChange={(newDocType) => {
                    const isTargetBill = newDocType === 'firm_bill';
                    const isPrevBill = formData.docType === 'firm_bill';
                    let newContent = formData.content;
                    let newColor = formData.textColor;
                    if (isTargetBill && !isPrevBill) {
                      newContent = getSampleBillTemplate();
                      newColor = '#000000';
                    } else if (!isTargetBill && isPrevBill) {
                      newContent = getSampleQuotationTemplate(formData.language);
                      newColor = formData.language === 'hindi' ? '#1e293b' : '#000000';
                    }
                    onFormDataChange({
                      ...formData,
                      docType: newDocType as any,
                      content: newContent,
                      textColor: newColor,
                    });
                  }}
                  options={[
                    { value: 'quotation_main', label: 'Quotation - Main' },
                    { value: 'quotation_alt_1', label: 'Quotation - Alt A' },
                    { value: 'quotation_alt_2', label: 'Quotation - Alt B' },
                    { value: 'firm_bill', label: 'Bill / Invoice' },
                  ]}
                  buttonClassName="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Language
                </Label>
                <CustomDropdown
                  value={formData.language}
                  onChange={(newLang) => {
                    const prevLang = formData.language;
                    const isBill = formData.docType === 'firm_bill';
                    const prevDefault = isBill ? getSampleBillTemplate() : getSampleQuotationTemplate(prevLang);
                    const shouldAutoSwitch =
                      !formData.content?.trim() || formData.content.trim() === prevDefault.trim();

                    const targetFont = newLang === 'hindi' ? 'Noto Sans Devanagari' : 'Inter';
                    const targetColor = newLang === 'hindi' ? '#1e293b' : '#000000';

                    let newContent = formData.content;
                    if (shouldAutoSwitch) {
                      newContent = isBill ? getSampleBillTemplate() : getSampleQuotationTemplate(newLang as any);
                    }

                    onFormDataChange({
                      ...formData,
                      language: newLang as any,
                      fontFamily: shouldAutoSwitch ? targetFont : formData.fontFamily,
                      textColor: shouldAutoSwitch ? targetColor : formData.textColor,
                      content: newContent,
                    });
                  }}
                  options={[
                    { value: 'hindi', label: 'Hindi' },
                    { value: 'english', label: 'English' },
                  ]}
                  buttonClassName="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Typography Font
                </Label>
                <CustomDropdown
                  value={formData.fontFamily || (formData.language === 'hindi' ? 'Noto Sans Devanagari' : 'Inter')}
                  onChange={(newFont) => onFormDataChange({ ...formData, fontFamily: newFont })}
                  options={[
                    { value: 'Noto Sans Devanagari', label: 'Noto Sans Devanagari' },
                    { value: 'Rozha One', label: 'Rozha One' },
                    { value: 'Yatra One', label: 'Yatra One' },
                    { value: 'Tiro Devanagari Hindi', label: 'Tiro Devanagari' },
                    { value: 'Kalam', label: 'Kalam' },
                    { value: 'Inter', label: 'Inter' },
                    { value: 'Roboto', label: 'Roboto' },
                    { value: 'Open Sans', label: 'Open Sans' },
                  ]}
                  buttonClassName="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Theme Color
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer p-0 bg-transparent shrink-0"
                    value={formData.textColor || '#1e293b'}
                    onChange={(e) => {
                      const newColor = e.target.value;
                      const updatedContent = updateHTMLColor(formData.content, newColor);
                      onFormDataChange({
                        ...formData,
                        textColor: newColor,
                        content: updatedContent,
                      });
                    }}
                  />
                  <Input
                    type="text"
                    className="h-9 text-xs font-mono uppercase rounded-xl border-slate-200"
                    value={formData.textColor || '#1e293b'}
                    onChange={(e) => {
                      const newColor = e.target.value;
                      const updatedContent = updateHTMLColor(formData.content, newColor);
                      onFormDataChange({
                        ...formData,
                        textColor: newColor,
                        content: updatedContent,
                      });
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Variable Tags Palette */}
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Template Variables (Click to copy tag)
                </p>
                {copiedTag && (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="h-3 w-3" /> Copied {copiedTag}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {(formData.docType === 'firm_bill'
                  ? [
                      { tag: '{{invoiceNumber}}', desc: 'Inv #' },
                      { tag: '{{invoiceDate}}', desc: 'Date' },
                      { tag: '{{recipientDesignation}}', desc: 'Designation' },
                      { tag: '{{recipientDepartment}}', desc: 'Dept' },
                      { tag: '{{recipientDistrict}}', desc: 'Distt' },
                      { tag: '{{firmName}}', desc: 'Firm' },
                      { tag: '{{bankName}}', desc: 'Bank' },
                      { tag: '{{bankBranch}}', desc: 'Branch' },
                      { tag: '{{ifscCode}}', desc: 'IFSC' },
                      { tag: '{{accountNumber}}', desc: 'A/C' },
                      { tag: '{{panNumber}}', desc: 'PAN' },
                      { tag: '{{itemRows}}', desc: 'Rows' },
                      { tag: '{{subtotal}}', desc: 'Subtotal' },
                      { tag: '{{grandTotal}}', desc: 'Total' },
                      { tag: '{{amountInWords}}', desc: 'Words' },
                    ]
                  : [
                      { tag: '{{tenderNumber}}', desc: 'Tender #' },
                      { tag: '{{placeName}}', desc: 'Place' },
                      { tag: '{{districtName}}', desc: 'District' },
                      { tag: '{{subject}}', desc: 'Subject' },
                      { tag: '{{firmName}}', desc: 'Firm' },
                      { tag: '{{items}}', desc: 'Items List' },
                      { tag: '{{itemRows}}', desc: 'Items Table' },
                    ]
                ).map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => handleCopyTag(item.tag)}
                    className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-lg px-2 py-0.5 text-[11px] font-mono shadow-2xs transition-colors"
                  >
                    <span className="font-bold text-blue-600">{item.tag}</span>
                    <span className="text-[9px] text-slate-400">({item.desc})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* HTML Code Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="tplContent" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  HTML Body Skeleton <span className="text-red-500">*</span>
                </Label>
                <span className="text-[10px] font-mono text-slate-400">HTML5 / Inline CSS</span>
              </div>
              <Textarea
                id="tplContent"
                className="font-mono text-xs border-slate-800 rounded-2xl bg-slate-900 text-slate-100 shadow-md min-h-[260px] p-3.5 focus-visible:ring-blue-500 leading-relaxed"
                value={formData.content}
                onChange={(e) => {
                  const newContent = e.target.value;
                  const extractedColor = getTextColorFromHTML(newContent);
                  onFormDataChange({
                    ...formData,
                    content: newContent,
                    textColor: extractedColor || formData.textColor,
                  });
                }}
                placeholder="<div class='quotation-body'>...</div>"
              />
              {formErrors.content && <p className="text-xs text-red-500 font-medium">{formErrors.content}</p>}
            </div>
          </div>

          {/* Right Side: Rendered Live Preview Panel */}
          <div
            className={`p-6 bg-slate-100/60 flex flex-col max-h-[75vh] overflow-hidden ${
              activeMobileTab === 'preview' ? 'block' : 'hidden lg:flex'
            }`}
          >
            <div className="flex items-center justify-between pb-2 shrink-0">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-blue-600" />
                Live Document Render
              </p>
              <span className="text-[10px] text-slate-400 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                Scale: 100%
              </span>
            </div>

            <div className="flex-1 rounded-2xl border border-slate-200 bg-white overflow-y-auto shadow-inner p-6">
              <div
                className="w-full h-full min-h-[500px]"
                dangerouslySetInnerHTML={{ __html: getCompiledPreviewHTML() }}
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
            {mode === 'add' ? 'Save New Layout' : 'Update Layout'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
