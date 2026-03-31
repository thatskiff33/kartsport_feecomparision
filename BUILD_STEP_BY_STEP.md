# Fully Automated Build Guide (No Coding Experience Required)

This version is designed for maximum automation:
- It auto-fills `Config`.
- It scrapes all discoverable NZ KartSport club websites.
- If key fee categories are missing, it finds club emails online and sends a friendly request automatically.

## What is now automated

- Creates all required tabs with correct headers.
- Auto-populates the `Config` tab from KartSport NZ club directory links.
- Discovers likely fee source pages (membership, race entries, practice, Have a Go, PDFs).
- Scrapes and classifies fee values into:
  - `Annual_Costs`
  - `Per_Use_Costs`
  - `Have_A_Go`
- Writes evidence and review status into `Sources_Log`.
- Detects missing fee categories per club.
- Searches each club site for contact emails.
- Sends conversational follow-up emails when required data is missing.
- Logs all outreach in `Outreach_Log`.

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

This creates all required tabs, including `Outreach_Log`.

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
- Missing fee categories are detected by club.
- Club contact emails are discovered from website pages.
- Outreach emails are sent and logged in `Outreach_Log`.

---

## Step 6: Monthly human review (quick quality control)

1. Open `Sources_Log` and filter `status = Needs review`.
2. Validate flagged rows.
3. Mark confirmed rows with `date_validated`, `validator_initials`, `status = Confirmed`.
4. Open `Outreach_Log` and confirm outreach status (`Sent`, `Needs review`, `Skipped`).

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

- Google Apps Script email sending uses your account/mail quotas.
- Clubs are contacted at most once per month by this automation.
- If a site blocks access or hides contact data, outreach is logged as `Needs review` so you can follow up manually.
