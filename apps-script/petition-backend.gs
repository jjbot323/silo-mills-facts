/**
 * Silo Mills Facts — Petition Backend
 * =======================================================
 * Google Apps Script that receives petition form submissions
 * from silomillstruth.com, verifies Cloudflare Turnstile
 * tokens server-side, and appends rows to a Google Sheet.
 *
 * SETUP CHECKLIST (see BACKEND-SETUP.md for walkthrough):
 *   1. Create a new Google Sheet, add the header row
 *      (see columns below). Copy the spreadsheet ID from
 *      the URL and paste below as SHEET_ID.
 *   2. Get your Turnstile *Secret Key* from Cloudflare
 *      (dash.cloudflare.com → Turnstile → site → Settings).
 *      Paste below as TURNSTILE_SECRET. Do NOT commit this
 *      file with a real secret.
 *   3. In the Apps Script editor: Deploy → New deployment
 *      → Web app → Execute as "Me" → Who has access "Anyone"
 *      → Deploy. Copy the /exec URL and paste it into
 *      index.html as APPS_SCRIPT_URL.
 * =======================================================
 */

// ====== CONFIG (fill these in) ======
const SHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
const SHEET_NAME = 'Signatures';
const TURNSTILE_SECRET = 'PASTE_YOUR_TURNSTILE_SECRET_KEY_HERE';
// =====================================

/**
 * Main entry point for POST submissions from the petition form.
 * Called when the HTML form POSTs form-urlencoded data to the
 * deployed web app URL.
 */
function doPost(e) {
  try {
    const params = (e && e.parameter) || {};

    // 1. Verify Turnstile token (server-side spam protection)
    const token = params['cf-turnstile-response'] || '';
    if (!token) {
      return _text('FAIL:NO_TOKEN');
    }
    if (!_verifyTurnstile(token)) {
      return _text('FAIL:TURNSTILE_INVALID');
    }

    // 2. Validate required fields
    const firstName = _sanitize((params.first_name || '').toString().trim());
    const lastName = _sanitize((params.last_name || '').toString().trim());
    const email = _sanitize((params.email || '').toString().trim());
    const zip = _sanitize((params.zip_code || '').toString().trim());
    const role = _sanitize((params.role || '').toString().trim());
    const comment = _sanitize((params.comment || '').toString().trim());
    const userAgent = _sanitize((params.user_agent || '').toString().substring(0, 500));
    const pageUrl = _sanitize((params.page_url || '').toString().substring(0, 200));

    if (!firstName || !lastName || !email) {
      return _text('FAIL:MISSING_FIELDS');
    }

    // 3. Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return _text('FAIL:EMAIL_INVALID');
    }

    // 4. Length caps to prevent abuse
    if (firstName.length > 50 || lastName.length > 50 ||
        email.length > 200 || zip.length > 20 ||
        role.length > 100 || comment.length > 1000) {
      return _text('FAIL:FIELD_TOO_LONG');
    }

    // 5. Append to sheet
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        'Timestamp', 'First Name', 'Last Name', 'Email',
        'ZIP', 'Role', 'Comment', 'User Agent', 'Page URL'
      ]);
      sheet.getRange('A1:I1').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      new Date(),
      firstName,
      lastName,
      email,
      zip,
      role,
      comment,
      userAgent,
      pageUrl
    ]);

    return _text('OK');
  } catch (err) {
    // Never throw — always return a response so the client doesn't 500
    return _text('ERROR:' + (err && err.toString ? err.toString() : 'unknown'));
  }
}

/**
 * Simple GET handler — lets you visit the URL in a browser to
 * confirm the script is deployed and reachable.
 */
function doGet(e) {
  return _text('Silo Mills Truth petition endpoint is active. POST to submit a signature.');
}

/**
 * Call Cloudflare's siteverify API to confirm the token is valid.
 * Returns true if Cloudflare says the token was issued by a real
 * human via the widget; false otherwise.
 */
function _verifyTurnstile(token) {
  try {
    const response = UrlFetchApp.fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'post',
        payload: {
          secret: TURNSTILE_SECRET,
          response: token
        },
        muteHttpExceptions: true
      }
    );
    const result = JSON.parse(response.getContentText());
    return !!result.success;
  } catch (err) {
    // If Cloudflare is down or verify fails, reject the submission
    // (fail closed). Change to "return true" to fail open if you
    // prefer to accept during outages.
    return false;
  }
}

/**
 * Helper: prevent spreadsheet formula injection. If a string starts
 * with =, +, -, or @, Google Sheets will treat it as a formula when
 * the sheet is opened. Prefix those values with a single quote so
 * Sheets stores them as plain text.
 */
function _sanitize(value) {
  if (typeof value !== 'string' || value.length === 0) return value;
  return /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
}

/**
 * Helper: return a plain text ContentService response.
 */
function _text(message) {
  return ContentService
    .createTextOutput(message)
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Optional: run this once from the Apps Script editor to test
 * that you can open the sheet. Select this function from the
 * dropdown and click Run. Grant permissions when prompted.
 */
function _testSheetAccess() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME) ||
                SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
  Logger.log('Sheet name: ' + sheet.getName());
  Logger.log('Row count: ' + sheet.getLastRow());
}
