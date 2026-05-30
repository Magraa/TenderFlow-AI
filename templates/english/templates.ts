import { TenderDocType } from '@/types';
import { TemplateContext } from '@/templates/default/templates';

export const englishTemplates: Partial<Record<TenderDocType, (ctx: TemplateContext) => string>> = {
  vigyapti: (ctx) => `
    <div class="doc-body">
      <h2>Notice Inviting Tender</h2>
      <p><strong>Tender Title:</strong> ${ctx.tenderTitle}</p>
      <p><strong>Tender Number:</strong> ${ctx.tenderNumber}</p>
      <p><strong>Issue Date:</strong> ${ctx.dateLabel}</p>
      <p><strong>Department:</strong> ${ctx.departmentName}</p>
      ${ctx.itemsTableHTML}
      <p><strong>Estimated Value:</strong> ${ctx.totalAmountLabel}</p>
    </div>
  `,
  firm_bill: (ctx) => `
    <div class="doc-body">
      <h2>Main Firm Bill</h2>
      <p><strong>Tender Ref:</strong> ${ctx.tenderNumber}</p>
      <p><strong>Date:</strong> ${ctx.dateLabel}</p>
      ${ctx.itemsTableHTML}
      <p><strong>Payable Total:</strong> ${ctx.totalAmountLabel}</p>
      <div class="signature-area">
        <p>For Authorized Signature</p>
      </div>
    </div>
  `,
};
