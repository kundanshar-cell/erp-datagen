const { faker } = require('@faker-js/faker');
const { pickCommodity, randomItem, randomPrice, randomUnspsc } = require('../../utils/commodity');

// SAP ECC RSEG — Invoice Line Items (Logistics Invoice Verification)
// Each RSEG row links to RBKP via BELNR+GJAHR
//
// Two modes driven by the invoice header:
//
//   PO-backed (IS_NON_PO_INVOICE=false):
//     Links to EKPO via EBELN+EBELP. Price derived from PO price.
//     Used for standard goods/services purchased against a PO.
//
//   Non-PO (IS_NON_PO_INVOICE=true):
//     EBELN/EBELP are blank. SAKTO (GL account) is the only expense reference.
//     Common for: rent, utilities, subscriptions, professional fees, travel.
//     MENGE=0 (no quantity — pure GL expense posting).
//
//   Credit memo lines (IS_CREDIT_LINE=true):
//     WRBTR is negative. XNEGP='X'. Either PO-backed or non-PO.

const TAX_CODES = ['V1', 'V2', 'V5', 'X0', 'I1', 'S1'];
const GL_ACCOUNTS = ['400000','410000','420000','500000','510000','600000','620000','650000'];

// GL account descriptions for non-PO invoices — realistic expense categories
const NON_PO_DESCRIPTIONS = [
  'Office Rent Monthly Invoice',
  'Electricity Supply Invoice',
  'Software Subscription Annual',
  'Legal Advisory Services',
  'Accounting and Audit Fees',
  'Internet and Telecoms Services',
  'Business Insurance Premium',
  'Building Maintenance Services',
  'HR Consulting Retainer',
  'Cloud Hosting Monthly Fee',
  'Courier and Postage Services',
  'Company Vehicle Lease',
];

function padBuzei(num) {
  return String(num).padStart(5, '0');
}

function generateRSEGPORow(lineIndex, belnr, gjahr, waers, isCreditLine, options = {}) {
  const missingRate = options.missingRate || 0;
  const poPool = options.poPool || [];

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  let ebeln, ebelp, matnr, meins, poNetpr, poMenge;
  if (poPool.length > 0) {
    const poLine = faker.helpers.arrayElement(poPool);
    ebeln   = poLine.EBELN;
    ebelp   = poLine.EBELP;
    matnr   = poLine.MATNR;
    meins   = poLine.MEINS;
    poNetpr = poLine.NETPR;
    poMenge = poLine.MENGE;
  } else {
    ebeln   = String(4500000000 + faker.number.int({ min: 0, max: 99999 })).padStart(10, '0');
    ebelp   = String((faker.number.int({ min: 1, max: 20 })) * 10).padStart(5, '0');
    matnr   = `MAT-${faker.string.alphanumeric(6).toUpperCase()}`;
    meins   = faker.helpers.arrayElement(['EA', 'KG', 'LTR', 'MTR', 'BOX']);
    poNetpr = faker.number.float({ min: 1, max: 50000, fractionDigits: 2 });
    poMenge = faker.number.float({ min: 1, max: 500, fractionDigits: 3 });
  }

  // Invoice qty: 80% full (95–100% of PO qty), 20% partial (50–95%)
  const isPartial = Math.random() < 0.20;
  const invoicedQty = parseFloat((poMenge * faker.number.float({
    min: isPartial ? 0.50 : 0.95,
    max: isPartial ? 0.95 : 1.00,
    fractionDigits: 3,
  })).toFixed(3));

  // Invoice price with realistic variance:
  //   90%: ±0.5% (straight-through), 7%: ±2% (minor), 3%: ±15% (dispute)
  const vr = Math.random();
  let unitPrice, hasVariance;
  if (vr < 0.90) {
    unitPrice = parseFloat((poNetpr * (1 + (Math.random() * 0.01 - 0.005))).toFixed(2));
    hasVariance = false;
  } else if (vr < 0.97) {
    unitPrice = parseFloat((poNetpr * (1 + (Math.random() * 0.04 - 0.02))).toFixed(2));
    hasVariance = true;
  } else {
    unitPrice = parseFloat((poNetpr * (1 + (Math.random() * 0.30 - 0.15))).toFixed(2));
    hasVariance = true;
  }

  const wrbtr = parseFloat((invoicedQty * unitPrice).toFixed(2));

  return {
    BELNR: belnr,
    GJAHR: gjahr,
    BUZEI: padBuzei(lineIndex + 1),
    EBELN: ebeln,
    EBELP: ebelp,
    MATNR: matnr,
    MENGE: isCreditLine ? -invoicedQty : invoicedQty,
    MEINS: meins,
    WRBTR: isCreditLine ? -Math.abs(wrbtr) : wrbtr,
    WAERS: waers,
    MWSKZ: faker.helpers.arrayElement(TAX_CODES),
    SAKTO: maybeBlank(faker.helpers.arrayElement(GL_ACCOUNTS)),
    KZBEW: Math.random() < 0.05 ? 'X' : '',
    XNEGP: isCreditLine ? 'X' : '',
    HASPRICEVAR: hasVariance,
    IS_CREDIT_LINE:    isCreditLine,
    IS_NON_PO_INVOICE: false,
  };
}

