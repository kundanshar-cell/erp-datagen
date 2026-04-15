const { faker } = require('@faker-js/faker');
const { generateVatNumber, generateRegNumber } = require('../shared/taxUtils');

// JDE E1 F0101 — Address Book Master (Vendors)
// JDE uses AN8 (Address Number) as the primary key — 8-digit numeric
// Search type V = Vendor
//
// dupRate (0.0–1.0, default 0.1): proportion of vendors that are intentional
// duplicates — same TAX (VAT) + CREG, different ALPH name variant.

const LANGUAGES      = ['E', 'F', 'D', 'S', 'Z', 'J'];
const COUNTRIES      = ['GB', 'US', 'DE', 'FR', 'IN', 'JP', 'SG', 'AU'];
const CURRENCY_CODES = ['GBP', 'USD', 'EUR', 'INR', 'SGD', 'JPY'];
const PAYMENT_TERMS  = ['N30', 'N60', 'N90', 'NET', '2/10'];
const CATEGORY_CODES = ['001', '002', '003', '010', '020', 'A01', 'B01'];

function vendorNameVariants(baseName) {
  const variants = [
    baseName,
    baseName.toUpperCase(),
    baseName.replace('Ltd', 'Limited'),
    baseName.replace('Ltd', 'LTD'),
    baseName.replace('Inc', 'Incorporated'),
    baseName.replace('& ', 'and '),
    baseName.replace('Co.', 'Company'),
  ].filter(v => v !== baseName);
  variants.unshift(baseName);
  return faker.helpers.arrayElement(variants);
}

function generateF0101(rows, options = {}) {
  const missingRate = options.missingRate || 0;
  const dupRate     = options.dupRate !== undefined ? options.dupRate : 0.10;

  const maybeBlank = (v) => Math.random() < missingRate ? '' : v;

  // ── Build base company pool ────────────────────────────────────────────────
  const uniqueCount   = Math.max(1, Math.ceil(rows * (1 - dupRate)));
  const baseCompanies = Array.from({ length: uniqueCount }, () => {
    const country = faker.helpers.arrayElement(COUNTRIES);
    return {
      baseName : faker.company.name(),
      country,
      TAX      : generateVatNumber(country, missingRate),  // F0101.TAX — VAT/tax ID
      CREG     : generateRegNumber(country, missingRate),  // F0101.CREG — registration number
    };
  });

  // ── Generate all rows ──────────────────────────────────────────────────────
  return Array.from({ length: rows }, (_, i) => {
    const base = i < uniqueCount
      ? baseCompanies[i]
      : faker.helpers.arrayElement(baseCompanies);

    return {
      AN8  : 1000 + i,                                                  // Address number
      ALPH : vendorNameVariants(base.baseName),                         // Alpha name (40 chars)
      MCU  : maybeBlank(faker.helpers.arrayElement(['00001', '00002', '10000', '20000'])),
      AT1  : 'V',                                                        // Search type: Vendor
      TAX  : base.TAX,    // VAT / tax ID — SAME across duplicate cluster members
      CREG : base.CREG,   // Companies House / reg number — SAME across cluster
      LNID : faker.helpers.arrayElement(LANGUAGES),
      COUN : base.country,
      CTY1 : maybeBlank(faker.location.city()),
      ADDS : maybeBlank(faker.location.streetAddress()),
      POST : maybeBlank(faker.location.zipCode()),
      PHON : maybeBlank(faker.phone.number()),
      CRCD : faker.helpers.arrayElement(CURRENCY_CODES),
      PYEN : maybeBlank(faker.helpers.arrayElement(PAYMENT_TERMS)),
      AC01 : maybeBlank(faker.helpers.arrayElement(CATEGORY_CODES)),
      AC02 : maybeBlank(faker.helpers.arrayElement(CATEGORY_CODES)),
      ABTJ : Math.random() < 0.03 ? '1' : '0',                         // 3% inactive
    };
  });
}

module.exports = { generateF0101 };
