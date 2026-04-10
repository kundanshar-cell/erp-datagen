# Quick Start — No Technical Experience Needed

This guide will have you generating procurement test data in under 5 minutes.

---

## Step 1 — Check if Node.js is installed

Open your Terminal (Mac) or Command Prompt (Windows) and type:

```
node --version
```

If you see a number like `v20.0.0` — you're good. Skip to Step 3.

If you see an error — go to Step 2.

---

## Step 2 — Install Node.js (one time only)

1. Go to https://nodejs.org
2. Click the big green **"Download Node.js (LTS)"** button
3. Run the installer and click Next through all the steps
4. Close and reopen your Terminal
5. Type `node --version` to confirm it worked

---

## Step 3 — Generate your first file

Copy and paste this into your Terminal, then press Enter:

```
npx erp-datagen generate --erp=sap-ecc --entity=vendors --rows=100 --output=csv --file=my-vendors.csv
```

Wait about 10 seconds. You will see a file called `my-vendors.csv` appear in your current folder.
Open it in Excel — it will contain 100 realistic SAP vendor records.

---

## Step 4 — Generate a full dataset (all tables linked together)

This generates all procurement tables — vendors, purchase orders, goods receipts,
and invoices — all linked together with real document numbers.

```
npx erp-datagen scenario --erp=sap-ecc --name=full-p2p --rows=500 --output-dir=my-data
```

A folder called `my-data` will appear containing 7 CSV files ready to open in Excel.

---

## Choose your ERP system

Replace `sap-ecc` in any command above with one of these:

| Your ERP | Use this |
|----------|----------|
| SAP ECC | `sap-ecc` |
| Microsoft D365 | `d365` |
| JDE (Oracle) | `jde` |

Example for D365:
```
npx erp-datagen scenario --erp=d365 --name=full-p2p --rows=500 --output-dir=my-data
```

---

## Make the data messier (optional)

Real ERP exports often have missing fields. Add `--missing-rate=0.2` to simulate 20% missing data:

```
npx erp-datagen scenario --erp=sap-ecc --name=full-p2p --rows=500 --missing-rate=0.2 --output-dir=my-data
```

Increase to `0.5` for 50% missing — useful for testing how your system handles poor data quality.

---

## Common questions

**Where do the files appear?**
In whichever folder your Terminal is currently in. On Mac, this is usually your home folder (`/Users/yourname`). You can also type `pwd` in Terminal to see the exact path.

**Can I open the files in Excel?**
Yes. Just double-click the `.csv` file and it will open in Excel.

**Does it cost anything?**
No. The tool is free and open source. Nothing is uploaded — all data is generated on your computer.

**How do I get more rows?**
Change `--rows=500` to any number you need, e.g. `--rows=10000`.

---

## Need help?

Open an issue at https://github.com/kundanshar-cell/erp-datagen/issues
