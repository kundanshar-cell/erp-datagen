// Pareto vendor distribution utility
//
// Real procurement vendor masters have four distinct tiers:
//
//   Strategic (top 15%) — key suppliers, long-term contracts, ~75% of spend
//   Preferred (next 25%) — approved suppliers, competitive tendering, ~20% of spend
//   Tail     (next 30%) — occasional/one-off suppliers, ~5% of spend
//   Dormant  (bottom 30%) — in master data but NO POs in recent periods
//                           (contract expired, legacy records, deactivated)
//
// Dormant vendors are critical for Yukti training — they appear in LFA1/F0101/VendTable
// but never on a PO. A model must learn to distinguish active spend from dormant records.
//
// Usage:
//   const { buildWeightedVendorPool, tagVendorTiers, enrichVendorBehavior } = require('../utils/pareto');
//
//   // 1. Tag and enrich vendor master
//   const tiered   = tagVendorTiers(lfa1, 'LIFNR');
//   const enriched = enrichVendorBehavior(tiered);
//
//   // 2. Build weighted pool from ACTIVE vendors only (excludes Dormant)
//   const activeIds      = enriched.filter(v => v.VENDOR_TIER !== 'Dormant').map(v => v.LIFNR);
//   const weightedPool   = buildWeightedVendorPool(activeIds);

/**
 * Tags each vendor row with its tier based on position.
 * Adds VENDOR_TIER field — used as a Yukti training label.
 *
 * Tier boundaries (% of total vendor count):
 *   Strategic : top 15%
 *   Preferred : next 25%
 *   Tail      : next 30%  (active but infrequent)
 *   Dormant   : bottom 30% (in master, never appears on POs)
 *
 * @param {Array}  vendors  - Array of vendor row objects
 * @param {string} idField  - Field name used as vendor ID ('LIFNR', 'AN8', 'AccountNum')
 * @returns {Array} - Same rows with VENDOR_TIER added
 */
function tagVendorTiers(vendors, idField) {
  if (!vendors || vendors.length === 0) return vendors;

  const n = vendors.length;
  const strategicCount = Math.max(1, Math.round(n * 0.15));
  const preferredCount = Math.max(1, Math.round(n * 0.25));
  const tailCount      = Math.max(1, Math.round(n * 0.30));
  // remaining = Dormant

  return vendors.map((v, i) => ({
    ...v,
    VENDOR_TIER: i < strategicCount
      ? 'Strategic'
      : i < strategicCount + preferredCount
        ? 'Preferred'
        : i < strategicCount + preferredCount + tailCount
          ? 'Tail'
          : 'Dormant',
  }));
}

/**
 * Enriches vendor rows with tier-consistent behavioural attributes.
 * Adds fields that reflect realistic vendor master patterns:
 *
 *   PAYMENT_BEHAVIOR  : 'Reliable' / 'Moderate' / 'HighRisk'
 *   IS_SINGLE_SOURCE  : true for ~10% of Strategic vendors (exclusive contracts)
 *   IS_BLOCKED        : true for a tier-weighted % (dormant/tail more likely blocked)
 *   IS_DELETION_FLAGGED: true for dormant vendors at higher rate
 *
 * Overrides SPERR / LOEVM (SAP), INACTIVE (JDE), BlockedVendor (D365)
 * if those fields exist on the row.
 *
 * @param {Array} vendors - Tier-tagged vendor rows (output of tagVendorTiers)
 * @returns {Array} - Same rows with behavioural fields added/updated
 */
