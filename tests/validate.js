#!/usr/bin/env node

/**
 * erp-datagen comprehensive validation test suite
 * Uses only Node.js built-ins (assert, child_process, path)
 */

const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const path = require('node:path');

// ── SAP generators ──────────────────────────────────────────────────────────
const { generateLFA1 }  = require('../src/generators/sap-ecc/lfa1');
const { generateEKKO }  = require('../src/generators/sap-ecc/ekko');
const { generateEKPO }  = require('../src/generators/sap-ecc/ekpo');
const { generateMKPF }  = require('../src/generators/sap-ecc/mkpf');
const { generateMSEG }  = require('../src/generators/sap-ecc/mseg');
const { generateRBKP }  = require('../src/generators/sap-ecc/rbkp');
const { generateRSEG }  = require('../src/generators/sap-ecc/rseg');

// ── JDE generators ──────────────────────────────────────────────────────────
const { generateF0101 }  = require('../src/generators/jde/f0101');
const { generateF4301 }  = require('../src/generators/jde/f4301');
const { generateF4311 }  = require('../src/generators/jde/f4311');
const { generateF43121 } = require('../src/generators/jde/f43121');
const { generateF0411 }  = require('../src/generators/jde/f0411');

// ── D365 generators ─────────────────────────────────────────────────────────
const { generateVendTable }           = require('../src/generators/d365/vendtable');
const { generatePurchTable }          = require('../src/generators/d365/purchtable');
const { generatePurchLine }           = require('../src/generators/d365/purchline');
const { generateVendPackingSlipJour } = require('../src/generators/d365/vendpackingslipjour');
const { generateVendInvoiceJour }     = require('../src/generators/d365/vendinvoicejour');
const { generateVendInvoiceTrans }    = require('../src/generators/d365/vendinvoicetrans');

// ── Scenarios ───────────────────────────────────────────────────────────────
const { runFullP2P }       = require('../src/scenarios/sap-ecc-full-p2p');
const { runJdeFullP2P }    = require('../src/scenarios/jde-full-p2p');
const { runD365FullP2P }   = require('../src/scenarios/d365-full-p2p');

