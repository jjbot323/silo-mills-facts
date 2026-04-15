# Petition Backend — Google Sheets + Apps Script Setup

This guide walks you through connecting the petition form on silomillstruth.com to a Google Sheet that captures every signature. The entire backend is free, runs on Google's infrastructure, and has no submission limits.

**Total time:** ~15 minutes.

---

## What you'll end up with

- A Google Sheet titled "Silo Mills Truth — Petition Signatures" that auto-fills with every new signature
- A Google Apps Script web app that receives form POSTs, verifies the Cloudflare Turnstile token, and writes to the sheet
- Server-side spam protection (Turnstile secret key stays in the script, never exposed to visitors)
- Email notifications (optional — configurable inside Google Sheets)

---

## Step 1 — Create the Google Sheet (2 min)

1. Sign into Google Drive at [drive.google.com](https://drive.google.com) as **silomillstruth@gmail.com**.
2. Click **+ New → Google Sheets → Blank spreadsheet**.
3. Rename the spreadsheet to: `Silo Mills Truth — Petition Signatures`
4. Rename the first tab (bottom left) from `Sheet1` to `Signatures`.
5. In row 1, add these column headers (one per cell, A1 through I1):
   | A | B | C | D | E | F | G | H | I |
   |---|---|---|---|---|---|---|---|---|
   | Timestamp | First Name | Last Name | Email | ZIP | Role | Comment | User Agent | Page URL |
6. Select row 1, click **Format → Bold** to make the header row bold.
7. Click **View → Freeze → 1 row** so the headers stay visible when scrolling.
8. **Copy the spreadsheet ID** from the URL. It's the long string between `/d/` and `/edit`:
   ```
   https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890/edit
                                           ^-------------------- this is the ID --------------------^
   ```
   Save this somewhere — you'll paste it into the script in Step 3.

---

## Step 2 — Get your Turnstile Secret Key (1 min)

The petition form already uses your Turnstile **Site Key** (safe to expose in HTML). For server-side verification, the Apps Script needs the **Secret Key** (must stay private).

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com).
2. Sidebar → **Turnstile**.
3. Click your `Silo Mills Facts` site (or whatever you named it).
4. Click **Settings**.
5. Scroll down to **Secret Key** — copy it. It looks like `0x4AAAAAAC...` similar to the site key but starts with different characters.

**⚠️ Do NOT paste this key into any HTML file or commit it to GitHub.** It only belongs in the Apps Script.

---

## Step 3 — Create the Apps Script web app (5 min)

