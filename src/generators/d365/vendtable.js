const { faker } = require('@faker-js/faker');
const { generateVatNumber, generateRegNumber } = require('../shared/taxUtils');

// D365 F&O VendTable — Vendor Master
// AccountNum is the primary key — alphanumeric like V-000001
//
// dupRate (0.0–1.0, default 0.1): proportion of vendors that are intentional
// duplicates — same VATNum + RegistrationNumber, different Name variant.

const LEGAL_ENTITIES   = ['USMF', 'GBSI', 'FRRT', 'DEMF', 'INMF', 'SGMF'];
const VEND_GROUPS      = ['10', '20', '30', 'DOM', 'INTL', 'SVCS'];
const CURRENCIES       = ['GBP', 'USD', 'EUR', 'INR', 'SGD', 'JPY'];
const PAYMENT_TERMS    = ['Net30', 'Net60', 'Net90', '2%10Net30', 'Immediate'];
const PAYMENT_METHODS  = ['Check', 'Wire', 'EFT', 'DirectDebit'];
const TAX_GROUPS       = ['DOMESTIC', 'EU', 'IMPORT', 'EXEMPT'];
const BLOCK_STATUSES   = ['No', 'Invoice', 'All'];

// D365 legal entity → country mapping (for consistent VAT generation)
const ENTITY_COUNTRY = {
  USMF: 'US', GBSI: 'GB', FRRT: 'FR', DEMF: 'DE', INMF: 'IN', SGMF: 'SG',
};

function vendorNameVariants(baseName) {
  const variants = [
    baseName,
    baseName.toUpperCase(),
    baseName.replace('Ltd', 'Limited'),
    baseName.replace('Inc', 'Incorporated'),
    baseName.replace('LLC', 'L.L.C.'),
    baseName.replace('& ', 'and '),
    baseName.replace('Co.', 'Company'),
  ].filter(v => v !== baseName);
  variants.unshift(baseName);
  return faker.helpers.arrayElement(variants);
}

function padAccountNum(index) {
  return `V-${String(index + 1).padStart(6, '0')}`;
}

function generateVendTable(rows, options = {}) {
  const missingRate = options.missingRate || 0;
  const dupRate     = options.dupRate !== undefined ? options.dupRate : 0.10;

  const maybeBlank = (v) => Math.random() < missingRate ? '' : v;

  // ── Build base company pool ────────────────────────────────────────────────
  const uniqueCount   = Math.max(1, Math.ceil(rows * (1 - dupRate)));
  const baseCompanies = Array.from({ length: uniqueCount }, () => {
    const dataAreaId = faker.helpers.arrayElement(LEGAL_ENTITIES);
    const country    = ENTITY_COUNTRY[dataAreaId] || 'GB';
    return {
      baseName           : faker.company.name(),
      dataAreaId,
      country,
      VATNum             : generateVatNumber(country, missingRate),  // VAT registration number
      RegistrationNumber : generateRegNumber(country, missingRate),  // Companies House / national reg
    };
  });

  // ── Generate all rows ──────────────────────────────────────────────────────
  return Array.from({ length: rows }, (_, i) => {
    const base = i < uniqueCount
      ? baseCompanies[i]
      : faker.helpers.arrayElement(baseCompanies);

    return {
      AccountNum         : padAccountNum(i),
      DataAreaId         : base.dataAreaId,
      Name               : vendorNameVariants(base.baseName),        // name variant
      VendGroup          : faker.helpers.arrayElement(VEND_GROUPS),
      Currency           : faker.helpers.arrayElement(CURRENCIES),
      PaymTermId         : maybeBlank(faker.helpers.arrayElement(PAYMENT_TERMS)),
      PaymMode           : maybeBlank(faker.helpers.arrayElement(PAYMENT_METHODS)),
      TaxGroup           : maybeBlank(faker.helpers.arrayElement(TAX_GROUPS)),
      VATNum             : base.VATNum,             // VAT — SAME across duplicate cluster
      RegistrationNumber : base.RegistrationNumber, // Reg — SAME across cluster
      CountryRegionId    : base.country,
      Phone              : maybeBlank(faker.phone.number()),
      Email              : maybeBlank(faker.internet.email()),
      Blocked            : Math.random() < 0.04
                             ? faker.helpers.arrayElement(['Invoice', 'All'])
                             : 'No',
      OneTimeVendor      : Math.random() < 0.05 ? 'Yes' : 'No',
      InvoiceAccount     : Math.random() < 0.10
                             ? padAccountNum(faker.number.int({ min: 0, max: i }))
                             : padAccountNum(i),
    };
  });
}

module.exports = { generateVendTable };
