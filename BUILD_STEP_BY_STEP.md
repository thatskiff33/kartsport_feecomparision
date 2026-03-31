# Fully Automated Build Guide (No Coding Experience Required)

This version removes manual `Config` entry. The script now auto-discovers clubs, source pages, and fee candidates.

## What is now automated

- Creates all required tabs with correct headers.
- Auto-populates the `Config` tab from KartSport NZ club directory links.
- Discovers likely fee source pages (membership, race entries, practice, Have a Go, PDFs).
- Scrapes and classifies fee values into:
  - `Annual_Costs`
  - `Per_Use_Costs`
  - `Have_A_Go`
- Writes evidence and review status into `Sources_Log`.
- Updates `last_successful_run` in `Config`.

---

## Step 1: Create the spreadsheet

1. Open Google Drive (committee account).
2. Click **New** → **Google Sheets**.
3. Name it **Kart Sport NZ Fee Comparison**.

---

## Step 2: Install script

1. Open the sheet.
2. Click **Extensions** → **Apps Script**.
3. Open `Code.gs`.
4. Replace everything with `apps_script/Code.gs` from this repository.
5. Click **Save**.

---

## Step 3: One-time setup

1. Select function **setupWorkbook**.
2. Click **Run**.
3. Approve permissions if prompted.

This creates all required tabs automatically.

---

## Step 4: Turn on monthly automation

1. Select function **createMonthlyTrigger**.
2. Click **Run** once.

This schedules automatic monthly updates (1st day, 5 AM).

---

## Step 5: First fully automated run

1. Select function **monthlyRun**.
2. Click **Run**.

What happens automatically:
- If `Config` is empty, script fills it automatically.
- Script visits active source URLs.
- Fees are extracted and written to output tabs.
- `Sources_Log` is updated for audit and review.

---

## Step 6: Monthly human review (quick quality control)

1. Open `Sources_Log`.
2. Filter `status = Needs review`.
3. Validate those rows against source URL.
4. Fill `date_validated`, `validator_initials`, set status to `Confirmed`.

---

## Step 7: Dashboard publishing

1. Open Looker Studio.
2. Create report from this Google Sheet.
3. Build pages:
   - Snapshot
   - Annual Costs
   - Per-Use Costs
   - Have a Go
   - Data Quality
4. Share read-only with committee.

---

## Important notes

- Full automation still depends on each website allowing page access/scraping.
- If a site blocks access or uses complex JavaScript rendering, records may be flagged as `Needs review`.
- That is expected; the workflow is designed for “automated first, human validate exceptions.”