1. Still inside your new Google Sheet, click **Extensions → Apps Script**. This opens the Apps Script editor in a new tab.
2. You'll see a default `Code.gs` file with an empty `myFunction()` stub. **Delete everything** in that file.
3. Open the file at `apps-script/petition-backend.gs` in this repo (in a text editor or GitHub's web view) and **copy the entire contents**.
4. **Paste** the contents into the Apps Script editor, replacing what was there.
5. At the top of the script, find the CONFIG section and fill in the two placeholders:
   ```javascript
   const SHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
   const TURNSTILE_SECRET = 'PASTE_YOUR_TURNSTILE_SECRET_KEY_HERE';
   ```
   Replace the quoted strings with:
   - The spreadsheet ID from Step 1
   - The Turnstile secret key from Step 2
6. **Rename** the project: click "Untitled project" at the top → `Silo Mills Petition Backend` → Rename.
7. Click the **💾 Save** button (or press Ctrl+S).

---

## Step 4 — Authorize the script (2 min)

Apps Script needs permission to (a) read/write your Google Sheet and (b) make outbound HTTP requests to Cloudflare.

1. In the Apps Script editor, look at the function dropdown at the top. Select **`_testSheetAccess`**.
2. Click **▶ Run**.
3. Google will pop up a warning: "Authorization required" → click **Review permissions**.
4. Choose your silomillstruth@gmail.com account.
5. You'll see "Google hasn't verified this app" — this is normal for your own scripts. Click **Advanced → Go to Silo Mills Petition Backend (unsafe)**.
6. Review the permissions and click **Allow**.
7. The script will run and log some output at the bottom. If you see something like `Sheet name: Signatures` and `Row count: 1`, everything's wired correctly. ✅

---

## Step 5 — Deploy as a web app (3 min)

1. In the Apps Script editor, click **Deploy → New deployment**.
2. Click the **⚙️ gear icon** next to "Select type" → pick **Web app**.
3. Fill in the form:
   - **Description:** `Silo Mills petition v1`
   - **Execute as:** `Me (silomillstruth@gmail.com)`
   - **Who has access:** `Anyone` ← **important**
4. Click **Deploy**.
5. Google may ask to authorize again — click through.
6. When deployment finishes you'll see a **Web app URL** like:
   ```
   https://script.google.com/macros/s/AKfycb.................................../exec
   ```
7. **Copy this URL.** Send it to me (or paste it into the HTML yourself — see Step 6).

---

## Step 6 — Paste the URL into the site

The HTML form currently has a placeholder:

```javascript
const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL';
```

Replace `YOUR_APPS_SCRIPT_URL` (keep the quotes) with the full deployment URL from Step 5.

If you give me the URL, I'll paste it in and redeploy the site. If you want to do it yourself:

1. Open `index.html` in a text editor
2. Search for `YOUR_APPS_SCRIPT_URL`
3. Replace with your deployment URL
4. Save
5. In the `silo-mills-facts` folder, run:
   ```
   git add index.html
   git commit -m "Wire petition form to live Apps Script endpoint"
   git push
   ```

---

## Step 7 — Test the end-to-end flow (2 min)

1. Open [https://silomillstruth.com/](https://silomillstruth.com/) (or the GitHub Pages URL if custom domain DNS hasn't propagated yet).
2. Scroll to the "Take Action" section.
3. Fill out the petition form with real test data (use your own email so you can verify it).
4. Complete the Turnstile challenge if one appears.
5. Click **Add My Signature**.
6. You should see the "✓ Thanks for your interest!" message.
7. Open the Google Sheet. A new row should appear within a few seconds containing your test submission.

If the row doesn't appear:

- **Check the Apps Script execution log:** In the Apps Script editor, go to **Executions** in the left sidebar. You'll see every doPost call and any errors.
- **Common issues:**
  - `FAIL:TURNSTILE_INVALID` — Your Turnstile secret key is wrong, or the site key on the HTML doesn't match the site in Cloudflare.
  - `FAIL:MISSING_FIELDS` — Form isn't sending the expected field names. Rare, only happens if you edit the form HTML.
  - Silent failure with no log entry — the Apps Script URL in the HTML is wrong, or deployment access isn't set to "Anyone."

---

## Optional extras

### Email notifications on every signature

1. In Google Sheets: **Extensions → Apps Script** (this opens a different script attached to just this sheet — not the petition backend).
2. Paste this tiny onEdit trigger:
   ```javascript
   function onFormSubmit(e) {
     const row = e.range.getRow();
     const sheet = e.range.getSheet();
     if (sheet.getName() !== 'Signatures') return;
     const values = sheet.getRange(row, 1, 1, 9).getValues()[0];
     const subject = `New Silo Mills petition signature — ${values[1]} ${values[2]}`;
     const body = `Name: ${values[1]} ${values[2]}\nEmail: ${values[3]}\nZIP: ${values[4]}\nRole: ${values[5]}\nComment: ${values[6]}`;
     MailApp.sendEmail('silomillstruth@gmail.com', subject, body);
   }
   ```
3. Click **Triggers** (⏰ icon in left sidebar) → **Add Trigger**:
   - Function: `onFormSubmit`
   - Event source: `From spreadsheet`
   - Event type: `On change`
4. Save.

You'll now get an email for every new signature. MailApp's daily quota is 100 emails/day for free accounts (2000/day for Google Workspace), so this scales fine.

### Export signatures to CSV

In the Google Sheet: **File → Download → CSV**. Opens in Excel or any spreadsheet tool.

### Re-deploying after script updates

If you edit the Apps Script code:

1. Click **Deploy → Manage deployments**.
2. Click the ✏️ pencil icon next to your deployment.
3. Change "Version" dropdown to **New version**.
4. Click **Deploy**.
5. The URL stays the same — no need to update the HTML.

---

## Security notes

- **Turnstile secret key** is only in the Apps Script, never in the HTML. Even if someone views the site source they can't steal it.
- **The Apps Script runs as you**, meaning it has access to only your Google Sheet — no other files or services.
- **Rate limiting:** Apps Script web apps have built-in quotas (~20,000 requests/day for free accounts, more for Workspace). For a petition site this is effectively unlimited.
- **Do not commit the Apps Script file with real secrets to GitHub.** The file in this repo has placeholders. The real secrets only live inside the Apps Script editor, which is private to your Google account.

---

## Troubleshooting

**Q: I deleted the deployment by accident. What do I do?**
A: Create a new deployment (Deploy → New deployment → Web app → same settings) and update the URL in the HTML.

**Q: The form submits but Turnstile blocks it with FAIL:TURNSTILE_INVALID.**
A: Make sure you copied the **Secret Key** from Cloudflare (not the Site Key). Secret keys start with `0x4...` but are labeled "Secret Key" in the Cloudflare dashboard. Also verify that `silomillstruth.com` and `jjbot323.github.io` are both in the allowed domains list in Turnstile settings.

**Q: I see rows appearing in the sheet with weird or empty data. Are those spam bots?**
A: They'd have to have a valid Turnstile token to get past the check, so they're probably legitimate. But you can filter or delete them. To harden further, consider adding email verification (Phase 2).

**Q: Do signers know they're submitting to a Google Sheet?**
A: Your privacy policy (privacy.html) discloses that you collect their information. It doesn't mention the specific storage backend, which is fine — that's a detail. If you want to be extra transparent, you could add "signatures are stored in a private Google Sheet" to the privacy policy.
