const { faker } = require('@faker-js/faker');

// SAP ECC RSEG — Invoice Line Items (Logistics Invoice Verification)
// Each RSEG row links to RBKP via BELNR+GJAHR, and to PO via EBELN+EBELP

const TAX_CODES = ['V1', 'V2', 'V5', 'X0', 'I1', 'S1'];  // Common SAP tax codes
const GL_ACCOUNTS = ['400000', '410000', '420000', '500000', '510000', '600000'];

function padBuzei(num) {
  return String(num).padStart(5, '0');
}

function generateRSEGRow(lineIndex, belnr, gjahr, waers, options = {}) {
  const missingRate = options.missingRate || 0;
  const poPool = options.poPool || [];

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  let ebeln, ebelp, matnr, meins, poNetpr, poMenge;
  if (poPool.length > 0) {
    const poLine = faker.helpers.arrayElement(poPool);
    ebeln = poLine.EBELN;
    ebelp = poLine.EBELP;
    matnr = poLine.MATNR;
    meins = poLine.MEINS;
    poNetpr = poLine.NETPR;                                    // PO unit price — invoice must derive from this
    poMenge = poLine.MENGE;                                    // PO ordered qty — invoice qty is close to this
  } else {
    ebeln = String(4500000000 + faker.number.int({ min: 0, max: 99999 })).padStart(10, '0');
    ebelp = String((faker.number.int({ min: 1, max: 20 })) * 10).padStart(5, '0');
    matnr = `MAT-${faker.string.alphanumeric(6).toUpperCase()}`;
    meins = faker.helpers.arrayElement(['EA', 'KG', 'LTR', 'MTR', 'BOX']);
    poNetpr = faker.number.float({ min: 1, max: 50000, fractionDigits: 2 });
    poMenge = faker.number.float({ min: 1, max: 500, fractionDigits: 3 });
  }

  // Invoice qty: 80% full invoicing (95–100% of PO qty), 20% partial (50–95%)
  const isPartialInvoice = Math.random() < 0.20;
  const invoicedQty = parseFloat((poMenge * faker.number.float({
    min: isPartialInvoice ? 0.50 : 0.95,
    max: isPartialInvoice ? 0.95 : 1.00,
    fractionDigits: 3,
  })).toFixed(3));

  // Invoice unit price derived from PO price with realistic variance distribution:
  //   90%: exact match (within ±0.5%) — normal straight-through processing
  //    7%: small variance ±2%         — minor price discrepancy, within tolerance
  //    3%: outlier ±15%               — genuine price mismatch, triggers hold/dispute
  const varianceRoll = Math.random();
  let unitPrice, hasVariance;
  if (varianceRoll < 0.90) {
    unitPrice = parseFloat((poNetpr * (1 + (Math.random() * 0.01 - 0.005))).toFixed(2));
    hasVariance = false;
  } else if (varianceRoll < 0.97) {
    unitPrice = parseFloat((poNetpr * (1 + (Math.random() * 0.04 - 0.02))).toFixed(2));
    hasVariance = true;
  } else {
    unitPrice = parseFloat((poNetpr * (1 + (Math.random() * 0.30 - 0.15))).toFixed(2));
    hasVariance = true;
  }

  const lineAmount = parseFloat((invoicedQty * unitPrice).toFixed(2));
  const wrbtr = lineAmount;

  return {
    BELNR: belnr,
    GJAHR: gjahr,
    BUZEI: padBuzei(lineIndex + 1),
    EBELN: ebeln,
    EBELP: ebelp,
    MATNR: matnr,
    MENGE: invoicedQty,
    MEINS: meins,
    WRBTR: wrbtr,                                           // Invoiced amount
    WAERS: waers,
    MWSKZ: faker.helpers.arrayElement(TAX_CODES),          // Tax code
    SAKTO: maybeBlank(faker.helpers.arrayElement(GL_ACCOUNTS)),
    KZBEW: Math.random() < 0.05 ? 'X' : '',                // 5% subsequent debit/credit
    XNEGP: Math.random() < 0.03 ? 'X' : '',                // 3% negative posting (credit memo line)
    HASPRICEVAR: hasVariance,                               // True when invoice price deviates from PO price
  };
}

function generateRSEG(rows, options = {}) {
  const invoicePool = options.invoicePool || [];  // Array of RBKP rows { BELNR, GJAHR, WAERS }
  const linesPerInvoice = options.linesPerInvoice || { min: 1, max: 8 };
  const result = [];

  if (invoicePool.length > 0) {
    for (const inv of invoicePool) {
      const lineCount = faker.number.int(linesPerInvoice);
      for (let i = 0; i < lineCount && result.length < rows; i++) {
        result.push(generateRSEGRow(i, inv.BELNR, inv.GJAHR, inv.WAERS, options));
      }
    }
  } else {
    for (let i = 0; i < rows; i++) {
      const belnr = String(5100000000 + faker.number.int({ min: 0, max: 99999 })).padStart(10, '0');
      const gjahr = String(faker.number.int({ min: 2022, max: 2025 }));
      const waers = faker.helpers.arrayElement(['GBP', 'USD', 'EUR', 'INR']);
      result.push(generateRSEGRow(0, belnr, gjahr, waers, options));
    }
  }

  return result;
}

module.exports = { generateRSEG };
