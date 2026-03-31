/**
 * Kart Sport NZ Fee Comparison - automated Apps Script workflow.
 *
 * WHAT THIS VERSION AUTOMATES
 * - Creates all tabs with typed headers.
 * - Auto-builds Config from KartSport NZ club directory links.
 * - Discovers likely fee pages (membership/events/practice/have-a-go/pdf).
 * - Scrapes fee candidates from source pages.
 * - Classifies fees into Annual_Costs / Per_Use_Costs / Have_A_Go.
 * - Writes audit rows to Sources_Log with confidence and status.
 * - Updates Config.last_successful_run automatically.
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

const CLUB_DIRECTORY_URLS = [
  'https://www.kartsport.org.nz/clubs/',
  'https://www.kartsport.org.nz',
];

const SOURCE_KEYWORDS = [
  'membership',
  'fees',
  'pricing',
  'prices',
  'entry',
  'entries',
  'practice',
  'race',
  'clubday',
  'club-day',
  'have-a-go',
  'have a go',
  'licence',
  'license',
  'transponder',
  'pit',
  'track',
  'calendar',
];

const FEE_PATTERNS = [
  /([A-Za-z][A-Za-z0-9\-\s\/\(\)]{2,60}?)\s*[:\-]?\s*(?:NZ\$|\$|NZD\s?)(\d{1,4}(?:[\.,]\d{1,2})?)/gi,
  /(?:NZ\$|\$|NZD\s?)(\d{1,4}(?:[\.,]\d{1,2})?)\s*(?:for|per)?\s*([A-Za-z][A-Za-z0-9\-\s\/\(\)]{2,60})/gi,
];

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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureRequiredSheets_(ss);

  if (isConfigEmpty_(ss)) {
    autoPopulateConfig();
  }

  const configRows = getActiveConfigRows_(ss);
  if (configRows.length === 0) {
    throw new Error('Config has no active sources. Run autoPopulateConfig() or add sources manually.');
  }

  const now = new Date();
  const annualRows = [];
  const perUseRows = [];
  const haveAGoRows = [];
  const sourceLogRows = [];

  configRows.forEach((row) => {
    const page = fetchSourceText_(row.source_url);
    if (!page.text) {
      return;
    }

    const candidates = extractFeeCandidates_(page.text);
    candidates.forEach((candidate) => {
      const classified = classifyFee_(candidate.label);
      const confidence = scoreConfidence_(candidate, row.source_type);
      const status = confidence < 60 ? 'Needs review' : 'Auto';

      sourceLogRows.push([
        row.club_name,
        classified.fee_type,
        row.source_url,
        page.title,
        candidate.snippet,
        now,
        '',
        '',
        status,
      ]);

      const baseRecord = [
        row.club_name,
        candidate.label,
        candidate.amount,
        classified.billing_unit,
        classified.fee_type,
        candidate.snippet,
        false,
        row.source_url,
        now,
        confidence,
      ];

      if (classified.category === 'annual') {
        annualRows.push(baseRecord);
      } else if (classified.category === 'have_a_go') {
        haveAGoRows.push([
          row.club_name,
          candidate.label,
          candidate.amount,
          classified.billing_unit,
          classified.fee_type,
          '',
          '',
          candidate.snippet,
          row.source_url,
          now,
          confidence,
        ]);
      } else {
        perUseRows.push(baseRecord);
      }
    });
  });

  appendRowsIfAny_(ss.getSheetByName('Annual_Costs'), annualRows);
  appendRowsIfAny_(ss.getSheetByName('Per_Use_Costs'), perUseRows);
  appendRowsIfAny_(ss.getSheetByName('Have_A_Go'), haveAGoRows);
  appendRowsIfAny_(ss.getSheetByName('Sources_Log'), sourceLogRows);

  updateConfigRunTimestamps_(ss, now);
}

function autoPopulateConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureRequiredSheets_(ss);

  const discoveredClubs = discoverClubs_();
  const configRows = [];

  discoveredClubs.forEach((club) => {
    const sourceCandidates = discoverLikelySourceUrls_(club.url);
    if (sourceCandidates.length === 0) {
      sourceCandidates.push({
        source_url: club.url,
        source_type: inferSourceType_(club.url),
        selector_or_rule: 'fallback: homepage fee scan',
      });
    }

    sourceCandidates.slice(0, 5).forEach((candidate) => {
      configRows.push([
        club.name,
        candidate.source_type,
        candidate.source_url,
        candidate.selector_or_rule,
        true,
        Session.getActiveUser().getEmail() || '',
        '',
      ]);
    });
  });

  const configSheet = ss.getSheetByName('Config');
  clearDataRows_(configSheet);
  appendRowsIfAny_(configSheet, configRows);
}

function ensureRequiredSheets_(ss) {
  REQUIRED_SHEETS.forEach((sheetName) => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    const headers = HEADERS[sheetName];
    const existingHeader = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (!headerMatches_(existingHeader, headers)) {
      sheet.clear();
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  });
}

function isConfigEmpty_(ss) {
  const sheet = ss.getSheetByName('Config');
  return sheet.getLastRow() <= 1;
}

function getActiveConfigRows_(ss) {
  const config = ss.getSheetByName('Config');
  const values = config.getDataRange().getValues();
  if (values.length <= 1) {
    return [];
  }

  const headers = values[0];
  const index = indexMap_(headers);

  return values
    .slice(1)
    .filter((row) => String(row[index.is_active]).toLowerCase() === 'true')
    .map((row, rowOffset) => ({
      row_number: rowOffset + 2,
      club_name: String(row[index.club_name] || '').trim(),
      source_type: String(row[index.source_type] || '').trim().toLowerCase(),
      source_url: String(row[index.source_url] || '').trim(),
      selector_or_rule: String(row[index.selector_or_rule] || '').trim(),
    }))
    .filter((row) => row.club_name && row.source_url);
}

function discoverClubs_() {
  const clubs = [];
  const seen = {};

  CLUB_DIRECTORY_URLS.forEach((url) => {
    const page = fetchSourceText_(url);
    if (!page.text) {
      return;
    }

    const links = extractLinks_(page.html || '');
    links.forEach((link) => {
      const href = (link.href || '').trim();
      const text = (link.text || '').trim();
      if (!href || !text) return;
      if (!isLikelyClub_(text, href)) return;
      const normalized = normalizeUrl_(href, url);
      if (!normalized || seen[normalized]) return;
      seen[normalized] = true;
      clubs.push({ name: cleanClubName_(text), url: normalized });
    });
  });

  if (clubs.length === 0) {
    throw new Error('Unable to discover clubs automatically from configured directory URLs.');
  }

  return clubs;
}

function discoverLikelySourceUrls_(homepageUrl) {
  const page = fetchSourceText_(homepageUrl);
  if (!page.html) {
    return [];
  }

  const links = extractLinks_(page.html);
  const sources = [];
  const seen = {};

  links.forEach((link) => {
    const href = normalizeUrl_(link.href, homepageUrl);
    const text = (link.text || '').toLowerCase();
    if (!href || seen[href]) return;

    const target = `${href} ${text}`;
    const keywordHit = SOURCE_KEYWORDS.some((kw) => target.includes(kw));
    if (!keywordHit) return;

    seen[href] = true;
    sources.push({
      source_url: href,
      source_type: inferSourceType_(href),
      selector_or_rule: inferRuleHint_(target),
    });
  });

  return sources;
}

function fetchSourceText_(url) {
  const response = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; KartSportFeeBot/1.0)',
    },
  });

  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    return { title: '', text: '', html: '' };
  }

  const contentType = String(response.getHeaders()['Content-Type'] || '').toLowerCase();
  const body = response.getContentText();
  if (contentType.includes('pdf') || url.toLowerCase().endsWith('.pdf')) {
    // Simple fallback for PDFs (still captures text for regex pass).
    return { title: 'PDF', text: body, html: '' };
  }

  const titleMatch = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? sanitizeText_(titleMatch[1]) : '';
  const text = htmlToText_(body);
  return { title: title || url, text, html: body };
}

function extractFeeCandidates_(text) {
  const results = [];
  const dedupe = {};

  FEE_PATTERNS.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const labelRaw = match[1] && !match[1].match(/^\d/) ? match[1] : match[2];
      const amountRaw = match[2] && !match[2].match(/[A-Za-z]/) ? match[2] : match[1];
      const label = sanitizeText_(String(labelRaw || '').slice(0, 80));
      const amount = parseAmount_(amountRaw);
      if (!label || !amount || amount <= 0) continue;
      if (!isLikelyFeeLabel_(label)) continue;

      const key = `${label.toLowerCase()}|${amount}`;
      if (dedupe[key]) continue;
      dedupe[key] = true;

      results.push({
        label,
        amount,
        snippet: `${label} - ${amount}`,
      });

      if (results.length >= 200) {
        return;
      }
    }
  });

  return results;
}

function classifyFee_(label) {
  const l = label.toLowerCase();

  if (l.includes('have a go') || l.includes('have-a-go') || l.includes('experience')) {
    return {
      category: 'have_a_go',
      billing_unit: 'per_session',
      fee_type: 'have_a_go',
    };
  }

  if (
    l.includes('membership') ||
    l.includes('member') ||
    l.includes('annual') ||
    l.includes('yearly') ||
    l.includes('levy')
  ) {
    return {
      category: 'annual',
      billing_unit: 'annual',
      fee_type: 'membership',
    };
  }

  if (l.includes('transponder')) {
    return { category: 'per_use', billing_unit: 'per_day', fee_type: 'transponder_hire' };
  }
  if (l.includes('one day') && (l.includes('licence') || l.includes('license'))) {
    return { category: 'per_use', billing_unit: 'per_event', fee_type: 'one_day_licence' };
  }
  if (l.includes('pit')) {
    return { category: 'per_use', billing_unit: 'per_event', fee_type: 'pit_site_hire' };
  }
  if (l.includes('practice')) {
    return { category: 'per_use', billing_unit: 'per_day', fee_type: 'practice_day_fee' };
  }
  if (l.includes('race') || l.includes('club day') || l.includes('entry')) {
    return { category: 'per_use', billing_unit: 'per_event', fee_type: 'club_day_entry' };
  }

  return { category: 'per_use', billing_unit: 'per_event', fee_type: 'other_per_use' };
}

function scoreConfidence_(candidate, sourceType) {
  let score = 65;
  const label = candidate.label.toLowerCase();

  if (SOURCE_KEYWORDS.some((kw) => label.includes(kw))) {
    score += 15;
  }
  if (sourceType === 'pdf') {
    score -= 10;
  }
  if (candidate.amount > 0 && candidate.amount < 2000) {
    score += 10;
  }

  return Math.max(30, Math.min(98, score));
}

function updateConfigRunTimestamps_(ss, now) {
  const config = ss.getSheetByName('Config');
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
    if (String(values[r - 1][headers.indexOf('is_active')]).toLowerCase() === 'true') {
      config.getRange(r, runIndex + 1).setValue(now);
    }
  }
}

function appendRowsIfAny_(sheet, rows) {
  if (!rows || rows.length === 0) return;
  const start = sheet.getLastRow() + 1;
  sheet.getRange(start, 1, rows.length, rows[0].length).setValues(rows);
}

function clearDataRows_(sheet) {
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getMaxColumns()).clearContent();
  }
}

function headerMatches_(a, b) {
  if (!a || !b || a.length < b.length) return false;
  for (let i = 0; i < b.length; i++) {
    if (String(a[i]).trim() !== String(b[i]).trim()) {
      return false;
    }
  }
  return true;
}

function indexMap_(headers) {
  const map = {};
  headers.forEach((name, i) => {
    map[name] = i;
  });
  return map;
}

function extractLinks_(html) {
  const links = [];
  const regex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    links.push({
      href: sanitizeText_(match[1]),
      text: sanitizeText_(match[2]),
    });
  }
  return links;
}

function normalizeUrl_(href, baseUrl) {
  const h = String(href || '').trim();
  if (!h) return '';
  if (h.startsWith('mailto:') || h.startsWith('tel:') || h.startsWith('#')) return '';
  if (h.startsWith('http://') || h.startsWith('https://')) return h;
  if (h.startsWith('//')) return `https:${h}`;

  const baseMatch = String(baseUrl).match(/^(https?:\/\/[^/]+)/i);
  if (!baseMatch) return '';
  const origin = baseMatch[1];
  if (h.startsWith('/')) return `${origin}${h}`;

  const trimmedBase = String(baseUrl).replace(/\/?$/, '');
  return `${trimmedBase}/${h}`;
}

function inferSourceType_(url) {
  return String(url).toLowerCase().endsWith('.pdf') ? 'pdf' : 'html';
}

function inferRuleHint_(targetText) {
  const t = targetText.toLowerCase();
  if (t.includes('have a go') || t.includes('have-a-go')) return 'keyword: have a go';
  if (t.includes('membership')) return 'keyword: membership';
  if (t.includes('practice')) return 'keyword: practice';
  if (t.includes('entry') || t.includes('race')) return 'keyword: race/entry';
  if (t.includes('fee') || t.includes('price')) return 'keyword: fee/price';
  return 'keyword: general fee page';
}

function isLikelyClub_(text, href) {
  const t = `${text} ${href}`.toLowerCase();
  if (t.includes('facebook.com') || t.includes('instagram.com')) {
    return false;
  }
  return t.includes('kart') || t.includes('club');
}

function cleanClubName_(name) {
  let n = sanitizeText_(name).replace(/\s+/g, ' ').trim();
  n = n.replace(/\|.*/g, '').trim();
  if (n.length > 80) n = n.slice(0, 80);
  return n;
}

function htmlToText_(html) {
  return sanitizeText_(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
  );
}

function sanitizeText_(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function parseAmount_(value) {
  const normalized = String(value || '').replace(/,/g, '.').match(/\d+(?:\.\d{1,2})?/);
  if (!normalized) return null;
  return Number(normalized[0]);
}

function isLikelyFeeLabel_(label) {
  const l = label.toLowerCase();
  return (
    l.includes('membership') ||
    l.includes('have') ||
    l.includes('entry') ||
    l.includes('fee') ||
    l.includes('price') ||
    l.includes('practice') ||
    l.includes('race') ||
    l.includes('day') ||
    l.includes('license') ||
    l.includes('licence') ||
    l.includes('track') ||
    l.includes('transponder') ||
    l.includes('pit')
  );
}
