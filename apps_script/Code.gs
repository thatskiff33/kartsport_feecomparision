/**
 * Kart Sport NZ Fee Comparison - Apps Script starter scaffold.
 *
 * This script sets up the workbook tabs and a monthly trigger.
 *
 * HOW TO USE:
 * 1) Open your Google Sheet.
 * 2) Extensions -> Apps Script.
 * 3) Replace the default Code.gs content with this file.
 * 4) Run setupWorkbook() once.
 * 5) Run createMonthlyTrigger() once and approve permissions.
 */

const REQUIRED_SHEETS = [
  'Annual_Costs',
  'Per_Use_Costs',
  'Have_A_Go',
  'Sources_Log',
  'Config',
];

const HEADERS = {
  Annual_Costs: [
    'club_name',
    'fee_name',
    'amount_nzd',
    'billing_unit',
    'fee_type',
    'notes_text',
    'calc_flag',
    'source_url',
    'date_checked',
    'confidence_score',
  ],
  Per_Use_Costs: [
    'club_name',
    'fee_name',
    'amount_nzd',
    'billing_unit',
    'fee_type',
    'notes_text',
    'calc_flag',
    'source_url',
    'date_checked',
    'confidence_score',
  ],
  Have_A_Go: [
    'club_name',
    'session_name',
    'amount_nzd',
    'billing_unit',
    'fee_type',
    'inclusions',
    'age_restrictions',
    'notes_text',
    'source_url',
    'date_checked',
    'confidence_score',
  ],
  Sources_Log: [
    'club_name',
    'fee_type',
    'source_url',
    'source_page_title',
    'raw_text_snippet',
    'date_scraped',
    'date_validated',
    'validator_initials',
    'status',
  ],
  Config: [
    'club_name',
    'source_type',
    'source_url',
    'selector_or_rule',
    'is_active',
    'alert_recipients',
    'last_successful_run',
  ],
};

function setupWorkbook() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  REQUIRED_SHEETS.forEach((sheetName) => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    const headers = HEADERS[sheetName] || [];
    if (headers.length > 0) {
      sheet.clear();
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  });
}

function createMonthlyTrigger() {
  // Prevent duplicate triggers for monthlyRun.
  const existing = ScriptApp.getProjectTriggers();
  existing.forEach((trigger) => {
    if (trigger.getHandlerFunction() === 'monthlyRun') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('monthlyRun')
    .timeBased()
    .onMonthDay(1)
    .atHour(5)
    .create();
}

function monthlyRun() {
  // Placeholder MVP: logs run date into Config tab.
  // Next implementation step: loop Config rows, fetch source URLs,
  // extract fee candidates, and append to raw tabs + Sources_Log.
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const config = ss.getSheetByName('Config');
  if (!config) {
    throw new Error('Config sheet not found. Run setupWorkbook() first.');
  }

  const now = new Date();
  const values = config.getDataRange().getValues();
  if (values.length <= 1) {
    return;
  }

  const headers = values[0];
  const runIndex = headers.indexOf('last_successful_run');
  if (runIndex === -1) {
    throw new Error('Column last_successful_run missing in Config.');
  }

  for (let r = 2; r <= values.length; r++) {
    config.getRange(r, runIndex + 1).setValue(now);
  }
}
