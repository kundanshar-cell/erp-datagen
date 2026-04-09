const { faker } = require('@faker-js/faker');

// SAP ECC MSEG — Material Document Line Items (Goods Receipt Lines)
// Each MSEG row links to MKPF via MBLNR+MJAHR, and to EKKO/EKPO via EBELN+EBELP

const MOVEMENT_TYPES = {
  normal: '101',      // GR for purchase order — most common
  reversal: '102',    // Reversal of GR
  returns: '122',     // Return to vendor
  subseq: '101',      // Subsequent delivery
};

const STOCK_TYPES = ['', 'Q', 'S'];   // Unrestricted, QI inspection, Blocked
const PLANT_CODES = ['1000', '2000', '3000', 'GB01', 'US01', 'IN01'];
const STORAGE_LOCATIONS = ['0001', '0002', '0010', 'WH01', 'WH02'];

function padZeile(num) {
  return String(num).padStart(4, '0');
}

function generateMSEGRow(lineIndex, mblnr, mjahr, options = {}) {
  const missingRate = options.missingRate || 0;
  const poPool = options.poPool || [];    // Array of { EBELN, EBELP, MATNR, MENGE, MEINS, NETPR, WAERS, WERKS }

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  // Pick a PO line to receive against, or generate standalone
  let ebeln, ebelp, matnr, meins, waers, werks, unitPrice;
  if (poPool.length > 0) {
    const poLine = faker.helpers.arrayElement(poPool);
    ebeln = poLine.EBELN;
    ebelp = poLine.EBELP;
    matnr = poLine.MATNR;
    meins = poLine.MEINS;
    waers = poLine.WAERS;
    werks = poLine.WERKS;
    unitPrice = poLine.NETPR;
  } else {
    ebeln = String(4500000000 + faker.number.int({ min: 0, max: 99999 })).padStart(10, '0');
    ebelp = String((faker.number.int({ min: 1, max: 20 })) * 10).padStart(5, '0');
    matnr = `MAT-${faker.string.alphanumeric(6).toUpperCase()}`;
    meins = faker.helpers.arrayElement(['EA', 'KG', 'LTR', 'MTR', 'BOX']);
    waers = faker.helpers.arrayElement(['GBP', 'USD', 'EUR', 'INR']);
    werks = faker.helpers.arrayElement(PLANT_CODES);
    unitPrice = faker.number.float({ min: 1, max: 50000, fractionDigits: 2 });
  }

  // Partial deliveries are common — receive between 20% and 100% of expected qty
  const orderedQty = faker.number.float({ min: 1, max: 500, fractionDigits: 3 });
  const receivedQty = parseFloat((orderedQty * faker.number.float({ min: 0.2, max: 1.0, fractionDigits: 2 })).toFixed(3));
  const amount = parseFloat((receivedQty * unitPrice).toFixed(2));

  // 5% chance of reversal movement type
  const bwart = Math.random() < 0.05
    ? faker.helpers.arrayElement(['102', '122'])
    : '101';

  return {
    MBLNR: mblnr,
    MJAHR: mjahr,
    ZEILE: padZeile(lineIndex + 1),
    EBELN: ebeln,
    EBELP: ebelp,
    BWART: bwart,
    MATNR: matnr,
    WERKS: werks,
    LGORT: maybeBlank(faker.helpers.arrayElement(STORAGE_LOCATIONS)),
    CHARG: maybeBlank(                                               // Batch number — not all materials are batch-managed
      Math.random() < 0.3 ? faker.string.alphanumeric(10).toUpperCase() : ''
    ),
    MENGE: receivedQty,
    MEINS: meins,
    DMBTR: amount,                                                   // Amount in local currency
    WAERS: waers,
    INSMK: faker.helpers.arrayElement(STOCK_TYPES),                 // Stock type (QI, blocked, unrestricted)
    LIFNR: maybeBlank(
      String(faker.number.int({ min: 1000000, max: 1099999 })).padStart(10, '0')
    ),
  };
}

function generateMSEG(rows, options = {}) {
  const grPool = options.grPool || [];   // Array of MKPF rows { MBLNR, MJAHR }
  const linesPerGR = options.linesPerGR || { min: 1, max: 5 };
  const result = [];

  if (grPool.length > 0) {
    for (const gr of grPool) {
      const lineCount = faker.number.int(linesPerGR);
      for (let i = 0; i < lineCount && result.length < rows; i++) {
        result.push(generateMSEGRow(i, gr.MBLNR, gr.MJAHR, options));
      }
    }
  } else {
    for (let i = 0; i < rows; i++) {
      const mblnr = String(5000000000 + faker.number.int({ min: 0, max: 99999 })).padStart(10, '0');
      const mjahr = String(faker.number.int({ min: 2022, max: 2025 }));
      result.push(generateMSEGRow(0, mblnr, mjahr, options));
    }
  }

  return result;
}

module.exports = { generateMSEG };
