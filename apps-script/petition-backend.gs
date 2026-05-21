/**
 * Silo Mills Facts — Form Backend (Google Apps Script)
 * ====================================================================
 * Handles form submissions from silomillsfacts.com. Currently in use
 * for: "Request Full UES Site Assessment Report" form (May 2026+).
 *
 * Flow:
 *   1. Visitor submits the modal form on silomillsfacts.com with their
 *      Name + Email + Cloudflare Turnstile token.
 *   2. This script verifies the Turnstile token server-side (blocks bots).
 *   3. Appends a row to a Google Sheet for permanent record.
 *   4. Sends a notification email to the team so they can manually share
 *      the report with the requester.
 *
 * SETUP REMINDER:
 *   • Open the Apps Script editor at script.google.com.
 *   • Paste this entire file's contents into your existing project,
 *     replacing the previous petition code.
 *   • Confirm SHEET_ID and TURNSTILE_SECRET below are populated with
 *     your real values (they should already be from prior setup).
 *   • Click Deploy → Manage deployments → ✏️ Edit the existing one →
 *     Version: New version → Deploy.
 *   • The deployment URL stays the same (silomillsfacts.com/index.html
 *     is already pointed at it).
 * ====================================================================
 */

// ====== CONFIG (these should already be populated from prior setup) ======
const SHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
const TURNSTILE_SECRET = 'PASTE_YOUR_TURNSTILE_SECRET_KEY_HERE';

// Notification recipients (comma-separated). These two people get an
// email every time someone submits the report request form.
const NOTIFY_RECIPIENTS = 'jjohn@prophetequity.com, rbgatlin@prophetequity.com';

// Sheet tab name where requests are logged.
const REQUESTS_SHEET_NAME = 'Report Requests';
// =========================================================================


/**
 * Main entry point for POST submissions from any form on silomillsfacts.com.
 * Currently only handles the report-request form.
 */
function doPost(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = (params.action || 'report_request').toString();

    if (action === 'report_request') {
      return _handleReportRequest(params);
    }

    return _text('FAIL:UNKNOWN_ACTION');
  } catch (err) {
    return _text('ERROR:' + (err && err.toString ? err.toString() : 'unknown'));
  }
}


/**
 * Handles "Request Full UES Site Assessment Report" submissions.
 */
