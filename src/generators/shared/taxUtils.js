const { faker } = require('@faker-js/faker');

// Shared tax identifier generators used across SAP ECC, JDE E1, D365 F&O
//
// Real ERP exports have inherently incomplete tax data — even "clean" systems
// have 10-20% missing VAT numbers. This is modelled by adding a base missing
// rate on top of the caller's configured missingRate.

const VAT_BASE_MISSING  = 0.15; // 15% missing even in clean data
const REG_BASE_MISSING  = 0.20; // 20% missing even in clean data

/**
 * Generate a country-appropriate VAT number.
 * Returns empty string at (missingRate + 15%) probability.
 */
function generateVatNumber(country, missingRate = 0) {
  if (Math.random() < Math.min(missingRate + VAT_BASE_MISSING, 1)) return '';
  switch (country) {
    case 'GB': return `GB${faker.string.numeric(9)}`;
    case 'DE': return `DE${faker.string.numeric(9)}`;
    case 'FR': return `FR${faker.string.alphanumeric(2).toUpperCase()}${faker.string.numeric(9)}`;
    case 'AU': return faker.string.numeric(11);                        // ABN — 11 digits
    case 'IN': return `${faker.helpers.arrayElement(['07', '09', '24', '27', '33', '36'])}${faker.string.alphanumeric(13).toUpperCase()}`; // GSTIN
    default:   return `${country}${faker.string.numeric(9)}`;
  }
}

/**
 * Generate a company registration number.
 * UK: 8-digit or SC-prefixed (Scottish). Others: 8-digit.
 * Returns empty string at (missingRate + 20%) probability.
 */
function generateRegNumber(country, missingRate = 0) {
  if (Math.random() < Math.min(missingRate + REG_BASE_MISSING, 1)) return '';
  if (country === 'GB') {
    return Math.random() < 0.10
      ? `SC${faker.string.numeric(6)}`                      // 10% Scottish company
      : faker.string.numeric(8).padStart(8, '0');           // Standard Companies House number
  }
  return faker.string.numeric(8);
}

module.exports = { generateVatNumber, generateRegNumber };
