const { faker } = require('@faker-js/faker');
const { generateLFA1 } = require('../generators/sap-ecc/lfa1');
const { generateEKKO } = require('../generators/sap-ecc/ekko');
const { generateEKPO } = require('../generators/sap-ecc/ekpo');
const { generateMKPF } = require('../generators/sap-ecc/mkpf');
const { generateMSEG } = require('../generators/sap-ecc/mseg');
const { generateRBKP } = require('../generators/sap-ecc/rbkp');
const { generateRSEG } = require('../generators/sap-ecc/rseg');
const { buildWeightedVendorPool, tagVendorTiers, enrichVendorBehavior } = require('../utils/pareto');

// Full P2P scenario for SAP ECC
// Generates all 7 tables linked by real keys:
//   LFA1 → EKKO → EKPO → MSEG (via MKPF)
//                       → RSEG (via RBKP)

function runFullP2P(rows, options = {}) {
  const missingRate = options.missingRate || 0;

  // --- Step 1: Vendors (LFA1) ---
  const vendorCount = Math.max(10, Math.floor(rows * 0.1));
  const lfa1 = enrichVendorBehavior(tagVendorTiers(generateLFA1(vendorCount, { missingRate }), 'LIFNR'));
  // Dormant vendors: appear in master data but receive NO POs (contract expired / deactivated)
  const activeVendorIds = lfa1.filter(v => v.VENDOR_TIER !== 'Dormant').map(v => v.LIFNR);
  // Weighted pool: strategic vendors (top 20%) get 80% of PO assignments — Pareto distribution
  const weightedVendorPool = buildWeightedVendorPool(activeVendorIds);

  // --- Step 2: PO Headers (EKKO) linked to vendors ---
  const poHeaderCount = Math.max(5, Math.floor(rows * 0.2));
  const ekko = generateEKKO(poHeaderCount, { missingRate, vendorPool: weightedVendorPool });

  // --- Step 3: PO Lines (EKPO) linked to EKKO ---
  // Each PO gets 1–5 lines, total capped at rows
  const ekpo = generateEKPO(rows, {
    missingRate,
    poPool: ekko.map(h => ({
      EBELN: h.EBELN,
      BEDAT: h.BEDAT,
      WAERS: h.WAERS,
      BUKRS: h.BUKRS,   // Thread company code so EKPO.WERKS is from the correct plant list
    })),
    linesPerPO: { min: 1, max: 5 },
  });

  // Build a PO line pool for GR and invoice linkage
  const poLinePool = ekpo.map(l => ({
    EBELN: l.EBELN,
    EBELP: l.EBELP,
    MATNR: l.MATNR,
    MENGE: l.MENGE,
    MEINS: l.MEINS,
    NETPR: l.NETPR,
    WAERS: l.WAERS,
    WERKS: l.WERKS,
  }));

  // --- Step 4: GR Headers (MKPF) ---
  // Roughly one GR per 3 PO lines (partial deliveries are common)
  const grHeaderCount = Math.max(3, Math.floor(ekpo.length / 3));
  const mkpf = generateMKPF(grHeaderCount, { missingRate });

  // --- Step 5: GR Lines (MSEG) linked to MKPF + EKPO ---
  const mseg = generateMSEG(ekpo.length, {
    missingRate,
    grPool: mkpf.map(g => ({ MBLNR: g.MBLNR, MJAHR: g.MJAHR })),
    poPool: poLinePool,
    linesPerGR: { min: 1, max: 4 },
  });

  // --- Step 6: PO-backed Invoice Headers (RBKP) ---
  // Roughly one invoice per 4 PO lines
  const invoiceHeaderCount = Math.max(3, Math.floor(ekpo.length / 4));
  const usedBukrs = [...new Set(ekko.map(h => h.BUKRS))];
  const rbkp = generateRBKP(invoiceHeaderCount, { missingRate, vendorPool: weightedVendorPool, companyCodePool: usedBukrs });

  // --- Step 7: PO-backed Invoice Lines (RSEG) ---
  const rseg = generateRSEG(ekpo.length, {
    missingRate,
    invoicePool: rbkp.map(i => ({
      BELNR: i.BELNR, GJAHR: i.GJAHR, WAERS: i.WAERS,
      IS_CREDIT_MEMO: i.IS_CREDIT_MEMO, IS_NON_PO_INVOICE: false,
    })),
    poPool: poLinePool,
    linesPerInvoice: { min: 1, max: 6 },
  });

  // --- Step 7b: Non-PO Invoice Headers + Lines (~20% of invoice volume) ---
  // Rent, utilities, subscriptions, professional fees — no EKKO/EKPO backing
  const nonPoInvoiceCount = Math.max(2, Math.floor(invoiceHeaderCount * 0.20));
  const nonPoRbkp = generateRBKP(nonPoInvoiceCount, {
    missingRate, vendorPool: weightedVendorPool, companyCodePool: usedBukrs, forceNonPO: true,
  });
  const nonPoRseg = generateRSEG(nonPoInvoiceCount * 2, {
    missingRate,
    invoicePool: nonPoRbkp.map(i => ({
      BELNR: i.BELNR, GJAHR: i.GJAHR, WAERS: i.WAERS,
      IS_CREDIT_MEMO: i.IS_CREDIT_MEMO, IS_NON_PO_INVOICE: true,
    })),
    // No poPool — GL-only lines
    linesPerInvoice: { min: 1, max: 3 },
  });

  // Merge PO-backed and non-PO invoices into single tables
  rbkp.push(...nonPoRbkp);
  rseg.push(...nonPoRseg);

  // --- Step 8: Split invoices — ~5% of PO lines invoiced across 2 separate invoice documents ---
  // Real scenario: vendor sends partial invoice first, remaining balance on a second invoice.
  // Both RSEG rows share the same EBELN+EBELP but have different BELNR.
  const splitCandidates = poLinePool.filter(() => Math.random() < 0.05);
  if (splitCandidates.length > 0 && rbkp.length >= 2) {
    for (const poLine of splitCandidates) {
      // Pick a different invoice header for the second invoice
      const secondInv = faker.helpers.arrayElement(rbkp);
      const splitQty = parseFloat((poLine.MENGE * faker.number.float({ min: 0.30, max: 0.50, fractionDigits: 3 })).toFixed(3));
      const splitPrice = parseFloat((poLine.NETPR * (1 + (Math.random() * 0.01 - 0.005))).toFixed(2));
      rseg.push({
        BELNR:      secondInv.BELNR,
        GJAHR:      secondInv.GJAHR,
        BUZEI:      String(rseg.filter(r => r.BELNR === secondInv.BELNR).length + 1).padStart(5, '0'),
        EBELN:      poLine.EBELN,
        EBELP:      poLine.EBELP,
        MATNR:      poLine.MATNR,
        MENGE:      splitQty,
        MEINS:      poLine.MEINS,
        WRBTR:      parseFloat((splitQty * splitPrice).toFixed(2)),
        WAERS:      poLine.WAERS,
        MWSKZ:      faker.helpers.arrayElement(['V1', 'V2', 'V5', 'X0']),
        SAKTO:      '',
        KZBEW:      '',
        XNEGP:      '',
        HASPRICEVAR: false,
        IS_CREDIT_LINE:    false,
        IS_NON_PO_INVOICE: false,
        IS_SPLIT_INVOICE: true,                                      // Second invoice for same PO line
      });
    }
  }

  return { lfa1, ekko, ekpo, mkpf, mseg, rbkp, rseg };
}

module.exports = { runFullP2P };
