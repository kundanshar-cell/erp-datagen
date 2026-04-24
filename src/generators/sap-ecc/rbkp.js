const { faker } = require('@faker-js/faker');
const { seasonalDate, invoicePostingDate } = require('../../utils/dates');

// SAP ECC RBKP — Invoice Document Header (Logistics Invoice Verification)
// One RBKP per vendor invoice posted in MIRO/MIR7

const DOCUMENT_TYPES = ['RE', 'KR', 'RD'];   // Invoice, Vendor credit memo, Invoice with diff
const DEFAULT_COMPANY_CODES = ['1000', '2000', '3000', 'GB01', 'US01', 'IN01'];
const CURRENCIES = ['GBP', 'USD', 'EUR', 'INR', 'SGD', 'JPY'];
const PAYMENT_TERMS = ['NT30', 'NT60', 'NT90', '0001', '0002', 'Z030'];
const INVOICE_STATUSES = ['', 'A', 'B', 'Z'];  // Open, Parked, Posted, Reversed

function sapDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function padBelnr(num) {
  return String(num).padStart(10, '0');   // Invoice docs typically start with 51000...
}

function generateRBKPRow(index, options = {}) {
  const missingRate = options.missingRate || 0;
  const vendorPool = options.vendorPool || [];
  const companyCodes = (options.companyCodePool && options.companyCodePool.length > 0)
    ? options.companyCodePool
    : DEFAULT_COMPANY_CODES;

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  const invoiceDate = seasonalDate();
  const postingDate = invoicePostingDate(invoiceDate);

  const baseAmount = faker.number.float({ min: 100, max: 500000, fractionDigits: 2 });
  const taxRate = faker.helpers.arrayElement([0, 0.05, 0.10, 0.20]);
  const taxAmount = parseFloat((baseAmount * taxRate).toFixed(2));
  const grossAmount = parseFloat((baseAmount + taxAmount).toFixed(2));

  const lifnr = vendorPool.length > 0
    ? faker.helpers.arrayElement(vendorPool)
    : String(faker.number.int({ min: 1000000, max: 1099999 })).padStart(10, '0');

  // 5% chance of reversed invoice
  const reversed = Math.random() < 0.05;

  return {
    BELNR: padBelnr(5100000000 + index),
    GJAHR: String(invoiceDate.getFullYear()),
    BUKRS: faker.helpers.arrayElement(companyCodes),
    BLART: faker.helpers.arrayElement(DOCUMENT_TYPES),
    LIFNR: lifnr,
    BLDAT: sapDate(invoiceDate),                           // Invoice date
    BUDAT: sapDate(postingDate),                           // Posting date
    WAERS: faker.helpers.arrayElement(CURRENCIES),
    WRBTR: grossAmount,                                    // Gross invoice amount
    WMWST: taxAmount,                                      // Tax amount
    WSKTO: maybeBlank(
      parseFloat((grossAmount * 0.02).toFixed(2))          // 2% early payment discount
    ),
    ZTERM: maybeBlank(faker.helpers.arrayElement(PAYMENT_TERMS)),
    XBLNR: maybeBlank(faker.string.alphanumeric(16).toUpperCase()),  // Vendor invoice reference
    STBLG: reversed
      ? padBelnr(5100000000 + faker.number.int({ min: 0, max: index }))
      : '',                                                // Reversal document
    BSTAT: reversed ? 'A' : faker.helpers.arrayElement(INVOICE_STATUSES),
  };
}

function generateRBKP(rows, options = {}) {
  return Array.from({ length: rows }, (_, i) => generateRBKPRow(i, options));
}

module.exports = { generateRBKP };
