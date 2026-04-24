const { faker } = require('@faker-js/faker');
const { toJulian } = require('./f4301');
const { seasonalDate } = require('../../utils/dates');

// JDE E1 F43121 — Purchase Order Receiver (Goods Receipt)
// Links back to F4301/F4311 via PDOC+PDCT+KCOO+PLIN

const RECEIPT_TYPES = ['OP', 'OB', 'OS'];
const BUSINESS_UNITS = ['00001', '00002', 'M10', 'M20', 'WH01', 'WH02'];
const UNITS_OF_MEASURE = ['EA', 'KG', 'LT', 'MT', 'BX', 'PL', 'HR', 'DY', 'CS'];

function generateF43121Row(index, options = {}) {
  const missingRate = options.missingRate || 0;
  const poLinePool = options.poLinePool || [];

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  let pdoc, pdct, kcoo, plin, itm, litm, uom, prrc, crcd, poOrderedQty;

  if (poLinePool.length > 0) {
    const line = faker.helpers.arrayElement(poLinePool);
    pdoc  = line.DOCO;
    pdct  = line.DCTO;
    kcoo  = line.KCOO;
    plin  = line.LNID;
    itm   = line.ITM;
    litm  = line.LITM;
    uom   = line.UOM;
    prrc  = line.PRRC;
    crcd  = line.CRCD;
    poOrderedQty = line.UORG;                                // Ordered qty — receipt derives from this
  } else {
    pdoc  = 100000 + faker.number.int({ min: 0, max: 9999 });
    pdct  = faker.helpers.arrayElement(RECEIPT_TYPES);
    kcoo  = faker.helpers.arrayElement(['00001', '00002', '10000']);
    plin  = parseFloat((faker.number.int({ min: 1, max: 10 }) * 1.0).toFixed(2));
    itm   = faker.number.int({ min: 100000, max: 999999 });
    litm  = faker.string.alphanumeric(8).toUpperCase();
    uom   = faker.helpers.arrayElement(UNITS_OF_MEASURE);
    prrc  = faker.number.float({ min: 1, max: 50000, fractionDigits: 4 });
    crcd  = faker.helpers.arrayElement(['GBP', 'USD', 'EUR', 'INR']);
    poOrderedQty = faker.number.float({ min: 1, max: 500, fractionDigits: 2 });
  }

  const receiptDate = seasonalDate();

  // Partial receipts — receive 60–100% of PO ordered qty
  const urec = parseFloat((poOrderedQty * faker.number.float({ min: 0.6, max: 1.0, fractionDigits: 2 })).toFixed(2));
  const aexp = parseFloat((urec * (prrc || 1)).toFixed(2));

  // 4% reversals
  const isReversal = Math.random() < 0.04;

  return {
    DOCO: 200000 + index,                                         // Receipt document number
    DCTO: 'OP',
    KCOO: kcoo,
    RCVJ: toJulian(receiptDate),                                  // Receipt date (Julian)
    VEND: maybeBlank(1000 + faker.number.int({ min: 0, max: 999 })),
    PDOC: pdoc,                                                   // Original PO number
    PDCT: pdct,                                                   // Original PO type
    PLIN: plin,                                                   // Original PO line
    ITM:  itm,
    LITM: litm,
    MCU:  faker.helpers.arrayElement(BUSINESS_UNITS),
    LOCN: maybeBlank(faker.string.alphanumeric(8).toUpperCase()),
    UREC: isReversal ? -urec : urec,                              // Quantity received (negative for reversal)
    UOM:  uom,
    PRRC: prrc,
    AEXP: isReversal ? -aexp : aexp,                              // Amount
    CRCD: crcd,
    TREF: maybeBlank(faker.string.alphanumeric(12).toUpperCase()), // Carrier/delivery reference
  };
}

function generateF43121(rows, options = {}) {
  return Array.from({ length: rows }, (_, i) => generateF43121Row(i, options));
}

module.exports = { generateF43121 };