function generateRSEGNonPORow(lineIndex, belnr, gjahr, waers, isCreditLine, options = {}) {
  const missingRate = options.missingRate || 0;
  const maybeBlank = (value) => Math.random() < missingRate ? '' : value;

  // Non-PO invoices use commodity catalogue for realistic descriptions and amounts
  const cat    = pickCommodity();
  const amount = randomPrice(cat) * faker.number.float({ min: 1, max: 10, fractionDigits: 1 });
  const wrbtr  = parseFloat(amount.toFixed(2));

  // Use a curated description for non-PO realism (not product names)
  const description = NON_PO_DESCRIPTIONS[Math.floor(Math.random() * NON_PO_DESCRIPTIONS.length)];

  return {
    BELNR: belnr,
    GJAHR: gjahr,
    BUZEI: padBuzei(lineIndex + 1),
    EBELN: '',                                               // No PO reference
    EBELP: '',
    MATNR: '',                                               // No material number
    MENGE: 0,                                                // Services/expenses: no qty
    MEINS: '',
    WRBTR: isCreditLine ? -Math.abs(wrbtr) : wrbtr,
    WAERS: waers,
    MWSKZ: maybeBlank(faker.helpers.arrayElement(TAX_CODES)),
    SAKTO: faker.helpers.arrayElement(GL_ACCOUNTS),          // GL account is mandatory for non-PO
    KZBEW: '',
    XNEGP: isCreditLine ? 'X' : '',
    HASPRICEVAR: false,                                      // No PO to compare against
    SGTXT: description,                                      // Line text (SAP posting text)
    UNSPSC_CODE: randomUnspsc(cat),
    IS_CREDIT_LINE:    isCreditLine,
    IS_NON_PO_INVOICE: true,
  };
}

function generateRSEG(rows, options = {}) {
  const invoicePool     = options.invoicePool     || [];
  const linesPerInvoice = options.linesPerInvoice || { min: 1, max: 8 };
  const result = [];

  if (invoicePool.length > 0) {
    for (const inv of invoicePool) {
      const lineCount    = faker.number.int(linesPerInvoice);
      const isNonPO      = inv.IS_NON_PO_INVOICE || false;
      const isCreditMemo = inv.IS_CREDIT_MEMO     || false;

      for (let i = 0; i < lineCount && result.length < rows; i++) {
        if (isNonPO) {
          result.push(generateRSEGNonPORow(i, inv.BELNR, inv.GJAHR, inv.WAERS, isCreditMemo, options));
        } else {
          result.push(generateRSEGPORow(i, inv.BELNR, inv.GJAHR, inv.WAERS, isCreditMemo, options));
        }
      }
    }
  } else {
    // Standalone generation
    for (let i = 0; i < rows; i++) {
      const belnr = String(5100000000 + faker.number.int({ min: 0, max: 99999 })).padStart(10, '0');
      const gjahr = String(faker.number.int({ min: 2022, max: 2025 }));
      const waers = faker.helpers.arrayElement(['GBP', 'USD', 'EUR', 'INR']);
      result.push(generateRSEGPORow(0, belnr, gjahr, waers, false, options));
    }
  }

  return result;
}

module.exports = { generateRSEG };
