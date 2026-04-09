const { faker } = require('@faker-js/faker');

// JDE E1 F0101 — Address Book Master (Vendors)
// JDE uses AN8 (Address Number) as the primary key — 8-digit numeric
// Search type V = Vendor

const SEARCH_TYPES = ['V'];                          // V = Vendor (scope of this generator)
const LANGUAGES = ['E', 'F', 'D', 'S', 'Z', 'J'];  // English, French, German, Spanish, Chinese, Japanese
const COUNTRIES = ['GB', 'US', 'DE', 'FR', 'IN', 'JP', 'SG', 'AU'];
const CURRENCY_CODES = ['GBP', 'USD', 'EUR', 'INR', 'SGD', 'JPY'];
const PAYMENT_TERMS = ['N30', 'N60', 'N90', 'NET', '2/10'];

// JDE category codes (AC01-AC04) — used for vendor classification
const CATEGORY_CODES = ['001', '002', '003', '010', '020', 'A01', 'B01'];

function vendorNameVariants(baseName) {
  const variants = [
    baseName,
    baseName.toUpperCase(),
    baseName.replace('Ltd', 'Limited'),
    baseName.replace('Ltd', 'LTD'),
    baseName.replace('Inc', 'Incorporated'),
  ];
  return faker.helpers.arrayElement(variants);
}

function generateF0101Row(index, options = {}) {
  const missingRate = options.missingRate || 0;

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  const baseName = faker.company.name();

  return {
    AN8:   1000 + index,                                        // Address number (short numeric key)
    ALPH:  vendorNameVariants(baseName),                        // Alpha name (40 chars)
    MCU:   maybeBlank(faker.helpers.arrayElement(['00001', '00002', '10000', '20000'])), // Business unit
    AT1:   'V',                                                 // Search type: Vendor
    TAXID: maybeBlank(faker.string.numeric(10)),                // Tax ID
    LNID:  faker.helpers.arrayElement(LANGUAGES),               // Language
    COUN:  faker.helpers.arrayElement(COUNTRIES),               // Country
    CTY1:  maybeBlank(faker.location.city()),                   // City
    ADDS:  maybeBlank(faker.location.streetAddress()),          // Address line 1
    POST:  maybeBlank(faker.location.zipCode()),                // Postal code
    PHON:  maybeBlank(faker.phone.number()),                    // Phone
    CRCD:  faker.helpers.arrayElement(CURRENCY_CODES),          // Currency code
    PYEN:  maybeBlank(faker.helpers.arrayElement(PAYMENT_TERMS)), // Payment terms
    AC01:  maybeBlank(faker.helpers.arrayElement(CATEGORY_CODES)), // Category code 1
    AC02:  maybeBlank(faker.helpers.arrayElement(CATEGORY_CODES)), // Category code 2
    ABTJ:  Math.random() < 0.03 ? '1' : '0',                   // 3% flagged inactive
  };
}

function generateF0101(rows, options = {}) {
  return Array.from({ length: rows }, (_, i) => generateF0101Row(i, options));
}

module.exports = { generateF0101 };
