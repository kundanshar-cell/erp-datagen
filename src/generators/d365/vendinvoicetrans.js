const { faker } = require('@faker-js/faker');
const { pickCommodity, randomItem, randomUom, randomPrice, randomUnspsc } = require('../../utils/commodity');

// D365 F&O VendInvoiceTrans — Vendor Invoice Lines
// Links to VendInvoiceJour via LedgerVoucher+DataAreaId
//
// PO-backed lines:   PurchId + PurchLineNum set. Price derived from PO line price.
// Non-PO lines:      PurchId='', PurchLineNum=null. GL account used instead.
//                    Common for: subscriptions, rent, utilities, professional fees.
// Credit note lines: IsCreditLine=true, Qty and LineAmount are negative.
//                    Driven by parent VendInvoiceJour.IsCreditNote.

const GL_ACCOUNTS = ['400000','410000','420000','500000','510000','600000','620000','650000'];
const TAX_CODES   = ['STD', 'ZERO', 'EXEMPT', 'EU_RC', 'IMPORT'];

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
];

function generateTransPORow(lineIndex, ledgerVoucher, dataAreaId, currencyCode, isCreditNote, options = {}) {
  const missingRate = options.missingRate || 0;
  const maybeBlank  = (value) => Math.random() < missingRate ? '' : value;

  const poPurchPrice = options._poLine ? options._poLine.PurchPrice : faker.number.float({ min: 1, max: 50000, fractionDigits: 2 });
  const poPurchQty   = options._poLine ? options._poLine.PurchQty   : faker.number.float({ min: 1, max: 500, fractionDigits: 2 });

  // Invoice qty: 80% full (95–100% of PO qty), 20% partial (50–95%)
  const isPartial = Math.random() < 0.20;
  const invoicedQty = parseFloat((poPurchQty * faker.number.float({
    min: isPartial ? 0.50 : 0.95,
    max: isPartial ? 0.95 : 1.00,
    fractionDigits: 2,
  })).toFixed(2));

  // Price variance: 90% exact (±0.5%), 7% small (±2%), 3% outlier (±15%)
  const vr = Math.random();
  let unitPrice, hasVariance;
  if (vr < 0.90) {
    unitPrice = parseFloat((poPurchPrice * (1 + (Math.random() * 0.01 - 0.005))).toFixed(2));
    hasVariance = false;
  } else if (vr < 0.97) {
    unitPrice = parseFloat((poPurchPrice * (1 + (Math.random() * 0.04 - 0.02))).toFixed(2));
    hasVariance = true;
  } else {
    unitPrice = parseFloat((poPurchPrice * (1 + (Math.random() * 0.30 - 0.15))).toFixed(2));
    hasVariance = true;
  }

  const lineAmount = parseFloat((invoicedQty * unitPrice).toFixed(2));

  return {
    LedgerVoucher:       ledgerVoucher,
    LineNum:             lineIndex + 1,
    DataAreaId:          dataAreaId,
    PurchId:             options._poLine ? options._poLine.PurchId : '',
    PurchLineNum:        options._poLine ? options._poLine.LineNumber : null,
    ItemId:              options._poLine
      ? `D${faker.number.int({ min: 1000, max: 9999 })}`
      : faker.string.alphanumeric(8).toUpperCase(),
    Name:                faker.commerce.productName(),
    ProcurementCategory: options._poLine ? '' : faker.helpers.arrayElement(['IT Equipment','Office Supplies','Maintenance','Services']),
    Qty:                 isCreditNote ? -invoicedQty : invoicedQty,
    Unit:                options._poLine ? options._poLine.PurchUnit || 'ea' : 'ea',
    Price:               unitPrice,
    LineAmount:          isCreditNote ? -Math.abs(lineAmount) : lineAmount,
    CurrencyCode:        currencyCode,
    TaxGroup:            maybeBlank(faker.helpers.arrayElement(TAX_CODES)),
    HasPriceVariance:    hasVariance,
    IsCreditLine:        isCreditNote,   // Consistent with parent VendInvoiceJour.IsCreditNote
    IS_NON_PO_INVOICE:   false,
  };
}

function generateTransNonPORow(lineIndex, ledgerVoucher, dataAreaId, currencyCode, isCreditNote, options = {}) {
  const missingRate = options.missingRate || 0;
  const maybeBlank  = (value) => Math.random() < missingRate ? '' : value;

  const cat    = pickCommodity();
  const price  = randomPrice(cat);
  const amount = parseFloat(price.toFixed(2));

  const description = NON_PO_DESCRIPTIONS[Math.floor(Math.random() * NON_PO_DESCRIPTIONS.length)];

  return {
    LedgerVoucher:       ledgerVoucher,
    LineNum:             lineIndex + 1,
    DataAreaId:          dataAreaId,
    PurchId:             '',             // No PO reference
    PurchLineNum:        null,
    ItemId:              '',
    Name:                description,    // Expense description (not a product name)
    ProcurementCategory: cat.d365Cat,
    Qty:                 isCreditNote ? -1 : 1,   // Service/expense lines: qty=1
    Unit:                'ea',
    Price:               amount,
    LineAmount:          isCreditNote ? -amount : amount,
    CurrencyCode:        currencyCode,
    TaxGroup:            maybeBlank(faker.helpers.arrayElement(TAX_CODES)),
    HasPriceVariance:    false,           // No PO to compare against
    IsCreditLine:        isCreditNote,
    MainAccountId:       faker.helpers.arrayElement(GL_ACCOUNTS),   // GL account (non-PO only)
    UNSPSC_CODE:         randomUnspsc(cat),
    IS_NON_PO_INVOICE:   true,
  };
}

function generateVendInvoiceTrans(rows, options = {}) {
  const invoicePool     = options.invoicePool     || [];
  const poLinePool      = options.poLinePool      || [];
  const linesPerInvoice = options.linesPerInvoice || { min: 1, max: 8 };
  const result = [];

  if (invoicePool.length > 0) {
    for (const inv of invoicePool) {
      const lineCount    = faker.number.int(linesPerInvoice);
      const isNonPO      = inv.IS_NON_PO_INVOICE || false;
      const isCreditNote = inv.IsCreditNote       || false;

      for (let i = 0; i < lineCount && result.length < rows; i++) {
        if (isNonPO) {
          result.push(generateTransNonPORow(
            i, inv.LedgerVoucher, inv.DataAreaId, inv.InvoiceCurrencyCode, isCreditNote, options
          ));
        } else {
          const poLine = poLinePool.length > 0 ? faker.helpers.arrayElement(poLinePool) : null;
          result.push(generateTransPORow(
            i, inv.LedgerVoucher, inv.DataAreaId, inv.InvoiceCurrencyCode, isCreditNote,
            { ...options, _poLine: poLine }
          ));
        }
      }
    }
  } else {
    // Standalone generation
    for (let i = 0; i < rows; i++) {
      const voucher = `APINV-${String(faker.number.int({ min: 1, max: 9999 })).padStart(6, '0')}`;
      const purchId = `PO-${String(faker.number.int({ min: 1, max: 9999 })).padStart(6, '0')}`;
      result.push(generateTransPORow(
        0, voucher,
        faker.helpers.arrayElement(['USMF', 'GBSI', 'DEMF']),
        faker.helpers.arrayElement(['GBP', 'USD', 'EUR']),
        false, options
      ));
    }
  }

  return result;
}

module.exports = { generateVendInvoiceTrans };
