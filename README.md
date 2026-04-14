# Silo Mills Facts

Website presenting independent environmental testing findings that confirm the
Silo Mills residential development is safe for residential and school use,
and rebutting erroneous media claims about the former landfarm site.

## Live site

Hosted on GitHub Pages — see the **About** section of this repo for the URL.

## Files

- `index.html` — main page
- `privacy.html` — privacy policy
- `smi_logo.png` — logo source file (also embedded as base64 in index.html)
- `.nojekyll` — disables GitHub Pages Jekyll processing

## Deploying updates

1. Edit `index.html` or `privacy.html` locally.
2. Commit and push to the `main` branch.
3. GitHub Pages rebuilds automatically within ~60 seconds.

## Petition form status

The petition form is currently in **"coming soon"** mode — signatures are not
yet being collected. The form UI works and shows a thank-you message, but no
data is transmitted anywhere.

To activate, wire up one of these backends (see inline comments in `index.html`):

- **Web3Forms** — free, 250 submissions/month, email + dashboard
- **Formsubmit.co** — free, unlimited, email-only (no dashboard)
- **Google Sheets via Apps Script** — free, unlimited, writes each signature to a spreadsheet
- **Supabase** — free tier, full database with live signature count

## What's still needed before public launch

- [ ] Real petition backend
- [ ] Cloudflare Turnstile (invisible CAPTCHA) site key
- [ ] Custom domain
- [ ] Open Graph social preview image
- [ ] Analytics (Cloudflare Web Analytics or Google Analytics)
- [ ] Legal review of privacy policy and any claims about media outlets

## Data sources

All testing data comes from the independent "Former Landfarm Limited Site
Assessment Report" by UES, LLC (April 2026), with laboratory analysis by
Eurofins South Central (NELAP-accredited).
