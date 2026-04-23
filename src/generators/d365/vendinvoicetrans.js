const { faker } = require('@faker-js/faker');

// D365 F&O VendInvoiceTrans — Vendor Invoice Lines
// Links to VendInvoiceJour via LedgerVoucher+DataAreaId and to PurchLine via PurchId+LineNumber

const UNITS = ['ea', 'kg', 'ltr', 'mtr', 'box', 'pcs', 'hr', 'day', 'cs'];
const PROC_CATEGORIES = ['IT Equipment', 'Office Supplies', 'Maintenance', 'Services',
                          'Raw Materials', 'Packaging', 'Logistics', 'Consultancy'];
const TAX_CODES = ['STD', 'ZERO', 'EXEMPT', 'EU_RC', 'IMPORT'];

function generateVendInvoiceTransRow(lineIndex, ledgerVoucher, dataAreaId, purchId,
  purchLineNum, currencyCode, options = {}) {
  const missingRate = options.missingRate || 0;

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  // Invoice qty and price must derive from PO line values (passed via poLine in the caller)
  // poLine fields expected: PurchPrice, PurchQty (injected by caller below)
  const poPurchPrice = options._poLine ? options._poLine.PurchPrice : faker.number.float({ min: 1, max: 50000, fractionDigits: 2 });
  const poPurchQty   = options._poLine ? options._poLine.PurchQty   : faker.number.float({ min: 1, max: 500, fractionDigits: 2 });

  // Invoice qty: 80% full (95–100% of PO qty), 20% partial (50–95%)
  const isPartialInvoice = Math.random() < 0.20;
  const invoicedQty = parseFloat((poPurchQty * faker.number.float({
    min: isPartialInvoice ? 0.50 : 0.95,
    max: isPartialInvoice ? 0.95 : 1.00,
    fractionDigits: 2,
  })).toFixed(2));

  // Invoice unit price derived from PO price:
  //   90%: exact match (within ±0.5%)
  //    7%: small variance ±2%
  //    3%: outlier ±15%
  const varianceRoll = Math.random();
  let unitPrice, hasVariance;
  if (varianceRoll < 0.90) {
    unitPrice = parseFloat((poPurchPrice * (1 + (Math.random() * 0.01 - 0.005))).toFixed(2));
    hasVariance = false;
  } else if (varianceRoll < 0.97) {
    unitPrice = parseFloat((poPurchPrice * (1 + (Math.random() * 0.04 - 0.02))).toFixed(2));
    hasVariance = true;
  } else {
    unitPrice = parseFloat((poPurchPrice * (1 + (Math.random() * 0.30 - 0.15))).toFixed(2));
    hasVariance = true;
  }

  const lineAmount = parseFloat((invoicedQty * unitPrice).toFixed(2));
  const actualAmount = lineAmount;

  return {
    LedgerVoucher:       ledgerVoucher,                         // Links to VendInvoiceJour
    LineNum:             lineIndex + 1,
    DataAreaId:          dataAreaId,
    PurchId:             purchId,                               // Links to PurchTable
    PurchLineNum:        purchLineNum,                          // Links to PurchLine.LineNumber
    ItemId:              faker.helpers.arrayElement([
                           `D${faker.number.int({ min: 1000, max: 9999 })}`,
                           `COMP-${faker.number.int({ min: 100, max: 9999 })}`,
                           faker.string.alphanumeric(8).toUpperCase(),
                         ]),
    Name:                faker.commerce.productName(),
    ProcurementCategory: faker.helpers.arrayElement(PROC_CATEGORIES),
    Qty:                 invoicedQty,
    Unit:                faker.helpers.arrayElement(UNITS),
    Price:               unitPrice,
    LineAmount:          actualAmount,
    CurrencyCode:        currencyCode,
    TaxGroup:            maybeBlank(faker.helpers.arrayElement(TAX_CODES)),
    HasPriceVariance:    hasVariance,
    IsCreditLine:        Math.random() < 0.04,                  // 4% credit lines
  };
}

function generateVendInvoiceTrans(rows, options = {}) {
  const invoicePool = options.invoicePool || [];
  const poLinePool  = options.poLinePool  || [];
  const linesPerInvoice = options.linesPerInvoice || { min: 1, max: 8 };
  const result = [];

  if (invoicePool.length > 0) {
    for (const inv of invoicePool) {
      const lineCount = faker.number.int(linesPerInvoice);
      for (let i = 0; i < lineCount && result.length < rows; i++) {
        const poLine = poLinePool.length > 0
          ? faker.helpers.arrayElement(poLinePool)
          : null;
        result.push(generateVendInvoiceTransRow(
          i,
          inv.LedgerVoucher,
          inv.DataAreaId,
          poLine ? poLine.PurchId : inv.PurchId,
          poLine ? poLine.LineNumber : faker.number.int({ min: 1, max: 10 }),
          inv.InvoiceCurrencyCode,
          { ...options, _poLine: poLine }            // Inject PO line price/qty for this row
        ));
      }
    }
  } else {
    for (let i = 0; i < rows; i++) {
      const voucher = `APINV-${String(faker.number.int({ min: 1, max: 9999 })).padStart(6, '0')}`;
      const purchId = `PO-${String(faker.number.int({ min: 1, max: 9999 })).padStart(6, '0')}`;
      result.push(generateVendInvoiceTransRow(
        0, voucher,
        faker.helpers.arrayElement(['USMF', 'GBSI', 'DEMF']),
        purchId,
        faker.number.int({ min: 1, max: 10 }),
        faker.helpers.arrayElement(['GBP', 'USD', 'EUR']),
        options
      ));
    }
  }

  return result;
}

module.exports = { generateVendInvoiceTrans };
