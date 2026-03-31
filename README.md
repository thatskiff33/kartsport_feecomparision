# kartsport_feecomparision

A project to track and compare Kart Sport club pricing and fees in New Zealand.

## Planning document
See `IMPLEMENTATION_PLAN.md` for the proposed live monthly-update architecture, workbook design, scraping strategy, and rollout plan.

## Build starter assets
- `BUILD_STEP_BY_STEP.md`: non-technical guide for running the **fully automated** monthly workflow, including outreach emails for missing fee data.
- `apps_script/Code.gs`: automation script for sheet setup, config auto-discovery, source scraping, fee classification, missing-data detection, and club outreach emails.
- `templates/*.csv`: optional CSV header templates for each required tab.