function _handleReportRequest(params) {
  // 1. Verify Turnstile token (server-side bot protection)
  const token = params['cf-turnstile-response'] || '';
  if (!token) return _text('FAIL:NO_TOKEN');
  if (!_verifyTurnstile(token)) return _text('FAIL:TURNSTILE_INVALID');

  // 2. Validate required fields
  const name = _sanitize((params.name || '').toString().trim());
  const email = _sanitize((params.email || '').toString().trim());
  const phone = _sanitize((params.phone || '').toString().trim().substring(0, 40));
  const role = _sanitize((params.role || '').toString().trim().substring(0, 80));
  const userAgent = _sanitize((params.user_agent || '').toString().substring(0, 500));
  const pageUrl = _sanitize((params.page_url || '').toString().substring(0, 200));

  if (!name || !email) return _text('FAIL:MISSING_FIELDS');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return _text('FAIL:EMAIL_INVALID');

  // 3. Length caps to prevent abuse
  if (name.length > 100 || email.length > 200) return _text('FAIL:FIELD_TOO_LONG');

  // 4. Append a row to the Sheet
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(REQUESTS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(REQUESTS_SHEET_NAME);
    sheet.appendRow(['Timestamp', 'Name', 'Email', 'Phone', 'Role', 'User Agent', 'Page URL', 'Status']);
    sheet.getRange('A1:H1').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([new Date(), name, email, phone, role, userAgent, pageUrl, 'PENDING']);

  // 5. Send notification email to the team
  const timestamp = Utilities.formatDate(new Date(), 'America/Chicago', 'MMMM d, yyyy \'at\' h:mm a z');
  const subject = 'New UES Report Request from ' + name;
  const plainBody = [
    'A new request has been submitted for the full UES Site Assessment Report.',
    '',
    'Name:       ' + name,
    'Email:      ' + email,
    'Phone:      ' + (phone || '(not provided)'),
    'I am a:     ' + (role || '(not provided)'),
    'Submitted:  ' + timestamp,
    '',
    'To send them the report, simply reply to this email — Reply-To is',
    'set to the requester so your response goes directly to them.',
    '',
    '———',
    'Submitted via the request form at silomillsfacts.com',
    'Full submission log: open the Google Sheet (search "Report Requests").',
  ].join('\n');

  const htmlBody =
    '<div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1A1A1A; max-width: 600px;">' +
    '<p>A new request has been submitted for the <strong>full UES Site Assessment Report</strong>.</p>' +
    '<table style="border-collapse: collapse; margin: 12px 0;">' +
    '<tr><td style="padding: 4px 12px 4px 0; font-weight: 600; color: #0B2A45;">Name:</td><td>' + _escapeHtml(name) + '</td></tr>' +
    '<tr><td style="padding: 4px 12px 4px 0; font-weight: 600; color: #0B2A45;">Email:</td><td><a href="mailto:' + _escapeHtml(email) + '">' + _escapeHtml(email) + '</a></td></tr>' +
    '<tr><td style="padding: 4px 12px 4px 0; font-weight: 600; color: #0B2A45;">Phone:</td><td>' + _escapeHtml(phone || '(not provided)') + '</td></tr>' +
    '<tr><td style="padding: 4px 12px 4px 0; font-weight: 600; color: #0B2A45;">I am a:</td><td>' + _escapeHtml(role || '(not provided)') + '</td></tr>' +
    '<tr><td style="padding: 4px 12px 4px 0; font-weight: 600; color: #0B2A45;">Submitted:</td><td>' + _escapeHtml(timestamp) + '</td></tr>' +
    '</table>' +
    '<p style="color: #555;">To send them the report, simply <strong>reply</strong> to this email — Reply-To is set to the requester so your response goes directly to them.</p>' +
    '<p style="color: #888; font-size: 12px; margin-top: 24px;">Submitted via the request form at <a href="https://silomillsfacts.com">silomillsfacts.com</a>. Full submission log is in the Google Sheet (tab: <em>Report Requests</em>).</p>' +
    '</div>';

  MailApp.sendEmail({
    to: NOTIFY_RECIPIENTS,
    subject: subject,
    body: plainBody,
    htmlBody: htmlBody,
    replyTo: email,
    name: 'Silo Mills Facts — Request Form',
  });

  return _text('OK');
}


/**
 * Optional GET handler — useful for confirming the script is deployed
 * by hitting the URL in a browser.
 */
function doGet(e) {
  return _text('Silo Mills Facts request endpoint is active. POST to submit a request.');
}


/**
 * Verifies a Cloudflare Turnstile token via Cloudflare's siteverify API.
 */
function _verifyTurnstile(token) {
  try {
    const response = UrlFetchApp.fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'post',
        payload: { secret: TURNSTILE_SECRET, response: token },
        muteHttpExceptions: true,
      }
    );
    const result = JSON.parse(response.getContentText());
    return !!result.success;
  } catch (err) {
    return false;
  }
}


/**
 * Spreadsheet formula injection prevention. Prefixes values starting with
 * =, +, -, @, tab, or carriage return with a single quote so Sheets stores
 * them as plain text.
 */
function _sanitize(value) {
  if (typeof value !== 'string' || value.length === 0) return value;
  return /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
}


function _escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


/**
 * Helper: returns plain text ContentService response.
 */
function _text(message) {
  return ContentService
    .createTextOutput(message)
    .setMimeType(ContentService.MimeType.TEXT);
}


/**
 * Optional: run this once from the Apps Script editor to confirm
 * Sheet access works. Select this function from the dropdown and
 * click Run. Grant permissions when prompted.
 */
function _testSheetAccess() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(REQUESTS_SHEET_NAME) ||
                SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
  Logger.log('Sheet name: ' + sheet.getName());
  Logger.log('Row count: ' + sheet.getLastRow());
}
