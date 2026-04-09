#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const { generateLFA1, generateEKKO, generateEKPO, generateMKPF, generateMSEG, generateRBKP, generateRSEG } = require('../src/generators/sap-ecc');
const { generateF0101, generateF4301, generateF4311, generateF43121, generateF0411 } = require('../src/generators/jde');
const { generateVendTable, generatePurchTable, generatePurchLine, generateVendPackingSlipJour, generateVendInvoiceJour, generateVendInvoiceTrans } = require('../src/generators/d365');
const { runFullP2P } = require('../src/scenarios/sap-ecc-full-p2p');
const { runJdeFullP2P } = require('../src/scenarios/jde-full-p2p');
const { runD365FullP2P } = require('../src/scenarios/d365-full-p2p');
const { toCSV, writeCSV } = require('../src/output/csv');
const { toJSON, writeJSON } = require('../src/output/json');

const program = new Command();

program
  .name('erp-datagen')
  .description('Generate realistic synthetic procurement data for SAP ECC, D365, and JDE')
  .version('0.1.0');

// ── generate: single entity ──────────────────────────────────────────────────
program
  .command('generate')
  .description('Generate a single ERP entity')
  .requiredOption('--erp <system>', 'ERP system: sap-ecc | d365 | jde')
  .requiredOption('--entity <name>', 'Entity: vendors | po-headers | po-lines | gr-headers | gr-lines | invoice-headers | invoice-lines')
  .option('--rows <number>', 'Number of rows to generate', '100')
  .option('--output <format>', 'Output format: csv | json', 'csv')
  .option('--file <path>', 'Output file path (defaults to stdout)')
  .option('--missing-rate <rate>', 'Rate of missing optional fields (0-1)', '0')
  .action((options) => {
    const rows = parseInt(options.rows, 10);
    const missingRate = parseFloat(options.missingRate);
    let data;

    if (options.erp === 'sap-ecc') {
      if (options.entity === 'vendors')          data = generateLFA1(rows, { missingRate });
      else if (options.entity === 'po-headers')  data = generateEKKO(rows, { missingRate });
      else if (options.entity === 'po-lines')    data = generateEKPO(rows, { missingRate });
      else if (options.entity === 'gr-headers')  data = generateMKPF(rows, { missingRate });
      else if (options.entity === 'gr-lines')    data = generateMSEG(rows, { missingRate });
      else if (options.entity === 'invoice-headers') data = generateRBKP(rows, { missingRate });
      else if (options.entity === 'invoice-lines')   data = generateRSEG(rows, { missingRate });
      else {
        console.error(`Entity "${options.entity}" not supported for SAP ECC.`);
        console.error('Supported: vendors, po-headers, po-lines, gr-headers, gr-lines, invoice-headers, invoice-lines');
        process.exit(1);
      }
    } else if (options.erp === 'jde') {
      if (options.entity === 'vendors')          data = generateF0101(rows, { missingRate });
      else if (options.entity === 'po-headers')  data = generateF4301(rows, { missingRate });
      else if (options.entity === 'po-lines')    data = generateF4311(rows, { missingRate });
      else if (options.entity === 'gr-lines')    data = generateF43121(rows, { missingRate });
      else if (options.entity === 'invoices')    data = generateF0411(rows, { missingRate });
      else {
        console.error(`Entity "${options.entity}" not supported for JDE.`);
        console.error('Supported: vendors, po-headers, po-lines, gr-lines, invoices');
        process.exit(1);
      }
    } else if (options.erp === 'd365') {
      if (options.entity === 'vendors')          data = generateVendTable(rows, { missingRate });
      else if (options.entity === 'po-headers')  data = generatePurchTable(rows, { missingRate });
      else if (options.entity === 'po-lines')    data = generatePurchLine(rows, { missingRate });
      else if (options.entity === 'gr-headers')  data = generateVendPackingSlipJour(rows, { missingRate });
      else if (options.entity === 'invoice-headers') data = generateVendInvoiceJour(rows, { missingRate });
      else if (options.entity === 'invoice-lines')   data = generateVendInvoiceTrans(rows, { missingRate });
      else {
        console.error(`Entity "${options.entity}" not supported for D365.`);
        console.error('Supported: vendors, po-headers, po-lines, gr-headers, invoice-headers, invoice-lines');
        process.exit(1);
      }
    } else {
      console.error(`ERP "${options.erp}" not yet supported. Supported: sap-ecc, jde, d365`);
      process.exit(1);
    }

    writeOutput(data, options.output, options.file, rows);
  });

