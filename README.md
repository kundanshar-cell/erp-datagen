# erp-datagen
Generate realistic synthetic procurement data for SAP ECC, D365, and JDE — for testing, AI training, and demos
# erp-datagen

![Status](https://img.shields.io/badge/status-early%20development-orange)
![License](https://img.shields.io/badge/license-MIT-blue)

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

| ERP        | Entities supported                                              |
|------------|-----------------------------------------------------------------|
| SAP ECC    | LFA1, EKKO, EKPO, MKPF, MSEG, RBKP, RSEG                      |
| D365 F&O   | VendTable, PurchTable, PurchLine, VendPackingSlipJour, VendInvoiceJour, VendInvoiceTrans |
| JDE E1     | F0101, F4301, F4311, F43121, F0411                              |

## Requirements

- Node.js >= 18

## Install

> **Note:** Package not yet published to npm. Clone and run locally for now.

```bash
git clone https://github.com/your-username/erp-datagen.git
cd erp-datagen
npm install
```

Once published:

```bash
npx erp-datagen --help
# or
npm install -g erp-datagen
```

## Usage

```bash
# Generate 500 SAP vendors as CSV
npx erp-datagen --erp=sap-ecc --entity=vendors --rows=500 --output=csv

# Generate D365 PO headers and lines as JSON
npx erp-datagen --erp=d365 --entity=purchase-orders --rows=200 --output=json

# Generate full procurement dataset (all linked tables)
npx erp-datagen --erp=sap-ecc --scenario=full-p2p --rows=1000
```

## Edge cases included

- Duplicate vendor names with different formats
  (`ACME Ltd`, `Acme Limited`, `ACME LIMITED`)
- Missing mandatory fields (configurable rate)
- Multi-currency (GBP, USD, EUR, INR)
- Multi-language vendor names
- Realistic document numbering per ERP convention
- Three-way match scenarios (PO → GR → Invoice) across all supported ERPs

## Output formats

`--output=csv` `--output=json` `--output=sql` `--output=parquet`

## Roadmap

- [ ] Publish to npm
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

Built by Kundan Sharma — founder of [DataEsprit](https://dataesprit.com),
a procurement data intelligence platform. SAP, D365, and JDE specialist.

If this saved you time, leave a star.

## License

MIT — see [LICENSE](LICENSE) for details.
