// Realistic date generation utility
//
// Real procurement data has strong temporal patterns that uniform random dates miss:
//   - Q4 spend spikes (Oct-Dec) and March year-end budget flush
//   - August summer holiday dip
//   - Month-end PO/GR/invoice clustering (last 5 working days)
//   - Invoice posting gaps clustered around weekly payment runs
//
// Usage:
//   const { seasonalDate, invoicePostingDate } = require('../utils/dates');
//
//   const poDate = seasonalDate();                         // PO / GR / GI date
//   const postDate = invoicePostingDate(invoiceDate);      // AP posting date

// Month weights (1 = average; higher = more activity)
const MONTH_WEIGHTS = [
  0.8,   // Jan — post-holiday slowdown
  0.8,   // Feb
  1.4,   // Mar — year-end budget flush
  0.9,   // Apr
  0.9,   // May
  1.0,   // Jun
  0.8,   // Jul
  0.6,   // Aug — summer holiday dip
  0.9,   // Sep
  1.2,   // Oct — Q4 ramp-up
  1.3,   // Nov — Q4 peak
  1.3,   // Dec — Q4 peak (holiday dip offset by year-end rush)
];

const TOTAL_MONTH_WEIGHT = MONTH_WEIGHTS.reduce((s, w) => s + w, 0);

// Years to spread data across (2022–2025)
const YEARS = [2022, 2023, 2024, 2025];

/**
 * Pick a month (0-indexed) using seasonal weights.
 */
function weightedMonth() {
  let r = Math.random() * TOTAL_MONTH_WEIGHT;
  for (let i = 0; i < MONTH_WEIGHTS.length; i++) {
    r -= MONTH_WEIGHTS[i];
    if (r <= 0) return i;
  }
  return 11;
}

/**
 * Pick a day within a month with month-end clustering.
 * Days 1-20: normal weight (1.0)
 * Days 21-25: elevated (1.5x) — approaching month-end
 * Days 26-end: peak (2.5x) — month-end push
 */
function weightedDay(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weights = [];
  for (let d = 1; d <= daysInMonth; d++) {
    if (d <= 20)          weights.push(1.0);
    else if (d <= 25)     weights.push(1.5);
    else                  weights.push(2.5);
  }

  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i + 1;
  }
  return daysInMonth;
}

/**
 * Generate a date with realistic seasonal and month-end patterns.
 * Covers 2022–2025, matching the erp-datagen data range.
 *
 * @returns {Date}
 */
function seasonalDate() {
  const year  = YEARS[Math.floor(Math.random() * YEARS.length)];
  const month = weightedMonth();
  const day   = weightedDay(year, month);
  return new Date(year, month, day);
}

/**
 * Generate an invoice posting date from an invoice date.
 * Real AP posting has a gap distribution:
 *   40%:  1–3  days  — quick straight-through processing
 *   30%:  4–7  days  — posted in next weekly payment run
 *   20%:  8–14 days  — slower / approval needed
 *   10%: 15–45 days  — parked, disputed, or late-arriving invoice
 *
 * @param {Date} invoiceDate
 * @returns {Date}
 */
function invoicePostingDate(invoiceDate) {
  const r = Math.random();
  let gapDays;
  if (r < 0.40) {
    gapDays = 1 + Math.floor(Math.random() * 3);        // 1–3 days
  } else if (r < 0.70) {
    gapDays = 4 + Math.floor(Math.random() * 4);        // 4–7 days
  } else if (r < 0.90) {
    gapDays = 8 + Math.floor(Math.random() * 7);        // 8–14 days
  } else {
    gapDays = 15 + Math.floor(Math.random() * 31);      // 15–45 days
  }
  const postDate = new Date(invoiceDate);
  postDate.setDate(postDate.getDate() + gapDays);
  return postDate;
}

module.exports = { seasonalDate, invoicePostingDate };
