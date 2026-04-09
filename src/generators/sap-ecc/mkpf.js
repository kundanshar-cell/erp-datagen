const { faker } = require('@faker-js/faker');

// SAP ECC MKPF — Material Document Header (Goods Receipt)
// One MKPF document per GR posting event

const DOCUMENT_TYPES = ['WE', 'WA', 'WL'];   // GR for PO, Goods Issue, Delivery
const TRANSACTION_CODES = ['MIGO', 'MB01', 'MB0A'];

function sapDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function padMblnr(num) {
  return String(num).padStart(10, '0');  // GR docs typically start with 50000...
}

function generateMKPFRow(index, options = {}) {
  const missingRate = options.missingRate || 0;
  const poPool = options.poPool || [];

  const maybeBlank = (value) =>
    Math.random() < missingRate ? '' : value;

  const postingDate = faker.date.between({ from: '2022-01-01', to: '2025-12-31' });
  const docDate = new Date(postingDate);
  docDate.setDate(docDate.getDate() - faker.number.int({ min: 0, max: 3 })); // Doc date <= posting date

  return {
    MBLNR: padMblnr(5000000000 + index),
    MJAHR: String(postingDate.getFullYear()),
    BLART: 'WE',                                         // Goods receipt for PO
    BUDAT: sapDate(postingDate),                         // Posting date
    BLDAT: sapDate(docDate),                             // Document date
    CPUDT: sapDate(postingDate),                         // Entry date
    USNAM: maybeBlank(faker.internet.username().toUpperCase().slice(0, 12)),
    BKTXT: maybeBlank(faker.lorem.words(4)),             // Header text
    TCODE: faker.helpers.arrayElement(TRANSACTION_CODES),
  };
}

function generateMKPF(rows, options = {}) {
  return Array.from({ length: rows }, (_, i) => generateMKPFRow(i, options));
}

module.exports = { generateMKPF };
