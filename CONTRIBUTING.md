# Contributing to erp-datagen

Thanks for taking the time to contribute! This project exists because
the ERP community needs better tooling for realistic test data —
and that knowledge lives with practitioners like you.

## What we need most

- Schema definitions for Oracle Fusion, Coupa, and Ariba
- Additional SAP ECC, D365, or JDE entities
- Edge case improvements (new data quality scenarios)
- Bug fixes and output format improvements

## Getting started

```bash
git clone https://github.com/kundanshar-cell/erp-datagen.git
cd erp-datagen
npm install
```

## How to contribute

1. **Fork** the repo and create a branch from `main`
   ```bash
   git checkout -b feature/oracle-fusion-vendors
   ```

2. **Make your changes** — keep commits focused and descriptive

3. **Test your changes** locally before submitting

4. **Open a Pull Request** with:
   - A clear title (e.g. `Add Oracle Fusion VendorSite entity`)
   - What ERP / entity you added or changed
   - A sample of the generated output

## Adding a new ERP or entity

If you're adding a new ERP schema or entity, please include:

- The **official table/entity name** as used in the ERP system
- **Field names** matching the ERP convention (e.g. SAP uses uppercase like `LIFNR`, JDE uses `AN8`)
- **Realistic sample values** — not just `field1`, `value1`
- Any **referential constraints** (e.g. PO line must reference a valid PO header)

## Code style

- Keep it simple and readable
- No external dependencies unless necessary
- Each entity generator should be self-contained

## Reporting issues

Found a bug or missing edge case? [Open an issue](https://github.com/kundanshar-cell/erp-datagen/issues) with:
- ERP system and entity
- What you expected vs what you got
- Steps to reproduce

## Questions?

Open a [GitHub Discussion](https://github.com/kundanshar-cell/erp-datagen/discussions)
or reach out via the repo.
