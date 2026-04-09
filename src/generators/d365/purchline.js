const { faker } = require('@faker-js/faker');

// D365 F&O PurchLine — Purchase Order Lines
// Links to PurchTable via PurchId + DataAreaId

const UNITS = ['ea', 'kg', 'ltr', 'mtr', 'box', 'pcs', 'hr', 'day', 'cs'];
const PROC_CATEGORIES = ['IT Equipment', 'Office Supplies', 'Maintenance', 'Services',
                          'Raw Materials', 'Packaging', 'Logistics', 'Consultancy'];
const LINE_STATUSES = ['Backorder', 'Received', 'Invoiced', 'Cancelled'];
const SITES = ['Site1', 'Site2', 'HQ', 'WH-UK', 'WH-US', 'WH-IN'];
const WAREHOUSES = ['WH01', 'WH02', 'MAIN', 'UK01', 'US01', 'IN01'];

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function generateItemId() {
  const formats = [
    () => `D${String(faker.number.int({ min: 1000, max: 9999 }))}`,
    () => `${faker.helpers.arrayElement(['COMP', 'SERV', 'MRO', 'PKG'])}-${faker.number.int({ min: 100, max: 9999 })}`,
    () => faker.string.alphanumeric(8).toUpperCase(),
  ];
  return faker.helpers.arrayElement(formats)();
}

function generatePurchLineRow(lineIndex, purchId, dataAreaId, currencyCode, purchDate, options = {}) {
  const missingRate = options.missingRate || 0;

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  const qty = faker.number.float({ min: 1, max: 1000, fractionDigits: 2 });
  const price = faker.number.float({ min: 1, max: 50000, fractionDigits: 2 });
  const lineAmount = parseFloat((qty * price).toFixed(2));

  const deliveryDate = new Date(purchDate);
  deliveryDate.setDate(deliveryDate.getDate() + faker.number.int({ min: 7, max: 90 }));

  const itemId = generateItemId();

  return {
    PurchId:             purchId,
    LineNumber:          lineIndex + 1,
    DataAreaId:          dataAreaId,
    ItemId:              itemId,
    Name:                faker.commerce.productName(),
    ProcurementCategory: faker.helpers.arrayElement(PROC_CATEGORIES),
    PurchQty:            qty,
    PurchUnit:           faker.helpers.arrayElement(UNITS),
    PurchPrice:          price,
    LineAmount:          lineAmount,
    CurrencyCode:        currencyCode,
    DeliveryDate:        isoDate(deliveryDate),
    InventSiteId:        maybeBlank(faker.helpers.arrayElement(SITES)),
    InventLocationId:    maybeBlank(faker.helpers.arrayElement(WAREHOUSES)),
    PurchStatus:         faker.helpers.arrayElement(LINE_STATUSES),
    IsDeleted:           Math.random() < 0.03,                   // 3% deleted lines
    RemainPurchPhysical: parseFloat((qty * faker.number.float({ min: 0, max: 1, fractionDigits: 2 })).toFixed(2)),
  };
}

function generatePurchLine(rows, options = {}) {
  const poPool = options.poPool || [];
  const linesPerPO = options.linesPerPO || { min: 1, max: 8 };
  const result = [];

  if (poPool.length > 0) {
    for (const po of poPool) {
      const lineCount = faker.number.int(linesPerPO);
      for (let i = 0; i < lineCount && result.length < rows; i++) {
        result.push(generatePurchLineRow(i, po.PurchId, po.DataAreaId, po.CurrencyCode,
          new Date(po.PurchDate), options));
      }
    }
  } else {
    for (let i = 0; i < rows; i++) {
      const purchId = `PO-${String(faker.number.int({ min: 1, max: 9999 })).padStart(6, '0')}`;
      result.push(generatePurchLineRow(0, purchId, faker.helpers.arrayElement(['USMF', 'GBSI', 'DEMF']),
        faker.helpers.arrayElement(['GBP', 'USD', 'EUR']), new Date(), options));
    }
  }

  return result;
}

module.exports = { generatePurchLine };
