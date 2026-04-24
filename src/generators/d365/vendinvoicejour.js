const { faker } = require('@faker-js/faker');
const { seasonalDate, invoicePostingDate } = require('../../utils/dates');

// D365 F&O VendInvoiceJour — Vendor Invoice Header
// Linked to PurchTable via PurchId (blank for non-PO invoices)
//
// Invoice types:
//   PO-backed standard invoice:  PurchId set, IsCreditNote=false
//   PO-backed credit note:       PurchId set, IsCreditNote=true, InvoiceAmount negative
//   Non-PO invoice:              PurchId='',  IsCreditNote=false
//   Non-PO credit note:          PurchId='',  IsCreditNote=true, InvoiceAmount negative
//
// IS_NON_PO_INVOICE: true when PurchId is blank — Yukti training label

const LEGAL_ENTITIES = ['USMF', 'GBSI', 'FRRT', 'DEMF', 'INMF', 'SGMF'];
const CURRENCIES = ['GBP', 'USD', 'EUR', 'INR', 'SGD', 'JPY'];
const PAYMENT_TERMS = ['Net30', 'Net60', 'Net90', '2%10Net30', 'Immediate'];
const INVOICE_STATUSES = ['None', 'Approved', 'Paid', 'Cancelled', 'OnHold'];

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function padVoucher(prefix, index) {
  return `${prefix}-${String(index + 1).padStart(6, '0')}`;
}

function generateVendInvoiceJourRow(index, options = {}) {
  const missingRate = options.missingRate || 0;
  const poPool      = options.poPool      || [];
  const vendorPool  = options.vendorPool  || [];
  const isNonPO     = options.forceNonPO  || false;

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  let purchId, dataAreaId, vendAccount, currencyCode;
  if (!isNonPO && poPool.length > 0) {
    const po     = faker.helpers.arrayElement(poPool);
    purchId      = po.PurchId;
    dataAreaId   = po.DataAreaId;
    vendAccount  = po.OrderAccount;
    currencyCode = po.CurrencyCode;
  } else {
    purchId      = '';                                               // Non-PO: no purchase order
    dataAreaId   = faker.helpers.arrayElement(LEGAL_ENTITIES);
    vendAccount  = vendorPool.length > 0
      ? faker.helpers.arrayElement(vendorPool)
      : `V-${String(faker.number.int({ min: 1, max: 999 })).padStart(6, '0')}`;
    currencyCode = faker.helpers.arrayElement(CURRENCIES);
  }

  const invoiceDate = seasonalDate();
  const dueDate     = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + faker.number.int({ min: 30, max: 90 }));

  const amountMax    = isNonPO ? 50000 : 500000;
  const invoiceAmount = faker.number.float({ min: 100, max: amountMax, fractionDigits: 2 });
  const taxRate       = faker.helpers.arrayElement([0, 0.05, 0.10, 0.20]);
  const taxAmount     = parseFloat((invoiceAmount * taxRate).toFixed(2));

  const isDispute    = Math.random() < 0.05;
  // Credit notes: ~6% of PO invoices, ~8% of non-PO invoices
  const isCreditNote = Math.random() < (isNonPO ? 0.08 : 0.06);

  return {
    LedgerVoucher:       padVoucher(isNonPO ? 'NPINV' : 'APINV', index),
    PurchId:             purchId,                                    // Blank for non-PO
    DataAreaId:          dataAreaId,
    InvoiceAccount:      vendAccount,
    InvoiceId:           faker.string.alphanumeric(12).toUpperCase(),
    InvoiceDate:         isoDate(invoiceDate),
    DueDate:             isoDate(dueDate),
    InvoiceAmount:       isCreditNote ? -invoiceAmount : invoiceAmount,
    TaxAmount:           taxAmount,
    InvoiceCurrencyCode: currencyCode,
    PaymTermId:          maybeBlank(faker.helpers.arrayElement(PAYMENT_TERMS)),
    InvoiceStatus:       isDispute ? 'OnHold' : faker.helpers.arrayElement(INVOICE_STATUSES),
    IsCreditNote:        isCreditNote,
    DisputeReason:       isDispute
      ? faker.helpers.arrayElement(['Price mismatch', 'Goods not received', 'Duplicate invoice', 'Quantity dispute'])
      : '',
    PostingDate:         isoDate(invoicePostingDate(invoiceDate)),
    IS_NON_PO_INVOICE:   isNonPO,       // Yukti training label
  };
}

function generateVendInvoiceJour(rows, options = {}) {
  return Array.from({ length: rows }, (_, i) => generateVendInvoiceJourRow(i, options));
}

module.exports = { generateVendInvoiceJour };
