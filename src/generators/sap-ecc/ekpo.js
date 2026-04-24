const { faker } = require('@faker-js/faker');
const { sapPlantForCompany } = require('../../utils/org-hierarchy');
const { pickCommodity, randomItem, randomUom, randomPrice, randomUnspsc } = require('../../utils/commodity');

// SAP ECC EKPO — Purchase Order Line Items
// Each EKPO row links to an EKKO header via EBELN

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

function generateMaterialNumber(cat) {
  // Material number prefix mirrors the commodity category for realism
  const prefix = cat.sapMatkl;
  const formats = [
    () => String(faker.number.int({ min: 10000000, max: 99999999 })),
    () => `${prefix}-${faker.string.alphanumeric(6).toUpperCase()}`,
    () => `${prefix}-${faker.number.int({ min: 1000, max: 9999 })}`,
  ];
  return faker.helpers.arrayElement(formats)();
}

function generateEKPORow(lineIndex, ebeln, poDate, waers, options = {}) {
  const missingRate = options.missingRate || 0;
  const bukrs = options.bukrs || null;

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  // Commodity-driven item — description, UOM, and price all consistent with category
  const cat = pickCommodity();
  const itemCategory = faker.helpers.arrayElement(ITEM_CATEGORIES);
  const isService = itemCategory === 'D';

  const qty = faker.number.float({ min: 1, max: 500, fractionDigits: 3 });
  const unitPrice = randomPrice(cat);
  const netValue = parseFloat((qty * unitPrice).toFixed(2));

  const deliveryDate = new Date(poDate);
  deliveryDate.setDate(deliveryDate.getDate() + faker.number.int({ min: 7, max: 90 }));

  const acctAssignment = faker.helpers.arrayElement(ACCOUNT_ASSIGNMENT);

  // WERKS: derived from BUKRS org hierarchy (plant must belong to company code)
  const werks = bukrs ? sapPlantForCompany(bukrs) : faker.helpers.arrayElement(['1000','2000','GB01','US01','IN01']);

  return {
    EBELN: ebeln,
    EBELP: padEbelp(lineIndex + 1),
    MATNR: isService ? '' : generateMaterialNumber(cat),   // Services have no material number
    TXZ01: randomItem(cat),                                 // Short text from commodity catalogue
    MATKL: cat.sapMatkl,                                   // Material group matches category
    WERKS: werks,                                           // Plant consistent with company code
    LGORT: maybeBlank(faker.helpers.arrayElement(STORAGE_LOCATIONS)),
    MENGE: qty,
    MEINS: randomUom(cat),                                  // UOM appropriate for commodity
    NETPR: unitPrice,
    PEINH: 1,                                               // Price unit
    NETWR: netValue,
    WAERS: waers,
    EINDT: sapDate(deliveryDate),
    PSTYP: itemCategory,
    KNTTP: acctAssignment,
    SAKTO: acctAssignment !== '' ? faker.helpers.arrayElement(GL_ACCOUNTS) : '',
    LOEKZ: Math.random() < 0.03 ? 'L' : '',                // 3% line deletion flag
    ELIKZ: Math.random() < 0.05 ? 'X' : '',                // 5% delivery completed
    REPOS: Math.random() < 0.08 ? 'X' : '',                // 8% invoice receipt flag
    UNSPSC_CODE: randomUnspsc(cat),                         // Yukti training label
  };
}

function generateEKPO(rows, options = {}) {
  const poPool = options.poPool || [];   // Array of { EBELN, BEDAT, WAERS, BUKRS } from EKKO
  const linesPerPO = options.linesPerPO || { min: 1, max: 10 };
  const result = [];

  if (poPool.length > 0) {
    for (const po of poPool) {
      const lineCount = faker.number.int(linesPerPO);
      for (let i = 0; i < lineCount && result.length < rows; i++) {
        result.push(generateEKPORow(i, po.EBELN, new Date(
          po.BEDAT.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
        ), po.WAERS, { ...options, bukrs: po.BUKRS }));
      }
    }
  } else {
    // Standalone generation
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
