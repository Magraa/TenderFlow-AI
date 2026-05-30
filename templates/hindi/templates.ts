import { TenderDocType } from '@/types';
import { TemplateContext } from '@/templates/default/templates';

export const hindiTemplates: Partial<Record<TenderDocType, (ctx: TemplateContext) => string>> = {
  vigyapti: (ctx) => `
    <div class="doc-body">
      <h2>निविदा सूचना</h2>
      <p><strong>निविदा शीर्षक:</strong> ${ctx.tenderTitle}</p>
      <p><strong>निविदा संख्या:</strong> ${ctx.tenderNumber}</p>
      <p><strong>तारीख:</strong> ${ctx.dateLabel}</p>
      <p><strong>विभाग:</strong> ${ctx.departmentName}</p>
      ${ctx.itemsTableHTML}
      <p><strong>अनुमानित राशि:</strong> ${ctx.totalAmountLabel}</p>
    </div>
  `,
  firm_bill: (ctx) => `
    <div class="doc-body">
      <h2>मुख्य फर्म बिल</h2>
      <p><strong>संदर्भ निविदा:</strong> ${ctx.tenderNumber}</p>
      <p><strong>तारीख:</strong> ${ctx.dateLabel}</p>
      ${ctx.itemsTableHTML}
      <p><strong>देय कुल राशि:</strong> ${ctx.totalAmountLabel}</p>
      <div class="signature-area">
        <p>अधिकृत हस्ताक्षर</p>
      </div>
    </div>
  `,
};
