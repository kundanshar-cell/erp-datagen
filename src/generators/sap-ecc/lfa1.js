const { faker } = require('@faker-js/faker');

// SAP ECC LFA1 — Vendor Master General Data
// Field names match SAP table conventions

const ACCOUNT_GROUPS = ['KRED', 'LIEF', 'INT1', 'CPD'];
const LANGUAGES = ['EN', 'DE', 'FR', 'ES', 'ZH', 'JA'];
const COUNTRIES = ['GB', 'US', 'DE', 'FR', 'IN', 'JP', 'SG', 'AU'];

// Simulate duplicate vendor name formats (real-world data quality issue)
function vendorNameVariants(baseName) {
  const variants = [
    baseName,
    baseName.toUpperCase(),
    baseName.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
    baseName.replace('Ltd', 'Limited'),
    baseName.replace('Ltd', 'LTD'),
  ];
  return faker.helpers.arrayElement(variants);
}

function padLifnr(num) {
  return String(num).padStart(10, '0');
}

function generateLFA1Row(index, options = {}) {
  const missingRate = options.missingRate || 0;
  const country = faker.helpers.arrayElement(COUNTRIES);
  const baseName = `${faker.company.name()}`;

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  return {
    LIFNR: padLifnr(1000000 + index),
    LAND1: country,
    NAME1: vendorNameVariants(baseName),
    NAME2: maybeBlank(faker.company.buzzPhrase()),
    ORT01: maybeBlank(faker.location.city()),
    PSTLZ: maybeBlank(faker.location.zipCode()),
    STRAS: maybeBlank(faker.location.streetAddress()),
    TELF1: maybeBlank(faker.phone.number()),
    TELFX: maybeBlank(faker.phone.number()),
    SPRAS: faker.helpers.arrayElement(LANGUAGES),
    KTOKK: faker.helpers.arrayElement(ACCOUNT_GROUPS),
    SPERR: Math.random() < 0.05 ? 'X' : '',   // 5% blocked vendors
    LOEVM: Math.random() < 0.02 ? 'X' : '',   // 2% deletion-flagged
  };
}

function generateLFA1(rows, options = {}) {
  return Array.from({ length: rows }, (_, i) => generateLFA1Row(i, options));
}

module.exports = { generateLFA1 };
