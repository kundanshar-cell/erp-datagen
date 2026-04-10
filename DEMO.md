# erp-datagen — Demo Guide

Quick reference for demoing the tool to developers, data engineers, or anyone who asks.

Available on npm: `npx erp-datagen --help`

---

## Demo 1 — Quick single entity (30 seconds)

```bash
# SAP ECC — 5 vendor master rows to screen
npx erp-datagen generate --erp=sap-ecc --entity=vendors --rows=5

# JDE — PO lines with 20% missing fields (simulates messy real-world data)
npx erp-datagen generate --erp=jde --entity=po-lines --rows=10 --missing-rate=0.2

# D365 — invoice headers as JSON
npx erp-datagen generate --erp=d365 --entity=invoice-headers --rows=5 --output=json
```

---

## Demo 2 — Full linked P2P dataset (the impressive one)

Generates all tables linked by real document keys — vendor → PO → GR → Invoice.

```bash
npx erp-datagen scenario --erp=sap-ecc --name=full-p2p --rows=1000 --output-dir=./demo-output
```

Output:
```
LFA1_vendors.csv          (~100 rows)
EKKO_po_headers.csv       (~200 rows)
EKPO_po_lines.csv         (~600 rows)
MKPF_gr_headers.csv       (~200 rows)
MSEG_gr_lines.csv         (~500 rows)
RBKP_invoice_headers.csv  (~150 rows)
RSEG_invoice_lines.csv    (~560 rows)
```

Every file links correctly — a PO line references a real PO header, which references a real vendor.

---

## Demo 3 — All 3 ERPs side by side

```bash
npx erp-datagen scenario --erp=sap-ecc --name=full-p2p --rows=500 --output-dir=./demo/sap
npx erp-datagen scenario --erp=jde   --name=full-p2p --rows=500 --output-dir=./demo/jde
npx erp-datagen scenario --erp=d365  --name=full-p2p --rows=500 --output-dir=./demo/d365
```

Same procurement data, three ERP formats — useful for cross-ERP migration or analytics demos.

---

## Demo 4 — Messy data (data quality / AI training angle)

```bash
npx erp-datagen scenario --erp=d365 --name=full-p2p --rows=1000 --missing-rate=0.3 --output-dir=./demo/messy
```

30% of optional fields will be missing — simulates the reality of production ERP exports.

---

## Key talking points

- **"Real production data can't be shared"** — this fills that gap instantly
- **"It understands ERP domain structure"** — duplicate vendor names (`ACME Ltd` / `Acme Limited` / `ACME LIMITED`), partial GR deliveries, invoice price variance, dispute flags
- **"Three-way match with referential integrity"** — PO → GR → Invoice document keys all link correctly across files
- **"Works for AI/ML teams too"** — JSONL fine-tuning pack coming soon (`erp-datagen-ai-pack`)
- **"Three ERPs, one tool"** — SAP ECC, JDE E1, D365 F&O

---

## Install

```bash
# No install needed
npx erp-datagen --help

# Or globally
npm install -g erp-datagen
```

Live on npm: https://www.npmjs.com/package/erp-datagen
