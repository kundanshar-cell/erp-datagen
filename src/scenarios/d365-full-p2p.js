const { faker } = require('@faker-js/faker');
const { generateVendTable }           = require('../generators/d365/vendtable');
const { generatePurchTable }          = require('../generators/d365/purchtable');
const { generatePurchLine }           = require('../generators/d365/purchline');
const { generateVendPackingSlipJour } = require('../generators/d365/vendpackingslipjour');
const { generateVendInvoiceJour }     = require('../generators/d365/vendinvoicejour');
const { generateVendInvoiceTrans }    = require('../generators/d365/vendinvoicetrans');

// Full P2P scenario for D365 F&O
// Generates all 6 tables linked by real keys:
//   VendTable → PurchTable (via OrderAccount=AccountNum)
//   PurchTable → PurchLine (via PurchId+DataAreaId)
//   PurchTable → VendPackingSlipJour (via PurchId)
//   PurchTable → VendInvoiceJour (via PurchId+OrderAccount)
//   PurchLine → VendInvoiceTrans (via PurchId+LineNumber)
//   VendInvoiceJour → VendInvoiceTrans (via LedgerVoucher)

function runD365FullP2P(rows, options = {}) {
  const missingRate = options.missingRate || 0;

  // --- Step 1: Vendors (VendTable) ---
  const vendorCount = Math.max(10, Math.floor(rows * 0.1));
  const vendTable = generateVendTable(vendorCount, { missingRate });
  const vendorPool = vendTable.map(v => v.AccountNum);

  // --- Step 2: PO Headers (PurchTable) linked to vendors ---
  const poHeaderCount = Math.max(5, Math.floor(rows * 0.2));
  const purchTable = generatePurchTable(poHeaderCount, { missingRate, vendorPool });

  // --- Step 3: PO Lines (PurchLine) linked to PurchTable ---
  const purchLine = generatePurchLine(rows, {
    missingRate,
    poPool: purchTable.map(h => ({
      PurchId:      h.PurchId,
      DataAreaId:   h.DataAreaId,
      CurrencyCode: h.CurrencyCode,
      PurchDate:    h.PurchDate,
    })),
    linesPerPO: { min: 1, max: 5 },
  });

  // Build PO line pool for invoice linkage
  const poLinePool = purchLine.map(l => ({
    PurchId:    l.PurchId,
    LineNumber: l.LineNumber,
    DataAreaId: l.DataAreaId,
    ItemId:     l.ItemId,
    PurchUnit:  l.PurchUnit,
    PurchPrice: l.PurchPrice,
  }));

  // --- Step 4: GR Headers (VendPackingSlipJour) linked to PurchTable ---
  const grCount = Math.max(3, Math.floor(purchLine.length / 3));
  const packingSlipJour = generateVendPackingSlipJour(grCount, {
    missingRate,
    poPool: purchTable.map(h => ({
      PurchId:      h.PurchId,
      DataAreaId:   h.DataAreaId,
      OrderAccount: h.OrderAccount,
      CurrencyCode: h.CurrencyCode,
    })),
  });

  // --- Step 5: Invoice Headers (VendInvoiceJour) linked to PurchTable + vendors ---
  const invoiceCount = Math.max(3, Math.floor(purchLine.length / 4));
  const invoiceJour = generateVendInvoiceJour(invoiceCount, {
    missingRate,
    vendorPool,
    poPool: purchTable.map(h => ({
      PurchId:      h.PurchId,
      DataAreaId:   h.DataAreaId,
      OrderAccount: h.OrderAccount,
      CurrencyCode: h.CurrencyCode,
    })),
  });

  // --- Step 6: Invoice Lines (VendInvoiceTrans) linked to VendInvoiceJour + PurchLine ---
  const invoiceTrans = generateVendInvoiceTrans(purchLine.length, {
    missingRate,
    invoicePool: invoiceJour.map(i => ({
      LedgerVoucher:       i.LedgerVoucher,
      DataAreaId:          i.DataAreaId,
      PurchId:             i.PurchId,
      InvoiceCurrencyCode: i.InvoiceCurrencyCode,
    })),
    poLinePool,
    linesPerInvoice: { min: 1, max: 6 },
  });

  return { vendTable, purchTable, purchLine, packingSlipJour, invoiceJour, invoiceTrans };
}

module.exports = { runD365FullP2P };
