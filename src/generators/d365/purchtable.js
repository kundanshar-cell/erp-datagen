const { faker } = require('@faker-js/faker');
const { seasonalDate } = require('../../utils/dates');

// D365 F&O PurchTable — Purchase Order Header

const LEGAL_ENTITIES = ['USMF', 'GBSI', 'FRRT', 'DEMF', 'INMF', 'SGMF'];
const CURRENCIES = ['GBP', 'USD', 'EUR', 'INR', 'SGD', 'JPY'];
const PAYMENT_TERMS = ['Net30', 'Net60', 'Net90', '2%10Net30', 'Immediate'];
const PO_STATUSES = ['Backorder', 'Received', 'Invoiced', 'Cancelled'];
const DOCUMENT_STATUSES = ['None', 'PurchaseOrder', 'ConfirmationRequest', 'Confirmation'];
const INCOTERMS = ['EXW', 'FOB', 'CIF', 'DDP', 'DAP', 'FCA'];
const PURCHASE_TYPES = ['Purch', 'ReturnItem', 'BlanketOrder', 'Journal'];
const HOLD_STATUSES = ['NoHold', 'BudgetHold', 'ApprovalHold'];

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function padPurchId(index) {
  return `PO-${String(index + 1).padStart(6, '0')}`;
}

function generatePurchTableRow(index, options = {}) {
  const missingRate = options.missingRate || 0;
  const vendorPool = options.vendorPool || [];

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  const purchDate = seasonalDate();
  const deliveryDate = new Date(purchDate);
  deliveryDate.setDate(deliveryDate.getDate() + faker.number.int({ min: 7, max: 90 }));

  const orderAccount = vendorPool.length > 0
    ? faker.helpers.arrayElement(vendorPool)
    : `V-${String(faker.number.int({ min: 1, max: 999 })).padStart(6, '0')}`;

  const purchType = faker.helpers.arrayElement(PURCHASE_TYPES);

  return {
    PurchId:          padPurchId(index),
    DataAreaId:       faker.helpers.arrayElement(LEGAL_ENTITIES),
    PurchStatus:      faker.helpers.arrayElement(PO_STATUSES),
    DocumentStatus:   faker.helpers.arrayElement(DOCUMENT_STATUSES),
    PurchaseType:     purchType,
    OrderAccount:     orderAccount,                               // Vendor account (VendTable.AccountNum)
    InvoiceAccount:   orderAccount,
    CurrencyCode:     faker.helpers.arrayElement(CURRENCIES),
    PaymTermId:       maybeBlank(faker.helpers.arrayElement(PAYMENT_TERMS)),
    PurchDate:        isoDate(purchDate),
    DeliveryDate:     isoDate(deliveryDate),
    PurchName:        maybeBlank(faker.commerce.department() + ' procurement'),
    Intrastat:        maybeBlank(faker.helpers.arrayElement(INCOTERMS)),
    HoldUpdate:       faker.helpers.arrayElement(HOLD_STATUSES),
    BlanketOrderMax:  purchType === 'BlanketOrder'
                        ? faker.number.float({ min: 10000, max: 500000, fractionDigits: 2 })
                        : '',
  };
}

function generatePurchTable(rows, options = {}) {
  return Array.from({ length: rows }, (_, i) => generatePurchTableRow(i, options));
}

module.exports = { generatePurchTable };
