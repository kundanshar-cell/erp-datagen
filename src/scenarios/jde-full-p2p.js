const { faker } = require('@faker-js/faker');
const { generateF0101 } = require('../generators/jde/f0101');
const { generateF4301 } = require('../generators/jde/f4301');
const { generateF4311 } = require('../generators/jde/f4311');
const { generateF43121 } = require('../generators/jde/f43121');
const { generateF0411 } = require('../generators/jde/f0411');
const { buildWeightedVendorPool, tagVendorTiers } = require('../utils/pareto');

// Full P2P scenario for JDE E1
// Generates all 5 tables linked by real keys:
//   F0101 → F4301 (via VEND=AN8)
//   F4301 → F4311 (via DOCO+DCTO+KCOO)
//   F4311 → F43121 (via PDOC+PDCT+PLIN)
//   F4301 → F0411 (via PDOC, VEND)

function runJdeFullP2P(rows, options = {}) {
  const missingRate = options.missingRate || 0;

  // --- Step 1: Vendors (F0101) ---
  const vendorCount = Math.max(10, Math.floor(rows * 0.1));
  const f0101 = tagVendorTiers(generateF0101(vendorCount, { missingRate }), 'AN8');
  const vendorPool = f0101.map(v => v.AN8);
  // Weighted pool: strategic vendors (top 20%) get 80% of PO assignments — Pareto distribution
  const weightedVendorPool = buildWeightedVendorPool(vendorPool);

  // --- Step 2: PO Headers (F4301) linked to vendors ---
  const poHeaderCount = Math.max(5, Math.floor(rows * 0.2));
  const f4301 = generateF4301(poHeaderCount, { missingRate, vendorPool: weightedVendorPool });

  // --- Step 3: PO Lines (F4311) linked to F4301 ---
  const f4311 = generateF4311(rows, {
    missingRate,
    poPool: f4301.map(h => ({
      DOCO: h.DOCO,
      DCTO: h.DCTO,
      KCOO: h.KCOO,
      TRDJ: h.TRDJ,
      CRCD: h.CRCD,
    })),
    linesPerPO: { min: 1, max: 5 },
  });

  // Build PO line pool for GR and invoice linkage
  const poLinePool = f4311.map(l => ({
    DOCO: l.DOCO,
    DCTO: l.DCTO,
    KCOO: l.KCOO,
    LNID: l.LNID,
    ITM:  l.ITM,
    LITM: l.LITM,
    UOM:  l.UOM,
    UORG: l.UORG,                                            // Ordered qty — GR receipt derives from this
    PRRC: l.PRRC,
    AEXP: l.AEXP,                                            // Extended price — invoice amount derives from this
    CRCD: l.CRCD,
  }));

  // Compute PO total amounts for realistic invoice amounts in F0411
  const poTotalAmountMap = {};
  f4311.forEach(l => {
    if (!poTotalAmountMap[l.DOCO]) poTotalAmountMap[l.DOCO] = 0;
    poTotalAmountMap[l.DOCO] = parseFloat((poTotalAmountMap[l.DOCO] + l.AEXP).toFixed(2));
  });

  // --- Step 4: GR Lines (F43121) linked to F4311 ---
  // Roughly one receipt per 3 PO lines (partial deliveries common)
  const grCount = Math.max(3, Math.floor(f4311.length / 3) * 2);
  const f43121 = generateF43121(grCount, { missingRate, poLinePool });

  // --- Step 5: AP Invoices (F0411) linked to F4301 + vendors ---
  const invoiceCount = Math.max(3, Math.floor(f4311.length / 4));
  const f0411 = generateF0411(invoiceCount, {
    missingRate,
    vendorPool: weightedVendorPool,
    poPool: f4301,
    poTotalAmountMap,                                        // PO total amounts for realistic invoice amounts
  });

  return { f0101, f4301, f4311, f43121, f0411 };
}

module.exports = { runJdeFullP2P };