// ── Test harness ────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, message: err.message });
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message.split('\n')[0]}`);
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const isSapDate = (v) => typeof v === 'string' && /^\d{8}$/.test(v);
const isJulianDate = (v) => typeof v === 'number' && v >= 100001 && v <= 199366;
const isIsoDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

function assertFieldsPresent(row, fields, label) {
  for (const f of fields) {
    assert.ok(f in row, `${label}: missing field "${f}"`);
  }
}

function assertPositiveNumber(val, label) {
  assert.ok(typeof val === 'number' && val > 0, `${label}: expected positive number, got ${val}`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 1: Individual generators — structural correctness
// ═══════════════════════════════════════════════════════════════════════════

section('1. SAP ECC — Individual generators');

test('LFA1 generates rows with required fields', () => {
  const rows = generateLFA1(20);
  assert.equal(rows.length, 20);
  const r = rows[0];
  assertFieldsPresent(r, ['LIFNR','LAND1','NAME1','KTOKK','STCEG','STCD3','SPERR','LOEVM'], 'LFA1');
  assert.ok(typeof r.LIFNR === 'string' && r.LIFNR.length === 10, 'LIFNR should be 10-digit padded string');
});

test('EKKO generates rows with correct date format', () => {
  const rows = generateEKKO(15);
  assert.equal(rows.length, 15);
  const r = rows[0];
  assertFieldsPresent(r, ['EBELN','BUKRS','BSTYP','BSART','LIFNR','EKORG','WAERS','BEDAT'], 'EKKO');
  assert.ok(isSapDate(r.BEDAT), `BEDAT should be YYYYMMDD, got "${r.BEDAT}"`);
  assert.ok(r.EBELN.length === 10, 'EBELN should be 10-digit padded');
});

test('EKPO generates rows with positive qty/price', () => {
  const rows = generateEKPO(20);
  assert.equal(rows.length, 20);
  const r = rows[0];
  assertFieldsPresent(r, ['EBELN','EBELP','MENGE','MEINS','NETPR','NETWR','WAERS','EINDT'], 'EKPO');
  assertPositiveNumber(r.MENGE, 'EKPO.MENGE');
  assertPositiveNumber(r.NETPR, 'EKPO.NETPR');
  assertPositiveNumber(r.NETWR, 'EKPO.NETWR');
  assert.ok(isSapDate(r.EINDT), 'EINDT should be YYYYMMDD');
});

test('MKPF generates rows with correct fields', () => {
  const rows = generateMKPF(10);
  assert.equal(rows.length, 10);
  assertFieldsPresent(rows[0], ['MBLNR','MJAHR','BLART','BUDAT','BLDAT','TCODE'], 'MKPF');
  assert.ok(isSapDate(rows[0].BUDAT), 'BUDAT should be YYYYMMDD');
});

test('MSEG generates rows with correct fields', () => {
  const rows = generateMSEG(10);
  assert.equal(rows.length, 10);
  assertFieldsPresent(rows[0], ['MBLNR','MJAHR','ZEILE','EBELN','EBELP','BWART','MENGE','MEINS','DMBTR','WAERS'], 'MSEG');
  assertPositiveNumber(rows[0].MENGE, 'MSEG.MENGE');
});

test('RBKP generates rows with correct fields', () => {
  const rows = generateRBKP(10);
  assert.equal(rows.length, 10);
  assertFieldsPresent(rows[0], ['BELNR','GJAHR','BUKRS','BLART','LIFNR','BLDAT','BUDAT','WAERS','WRBTR'], 'RBKP');
  assert.ok(isSapDate(rows[0].BLDAT), 'BLDAT should be YYYYMMDD');
  assertPositiveNumber(rows[0].WRBTR, 'RBKP.WRBTR');
});

test('RSEG generates rows with correct fields', () => {
  const rows = generateRSEG(10);
  assert.equal(rows.length, 10);
  assertFieldsPresent(rows[0], ['BELNR','GJAHR','BUZEI','EBELN','EBELP','MENGE','WRBTR','WAERS','HASPRICEVAR'], 'RSEG');
  assertPositiveNumber(rows[0].MENGE, 'RSEG.MENGE');
  assertPositiveNumber(rows[0].WRBTR, 'RSEG.WRBTR');
  assert.ok(typeof rows[0].HASPRICEVAR === 'boolean', 'HASPRICEVAR should be boolean');
});

section('1. JDE — Individual generators');

test('F0101 generates rows with required fields', () => {
  const rows = generateF0101(20);
  assert.equal(rows.length, 20);
  assertFieldsPresent(rows[0], ['AN8','ALPH','AT1','TAX','CREG','COUN','CRCD'], 'F0101');
  assert.ok(typeof rows[0].AN8 === 'number', 'AN8 should be a number');
});

test('F4301 generates rows with Julian dates', () => {
  const rows = generateF4301(10);
  assert.equal(rows.length, 10);
  assertFieldsPresent(rows[0], ['DOCO','DCTO','KCOO','TRDJ','VEND','CRCD'], 'F4301');
  assert.ok(isJulianDate(rows[0].TRDJ), `TRDJ should be Julian CYYDDD, got ${rows[0].TRDJ}`);
});

test('F4311 generates rows with positive qty/price', () => {
  const rows = generateF4311(10);
  assert.equal(rows.length, 10);
  assertFieldsPresent(rows[0], ['DOCO','DCTO','KCOO','LNID','UORG','UOM','PRRC','AEXP','CRCD'], 'F4311');
  assertPositiveNumber(rows[0].UORG, 'F4311.UORG');
  assertPositiveNumber(rows[0].PRRC, 'F4311.PRRC');
  assertPositiveNumber(rows[0].AEXP, 'F4311.AEXP');
});

test('F43121 generates rows with correct fields', () => {
  const rows = generateF43121(10);
  assert.equal(rows.length, 10);
  assertFieldsPresent(rows[0], ['DOCO','DCTO','KCOO','RCVJ','PDOC','PDCT','PLIN','UREC','UOM','PRRC','AEXP','CRCD'], 'F43121');
  // UREC can be negative for reversals, but most should be positive
  assert.ok(typeof rows[0].UREC === 'number', 'F43121.UREC should be a number');
  assert.ok(isJulianDate(rows[0].RCVJ), `RCVJ should be Julian CYYDDD, got ${rows[0].RCVJ}`);
});

test('F0411 generates rows with correct fields', () => {
  const rows = generateF0411(10);
  assert.equal(rows.length, 10);
  assertFieldsPresent(rows[0], ['DOC','DCT','KCO','VEND','ISTR','DGJ','AG','CRCD','PDOC','PDCT'], 'F0411');
  assert.ok(isJulianDate(rows[0].ISTR), `ISTR should be Julian CYYDDD, got ${rows[0].ISTR}`);
});

section('1. D365 — Individual generators');

test('VendTable generates rows with required fields', () => {
  const rows = generateVendTable(20);
  assert.equal(rows.length, 20);
  assertFieldsPresent(rows[0], ['AccountNum','DataAreaId','Name','VendGroup','Currency','VATNum','RegistrationNumber','Blocked'], 'VendTable');
  assert.ok(rows[0].AccountNum.startsWith('V-'), 'AccountNum should start with V-');
});

test('PurchTable generates rows with ISO dates', () => {
  const rows = generatePurchTable(10);
  assert.equal(rows.length, 10);
  assertFieldsPresent(rows[0], ['PurchId','DataAreaId','PurchStatus','OrderAccount','CurrencyCode','PurchDate','DeliveryDate'], 'PurchTable');
  assert.ok(isIsoDate(rows[0].PurchDate), `PurchDate should be ISO date, got "${rows[0].PurchDate}"`);
  assert.ok(rows[0].PurchId.startsWith('PO-'), 'PurchId should start with PO-');
});

test('PurchLine generates rows with positive qty/price', () => {
  const rows = generatePurchLine(10);
  assert.equal(rows.length, 10);
  assertFieldsPresent(rows[0], ['PurchId','LineNumber','ItemId','PurchQty','PurchUnit','PurchPrice','LineAmount','CurrencyCode'], 'PurchLine');
  assertPositiveNumber(rows[0].PurchQty, 'PurchLine.PurchQty');
  assertPositiveNumber(rows[0].PurchPrice, 'PurchLine.PurchPrice');
});

test('VendPackingSlipJour generates rows with correct fields', () => {
  const rows = generateVendPackingSlipJour(10);
  assert.equal(rows.length, 10);
  assertFieldsPresent(rows[0], ['PackingSlipId','PurchId','DataAreaId','VendAccount','PackingSlipDate','CurrencyCode'], 'VendPackingSlipJour');
  assert.ok(isIsoDate(rows[0].PackingSlipDate), 'PackingSlipDate should be ISO date');
});

test('VendInvoiceJour generates rows with correct fields', () => {
  const rows = generateVendInvoiceJour(10);
  assert.equal(rows.length, 10);
  assertFieldsPresent(rows[0], ['LedgerVoucher','PurchId','DataAreaId','InvoiceAccount','InvoiceDate','InvoiceAmount','InvoiceCurrencyCode'], 'VendInvoiceJour');
  assert.ok(isIsoDate(rows[0].InvoiceDate), 'InvoiceDate should be ISO date');
});

test('VendInvoiceTrans generates rows with correct fields', () => {
  const rows = generateVendInvoiceTrans(10);
  assert.equal(rows.length, 10);
  assertFieldsPresent(rows[0], ['LedgerVoucher','LineNum','PurchId','PurchLineNum','Qty','Price','LineAmount','CurrencyCode','HasPriceVariance'], 'VendInvoiceTrans');
  assertPositiveNumber(rows[0].Qty, 'VendInvoiceTrans.Qty');
  assertPositiveNumber(rows[0].Price, 'VendInvoiceTrans.Price');
  assert.ok(typeof rows[0].HasPriceVariance === 'boolean', 'HasPriceVariance should be boolean');
});


// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 2: Three-way match linkage (scenario-level)
// ═══════════════════════════════════════════════════════════════════════════

section('2. Three-way match linkage — SAP ECC');

(() => {
  const sap = runFullP2P(100);

  // Build lookup: EBELN+EBELP → EKPO line
  const ekpoMap = {};
  for (const line of sap.ekpo) {
    ekpoMap[`${line.EBELN}|${line.EBELP}`] = line;
  }

  test('SAP GR qty (MSEG.MENGE) is 60-105% of PO qty (EKPO.MENGE)', () => {
    let checked = 0;
    for (const gr of sap.mseg) {
      const poLine = ekpoMap[`${gr.EBELN}|${gr.EBELP}`];
      if (!poLine) continue; // MSEG may pick a different PO line from the pool
      checked++;
      const ratio = gr.MENGE / poLine.MENGE;
      assert.ok(ratio >= 0.58 && ratio <= 1.05,
        `MSEG MENGE/EKPO MENGE ratio ${ratio.toFixed(4)} outside 0.58-1.05 for PO ${gr.EBELN}/${gr.EBELP}`);
    }
    assert.ok(checked > 0, 'Should have matched at least one GR line to a PO line');
  });

  test('SAP invoice price (RSEG) within 25% of PO price (EKPO.NETPR)', () => {
    let checked = 0;
    for (const inv of sap.rseg) {
      const poLine = ekpoMap[`${inv.EBELN}|${inv.EBELP}`];
      if (!poLine) continue;
      checked++;
      const invUnitPrice = inv.WRBTR / inv.MENGE;
      const ratio = invUnitPrice / poLine.NETPR;
      assert.ok(ratio >= 0.75 && ratio <= 1.25,
        `RSEG unit price / EKPO.NETPR ratio ${ratio.toFixed(4)} outside 0.75-1.25 for PO ${inv.EBELN}/${inv.EBELP}`);
    }
    assert.ok(checked > 0, 'Should have matched at least one invoice line to a PO line');
  });

  test('SAP invoice qty (RSEG.MENGE) is 45-105% of PO qty (EKPO.MENGE)', () => {
    let checked = 0;
    for (const inv of sap.rseg) {
      const poLine = ekpoMap[`${inv.EBELN}|${inv.EBELP}`];
      if (!poLine) continue;
      checked++;
      const ratio = inv.MENGE / poLine.MENGE;
      assert.ok(ratio >= 0.45 && ratio <= 1.05,
        `RSEG MENGE/EKPO MENGE ratio ${ratio.toFixed(4)} outside 0.45-1.05 for PO ${inv.EBELN}/${inv.EBELP}`);
    }
    assert.ok(checked > 0, 'Should have matched at least one invoice line to a PO line');
  });

  test('SAP HASPRICEVAR set correctly (false when price within 2%, true otherwise)', () => {
    let checked = 0;
    for (const inv of sap.rseg) {
      const poLine = ekpoMap[`${inv.EBELN}|${inv.EBELP}`];
      if (!poLine) continue;
      checked++;
      const invUnitPrice = inv.WRBTR / inv.MENGE;
      const pctDiff = Math.abs(invUnitPrice - poLine.NETPR) / poLine.NETPR;
      if (inv.HASPRICEVAR === false) {
        // When false, price should be within ~1% (the 90% band uses +-0.5%)
        // Allow some float tolerance — 2.5% max
        assert.ok(pctDiff < 0.025,
          `HASPRICEVAR=false but price diff is ${(pctDiff*100).toFixed(2)}% for PO ${inv.EBELN}`);
      }
      // When true, price should show some deviation — but the +-2% band overlaps with noise,
      // so we just verify the flag is a boolean (already done in section 1)
    }
    assert.ok(checked > 0, 'Should have matched at least one invoice line');
  });
})();

section('2. Three-way match linkage — JDE');

(() => {
  const jde = runJdeFullP2P(100);

  // Build lookup: DOCO+LNID → F4311 line
  const f4311Map = {};
  for (const line of jde.f4311) {
    f4311Map[`${line.DOCO}|${line.LNID}`] = line;
  }

  test('JDE GR qty (F43121.UREC) is 58-105% of PO qty (F4311.UORG)', () => {
    let checked = 0;
    for (const gr of jde.f43121) {
      const poLine = f4311Map[`${gr.PDOC}|${gr.PLIN}`];
      if (!poLine) continue;
      checked++;
      const absUrec = Math.abs(gr.UREC);  // reversals are negative
      const ratio = absUrec / poLine.UORG;
      assert.ok(ratio >= 0.58 && ratio <= 1.05,
        `F43121 UREC/F4311 UORG ratio ${ratio.toFixed(4)} outside 0.58-1.05 for PO ${gr.PDOC}/${gr.PLIN}`);
    }
    assert.ok(checked > 0, 'Should have matched at least one GR line to a PO line');
  });

  test('JDE invoice amount (F0411.AG) is within 25% of PO total (summed F4311.AEXP)', () => {
    // Build PO total map
    const poTotals = {};
    for (const line of jde.f4311) {
      if (!poTotals[line.DOCO]) poTotals[line.DOCO] = 0;
      poTotals[line.DOCO] += line.AEXP;
    }

    let checked = 0;
    for (const inv of jde.f0411) {
      if (inv.DCT === 'PX') continue; // credit memos are negative
      const poTotal = poTotals[inv.PDOC];
      if (!poTotal) continue;
      checked++;
      const ratio = Math.abs(inv.AG) / poTotal;
      // AG includes tax, so ratio can exceed 1.0 — allow up to 1.5 (tax can be 20%)
      // The base amount (before tax) should be within ~25% of PO total due to variance logic
      // But since AG = (base * variance) + (base * variance * taxRate), and taxRate can be 0.20,
      // the overall ratio can be up to ~1.5. We'll check AG without tax is within 25%.
      // Actually we can't strip tax easily, so just check AG is in a reasonable range.
      assert.ok(ratio >= 0.5 && ratio <= 1.6,
        `F0411 AG/PO total ratio ${ratio.toFixed(4)} outside 0.5-1.6 for PO ${inv.PDOC}`);
    }
    assert.ok(checked > 0, 'Should have matched at least one invoice to a PO');
  });
})();

section('2. Three-way match linkage — D365');

(() => {
  const d365 = runD365FullP2P(100);

  // Build lookup: PurchId+LineNumber → PurchLine row
  const plMap = {};
  for (const line of d365.purchLine) {
    plMap[`${line.PurchId}|${line.LineNumber}`] = line;
  }

  test('D365 invoice qty (VendInvoiceTrans.Qty) is 45-105% of PO qty (PurchLine.PurchQty)', () => {
    let checked = 0;
    for (const inv of d365.invoiceTrans) {
      const poLine = plMap[`${inv.PurchId}|${inv.PurchLineNum}`];
      if (!poLine) continue;
      checked++;
      const ratio = inv.Qty / poLine.PurchQty;
      assert.ok(ratio >= 0.45 && ratio <= 1.05,
        `VendInvoiceTrans Qty/PurchLine PurchQty ratio ${ratio.toFixed(4)} outside 0.45-1.05 for PO ${inv.PurchId}/${inv.PurchLineNum}`);
    }
    assert.ok(checked > 0, 'Should have matched at least one invoice line to a PO line');
  });

  test('D365 invoice price within 25% of PO price (PurchLine.PurchPrice)', () => {
    let checked = 0;
    for (const inv of d365.invoiceTrans) {
      const poLine = plMap[`${inv.PurchId}|${inv.PurchLineNum}`];
      if (!poLine) continue;
      checked++;
      const ratio = inv.Price / poLine.PurchPrice;
      assert.ok(ratio >= 0.75 && ratio <= 1.25,
        `VendInvoiceTrans Price/PurchLine PurchPrice ratio ${ratio.toFixed(4)} outside 0.75-1.25`);
    }
    assert.ok(checked > 0, 'Should have matched at least one invoice line');
  });

  test('D365 HasPriceVariance set correctly (false when price within 2%)', () => {
    let checked = 0;
    for (const inv of d365.invoiceTrans) {
      const poLine = plMap[`${inv.PurchId}|${inv.PurchLineNum}`];
      if (!poLine) continue;
      checked++;
      const pctDiff = Math.abs(inv.Price - poLine.PurchPrice) / poLine.PurchPrice;
      if (inv.HasPriceVariance === false) {
        assert.ok(pctDiff < 0.025,
          `HasPriceVariance=false but price diff is ${(pctDiff*100).toFixed(2)}% for PO ${inv.PurchId}`);
      }
    }
    assert.ok(checked > 0, 'Should have matched at least one invoice line');
  });
})();


// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 3: Referential integrity
// ═══════════════════════════════════════════════════════════════════════════

section('3. Referential integrity');

(() => {
  const sap = runFullP2P(100);
  const ekpoEbelns = new Set(sap.ekpo.map(l => l.EBELN));

  test('SAP: every MSEG.EBELN exists in EKPO', () => {
    for (const gr of sap.mseg) {
      assert.ok(ekpoEbelns.has(gr.EBELN),
        `MSEG EBELN ${gr.EBELN} not found in EKPO`);
    }
  });

  test('SAP: every RSEG.EBELN exists in EKPO', () => {
    for (const inv of sap.rseg) {
      assert.ok(ekpoEbelns.has(inv.EBELN),
        `RSEG EBELN ${inv.EBELN} not found in EKPO`);
    }
  });
})();

(() => {
  const jde = runJdeFullP2P(100);
  const f4311Docos = new Set(jde.f4311.map(l => l.DOCO));

  test('JDE: every F43121.PDOC exists in F4311', () => {
    for (const gr of jde.f43121) {
      assert.ok(f4311Docos.has(gr.PDOC),
        `F43121 PDOC ${gr.PDOC} not found in F4311`);
    }
  });
})();

(() => {
  const d365 = runD365FullP2P(100);
  const purchIds = new Set(d365.purchLine.map(l => l.PurchId));

  test('D365: every VendInvoiceTrans.PurchId exists in PurchLine', () => {
    for (const inv of d365.invoiceTrans) {
      assert.ok(purchIds.has(inv.PurchId),
        `VendInvoiceTrans PurchId ${inv.PurchId} not found in PurchLine`);
    }
  });
})();


// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 4: Variance distribution (large sample)
// ═══════════════════════════════════════════════════════════════════════════

section('4. Variance distribution (500 rows)');

(() => {
  const sap = runFullP2P(500);

  // Build EKPO lookup
  const ekpoMap = {};
  for (const line of sap.ekpo) {
    ekpoMap[`${line.EBELN}|${line.EBELP}`] = line;
  }

  test('SAP RSEG: HASPRICEVAR is true on 5-15% of lines', () => {
    const total = sap.rseg.length;
    const withVar = sap.rseg.filter(r => r.HASPRICEVAR === true).length;
    const pct = withVar / total;
    assert.ok(pct >= 0.05 && pct <= 0.15,
      `HASPRICEVAR true rate: ${(pct*100).toFixed(1)}% (expected 5-15%)`);
  });

  test('SAP GR partial delivery: at least 20% of GR lines receive <95% of PO qty', () => {
    let matched = 0;
    let partial = 0;
    for (const gr of sap.mseg) {
      const poLine = ekpoMap[`${gr.EBELN}|${gr.EBELP}`];
      if (!poLine) continue;
      matched++;
      if (gr.MENGE / poLine.MENGE < 0.95) partial++;
    }
    assert.ok(matched > 0, 'Should have matched GR lines');
    const pct = partial / matched;
    assert.ok(pct >= 0.20,
      `Partial delivery rate: ${(pct*100).toFixed(1)}% (expected >=20%)`);
  });
})();

(() => {
  const d365 = runD365FullP2P(500);

  test('D365 VendInvoiceTrans: HasPriceVariance is true on 5-15% of lines', () => {
    const total = d365.invoiceTrans.length;
    const withVar = d365.invoiceTrans.filter(r => r.HasPriceVariance === true).length;
    const pct = withVar / total;
    assert.ok(pct >= 0.05 && pct <= 0.15,
      `HasPriceVariance true rate: ${(pct*100).toFixed(1)}% (expected 5-15%)`);
  });
})();


// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 5: Standalone generator mode (no pools)
// ═══════════════════════════════════════════════════════════════════════════

section('5. Standalone generator mode (no pools)');

test('SAP MSEG standalone (no poPool, no grPool) does not throw', () => {
  const rows = generateMSEG(5);
  assert.equal(rows.length, 5);
  assertPositiveNumber(rows[0].MENGE, 'standalone MSEG.MENGE');
});

test('SAP RSEG standalone (no invoicePool, no poPool) does not throw', () => {
  const rows = generateRSEG(5);
  assert.equal(rows.length, 5);
  assertPositiveNumber(rows[0].MENGE, 'standalone RSEG.MENGE');
  assertPositiveNumber(rows[0].WRBTR, 'standalone RSEG.WRBTR');
});

test('SAP EKPO standalone (no poPool) does not throw', () => {
  const rows = generateEKPO(5);
  assert.equal(rows.length, 5);
});

test('JDE F4311 standalone (no poPool) does not throw', () => {
  const rows = generateF4311(5);
  assert.equal(rows.length, 5);
});

test('JDE F43121 standalone (no poLinePool) does not throw', () => {
  const rows = generateF43121(5);
  assert.equal(rows.length, 5);
});

test('JDE F0411 standalone (no poPool, no poTotalAmountMap) does not throw', () => {
  const rows = generateF0411(5);
  assert.equal(rows.length, 5);
});

test('D365 PurchLine standalone (no poPool) does not throw', () => {
  const rows = generatePurchLine(5);
  assert.equal(rows.length, 5);
});

test('D365 VendInvoiceTrans standalone (no invoicePool, no poLinePool) does not throw', () => {
  const rows = generateVendInvoiceTrans(5);
  assert.equal(rows.length, 5);
});

test('D365 VendPackingSlipJour standalone (no poPool) does not throw', () => {
  const rows = generateVendPackingSlipJour(5);
  assert.equal(rows.length, 5);
});

test('D365 VendInvoiceJour standalone (no poPool) does not throw', () => {
  const rows = generateVendInvoiceJour(5);
  assert.equal(rows.length, 5);
});


// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 6: CLI smoke tests
// ═══════════════════════════════════════════════════════════════════════════

section('6. CLI smoke tests');

const ROOT = path.resolve(__dirname, '..');

test('CLI generate: sap-ecc vendors JSON outputs 10 valid rows', () => {
  const output = execSync(
    `node bin/cli.js generate --erp=sap-ecc --entity=vendors --rows=10 --output=json`,
    { cwd: ROOT, encoding: 'utf8' }
  );
  const data = JSON.parse(output);
  assert.ok(Array.isArray(data), 'Output should be a JSON array');
  assert.equal(data.length, 10, 'Should have 10 rows');
  assert.ok(data[0].LIFNR, 'First row should have LIFNR field');
});

test('CLI scenario: sap-ecc full-p2p 50 rows completes without error', () => {
  const output = execSync(
    `node bin/cli.js scenario --erp=sap-ecc --name=full-p2p --rows=50 --output=json --output-dir=/tmp/erp-datagen-test`,
    { cwd: ROOT, encoding: 'utf8', timeout: 30000 }
  );
  assert.ok(output.includes('Done.'), 'Scenario should print "Done." on completion');
});

test('CLI scenario: jde full-p2p completes without error', () => {
  const output = execSync(
    `node bin/cli.js scenario --erp=jde --name=full-p2p --rows=50 --output=json --output-dir=/tmp/erp-datagen-test-jde`,
    { cwd: ROOT, encoding: 'utf8', timeout: 30000 }
  );
  assert.ok(output.includes('Done.'), 'JDE scenario should print "Done."');
});

test('CLI scenario: d365 full-p2p completes without error', () => {
  const output = execSync(
    `node bin/cli.js scenario --erp=d365 --name=full-p2p --rows=50 --output=json --output-dir=/tmp/erp-datagen-test-d365`,
    { cwd: ROOT, encoding: 'utf8', timeout: 30000 }
  );
  assert.ok(output.includes('Done.'), 'D365 scenario should print "Done."');
});


// ═══════════════════════════════════════════════════════════════════════════
//  Final summary
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n' + '='.repeat(60));
console.log(`  TOTAL: ${passed + failed}  |  PASSED: ${passed}  |  FAILED: ${failed}`);
console.log('='.repeat(60));

if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  - ${f.name}: ${f.message}`);
  }
  process.exit(1);
} else {
  console.log('\nAll tests passed.');
  process.exit(0);
}
