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

  const invoicedQty = faker.number.float({ min: 1, max: 500, fractionDigits: 2 });
  const unitPrice = faker.number.float({ min: 1, max: 50000, fractionDigits: 2 });
  const lineAmount = parseFloat((invoicedQty * unitPrice).toFixed(2));

  // Price variance on 10% of lines — invoice vs PO price mismatch
  const hasVariance = Math.random() < 0.10;
  const actualAmount = hasVariance
    ? parseFloat((lineAmount * faker.number.float({ min: 0.90, max: 1.10, fractionDigits: 4 })).toFixed(2))
    : lineAmount;

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
          options
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
