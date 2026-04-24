// Pareto vendor distribution utility
// Real procurement spend follows the 80/20 rule:
//   ~20% of vendors (strategic) account for ~80% of spend
//   ~30% of vendors (preferred) account for ~15% of spend
//   ~50% of vendors (tail)      account for ~5% of spend
//
// Usage:
//   const { buildWeightedVendorPool, tagVendorTiers } = require('../utils/pareto');
//
//   // Tag vendor master with tier before output
//   const tieredVendors = tagVendorTiers(lfa1, 'LIFNR');
//
//   // Get weighted pool for PO assignment
//   const weightedPool = buildWeightedVendorPool(vendorPool);
//   // Now use weightedPool wherever vendor is assigned to a PO

/**
 * Builds a weighted vendor array where strategic vendors appear proportionally
 * more often, matching real-world Pareto spend distribution.
 *
 * @param {Array} vendors - Array of vendor IDs or objects
 * @returns {Array} - Expanded weighted array for use with faker.helpers.arrayElement()
 */
function buildWeightedVendorPool(vendors) {
  if (!vendors || vendors.length === 0) return vendors;

  const n = vendors.length;
  const strategicCount = Math.max(1, Math.round(n * 0.20));
  const preferredCount = Math.max(1, Math.round(n * 0.30));

  const strategic = vendors.slice(0, strategicCount);
  const preferred  = vendors.slice(strategicCount, strategicCount + preferredCount);
  const tail       = vendors.slice(strategicCount + preferredCount);

  // Expand into weighted pool (1000 slots for low rounding error across any vendor count)
  // Strategic: 80% of slots shared across strategicCount vendors
  // Preferred: 15% of slots shared across preferredCount vendors
  // Tail:       5% of slots shared across tail vendors
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

/**
 * Tags each vendor row with its tier (Strategic / Preferred / Tail)
 * based on position in the vendor array.
 * Adds a VENDOR_TIER field — useful as a Yukti training label.
 *
 * @param {Array}  vendors   - Array of vendor row objects
 * @param {string} idField   - Field name used as vendor ID (e.g. 'LIFNR', 'AN8', 'AccountNum')
 * @returns {Array} - Same rows with VENDOR_TIER added
 */
function tagVendorTiers(vendors, idField) {
  if (!vendors || vendors.length === 0) return vendors;

  const n = vendors.length;
  const strategicCount = Math.max(1, Math.round(n * 0.20));
  const preferredCount = Math.max(1, Math.round(n * 0.30));

  return vendors.map((v, i) => ({
    ...v,
    VENDOR_TIER: i < strategicCount
      ? 'Strategic'
      : i < strategicCount + preferredCount
        ? 'Preferred'
        : 'Tail',
  }));
}

module.exports = { buildWeightedVendorPool, tagVendorTiers };
