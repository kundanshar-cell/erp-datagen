const { faker } = require('@faker-js/faker');

// D365 F&O VendTable — Vendor Master
// AccountNum is the primary key — alphanumeric like V-000001 or numeric string

const LEGAL_ENTITIES = ['USMF', 'GBSI', 'FRRT', 'DEMF', 'INMF', 'SGMF'];
const VEND_GROUPS = ['10', '20', '30', 'DOM', 'INTL', 'SVCS'];
const CURRENCIES = ['GBP', 'USD', 'EUR', 'INR', 'SGD', 'JPY'];
const PAYMENT_TERMS = ['Net30', 'Net60', 'Net90', '2%10Net30', 'Immediate'];
const PAYMENT_METHODS = ['Check', 'Wire', 'EFT', 'DirectDebit'];
const TAX_GROUPS = ['DOMESTIC', 'EU', 'IMPORT', 'EXEMPT'];
const BLOCK_STATUSES = ['', 'No', 'Invoice', 'All'];  // Blank/No=active, Invoice=invoice blocked, All=fully blocked

function vendorNameVariants(baseName) {
  const variants = [
    baseName,
    baseName.toUpperCase(),
    baseName.replace('Ltd', 'Limited'),
    baseName.replace('Inc', 'Incorporated'),
    baseName.replace('LLC', 'L.L.C.'),
  ];
  return faker.helpers.arrayElement(variants);
}

function padAccountNum(index) {
  return `V-${String(index + 1).padStart(6, '0')}`;
}

function generateVendTableRow(index, options = {}) {
  const missingRate = options.missingRate || 0;

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  const baseName = faker.company.name();
  const dataAreaId = faker.helpers.arrayElement(LEGAL_ENTITIES);

  return {
    AccountNum:       padAccountNum(index),
    DataAreaId:       dataAreaId,
    Name:             vendorNameVariants(baseName),
    VendGroup:        faker.helpers.arrayElement(VEND_GROUPS),
    Currency:         faker.helpers.arrayElement(CURRENCIES),
    PaymTermId:       maybeBlank(faker.helpers.arrayElement(PAYMENT_TERMS)),
    PaymMode:         maybeBlank(faker.helpers.arrayElement(PAYMENT_METHODS)),
    TaxGroup:         maybeBlank(faker.helpers.arrayElement(TAX_GROUPS)),
    CountryRegionId:  faker.helpers.arrayElement(['GBR', 'USA', 'DEU', 'FRA', 'IND', 'SGP']),
    Phone:            maybeBlank(faker.phone.number()),
    Email:            maybeBlank(faker.internet.email()),
    Blocked:          Math.random() < 0.04
                        ? faker.helpers.arrayElement(['Invoice', 'All'])
                        : 'No',                            // 4% blocked vendors
    OneTimeVendor:    Math.random() < 0.05 ? 'Yes' : 'No',
    InvoiceAccount:   Math.random() < 0.1
                        ? padAccountNum(faker.number.int({ min: 0, max: index }))
                        : padAccountNum(index),            // 10% use a different invoice account
  };
}

function generateVendTable(rows, options = {}) {
  return Array.from({ length: rows }, (_, i) => generateVendTableRow(i, options));
}

module.exports = { generateVendTable };
