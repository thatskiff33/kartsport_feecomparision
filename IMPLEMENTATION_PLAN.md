# Kart Sport NZ Fee Comparison – Live Monthly Update Plan

## 1) Target outcome
Create a committee-facing, live fee comparison system that:
- updates monthly,
- separates **annual** costs from **per-use** costs,
- isolates **Have a Go** pricing in its own view,
- preserves source/date evidence,
- can be viewed by Kart Sport Taranaki committee members in Google Workspace.

## 2) Recommended platform architecture (best fit for your tools)
Use **Google Sheets + Apps Script + Looker Studio** as the primary stack.

- **Data store & calculations:** Google Sheets (shared drive controlled by committee)
- **Automation/scraping:** Google Apps Script (time-based monthly trigger)
- **Presentation dashboard:** Looker Studio (connected to Sheets, read-only)
- **Publishing options:**
  - Private sharing to committee Google accounts (preferred)
  - Link/embed into Sporty/1stdomains page if required (public or restricted by page permissions)

Why this approach:
- No extra software licensing required.
- Easy for non-technical committee members to maintain.
- Native monthly scheduling and email alerts.
- Clear audit trail with source URL + date checked.

---

## 3) Workbook structure (replace the current single-sheet design)
Create one Google Spreadsheet with these tabs:

### A. `Annual_Costs`
Use for recurring yearly fees:
- Club membership (single/family/junior where available)
- Annual track access / key hire / key bond (if annual)
- Any annual levy or compulsory annual charge

### B. `Per_Use_Costs`
Use for event/day-based fees:
- Club day entry fee
- Race day fee
- Practice day fee
- Daily track access fee
- Transponder hire
- Pit site hire
- One-day licence

### C. `Have_A_Go`
Dedicated tab for all Have a Go products:
- Session/experience name
- Price
- Inclusions (kart, gear, coaching, laps/time)
- Age restrictions / conditions

### D. `Sources_Log`
Mandatory evidence table for governance:
- Club name
- Fee type
- Source URL
- Source page title
- Raw extracted text/snippet
- Date scraped
- Date validated by human
- Validator initials
- Status (Auto / Needs review / Confirmed)

### E. `Config`
Controls for automation:
- List of clubs + website URLs
- Selector/XPath rules per club
- Last successful run date
- Alert recipients

---

## 4) Data model standard (fix mixed text/number/formula issues)
For every fee row, separate fields so formulas and values do not mix:

- `amount_nzd` (number only)
- `billing_unit` (annual, per_day, per_event, per_session)
- `fee_type` (membership, transponder_hire, one_day_licence, etc.)
- `notes_text` (plain text only)
- `calc_flag` (TRUE/FALSE if derived)
- `source_url`
- `date_checked`
- `confidence_score` (0–100)

Rule: **Never put formulas in raw ingest columns.**
- Raw tabs = values only.
- Calculated tabs = formula outputs from raw data.

---

## 5) Monthly collection workflow

### Step 1 — Source discovery and mapping (one-off setup)
For each club:
1. Identify where fees are published (often one of):
   - Sporty pages (membership/events/forms pages)
   - Club PDF forms
   - KartSport NZ event or supplementary regulation links
   - Facebook posts (fallback only; mark low confidence)
2. Record canonical fee URL(s) into `Config`.
3. Define extraction rule per source type (HTML table, list item, PDF text, form label).

### Step 2 — Automated scrape (monthly)
Apps Script trigger runs monthly (e.g., 1st of month 05:00):
- Fetch each configured source page.
- Extract fee candidates by selectors/regex.
- Normalize fee strings to decimal NZD values.
- Append to `Sources_Log` and write to staging tabs.

### Step 3 — Validation pass (human, 20–30 mins)
Committee data owner reviews rows flagged:
- large month-on-month changes,
- missing values,
- uncertain parse.
Then marks status as `Confirmed`.

### Step 4 — Publish view refresh
Looker Studio auto-refreshes from Sheets.
Committee views latest verified dataset and trend comparison.

---

## 6) Practical scraping strategy by source type
Because club websites vary, use a hybrid extractor:

1. **HTML first (preferred):**
   - CSS selector extraction from known fee sections/tables.
2. **PDF parser fallback:**
   - If fees are only in downloadable forms.
3. **Keyword+currency regex fallback:**
   - Detect phrases near `$`, `NZD`, `membership`, `transponder`, `one day licence`, `Have a Go`, `pit site`, `track access`.
4. **Manual confirm fallback:**
   - If dynamic pages/scripts prevent extraction.

Add a confidence score per record:
- 90–100: exact selector hit in structured table
- 60–89: regex extraction from plain text
- <60: manual review required

---

## 7) Presentation design for committee decision-making
Create a Looker Studio dashboard with these pages:

1. **National Comparison Snapshot**
   - Cheapest/median/highest by fee type
   - Taranaki position highlighted
2. **Annual Costs Comparison**
   - Membership + annual access side-by-side
3. **Per-Use Costs Comparison**
   - Club day, transponder, one-day licence, pit site, practice
4. **Have a Go Market View**
   - Entry-level pricing by club
5. **Data Quality & Freshness**
   - Last updated date, rows awaiting validation, sources by age

---

## 8) Governance, quality, and risk controls
- Nominate a **Data Steward** and **Backup Steward**.
- Keep a monthly signoff checklist.
- Retain historical snapshots (month-end copy tab or BigQuery export).
- Respect each website's terms; if scraping blocked, switch to manual source entry with citation.
- Keep all source links and timestamps for auditability.

---

## 9) Rollout plan (4 weeks)

### Week 1 — Design
- Build new workbook structure.
- Define taxonomy and fee dictionary.
- Populate initial club/source list.

### Week 2 — Automation MVP
- Build Apps Script extractor for 5 pilot clubs.
- Set monthly trigger.
- Implement data quality flags.

### Week 3 — Scale to all clubs
- Add remaining clubs.
- Tune selectors and fallback regex.
- Implement validation workflow.

### Week 4 — Dashboard + adoption
- Build Looker Studio dashboard.
- Committee review session.
- Finalize SOP for monthly validation.

---

## 10) Suggested ownership model
- **Committee sponsor:** Kart Sport Taranaki Chair/Secretary
- **Data steward:** 1 committee member (monthly checks)
- **Tech owner:** volunteer/admin comfortable with Apps Script
- **Review cadence:** monthly quick check + quarterly methodology review

---

## 11) Immediate next actions (this month)
1. Approve this three-tab fee split (`Annual_Costs`, `Per_Use_Costs`, `Have_A_Go`).
2. Build the new column schema with strict data typing.
3. Compile target club/source URL list in `Config`.
4. Pilot monthly automation on 3–5 clubs.
5. Stand up committee dashboard with read-only sharing.

---

## Note on web-source reconnaissance in this environment
External web requests are blocked in this execution environment, so live verification of specific club page structures could not be completed here. The implementation plan therefore uses a robust source-agnostic extraction strategy (HTML/PDF/regex/manual validation) suitable for the typical mix of NZ club publishing patterns.