function enrichVendorBehavior(vendors) {
  if (!vendors || vendors.length === 0) return vendors;

  return vendors.map(v => {
    const tier = v.VENDOR_TIER || 'Tail';

    // Payment behaviour — strategic vendors almost always reliable
    let paymentBehavior;
    if (tier === 'Strategic') {
      paymentBehavior = Math.random() < 0.95 ? 'Reliable' : 'Moderate';
    } else if (tier === 'Preferred') {
      paymentBehavior = Math.random() < 0.70 ? 'Reliable' : Math.random() < 0.80 ? 'Moderate' : 'HighRisk';
    } else if (tier === 'Tail') {
      paymentBehavior = Math.random() < 0.30 ? 'Reliable' : Math.random() < 0.60 ? 'Moderate' : 'HighRisk';
    } else {
      // Dormant — payment behaviour is historic / unknown
      paymentBehavior = Math.random() < 0.40 ? 'Moderate' : 'HighRisk';
    }

    // Single-source: ~10% of strategic vendors have exclusive supply contracts
    const isSingleSource = tier === 'Strategic' && Math.random() < 0.10;

    // Blocked rate — tier-weighted. Dormant vendors frequently blocked/expired.
    const blockedRate = { Strategic: 0.01, Preferred: 0.03, Tail: 0.08, Dormant: 0.35 }[tier] || 0.05;
    const isBlocked = Math.random() < blockedRate;

    // Deletion flag — dormant vendors often soft-deleted in ERP
    const deletionRate = { Strategic: 0.00, Preferred: 0.01, Tail: 0.04, Dormant: 0.25 }[tier] || 0.02;
    const isDeletionFlagged = Math.random() < deletionRate;

    const enriched = {
      ...v,
      PAYMENT_BEHAVIOR:   paymentBehavior,
      IS_SINGLE_SOURCE:   isSingleSource,
    };

    // Override ERP-specific blocking fields if they exist
    if ('SPERR' in v) enriched.SPERR = isBlocked ? 'X' : '';
    if ('LOEVM' in v) enriched.LOEVM = isDeletionFlagged ? 'X' : '';
    if ('INACTIVE' in v) enriched.INACTIVE = (isBlocked || isDeletionFlagged) ? 'Y' : 'N';  // JDE
    if ('IsBlocked' in v || tier === 'Dormant') enriched.IS_BLOCKED = isBlocked;
    if ('IsDeleted' in v || tier === 'Dormant') enriched.IS_DELETION_FLAGGED = isDeletionFlagged;

    return enriched;
  });
}

/**
 * Builds a weighted vendor ID array so strategic vendors receive ~80% of PO
 * assignments, preferred ~15%, tail ~5%.
 *
 * IMPORTANT: Pass only ACTIVE vendor IDs (filter out Dormant before calling).
 * The function assumes all vendors passed in should receive at least some POs.
 *
 * @param {Array} activeVendors - Array of active vendor IDs (strings or numbers)
 * @returns {Array} - Expanded weighted array for faker.helpers.arrayElement()
 */
function buildWeightedVendorPool(activeVendors) {
  if (!activeVendors || activeVendors.length === 0) return activeVendors;

  const n = activeVendors.length;
  // Among active vendors: top 21% strategic, next 36% preferred, rest tail
  // (reflects 15/25/30 absolute tiers with dormant removed)
  const strategicCount = Math.max(1, Math.round(n * 0.21));
  const preferredCount = Math.max(1, Math.round(n * 0.36));

  const strategic = activeVendors.slice(0, strategicCount);
  const preferred  = activeVendors.slice(strategicCount, strategicCount + preferredCount);
  const tail       = activeVendors.slice(strategicCount + preferredCount);

  const POOL_SIZE = 1000;
  const strategicWeight = Math.max(1, Math.round((0.80 * POOL_SIZE) / strategicCount));
  const preferredWeight = Math.max(1, Math.round((0.15 * POOL_SIZE) / preferredCount));
  const tailWeight      = Math.max(1, Math.round((0.05 * POOL_SIZE) / Math.max(tail.length, 1)));

  const weighted = [];
  strategic.forEach(v => { for (let i = 0; i < strategicWeight; i++) weighted.push(v); });
  preferred.forEach(v => { for (let i = 0; i < preferredWeight; i++) weighted.push(v); });
  tail.forEach(v      => { for (let i = 0; i < tailWeight; i++) weighted.push(v); });

  return weighted;
}

module.exports = { buildWeightedVendorPool, tagVendorTiers, enrichVendorBehavior };
