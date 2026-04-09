const { generateVendTable }          = require('./vendtable');
const { generatePurchTable }         = require('./purchtable');
const { generatePurchLine }          = require('./purchline');
const { generateVendPackingSlipJour } = require('./vendpackingslipjour');
const { generateVendInvoiceJour }    = require('./vendinvoicejour');
const { generateVendInvoiceTrans }   = require('./vendinvoicetrans');

module.exports = {
  generateVendTable,
  generatePurchTable,
  generatePurchLine,
  generateVendPackingSlipJour,
  generateVendInvoiceJour,
  generateVendInvoiceTrans,
};
