# erp-datagen

![Status](https://img.shields.io/badge/status-working-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

Generate realistic synthetic procurement data for SAP ECC,
Microsoft D365, and JDE — for testing, AI training, and demos.

## The problem

Developers and data engineers building on ERP systems constantly
need realistic test data. Real production data can't be shared.
Existing tools don't understand procurement domain structure —
duplicate vendor names, multi-currency POs, three-way match
scenarios, and the messy edge cases that actually matter.

This tool does.

## Supported ERP systems

| ERP        | Entities supported                                                                        |
|------------|-------------------------------------------------------------------------------------------|
| SAP ECC    | LFA1, EKKO, EKPO, MKPF, MSEG, RBKP, RSEG                                                 |
| D365 F&O   | VendTable, PurchTable, PurchLine, VendPackingSlipJour, VendInvoiceJour, VendInvoiceTrans  |
| JDE E1     | F0101, F4301, F4311, F43121, F0411                                                        |

All three ERPs support a `full-p2p` scenario that generates all tables
**linked by real keys** in one command.

## Requirements

- Node.js >= 18

## Install

> **Note:** Package not yet published to npm. Clone and run locally for now.

```bash
git clone https://github.com/kundanshar-cell/erp-datagen.git
cd erp-datagen
npm install
```

## Usage

### Generate a single entity

```bash
node bin/cli.js generate --erp=<erp> --entity=<entity> [options]
```

| Option | Description | Default |
|---|---|---|
| `--erp` | ERP system: `sap-ecc`, `jde`, `d365` | required |
| `--entity` | Entity name (see table below) | required |
| `--rows` | Number of rows to generate | `100` |
| `--output` | Output format: `csv`, `json` | `csv` |
| `--file` | Write to file instead of stdout | stdout |
| `--missing-rate` | Rate of missing optional fields (0–1) | `0` |

**Examples:**

```bash
# SAP ECC — 500 vendors as CSV
node bin/cli.js generate --erp=sap-ecc --entity=vendors --rows=500 --output=csv

# SAP ECC — 200 PO headers as JSON, written to file
node bin/cli.js generate --erp=sap-ecc --entity=po-headers --rows=200 --output=json --file=./ekko.json

# JDE — 100 PO lines with 20% missing fields (simulates messy data)
node bin/cli.js generate --erp=jde --entity=po-lines --rows=100 --missing-rate=0.2

# D365 — 300 invoice headers as CSV
node bin/cli.js generate --erp=d365 --entity=invoice-headers --rows=300 --output=csv
```

### Supported entities per ERP

| ERP | `--entity` value | Table |
|-----|-----------------|-------|
| `sap-ecc` | `vendors` | LFA1 |
| `sap-ecc` | `po-headers` | EKKO |
| `sap-ecc` | `po-lines` | EKPO |
| `sap-ecc` | `gr-headers` | MKPF |
| `sap-ecc` | `gr-lines` | MSEG |
| `sap-ecc` | `invoice-headers` | RBKP |
| `sap-ecc` | `invoice-lines` | RSEG |
| `jde` | `vendors` | F0101 |
| `jde` | `po-headers` | F4301 |
| `jde` | `po-lines` | F4311 |
| `jde` | `gr-lines` | F43121 |
| `jde` | `invoices` | F0411 |
| `d365` | `vendors` | VendTable |
| `d365` | `po-headers` | PurchTable |
| `d365` | `po-lines` | PurchLine |
| `d365` | `gr-headers` | VendPackingSlipJour |
| `d365` | `invoice-headers` | VendInvoiceJour |
| `d365` | `invoice-lines` | VendInvoiceTrans |

### Generate a full linked dataset (full-p2p scenario)

Generates all tables for an ERP linked by real document keys — vendors → PO headers →
PO lines → goods receipt → invoices. One file per table, written to an output directory.

```bash
node bin/cli.js scenario --erp=<erp> --name=full-p2p [options]
```

| Option | Description | Default |
|---|---|---|
| `--erp` | ERP system: `sap-ecc`, `jde`, `d365` | required |
| `--name` | Scenario name: `full-p2p` | required |
| `--rows` | Approximate number of PO lines | `100` |
| `--output` | Output format: `csv`, `json` | `csv` |
| `--output-dir` | Directory to write files | `./output` |
| `--missing-rate` | Rate of missing optional fields (0–1) | `0` |

**Examples:**

```bash
# SAP ECC — full P2P dataset, 1000 PO lines, CSV
node bin/cli.js scenario --erp=sap-ecc --name=full-p2p --rows=1000 --output-dir=./output

# JDE — full P2P as JSON
node bin/cli.js scenario --erp=jde --name=full-p2p --rows=500 --output=json --output-dir=./output/jde

# D365 — messy data with 30% missing fields
node bin/cli.js scenario --erp=d365 --name=full-p2p --rows=1000 --missing-rate=0.3 --output-dir=./output/d365
```

**Sample output (SAP ECC, 1000 rows):**
```
LFA1_vendors.csv        (100 rows)
EKKO_po_headers.csv     (200 rows)
EKPO_po_lines.csv       (622 rows)
MKPF_gr_headers.csv     (207 rows)
MSEG_gr_lines.csv       (522 rows)
RBKP_invoice_headers.csv (155 rows)
RSEG_invoice_lines.csv  (567 rows)
```

## Edge cases included

- Duplicate vendor names with different formats
  (`ACME Ltd`, `Acme Limited`, `ACME LIMITED`)
- Configurable missing fields (`--missing-rate`)
- Multi-currency (GBP, USD, EUR, INR, SGD, JPY)
- Multi-language vendor names
- Realistic document numbering per ERP convention
- Three-way match scenarios (PO → GR → Invoice) with referential integrity
- Blocked/deleted vendors, cancelled PO lines
- Partial deliveries (GR quantity < PO quantity)
- Invoice price variance vs PO price
- Reversed GR documents and credit memos
- Dispute flags on invoices

## Output formats

`--output=csv` `--output=json`

> `sql` and `parquet` formats are on the roadmap.

## Roadmap

- [ ] Publish to npm
- [ ] SQL and Parquet output formats
- [ ] Oracle Fusion Procurement
- [ ] Coupa supplier/PO entities
- [ ] Web UI for no-code data generation
- [ ] Configurable data quality profiles (clean / messy / broken)

## Who is this for

- Developers building ERP integrations who need test data
- Data engineers building procurement analytics pipelines
- AI/ML teams training models on procurement data
- Consultants demoing ERP tools without production data

## Contributing

PRs welcome — especially for Oracle Fusion, Coupa, and Ariba schemas.
See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Author

Built by Kundan Sharma — IT & Digital Solution Architect
specialising in procurement data transformation and
agentic AI in enterprise supply chains.

15+ years designing and delivering digital transformation
programmes across enterprise.
[GitHub](https://github.com/kundanshar-cell)

If this saved you time, leave a star.

## License

MIT — see [LICENSE](LICENSE) for details.
