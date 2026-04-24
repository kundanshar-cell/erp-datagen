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
  const grPool = options.grPool || [];    // All GR headers — used to reference original doc in reversals

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  // Pick a PO line to receive against, or generate standalone
  let ebeln, ebelp, matnr, meins, waers, werks, unitPrice, poOrderedQty;
  if (poPool.length > 0) {
    const poLine = faker.helpers.arrayElement(poPool);
    ebeln = poLine.EBELN;
    ebelp = poLine.EBELP;
    matnr = poLine.MATNR;
    meins = poLine.MEINS;
    waers = poLine.WAERS;
    werks = poLine.WERKS;
    unitPrice = poLine.NETPR;
    poOrderedQty = poLine.MENGE;                               // Ordered qty from PO line
  } else {
    ebeln = String(4500000000 + faker.number.int({ min: 0, max: 99999 })).padStart(10, '0');
    ebelp = String((faker.number.int({ min: 1, max: 20 })) * 10).padStart(5, '0');
    matnr = `MAT-${faker.string.alphanumeric(6).toUpperCase()}`;
    meins = faker.helpers.arrayElement(['EA', 'KG', 'LTR', 'MTR', 'BOX']);
    waers = faker.helpers.arrayElement(['GBP', 'USD', 'EUR', 'INR']);
    werks = faker.helpers.arrayElement(PLANT_CODES);
    unitPrice = faker.number.float({ min: 1, max: 50000, fractionDigits: 2 });
    poOrderedQty = faker.number.float({ min: 1, max: 500, fractionDigits: 3 });
  }

  // Partial deliveries — receive 60–100% of PO ordered qty (realistic; 20% min was too low)
  const orderedQty = poOrderedQty;
  const receivedQty = parseFloat((orderedQty * faker.number.float({ min: 0.6, max: 1.0, fractionDigits: 2 })).toFixed(3));
  const amount = parseFloat((receivedQty * unitPrice).toFixed(2));

  // 5% chance of reversal — 102 (simple reversal) is 4x more common than 122 (return to vendor)
  const isReversal = Math.random() < 0.05;
  const bwart = isReversal
    ? (Math.random() < 0.80 ? '102' : '122')
    : '101';

  // SMBLN: reference to the original GR document being reversed
  // Pick any other GR in the pool — in real SAP this is the specific doc being cancelled
  const otherGRs = grPool.filter(g => g.MBLNR !== mblnr);
  const smbln = isReversal && otherGRs.length > 0
    ? faker.helpers.arrayElement(otherGRs).MBLNR
    : '';

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
    CHARG: maybeBlank(
      Math.random() < 0.3 ? faker.string.alphanumeric(10).toUpperCase() : ''
    ),
    MENGE: receivedQty,
    MEINS: meins,
    DMBTR: amount,
    WAERS: waers,
    INSMK: faker.helpers.arrayElement(STOCK_TYPES),
    LIFNR: maybeBlank(
      String(faker.number.int({ min: 1000000, max: 1099999 })).padStart(10, '0')
    ),
    SMBLN: smbln,                                                    // Original GR document (for reversals)
    STORNO: isReversal ? 'X' : '',                                   // Reversal indicator
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
