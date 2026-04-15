const { faker } = require('@faker-js/faker');
const { generateVatNumber, generateRegNumber } = require('../shared/taxUtils');

// SAP ECC LFA1 — Vendor Master General Data
// Field names match SAP table conventions
//
// dupRate (0.0–1.0, default 0.1): proportion of vendors that are intentional
// duplicates — same VAT + registration number, different NAME1 variant.
// This generates realistic dedup training clusters for the DataEsprit dedup engine.

const ACCOUNT_GROUPS = ['KRED', 'LIEF', 'INT1', 'CPD'];
const LANGUAGES      = ['EN', 'DE', 'FR', 'ES', 'ZH', 'JA'];
const COUNTRIES      = ['GB', 'US', 'DE', 'FR', 'IN', 'JP', 'SG', 'AU'];

// Generate realistic name format variants of the same underlying company
function vendorNameVariants(baseName) {
  const variants = [
    baseName,
    baseName.toUpperCase(),
    baseName.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
    baseName.replace('Ltd', 'Limited'),
    baseName.replace('Ltd', 'LTD'),
    baseName.replace('Inc', 'Incorporated'),
    baseName.replace('& ', 'and '),
    baseName.replace('Co.', 'Company'),
  ].filter(v => v !== baseName);
  variants.unshift(baseName);
  return faker.helpers.arrayElement(variants);
}

function padLifnr(num) {
  return String(num).padStart(10, '0');
}

function generateLFA1(rows, options = {}) {
  const missingRate = options.missingRate || 0;
  const dupRate     = options.dupRate !== undefined ? options.dupRate : 0.10;

  const maybeBlank = (v) => Math.random() < missingRate ? '' : v;

  // ── Build base company pool (unique real-world suppliers) ──────────────────
  // Each base company has a fixed VAT + reg number — these are the "true" identities.
  // Duplicate records share the same base company identity but have different NAME1.
  const uniqueCount   = Math.max(1, Math.ceil(rows * (1 - dupRate)));
  const baseCompanies = Array.from({ length: uniqueCount }, () => {
    const country = faker.helpers.arrayElement(COUNTRIES);
    return {
      baseName : faker.company.name(),
      country,
      STCEG    : generateVatNumber(country, missingRate),  // VAT registration number
      STCD3    : generateRegNumber(country, missingRate),  // Companies House / national reg
    };
  });

  // ── Generate all rows ──────────────────────────────────────────────────────
  // Rows 0..uniqueCount-1  → unique vendors (1:1 with base company)
  // Rows uniqueCount..N-1  → duplicates (random base company, new name variant, same tax IDs)
  return Array.from({ length: rows }, (_, i) => {
    const base = i < uniqueCount
      ? baseCompanies[i]
      : faker.helpers.arrayElement(baseCompanies);

    return {
      LIFNR : padLifnr(1000000 + i),
      LAND1 : base.country,
      NAME1 : vendorNameVariants(base.baseName),          // name variant — may differ from canonical
      NAME2 : maybeBlank(faker.company.buzzPhrase()),
      ORT01 : maybeBlank(faker.location.city()),
      PSTLZ : maybeBlank(faker.location.zipCode()),
      STRAS : maybeBlank(faker.location.streetAddress()),
      TELF1 : maybeBlank(faker.phone.number()),
      TELFX : maybeBlank(faker.phone.number()),
      SPRAS : faker.helpers.arrayElement(LANGUAGES),
      KTOKK : faker.helpers.arrayElement(ACCOUNT_GROUPS),
      STCEG : base.STCEG,   // VAT number — SAME across all duplicate cluster members
      STCD3 : base.STCD3,   // Companies House reg — SAME across cluster
      STCD4 : '',            // Local/national tax ID — leave blank (rarely exported)
      SPERR : Math.random() < 0.05 ? 'X' : '',   // 5% payment-blocked
      LOEVM : Math.random() < 0.02 ? 'X' : '',   // 2% deletion-flagged
    };
  });
}

module.exports = { generateLFA1 };
