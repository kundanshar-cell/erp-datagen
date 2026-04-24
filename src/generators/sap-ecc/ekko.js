const { faker } = require('@faker-js/faker');
const { seasonalDate } = require('../../utils/dates');

// SAP ECC EKKO — Purchase Order Header
// Field names match SAP table conventions

const DOC_TYPES = ['NB', 'FO', 'UB', 'ZNB'];  // Standard PO, Framework Order, Stock Transfer, Custom
const PURCHASING_ORGS = ['1000', '2000', '3000', 'GBPO', 'USPO', 'INDE'];
const PURCHASING_GROUPS = ['001', '002', '010', '020', 'A01', 'B01'];
const CURRENCIES = ['GBP', 'USD', 'EUR', 'INR', 'SGD', 'JPY'];
const COMPANY_CODES = ['1000', '2000', '3000', 'GB01', 'US01', 'IN01'];
const PAYMENT_TERMS = ['NT30', 'NT60', 'NT90', '0001', '0002', 'Z030'];
const INCOTERMS = ['EXW', 'FOB', 'CIF', 'DDP', 'DAP', 'FCA'];
const DOC_STATUSES = ['', 'B', 'Z'];  // Open, PO released, Closed

function padEbeln(num) {
  return String(num).padStart(10, '0');
}

function sapDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function generateEKKORow(index, options = {}) {
  const missingRate = options.missingRate || 0;
  const vendorPool = options.vendorPool || [];

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  // Pick vendor from pool if provided, else generate one in same range as LFA1
  const lifnr = vendorPool.length > 0
    ? faker.helpers.arrayElement(vendorPool)
    : String(faker.number.int({ min: 1000000, max: 1099999 })).padStart(10, '0');

  const poDate = seasonalDate();
  const validFrom = new Date(poDate);
  const validTo = new Date(poDate);
  validTo.setFullYear(validTo.getFullYear() + 1);

  const docType = faker.helpers.arrayElement(DOC_TYPES);

  return {
    EBELN: padEbeln(4500000000 + index),   // SAP PO numbers typically start with 45
    BUKRS: faker.helpers.arrayElement(COMPANY_CODES),
    BSTYP: 'F',                             // F = Purchase Order
    BSART: docType,
    LIFNR: lifnr,
    EKORG: faker.helpers.arrayElement(PURCHASING_ORGS),
    EKGRP: faker.helpers.arrayElement(PURCHASING_GROUPS),
    WAERS: faker.helpers.arrayElement(CURRENCIES),
    BEDAT: sapDate(poDate),
    KDATB: docType === 'FO' ? sapDate(validFrom) : '',   // Framework order validity
    KDATE: docType === 'FO' ? sapDate(validTo) : '',
    ZTERM: maybeBlank(faker.helpers.arrayElement(PAYMENT_TERMS)),
    INCO1: maybeBlank(faker.helpers.arrayElement(INCOTERMS)),
    INCO2: maybeBlank(faker.location.city()),
    FRGKE: faker.helpers.arrayElement(DOC_STATUSES),     // Release indicator
    RLWRT: docType === 'FO'
      ? faker.number.float({ min: 10000, max: 500000, fractionDigits: 2 })
      : '',                                               // Blanket PO limit
  };
}

function generateEKKO(rows, options = {}) {
  return Array.from({ length: rows }, (_, i) => generateEKKORow(i, options));
}

module.exports = { generateEKKO };