// ── scenario: full linked dataset ────────────────────────────────────────────
program
  .command('scenario')
  .description('Generate a full linked dataset across all tables')
  .requiredOption('--erp <system>', 'ERP system: sap-ecc')
  .requiredOption('--name <scenario>', 'Scenario name: full-p2p')
  .option('--rows <number>', 'Approximate number of PO lines to generate', '100')
  .option('--output <format>', 'Output format: csv | json', 'csv')
  .option('--output-dir <dir>', 'Directory to write output files', './output')
  .option('--missing-rate <rate>', 'Rate of missing optional fields (0-1)', '0')
  .action((options) => {
    const rows = parseInt(options.rows, 10);
    const missingRate = parseFloat(options.missingRate);
    const outputDir = path.resolve(options.outputDir);

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    if (!['sap-ecc', 'jde', 'd365'].includes(options.erp)) {
      console.error(`ERP "${options.erp}" not yet supported for scenarios. Supported: sap-ecc, jde, d365`);
      process.exit(1);
    }

    if (options.name !== 'full-p2p') {
      console.error(`Scenario "${options.name}" not supported. Supported: full-p2p`);
      process.exit(1);
    }

    let result, tables;

    if (options.erp === 'sap-ecc') {
      console.log(`Generating SAP ECC full P2P dataset (~${rows} PO lines)...\n`);
      result = runFullP2P(rows, { missingRate });
      tables = [
        { name: 'LFA1_vendors',          data: result.lfa1  },
        { name: 'EKKO_po_headers',       data: result.ekko  },
        { name: 'EKPO_po_lines',         data: result.ekpo  },
        { name: 'MKPF_gr_headers',       data: result.mkpf  },
        { name: 'MSEG_gr_lines',         data: result.mseg  },
        { name: 'RBKP_invoice_headers',  data: result.rbkp  },
        { name: 'RSEG_invoice_lines',    data: result.rseg  },
      ];
    } else if (options.erp === 'jde') {
      console.log(`Generating JDE E1 full P2P dataset (~${rows} PO lines)...\n`);
      result = runJdeFullP2P(rows, { missingRate });
      tables = [
        { name: 'F0101_vendors',    data: result.f0101  },
        { name: 'F4301_po_headers', data: result.f4301  },
        { name: 'F4311_po_lines',   data: result.f4311  },
        { name: 'F43121_gr_lines',  data: result.f43121 },
        { name: 'F0411_invoices',   data: result.f0411  },
      ];
    } else {
      console.log(`Generating D365 F&O full P2P dataset (~${rows} PO lines)...\n`);
      result = runD365FullP2P(rows, { missingRate });
      tables = [
        { name: 'VendTable',              data: result.vendTable       },
        { name: 'PurchTable',             data: result.purchTable      },
        { name: 'PurchLine',              data: result.purchLine       },
        { name: 'VendPackingSlipJour',    data: result.packingSlipJour },
        { name: 'VendInvoiceJour',        data: result.invoiceJour     },
        { name: 'VendInvoiceTrans',       data: result.invoiceTrans    },
      ];
    }

    for (const table of tables) {
      const ext = options.output === 'json' ? 'json' : 'csv';
      const filePath = path.join(outputDir, `${table.name}.${ext}`);
      if (options.output === 'json') {
        writeJSON(table.data, filePath);
      } else {
        writeCSV(table.data, filePath);
      }
      console.log(`  ${table.name}.${ext}  (${table.data.length} rows)`);
    }

    console.log(`\nDone. Files written to: ${outputDir}`);
  });

// ── helpers ──────────────────────────────────────────────────────────────────
function writeOutput(data, format, filePath, rows) {
  if (format === 'csv') {
    if (filePath) { writeCSV(data, filePath); console.log(`Written ${rows} rows to ${filePath}`); }
    else console.log(toCSV(data));
  } else if (format === 'json') {
    if (filePath) { writeJSON(data, filePath); console.log(`Written ${rows} rows to ${filePath}`); }
    else console.log(toJSON(data));
  } else {
    console.error(`Output format "${format}" not supported. Supported: csv, json`);
    process.exit(1);
  }
}

program.parse(process.argv);
