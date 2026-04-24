const { faker } = require('@faker-js/faker');
const { toJulian } = require('./f4301');
const { seasonalDate, invoicePostingDate } = require('../../utils/dates');

// JDE E1 F0411 — Accounts Payable Ledger (Vendor Invoices)
//
// PO-backed vouchers:  DCT='PV', PDOC = PO document number (F4301.DOCO)
// Credit memos:        DCT='PX', PDOC = original PO, AG is negative
// Non-PO vouchers:     DCT='PV', PDOC=0 — direct AP postings (rent, utilities, services)
//
// IS_CREDIT_MEMO:     true for DCT='PX'
// IS_NON_PO_INVOICE:  true for PDOC=0 vouchers

const DOC_TYPES_PO    = ['PV', 'PX'];    // PO-backed: voucher or credit memo
const DOC_TYPES_NONPO = ['PV'];          // Non-PO: always a regular voucher
const COMPANY_KEYS = ['00001', '00002', '10000', '20000'];
const CURRENCIES = ['GBP', 'USD', 'EUR', 'INR', 'SGD', 'JPY'];
const PAYMENT_TERMS = ['N30', 'N60', 'N90', 'NET', '2/10'];
const PAY_INSTRUMENTS = ['C', 'W', 'D', 'E'];   // Check, Wire, Direct debit, Electronic
const PAY_STATUSES = ['', 'A', 'P', 'D', '#'];  // Open, Approved, Paid, Draft, Dispute

function applyInvoiceVariance(baseAmount) {
  const r = Math.random();
  if (r < 0.90) {
    return parseFloat((baseAmount * (1 + (Math.random() * 0.01 - 0.005))).toFixed(2));
  } else if (r < 0.97) {
    return parseFloat((baseAmount * (1 + (Math.random() * 0.04 - 0.02))).toFixed(2));
  } else {
    return parseFloat((baseAmount * (1 + (Math.random() * 0.30 - 0.15))).toFixed(2));
  }
}

function generateF0411Row(index, options = {}) {
  const missingRate   = options.missingRate   || 0;
  const vendorPool    = options.vendorPool    || [];
  const poPool        = options.poPool        || [];
  const poTotalAmountMap = options.poTotalAmountMap || {};
  const isNonPO       = options.forceNonPO    || false;

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  const invoiceDate = seasonalDate();
  const glDate = invoicePostingDate(invoiceDate);

  const vend = vendorPool.length > 0
    ? faker.helpers.arrayElement(vendorPool)
    : 1000 + faker.number.int({ min: 0, max: 999 });

  // Non-PO: PDOC=0 (no PO reference). PO-backed: link to a real DOCO.
  const pdoc = isNonPO
    ? 0
    : (poPool.length > 0 ? faker.helpers.arrayElement(poPool).DOCO : 100000 + faker.number.int({ min: 0, max: 9999 }));

  const crcd = faker.helpers.arrayElement(CURRENCIES);

  // Amount derivation: PO-backed uses PO total; non-PO uses standalone amount
  const poTotal = !isNonPO && pdoc ? poTotalAmountMap[pdoc] : null;
  const baseAmount = poTotal
    ? applyInvoiceVariance(poTotal)
    : faker.number.float({ min: 100, max: isNonPO ? 50000 : 500000, fractionDigits: 2 });
  const taxRate    = faker.helpers.arrayElement([0, 0.05, 0.10, 0.20]);
  const taxAmount  = parseFloat((baseAmount * taxRate).toFixed(2));
  const grossAmount = parseFloat((baseAmount + taxAmount).toFixed(2));

  // Document type: non-PO only uses 'PV'; PO-backed can be PV or PX (credit memo)
  const docType    = faker.helpers.arrayElement(isNonPO ? DOC_TYPES_NONPO : DOC_TYPES_PO);
  const isCreditMemo = docType === 'PX';
  const isDispute  = Math.random() < 0.05;
  const isReversed = Math.random() < 0.04;

  return {
    DOC:  300000 + index,
    DCT:  docType,
    KCO:  faker.helpers.arrayElement(COMPANY_KEYS),
    VEND: vend,
    ISTR: toJulian(invoiceDate),
    DGJ:  toJulian(glDate),
    AG:   isCreditMemo ? -grossAmount : grossAmount,   // Negative for credit memos
    XTAM: taxAmount,
    CRCD: crcd,
    VINV: maybeBlank(faker.string.alphanumeric(16).toUpperCase()),
    PDOC: pdoc,                                        // 0 for non-PO invoices
    PDCT: isNonPO ? '' : 'OP',                        // Blank for non-PO
    PYIN: faker.helpers.arrayElement(PAY_INSTRUMENTS),
    PYST: isDispute ? '#' : faker.helpers.arrayElement(PAY_STATUSES),
    DKCO: maybeBlank(faker.string.numeric(5)),
    STAM: maybeBlank(parseFloat((grossAmount * 0.02).toFixed(2))),
    RMSG: isDispute
      ? faker.helpers.arrayElement(['PRICE QUERY', 'DUPLICATE', 'GOODS NOT RECEIVED', 'QTY DISPUTE'])
      : '',
    RNME: isReversed ? String(300000 + faker.number.int({ min: 0, max: index })) : '',
    IS_CREDIT_MEMO:    isCreditMemo,   // Yukti training label
    IS_NON_PO_INVOICE: isNonPO,        // Yukti training label
  };
}

function generateF0411(rows, options = {}) {
  return Array.from({ length: rows }, (_, i) => generateF0411Row(i, options));
}

module.exports = { generateF0411 };
