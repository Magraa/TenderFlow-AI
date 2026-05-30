import { TenderDocType } from '@/types';

export interface TemplateContext {
  tenderTitle: string;
  tenderNumber: string;
  departmentName: string;
  dateLabel: string;
  itemsTableHTML: string;
  totalAmountLabel: string;
}

export const defaultTemplates: Record<TenderDocType, (ctx: TemplateContext) => string> = {
  vigyapti: (ctx) => `
    <div class="doc-body">
      <h2>Tender Notice</h2>
      <p><strong>Tender:</strong> ${ctx.tenderTitle}</p>
      <p><strong>Tender No:</strong> ${ctx.tenderNumber}</p>
      <p><strong>Date:</strong> ${ctx.dateLabel}</p>
      <p><strong>Department:</strong> ${ctx.departmentName}</p>
      ${ctx.itemsTableHTML}
      <p><strong>Total:</strong> ${ctx.totalAmountLabel}</p>
    </div>
  `,
  quotation_main: (ctx) => `
    <div class="doc-body">
      <h2>Quotation</h2>
      <p><strong>Reference Tender:</strong> ${ctx.tenderNumber}</p>
      <p><strong>Date:</strong> ${ctx.dateLabel}</p>
      ${ctx.itemsTableHTML}
      <p><strong>Total Amount:</strong> ${ctx.totalAmountLabel}</p>
    </div>
  `,
  quotation_alt_1: (ctx) => `
    <div class="doc-body">
      <h2>Alternate Quotation A</h2>
      <p><strong>Reference:</strong> ${ctx.tenderNumber}</p>
      <p><strong>Date:</strong> ${ctx.dateLabel}</p>
      ${ctx.itemsTableHTML}
      <p><strong>Total:</strong> ${ctx.totalAmountLabel}</p>
    </div>
  `,
  quotation_alt_2: (ctx) => `
    <div class="doc-body">
      <h2>Alternate Quotation B</h2>
      <p><strong>Reference:</strong> ${ctx.tenderNumber}</p>
      <p><strong>Date:</strong> ${ctx.dateLabel}</p>
      ${ctx.itemsTableHTML}
      <p><strong>Total:</strong> ${ctx.totalAmountLabel}</p>
    </div>
  `,
  supply_aadesh: (ctx) => `
    <div class="doc-body">
      <h2>Supply Order</h2>
      <p><strong>Tender No:</strong> ${ctx.tenderNumber}</p>
      <p><strong>Date:</strong> ${ctx.dateLabel}</p>
      <p><strong>Department:</strong> ${ctx.departmentName}</p>
      ${ctx.itemsTableHTML}
      <p><strong>Order Value:</strong> ${ctx.totalAmountLabel}</p>
    </div>
  `,
  firm_bill: (ctx) => `
    <div class="doc-body">
      <h2>Tax Invoice / Bill</h2>
      <p><strong>Against Tender:</strong> ${ctx.tenderNumber}</p>
      <p><strong>Date:</strong> ${ctx.dateLabel}</p>
      ${ctx.itemsTableHTML}
      <p><strong>Bill Total:</strong> ${ctx.totalAmountLabel}</p>
      <div class="signature-area">
        <p>Authorized Signatory</p>
      </div>
    </div>
  `,
};
