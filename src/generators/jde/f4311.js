const { faker } = require('@faker-js/faker');
const { toJulian } = require('./f4301');
const { jdeMcuForCompany } = require('../../utils/org-hierarchy');
const { pickCommodity, randomItem, randomUom, randomPrice, randomUnspsc } = require('../../utils/commodity');

// JDE E1 F4311 — Purchase Order Detail (Line Items)
// Each line links to F4301 via DOCO+DCTO+KCOO
// JDE line numbers are decimal: 1.00, 2.00, 3.00...

const LINE_STATUSES = ['200', '280', '400', '999'];  // Open, Partially received, Closed, Cancelled
const ACCOUNT_CODES = ['4000', '4100', '4200', '5000', '5100', '6000'];

function generateItemNumber(cat) {
  const prefix = cat.jdeSrp;
  const formats = [
    () => String(faker.number.int({ min: 100000, max: 999999 })),
    () => `${prefix}-${faker.number.int({ min: 1000, max: 9999 })}`,
    () => faker.string.alphanumeric(8).toUpperCase(),
  ];
  return faker.helpers.arrayElement(formats)();
}

function generateF4311Row(lineIndex, doco, dcto, kcoo, orderDate, crcd, options = {}) {
  const missingRate = options.missingRate || 0;

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  // Commodity-driven item — description, UOM, and price all consistent with category
  const cat = pickCommodity();
  const qty = faker.number.float({ min: 1, max: 500, fractionDigits: 2 });
  const unitCost = randomPrice(cat);
  const extPrice = parseFloat((qty * unitCost).toFixed(2));

  const recdDate = new Date(orderDate);
  recdDate.setDate(recdDate.getDate() + faker.number.int({ min: 7, max: 90 }));

  const itemNum = generateItemNumber(cat);

  return {
    DOCO: doco,                                                   // PO number (links to F4301)
    DCTO: dcto,                                                   // Document type
    KCOO: kcoo,                                                   // Company key
    LNID: parseFloat(((lineIndex + 1) * 1.0).toFixed(2)),         // Line number (1.00, 2.00...)
    ITM:  faker.number.int({ min: 100000, max: 999999 }),         // Item number (short)
    LITM: itemNum,                                                // Item number (2nd) — prefixed by category
    DSC1: randomItem(cat),                                        // Description from commodity catalogue
    SRP3: cat.jdeSrp,                                             // Commodity code (JDE item category)
    MCU:  jdeMcuForCompany(kcoo),                                 // Branch/plant consistent with company key
    LOCN: maybeBlank(faker.string.alphanumeric(8).toUpperCase()), // Location
    UORG: qty,                                                    // Order quantity
    UOM:  randomUom(cat),                                         // UOM appropriate for commodity
    PRRC: unitCost,                                               // Unit cost in category range
    AEXP: extPrice,                                               // Extended price
    CRCD: crcd,                                                   // Currency code
    PDDJ: toJulian(recdDate),                                     // Promised delivery date (Julian)
    NXTR: faker.helpers.arrayElement(LINE_STATUSES),              // Next status
    LTTR: Math.random() < 0.03 ? '999' : '',                     // Last status (999 = cancelled)
    AN8:  maybeBlank(faker.number.int({ min: 1000, max: 1999 })), // GL account object
    OBJ:  maybeBlank(faker.helpers.arrayElement(ACCOUNT_CODES)),  // Account object
    UNSPSC_CODE: randomUnspsc(cat),                               // Yukti training label
  };
}

function generateF4311(rows, options = {}) {
  const poPool = options.poPool || [];
  const linesPerPO = options.linesPerPO || { min: 1, max: 8 };
  const result = [];

  if (poPool.length > 0) {
    for (const po of poPool) {
      const lineCount = faker.number.int(linesPerPO);
      for (let i = 0; i < lineCount && result.length < rows; i++) {
        const orderDate = new Date(
          String(po.TRDJ).replace(/^(\d)(\d{2})(\d{3})$/, (_, c, yy, ddd) => {
            const year = (c === '1' ? 2000 : 1900) + parseInt(yy);
            const d = new Date(year, 0);
            d.setDate(parseInt(ddd));
            return d.toISOString();
          })
        );
        result.push(generateF4311Row(i, po.DOCO, po.DCTO, po.KCOO, isNaN(orderDate) ? new Date() : orderDate, po.CRCD, options));
      }
    }
  } else {
    for (let i = 0; i < rows; i++) {
      const doco = 100000 + faker.number.int({ min: 0, max: 9999 });
      const dcto = faker.helpers.arrayElement(['OP', 'OB', 'OS']);
      const kcoo = faker.helpers.arrayElement(['00001', '00002', '10000']);
      const crcd = faker.helpers.arrayElement(['GBP', 'USD', 'EUR', 'INR']);
      result.push(generateF4311Row(0, doco, dcto, kcoo, new Date(), crcd, options));
    }
  }

  return result;
}

module.exports = { generateF4311 };
