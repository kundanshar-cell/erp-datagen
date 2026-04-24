const { faker } = require('@faker-js/faker');
const { buildWeightedVendorPool, tagVendorTiers, enrichVendorBehavior } = require('../utils/pareto');
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
  const vendTable = enrichVendorBehavior(tagVendorTiers(generateVendTable(vendorCount, { missingRate }), 'AccountNum'));
  // Dormant vendors: appear in master data but receive NO POs (contract expired / deactivated)
  const activeVendorIds = vendTable.filter(v => v.VENDOR_TIER !== 'Dormant').map(v => v.AccountNum);
  // Weighted pool: strategic vendors (top 20%) get 80% of PO assignments — Pareto distribution
  const weightedVendorPool = buildWeightedVendorPool(activeVendorIds);

  // --- Step 2: PO Headers (PurchTable) linked to vendors ---
  const poHeaderCount = Math.max(5, Math.floor(rows * 0.2));
  const purchTable = generatePurchTable(poHeaderCount, { missingRate, vendorPool: weightedVendorPool });

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
    PurchQty:   l.PurchQty,                                  // Ordered qty — invoice qty derives from this
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

  // --- Step 5: PO-backed Invoice Headers (VendInvoiceJour) ---
  const invoiceCount = Math.max(3, Math.floor(purchLine.length / 4));
  const invoiceJour = generateVendInvoiceJour(invoiceCount, {
    missingRate,
    vendorPool: weightedVendorPool,
    poPool: purchTable.map(h => ({
      PurchId:      h.PurchId,
      DataAreaId:   h.DataAreaId,
      OrderAccount: h.OrderAccount,
      CurrencyCode: h.CurrencyCode,
    })),
  });

  // --- Step 5b: Non-PO Invoice Headers (~20% of invoice volume) ---
  const nonPoInvoiceCount = Math.max(2, Math.floor(invoiceCount * 0.20));
  const nonPoInvoiceJour = generateVendInvoiceJour(nonPoInvoiceCount, {
    missingRate, vendorPool: weightedVendorPool, forceNonPO: true,
  });
  invoiceJour.push(...nonPoInvoiceJour);

  // --- Step 6: Invoice Lines (VendInvoiceTrans) ---
  // Pass IsCreditNote + IS_NON_PO_INVOICE from header so trans lines are consistent
  const invoiceTrans = generateVendInvoiceTrans(purchLine.length, {
    missingRate,
    invoicePool: invoiceJour.map(i => ({
      LedgerVoucher:       i.LedgerVoucher,
      DataAreaId:          i.DataAreaId,
      PurchId:             i.PurchId,
      InvoiceCurrencyCode: i.InvoiceCurrencyCode,
      IsCreditNote:        i.IsCreditNote,
      IS_NON_PO_INVOICE:   i.IS_NON_PO_INVOICE,
    })),
    poLinePool,
    linesPerInvoice: { min: 1, max: 6 },
  });

  // --- Step 7: Split invoices — ~5% of PO lines invoiced across 2 separate vouchers ---
  const splitCandidates = poLinePool.filter(() => Math.random() < 0.05);
  if (splitCandidates.length > 0 && invoiceJour.length >= 2) {
    splitCandidates.forEach(poLine => {
      const secondInv = faker.helpers.arrayElement(invoiceJour);
      const splitQty   = parseFloat((poLine.PurchQty * faker.number.float({ min: 0.30, max: 0.50, fractionDigits: 2 })).toFixed(2));
      const splitPrice = parseFloat((poLine.PurchPrice * (1 + (Math.random() * 0.01 - 0.005))).toFixed(2));
      invoiceTrans.push({
        LedgerVoucher:       secondInv.LedgerVoucher,
        LineNum:             invoiceTrans.filter(r => r.LedgerVoucher === secondInv.LedgerVoucher).length + 1,
        DataAreaId:          poLine.DataAreaId,
        PurchId:             poLine.PurchId,
        PurchLineNum:        poLine.LineNumber,
        ItemId:              faker.helpers.arrayElement([`D${faker.number.int({min:1000,max:9999})}`, faker.string.alphanumeric(8).toUpperCase()]),
        Name:                faker.commerce.productName(),
        ProcurementCategory: faker.helpers.arrayElement(['IT Equipment','Office Supplies','Maintenance','Services']),
        Qty:                 splitQty,
        Unit:                poLine.PurchUnit,
        Price:               splitPrice,
        LineAmount:          parseFloat((splitQty * splitPrice).toFixed(2)),
        CurrencyCode:        secondInv.InvoiceCurrencyCode,
        TaxGroup:            '',
        HasPriceVariance:    false,
        IsCreditLine:        false,
        IS_NON_PO_INVOICE:   false,
        IS_SPLIT_INVOICE:    true,                                   // Second invoice for same PO line
      });
    });
  }

  return { vendTable, purchTable, purchLine, packingSlipJour, invoiceJour, invoiceTrans };
}

module.exports = { runD365FullP2P };
