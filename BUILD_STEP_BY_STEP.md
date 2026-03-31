# Build Start Guide (No Coding Experience Required)

This guide turns `IMPLEMENTATION_PLAN.md` into concrete actions you can do right now.

## What we have already prepared in this repo

- `apps_script/Code.gs`: starter Google Apps Script file that creates the required tabs and headers, plus a monthly trigger.
- `templates/*.csv`: starter header templates you can import into Google Sheets (optional if you use the script).

---

## Step 1: Create your Google Sheet (manual)

1. Sign in to the committee Google account.
2. Open Google Drive.
3. Click **New** → **Google Sheets**.
4. Rename it to: **Kart Sport NZ Fee Comparison**.
5. Move it into your committee shared drive/folder.

---

## Step 2: Add the automation script (manual)

1. In the new Sheet, click **Extensions** → **Apps Script**.
2. In Apps Script, open `Code.gs`.
3. Delete all existing text in the editor.
4. Copy everything from this repository file:
   - `apps_script/Code.gs`
5. Paste it into Apps Script and click **Save**.

---

## Step 3: Run first-time setup (manual)

1. At the top of Apps Script, choose function **setupWorkbook**.
2. Click **Run**.
3. If asked to authorize:
   - Click **Review permissions**.
   - Select your Google account.
   - Click **Advanced** (if shown) → **Go to project**.
   - Click **Allow**.
4. Return to your Sheet. You should now see tabs:
   - `Annual_Costs`
   - `Per_Use_Costs`
   - `Have_A_Go`
   - `Sources_Log`
   - `Config`

---

## Step 4: Set monthly schedule (manual)

1. Back in Apps Script, select function **createMonthlyTrigger**.
2. Click **Run** once.
3. This creates an automatic run on the 1st day of each month at 5 AM.

---

## Step 5: Enter your first source list (manual)

1. Open the `Config` tab.
2. Add one row per club source URL.
3. Fill these columns:
   - `club_name`: e.g. "KartSport Taranaki"
   - `source_type`: e.g. `html`, `pdf`, `manual`
   - `source_url`: full webpage/PDF URL
   - `selector_or_rule`: simple note for now (e.g. "membership table")
   - `is_active`: `TRUE`
   - `alert_recipients`: committee email address

Tip: Start with only 3–5 clubs for pilot setup.

---

## Step 6: Test the monthly run now (manual)

1. In Apps Script, select function **monthlyRun**.
2. Click **Run**.
3. Go back to `Config` and confirm `last_successful_run` is populated.

If it populated, the basic automation framework is working.

---

## Step 7: Manual validation routine (manual every month)

On the first week of each month:

1. Open `Sources_Log`.
2. Filter `status` for `Needs review`.
3. Check source links manually.
4. Update:
   - `date_validated`
   - `validator_initials`
   - `status` = `Confirmed`

---

## Step 8: Committee dashboard setup (manual)

1. Open Looker Studio: <https://lookerstudio.google.com/>.
2. Create a new report.
3. Connect data source to your Google Sheet.
4. Add separate pages:
   - National Snapshot
   - Annual Costs
   - Per-Use Costs
   - Have a Go
   - Data Quality
5. Share report view access with committee members.

---

## What you need a developer to do next

After this setup is complete, a developer should implement:

1. Real fee extraction logic inside `monthlyRun()`.
2. HTML selector parsing per club.
3. PDF parsing fallback.
4. Regex fallback with confidence scoring.
5. Automatic writes to `Annual_Costs`, `Per_Use_Costs`, `Have_A_Go`, and `Sources_Log`.

