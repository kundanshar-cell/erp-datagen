const { faker } = require('@faker-js/faker');
const { generateLFA1 } = require('../generators/sap-ecc/lfa1');
const { generateEKKO } = require('../generators/sap-ecc/ekko');
const { generateEKPO } = require('../generators/sap-ecc/ekpo');
const { generateMKPF } = require('../generators/sap-ecc/mkpf');
const { generateMSEG } = require('../generators/sap-ecc/mseg');
const { generateRBKP } = require('../generators/sap-ecc/rbkp');
const { generateRSEG } = require('../generators/sap-ecc/rseg');
const { buildWeightedVendorPool, tagVendorTiers } = require('../utils/pareto');

// Full P2P scenario for SAP ECC
// Generates all 7 tables linked by real keys:
//   LFA1 → EKKO → EKPO → MSEG (via MKPF)
//                       → RSEG (via RBKP)

function runFullP2P(rows, options = {}) {
  const missingRate = options.missingRate || 0;

  // --- Step 1: Vendors (LFA1) ---
  const vendorCount = Math.max(10, Math.floor(rows * 0.1));
  const lfa1 = tagVendorTiers(generateLFA1(vendorCount, { missingRate }), 'LIFNR');
  const vendorPool = lfa1.map(v => v.LIFNR);
  // Weighted pool: strategic vendors (top 20%) get 80% of PO assignments — Pareto distribution
  const weightedVendorPool = buildWeightedVendorPool(vendorPool);

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

  // --- Step 6: Invoice Headers (RBKP) linked to vendors ---
  // Roughly one invoice per 4 PO lines
  const invoiceHeaderCount = Math.max(3, Math.floor(ekpo.length / 4));
  const rbkp = generateRBKP(invoiceHeaderCount, { missingRate, vendorPool: weightedVendorPool });

  // --- Step 7: Invoice Lines (RSEG) linked to RBKP + EKPO ---
  const rseg = generateRSEG(ekpo.length, {
    missingRate,
    invoicePool: rbkp.map(i => ({ BELNR: i.BELNR, GJAHR: i.GJAHR, WAERS: i.WAERS })),
    poPool: poLinePool,
    linesPerInvoice: { min: 1, max: 6 },
  });

  return { lfa1, ekko, ekpo, mkpf, mseg, rbkp, rseg };
}

module.exports = { runFullP2P };
