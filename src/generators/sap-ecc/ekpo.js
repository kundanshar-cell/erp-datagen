const { faker } = require('@faker-js/faker');

// SAP ECC EKPO — Purchase Order Line Items
// Each EKPO row links to an EKKO header via EBELN

const MATERIAL_GROUPS = ['001', '002', '010', '020', 'IT01', 'IT02', 'OFF', 'SVC', 'MRO'];
const UNITS_OF_MEASURE = ['EA', 'KG', 'LTR', 'MTR', 'BOX', 'PAL', 'SET', 'HR', 'DAY'];
const PLANT_CODES = ['1000', '2000', '3000', 'GB01', 'US01', 'IN01'];
const STORAGE_LOCATIONS = ['0001', '0002', '0010', 'WH01', 'WH02'];
const ACCOUNT_ASSIGNMENT = ['', 'K', 'F', 'P'];   // Blank=stock, K=cost centre, F=order, P=project
const ITEM_CATEGORIES = ['', 'D', 'K', 'L'];       // Standard, Service, Consignment, Subcontracting
const GL_ACCOUNTS = ['400000', '410000', '420000', '500000', '510000', '600000'];

function sapDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function padEbelp(num) {
  return String(num * 10).padStart(5, '0');   // SAP line items: 00010, 00020, 00030...
}

function generateMaterialNumber() {
  // SAP material numbers — mix of numeric and alphanumeric
  const formats = [
    () => String(faker.number.int({ min: 10000000, max: 99999999 })),
    () => `MAT-${faker.string.alphanumeric(6).toUpperCase()}`,
    () => `${faker.helpers.arrayElement(['COMP', 'SERV', 'MRO', 'IT'])}-${faker.number.int({ min: 1000, max: 9999 })}`,
  ];
  return faker.helpers.arrayElement(formats)();
}

function generateEKPORow(lineIndex, ebeln, poDate, waers, options = {}) {
  const missingRate = options.missingRate || 0;

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  const qty = faker.number.float({ min: 1, max: 1000, fractionDigits: 3 });
  const unitPrice = faker.number.float({ min: 1, max: 50000, fractionDigits: 2 });
  const netValue = parseFloat((qty * unitPrice).toFixed(2));

  const deliveryDate = new Date(poDate);
  deliveryDate.setDate(deliveryDate.getDate() + faker.number.int({ min: 7, max: 90 }));

  const acctAssignment = faker.helpers.arrayElement(ACCOUNT_ASSIGNMENT);
  const itemCategory = faker.helpers.arrayElement(ITEM_CATEGORIES);

  return {
    EBELN: ebeln,
    EBELP: padEbelp(lineIndex + 1),
    MATNR: itemCategory === 'D' ? '' : generateMaterialNumber(),  // Services have no material
    TXZ01: faker.commerce.productName(),                           // Short text
    MATKL: faker.helpers.arrayElement(MATERIAL_GROUPS),
    WERKS: faker.helpers.arrayElement(PLANT_CODES),
    LGORT: maybeBlank(faker.helpers.arrayElement(STORAGE_LOCATIONS)),
    MENGE: qty,
    MEINS: faker.helpers.arrayElement(UNITS_OF_MEASURE),
    NETPR: unitPrice,
    PEINH: 1,                                                      // Price unit
    NETWR: netValue,
    WAERS: waers,
    EINDT: sapDate(deliveryDate),
    PSTYP: itemCategory,
    KNTTP: acctAssignment,
    SAKTO: acctAssignment !== '' ? faker.helpers.arrayElement(GL_ACCOUNTS) : '',  // GL account for account-assigned items
    LOEKZ: Math.random() < 0.03 ? 'L' : '',                       // 3% line deletion flag
    ELIKZ: Math.random() < 0.05 ? 'X' : '',                       // 5% delivery completed
    REPOS: Math.random() < 0.08 ? 'X' : '',                       // 8% invoice receipt flag
  };
}

function generateEKPO(rows, options = {}) {
  const poPool = options.poPool || [];   // Array of { EBELN, BEDAT, WAERS } from EKKO
  const linesPerPO = options.linesPerPO || { min: 1, max: 10 };
  const result = [];

  if (poPool.length > 0) {
    // Generate lines linked to real EKKO headers
    for (const po of poPool) {
      const lineCount = faker.number.int(linesPerPO);
      for (let i = 0; i < lineCount && result.length < rows; i++) {
        result.push(generateEKPORow(i, po.EBELN, new Date(
          po.BEDAT.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
        ), po.WAERS, options));
      }
    }
  } else {
    // Standalone generation — each line gets its own PO number
    for (let i = 0; i < rows; i++) {
      const ebeln = String(4500000000 + faker.number.int({ min: 0, max: 99999 })).padStart(10, '0');
      const poDate = faker.date.between({ from: '2022-01-01', to: '2025-12-31' });
      const waers = faker.helpers.arrayElement(['GBP', 'USD', 'EUR', 'INR', 'SGD']);
      result.push(generateEKPORow(0, ebeln, poDate, waers, options));
    }
  }

  return result;
}

module.exports = { generateEKPO };
