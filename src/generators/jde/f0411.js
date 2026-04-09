const { faker } = require('@faker-js/faker');
const { toJulian } = require('./f4301');

// JDE E1 F0411 — Accounts Payable Ledger (Vendor Invoices)
// Document type PV = Voucher (standard AP invoice)
// Links to PO via PDOC+PDCT

const DOC_TYPES = ['PV', 'PX', 'PC'];    // Voucher, Credit memo, Manual payment
const COMPANY_KEYS = ['00001', '00002', '10000', '20000'];
const CURRENCIES = ['GBP', 'USD', 'EUR', 'INR', 'SGD', 'JPY'];
const PAYMENT_TERMS = ['N30', 'N60', 'N90', 'NET', '2/10'];
const PAY_INSTRUMENTS = ['C', 'W', 'D', 'E'];   // Check, Wire, Direct debit, Electronic
const PAY_STATUSES = ['', 'A', 'P', 'D', '#'];  // Open, Approved, Paid, Draft, Dispute

function generateF0411Row(index, options = {}) {
  const missingRate = options.missingRate || 0;
  const vendorPool = options.vendorPool || [];
  const poPool = options.poPool || [];

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  const invoiceDate = faker.date.between({ from: '2022-01-01', to: '2025-12-31' });
  const glDate = new Date(invoiceDate);
  glDate.setDate(glDate.getDate() + faker.number.int({ min: 0, max: 5 }));

  const vend = vendorPool.length > 0
    ? faker.helpers.arrayElement(vendorPool)
    : 1000 + faker.number.int({ min: 0, max: 999 });

  const pdoc = poPool.length > 0
    ? faker.helpers.arrayElement(poPool).DOCO
    : 100000 + faker.number.int({ min: 0, max: 9999 });

  const crcd = faker.helpers.arrayElement(CURRENCIES);
  const baseAmount = faker.number.float({ min: 100, max: 500000, fractionDigits: 2 });
  const taxRate = faker.helpers.arrayElement([0, 0.05, 0.10, 0.20]);
  const taxAmount = parseFloat((baseAmount * taxRate).toFixed(2));
  const grossAmount = parseFloat((baseAmount + taxAmount).toFixed(2));

  const docType = faker.helpers.arrayElement(DOC_TYPES);
  const isDispute = Math.random() < 0.05;
  const isReversed = Math.random() < 0.04;

  return {
    DOC:  300000 + index,                                         // Document number
    DCT:  docType,                                                // Document type
    KCO:  faker.helpers.arrayElement(COMPANY_KEYS),               // Company key
    VEND: vend,                                                   // Vendor address number (F0101.AN8)
    ISTR: toJulian(invoiceDate),                                  // Invoice date (Julian)
    DGJ:  toJulian(glDate),                                       // GL date (Julian)
    AG:   docType === 'PX' ? -grossAmount : grossAmount,          // Gross amount (negative for credit memo)
    XTAM: taxAmount,                                              // Tax amount
    CRCD: crcd,                                                   // Currency code
    VINV: maybeBlank(faker.string.alphanumeric(16).toUpperCase()), // Vendor invoice number
    PDOC: pdoc,                                                   // PO document number
    PDCT: 'OP',                                                   // PO document type
    PYIN: faker.helpers.arrayElement(PAY_INSTRUMENTS),             // Payment instrument
    PYST: isDispute ? '#' : faker.helpers.arrayElement(PAY_STATUSES), // Payment status
    DKCO: maybeBlank(faker.string.numeric(5)),                    // Discount taken
    STAM: maybeBlank(
      parseFloat((grossAmount * 0.02).toFixed(2))                 // 2% early payment discount
    ),
    RMSG: isDispute
      ? faker.helpers.arrayElement(['PRICE QUERY', 'DUPLICATE', 'GOODS NOT RECEIVED', 'QTY DISPUTE'])
      : '',                                                       // Remark / dispute reason
    RNME: isReversed ? String(300000 + faker.number.int({ min: 0, max: index })) : '', // Reversal document
  };
}

function generateF0411(rows, options = {}) {
  return Array.from({ length: rows }, (_, i) => generateF0411Row(i, options));
}

module.exports = { generateF0411 };
