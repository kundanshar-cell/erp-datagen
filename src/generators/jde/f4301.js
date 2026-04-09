const { faker } = require('@faker-js/faker');

// JDE E1 F4301 — Purchase Order Header
// JDE uses Julian dates: CYYDDD (C=century, YY=year, DDD=day-of-year)
// Document type OP = Purchase Order

const DOC_TYPES = ['OP', 'OB', 'OS'];   // Standard PO, Blanket Order, Subcontract
const COMPANY_KEYS = ['00001', '00002', '10000', '20000'];
const CURRENCIES = ['GBP', 'USD', 'EUR', 'INR', 'SGD', 'JPY'];
const PAYMENT_TERMS = ['N30', 'N60', 'N90', 'NET', '2/10'];
const HOLD_CODES = ['', 'H', 'C', 'B'];   // None, Hold, Credit hold, Budget hold

// Convert JS Date to JDE Julian format (CYYDDD)
function toJulian(date) {
  const year = date.getFullYear();
  const start = new Date(year, 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const doy = Math.floor(diff / oneDay);
  const c = year >= 2000 ? 1 : 0;
  const yy = String(year).slice(-2);
  return parseInt(`${c}${yy}${String(doy).padStart(3, '0')}`, 10);
}

function generateF4301Row(index, options = {}) {
  const missingRate = options.missingRate || 0;
  const vendorPool = options.vendorPool || [];

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  const orderDate = faker.date.between({ from: '2022-01-01', to: '2025-12-31' });
  const deliveryDate = new Date(orderDate);
  deliveryDate.setDate(deliveryDate.getDate() + faker.number.int({ min: 7, max: 90 }));

  const vend = vendorPool.length > 0
    ? faker.helpers.arrayElement(vendorPool)
    : 1000 + faker.number.int({ min: 0, max: 999 });

  const docType = faker.helpers.arrayElement(DOC_TYPES);

  return {
    DOCO: 100000 + index,                                        // Document (PO) number
    DCTO: docType,                                               // Document type
    KCOO: faker.helpers.arrayElement(COMPANY_KEYS),              // Company key
    TRDJ: toJulian(orderDate),                                   // Order date (Julian)
    PDDJ: toJulian(deliveryDate),                                // Promised delivery date (Julian)
    VEND: vend,                                                  // Vendor address number (F0101.AN8)
    AN8:  vend,                                                  // Ship-to address number
    CRCD: faker.helpers.arrayElement(CURRENCIES),                // Currency code
    PYEN: maybeBlank(faker.helpers.arrayElement(PAYMENT_TERMS)), // Payment terms
    HDST: faker.helpers.arrayElement(HOLD_CODES),                // Hold code
    BLTJ: docType === 'OB'                                       // Blanket order expiry date
      ? toJulian(new Date(orderDate.getFullYear() + 1, orderDate.getMonth(), orderDate.getDate()))
      : '',
    BLTA: docType === 'OB'
      ? faker.number.float({ min: 10000, max: 500000, fractionDigits: 2 })
      : '',                                                      // Blanket order amount
  };
}

function generateF4301(rows, options = {}) {
  return Array.from({ length: rows }, (_, i) => generateF4301Row(i, options));
}

module.exports = { generateF4301, toJulian };
