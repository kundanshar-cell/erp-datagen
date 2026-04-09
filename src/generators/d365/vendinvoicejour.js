const { faker } = require('@faker-js/faker');

// D365 F&O VendInvoiceJour — Vendor Invoice Header
// Linked to PurchTable via PurchId

const LEGAL_ENTITIES = ['USMF', 'GBSI', 'FRRT', 'DEMF', 'INMF', 'SGMF'];
const CURRENCIES = ['GBP', 'USD', 'EUR', 'INR', 'SGD', 'JPY'];
const PAYMENT_TERMS = ['Net30', 'Net60', 'Net90', '2%10Net30', 'Immediate'];
const INVOICE_STATUSES = ['None', 'Approved', 'Paid', 'Cancelled', 'OnHold'];

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function padVoucher(index) {
  return `APINV-${String(index + 1).padStart(6, '0')}`;
}

function generateVendInvoiceJourRow(index, options = {}) {
  const missingRate = options.missingRate || 0;
  const poPool = options.poPool || [];
  const vendorPool = options.vendorPool || [];

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  let purchId, dataAreaId, vendAccount, currencyCode;
  if (poPool.length > 0) {
    const po = faker.helpers.arrayElement(poPool);
    purchId      = po.PurchId;
    dataAreaId   = po.DataAreaId;
    vendAccount  = po.OrderAccount;
    currencyCode = po.CurrencyCode;
  } else {
    purchId      = `PO-${String(faker.number.int({ min: 1, max: 9999 })).padStart(6, '0')}`;
    dataAreaId   = faker.helpers.arrayElement(LEGAL_ENTITIES);
    vendAccount  = vendorPool.length > 0
      ? faker.helpers.arrayElement(vendorPool)
      : `V-${String(faker.number.int({ min: 1, max: 999 })).padStart(6, '0')}`;
    currencyCode = faker.helpers.arrayElement(CURRENCIES);
  }

  const invoiceDate = faker.date.between({ from: '2022-01-01', to: '2025-12-31' });
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + faker.number.int({ min: 30, max: 90 }));

  const invoiceAmount = faker.number.float({ min: 100, max: 500000, fractionDigits: 2 });
  const taxRate = faker.helpers.arrayElement([0, 0.05, 0.10, 0.20]);
  const taxAmount = parseFloat((invoiceAmount * taxRate).toFixed(2));

  const isDispute = Math.random() < 0.05;
  const isCreditNote = Math.random() < 0.06;

  return {
    LedgerVoucher:       padVoucher(index),
    PurchId:             purchId,                               // Links to PurchTable
    DataAreaId:          dataAreaId,
    InvoiceAccount:      vendAccount,
    InvoiceId:           faker.string.alphanumeric(12).toUpperCase(),  // Vendor's own invoice number
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
    PostingDate:         isoDate(invoiceDate),
  };
}

function generateVendInvoiceJour(rows, options = {}) {
  return Array.from({ length: rows }, (_, i) => generateVendInvoiceJourRow(i, options));
}

module.exports = { generateVendInvoiceJour };
