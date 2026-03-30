# Receipt Processing Instructions for Claude CLI

When the user asks you to "process receipts" or "process new receipts", follow this procedure exactly.

## Environment

- **Supabase URL**: `https://mxxabikquupnwvlspzyz.supabase.co`
- **Service role key**: stored in `/home/dejan/.claude/projects/-home-dejan-Hay---Wilson-Electric-Company-LLC-HandW-Website/memory/reference_supabase.md`
- **Storage bucket**: `hw-receipts`
- **Expenses table**: `hw_expenses`

## Step 1: List ALL receipt files in storage

Receipt files live in two places:
- **Bucket root** (uploaded from desktop — no folder prefix)
- **`_unassigned/` folder** (uploaded via mobile QR for "no job" company expenses)
- **Job ID folders** (e.g., `6a52c871-.../filename.jpg`) — uploaded via mobile QR for specific jobs

List files from ALL locations:

```bash
# Root files (most desktop uploads land here)
curl -s "$SB_URL/storage/v1/object/list/hw-receipts" \
  -H "Authorization: Bearer $SB_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prefix":"","limit":500}'

# Unassigned folder
curl -s "$SB_URL/storage/v1/object/list/hw-receipts" \
  -H "Authorization: Bearer $SB_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prefix":"_unassigned/","limit":500}'
```

## Step 2: List ALL existing expenses that have receipt_path

```bash
curl -s "$SB_URL/rest/v1/hw_expenses?select=receipt_path&receipt_path=not.is.null" \
  -H "apikey: $SB_KEY" \
  -H "Authorization: Bearer $SB_KEY"
```

Compare the two lists. Any file in storage that does NOT appear as a `receipt_path` in an expense record is **unprocessed** and needs to be handled.

## Step 3: Download and read each unprocessed receipt

For each unprocessed file, download it locally and read it:

```bash
# Get a signed URL (valid 5 min)
curl -s "$SB_URL/storage/v1/object/sign/hw-receipts/FILEPATH" \
  -H "Authorization: Bearer $SB_KEY" \
  -H "Content-Type: application/json" \
  -d '{"expiresIn":300}'

# Download to /tmp/
curl -sL "SIGNED_URL" -o /tmp/receipt_filename
```

Then use the Read tool to visually inspect the file (works for images and PDFs).

Extract from each receipt:
- **vendor**: Company/store name
- **amount**: Total amount as a number (USD)
- **expense_date**: Date in YYYY-MM-DD format
- **description**: Brief summary of what was purchased
- **category**: One of: `materials`, `tools`, `software`, `fuel`, `supplies`, `permits`, `subcontractor`, `equipment_rental`, `vehicle`, `meals`, `other`

## Step 4: Handle currency conversion

If a receipt is in a foreign currency (EUR, GBP, etc.):
1. Look up the exchange rate for the invoice/receipt date (use x-rates.com or similar)
2. Convert to USD
3. Note the conversion in the description, e.g.: `"Top up for Infobip Services (€20.00 EUR → USD at 1.182764)"`

## Step 5: Determine job assignment

**ASK THE USER** which job each receipt belongs to, unless it's obvious. Current jobs:

| Job Name | Job ID |
|----------|--------|
| El Cerrito | `6a52c871-3294-4195-847e-1e1c220090b6` |
| Panel upgrade | `b1ad63ae-15a7-4dc6-b20b-82c5610fd63d` |
| General design/engineering/contracting | `5709a5a9-54f4-485f-9f57-8a1040571608` |
| Tigo Energy Campus PV | `068f39f4-58ff-4f9c-b7ae-3f4d2837a86a` |
| Davis PV + Batt | `c22fceef-ea0b-4f02-a304-3db64eb038c4` |
| No job (company expense) | `null` |

**NOTE**: This job list may be outdated. Always query the current jobs:
```bash
curl -s "$SB_URL/rest/v1/hw_jobs?select=id,name&order=created_at.desc" \
  -H "apikey: $SB_KEY" -H "Authorization: Bearer $SB_KEY"
```

Common patterns (but still confirm with user if unsure):
- Software/SaaS invoices (Supabase, Vercel, Hetzner, Infobip, etc.) → usually `null` (company expense), category `"software"`
- Hardware store receipts (Home Depot, Ace) → usually belong to a specific job, category `"materials"`
- Meals, fuel → could be either, ask

## Step 6: Create expense records

Insert into `hw_expenses` via Supabase REST API:

```bash
curl -s "$SB_URL/rest/v1/hw_expenses" \
  -H "apikey: $SB_KEY" \
  -H "Authorization: Bearer $SB_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '[
    {
      "job_id": null,
      "vendor": "Vendor Name",
      "description": "Brief description of purchase",
      "amount": 123.45,
      "expense_date": "2026-01-15",
      "receipt_path": "exact_filename_from_storage.pdf",
      "ocr_raw_text": "processed",
      "category": "software",
      "reimbursable": true
    }
  ]'
```

### Field rules:
- **`receipt_path`**: Must EXACTLY match the storage filename (including any folder prefix like `_unassigned/`)
- **`job_id`**: UUID of the job, or `null` for company expenses
- **`ocr_raw_text`**: Always set to `"processed"` when creating manually
- **`reimbursable`**: `true` if the expense should be billed back to a customer (job-related materials), `false` for company overhead
- **`amount`**: Always in USD. For refunds/credits, use negative numbers
- You can batch multiple expenses in a single POST as a JSON array

## Step 7: Verify

After creating records, list the new expenses to confirm they were created correctly:

```bash
curl -s "$SB_URL/rest/v1/hw_expenses?select=vendor,amount,expense_date,receipt_path&order=created_at.desc&limit=10" \
  -H "apikey: $SB_KEY" -H "Authorization: Bearer $SB_KEY"
```

## Common Mistakes to Avoid

1. **Don't guess job assignments** — ask the user if not obvious
2. **Don't forget currency conversion** — all amounts must be USD
3. **Don't duplicate expenses** — always check existing records first (Step 2)
4. **Don't use wrong receipt_path** — it must match storage exactly (files at root have NO folder prefix; files in `_unassigned/` start with `_unassigned/`)
5. **Don't skip reading the actual receipt** — download and visually inspect every file to get accurate data
6. **Multiple receipts on one image** — some photos contain 2+ receipts. Create separate expense records for each
