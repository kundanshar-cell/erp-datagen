const { faker } = require('@faker-js/faker');

// D365 F&O VendPackingSlipJour — Vendor Packing Slip (Goods Receipt Header)
// One document per physical goods receipt, linked to PurchTable via PurchId

const LEGAL_ENTITIES = ['USMF', 'GBSI', 'FRRT', 'DEMF', 'INMF', 'SGMF'];

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function padPackingSlipId(index) {
  return `GR-${String(index + 1).padStart(6, '0')}`;
}

function generateVendPackingSlipJourRow(index, options = {}) {
  const missingRate = options.missingRate || 0;
  const poPool = options.poPool || [];

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  let purchId, dataAreaId, vendAccount, currencyCode;
  if (poPool.length > 0) {
    const po = faker.helpers.arrayElement(poPool);
    purchId      = po.PurchId;
    dataAreaId   = po.DataAreaId;
    vendAccount  = po.OrderAccount;
    currencyCode = po.CurrencyCode;
  } else {
    purchId      = `PO-${String(faker.number.int({ min: 1, max: 9999 })).padStart(6, '0')}`;
    dataAreaId   = faker.helpers.arrayElement(LEGAL_ENTITIES);
    vendAccount  = `V-${String(faker.number.int({ min: 1, max: 999 })).padStart(6, '0')}`;
    currencyCode = faker.helpers.arrayElement(['GBP', 'USD', 'EUR', 'INR']);
  }

  const receiptDate = faker.date.between({ from: '2022-01-01', to: '2025-12-31' });
  const invoicedAmount = faker.number.float({ min: 100, max: 200000, fractionDigits: 2 });
  const isReversed = Math.random() < 0.04;

  return {
    PackingSlipId:       padPackingSlipId(index),
    PurchId:             purchId,                               // Links to PurchTable
    DataAreaId:          dataAreaId,
    VendAccount:         vendAccount,
    PackingSlipDate:     isoDate(receiptDate),
    DeliveryDate:        isoDate(receiptDate),
    CurrencyCode:        currencyCode,
    InvoicedAmount:      invoicedAmount,
    DeliveryName:        maybeBlank(faker.company.name()),
    CarrierName:         maybeBlank(faker.helpers.arrayElement(['DHL', 'FedEx', 'UPS', 'TNT', 'Royal Mail', 'DPD'])),
    TrackingNumber:      maybeBlank(faker.string.alphanumeric(16).toUpperCase()),
    IsReversed:          isReversed,
    ReversalPackingSlip: isReversed
      ? padPackingSlipId(faker.number.int({ min: 0, max: Math.max(0, index - 1) }))
      : '',
  };
}

function generateVendPackingSlipJour(rows, options = {}) {
  return Array.from({ length: rows }, (_, i) => generateVendPackingSlipJourRow(i, options));
}

module.exports = { generateVendPackingSlipJour };
