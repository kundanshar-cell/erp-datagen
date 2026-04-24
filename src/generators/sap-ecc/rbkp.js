const { faker } = require('@faker-js/faker');
const { seasonalDate, invoicePostingDate } = require('../../utils/dates');

// SAP ECC RBKP — Invoice Document Header (Logistics Invoice Verification)
// One RBKP per vendor invoice posted in MIRO/MIR7
//
// Document types:
//   RE = Standard invoice (PO-backed)
//   KR = Vendor credit memo (returns, overbilling, service not rendered)
//   RD = Invoice with deviation (price/qty mismatch requiring approval)
//
// IS_CREDIT_MEMO  : true for BLART='KR' — negative WRBTR, references original invoice
// IS_NON_PO_INVOICE: true for invoices with no PO backing (rent, utilities, subscriptions)

const DOCUMENT_TYPES_PO    = ['RE', 'RD'];   // PO-backed: invoice, invoice with deviation
const DOCUMENT_TYPES_NONPO = ['RE', 'KR'];   // Non-PO: invoice or credit memo
const DEFAULT_COMPANY_CODES = ['1000', '2000', '3000', 'GB01', 'US01', 'IN01'];
const CURRENCIES = ['GBP', 'USD', 'EUR', 'INR', 'SGD', 'JPY'];
const PAYMENT_TERMS = ['NT30', 'NT60', 'NT90', '0001', '0002', 'Z030'];
const INVOICE_STATUSES = ['', 'A', 'B', 'Z'];  // Open, Parked, Posted, Reversed

function sapDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function padBelnr(num) {
  return String(num).padStart(10, '0');
}

function generateRBKPRow(index, options = {}) {
  const missingRate  = options.missingRate || 0;
  const vendorPool   = options.vendorPool  || [];
  const isNonPO      = options.forceNonPO  || false;
  const companyCodes = (options.companyCodePool && options.companyCodePool.length > 0)
    ? options.companyCodePool
    : DEFAULT_COMPANY_CODES;

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  const invoiceDate  = seasonalDate();
  const postingDate  = invoicePostingDate(invoiceDate);

  // Non-PO invoices are typically smaller (no framework contract — ad-hoc spends)
  const amountMax    = isNonPO ? 50000 : 500000;
  const baseAmount   = faker.number.float({ min: 100, max: amountMax, fractionDigits: 2 });
  const taxRate      = faker.helpers.arrayElement([0, 0.05, 0.10, 0.20]);
  const taxAmount    = parseFloat((baseAmount * taxRate).toFixed(2));
  const grossAmount  = parseFloat((baseAmount + taxAmount).toFixed(2));

  const lifnr = vendorPool.length > 0
    ? faker.helpers.arrayElement(vendorPool)
    : String(faker.number.int({ min: 1000000, max: 1099999 })).padStart(10, '0');

  // Document type: PO invoices can be RE/RD; non-PO can be RE/KR (credit memo)
  const blart   = faker.helpers.arrayElement(isNonPO ? DOCUMENT_TYPES_NONPO : DOCUMENT_TYPES_PO);
  const isCreditMemo = blart === 'KR';

  // 5% chance of reversal on standard invoices
  const reversed = !isCreditMemo && Math.random() < 0.05;

  return {
    BELNR: padBelnr(5100000000 + index),
    GJAHR: String(invoiceDate.getFullYear()),
    BUKRS: faker.helpers.arrayElement(companyCodes),
    BLART: blart,
    LIFNR: lifnr,
    BLDAT: sapDate(invoiceDate),
    BUDAT: sapDate(postingDate),
    WAERS: faker.helpers.arrayElement(CURRENCIES),
    WRBTR: isCreditMemo ? -grossAmount : grossAmount,  // Credit memos have negative gross amount
    WMWST: taxAmount,
    WSKTO: maybeBlank(parseFloat((grossAmount * 0.02).toFixed(2))),
    ZTERM: maybeBlank(faker.helpers.arrayElement(PAYMENT_TERMS)),
    XBLNR: maybeBlank(faker.string.alphanumeric(16).toUpperCase()),
    STBLG: reversed
      ? padBelnr(5100000000 + faker.number.int({ min: 0, max: index }))
      : '',
    BSTAT: reversed ? 'A' : faker.helpers.arrayElement(INVOICE_STATUSES),
    IS_CREDIT_MEMO:    isCreditMemo,   // Yukti training label — vendor credit
    IS_NON_PO_INVOICE: isNonPO,        // Yukti training label — no PO backing
  };
}

function generateRBKP(rows, options = {}) {
  return Array.from({ length: rows }, (_, i) => generateRBKPRow(i, options));
}

module.exports = { generateRBKP };
