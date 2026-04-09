#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const { generateLFA1 } = require('../src/generators/sap-ecc');
const { toCSV, writeCSV } = require('../src/output/csv');
const { toJSON, writeJSON } = require('../src/output/json');

const program = new Command();

program
  .name('erp-datagen')
  .description('Generate realistic synthetic procurement data for SAP ECC, D365, and JDE')
  .version('0.1.0');

program
  .command('generate')
  .description('Generate synthetic ERP data')
  .requiredOption('--erp <system>', 'ERP system: sap-ecc | d365 | jde')
  .requiredOption('--entity <name>', 'Entity to generate: vendors | ...')
  .option('--rows <number>', 'Number of rows to generate', '100')
  .option('--output <format>', 'Output format: csv | json', 'csv')
  .option('--file <path>', 'Output file path (defaults to stdout)')
  .option('--missing-rate <rate>', 'Rate of missing optional fields (0-1)', '0')
  .action((options) => {
    const rows = parseInt(options.rows, 10);
    const missingRate = parseFloat(options.missingRate);

    let data;

    if (options.erp === 'sap-ecc') {
      if (options.entity === 'vendors') {
        data = generateLFA1(rows, { missingRate });
      } else {
        console.error(`Entity "${options.entity}" not yet supported for SAP ECC.`);
        console.error('Supported: vendors');
        process.exit(1);
      }
    } else {
      console.error(`ERP "${options.erp}" not yet supported.`);
      console.error('Supported: sap-ecc');
      process.exit(1);
    }

    if (options.output === 'csv') {
      if (options.file) {
        writeCSV(data, options.file);
        console.log(`Written ${rows} rows to ${options.file}`);
      } else {
        console.log(toCSV(data));
      }
    } else if (options.output === 'json') {
      if (options.file) {
        writeJSON(data, options.file);
        console.log(`Written ${rows} rows to ${options.file}`);
      } else {
        console.log(toJSON(data));
      }
    } else {
      console.error(`Output format "${options.output}" not yet supported.`);
      console.error('Supported: csv, json');
      process.exit(1);
    }
  });

program.parse(process.argv);
