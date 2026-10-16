# Test sites for validating the audit

How to use: open each site, run the audit, fill in **Actual score** and **Mismatches**.
For each site, also open `/robots.txt` and `/llms.txt` by hand and compare with what the
extension reports. Target: results match the manual check, and one audit finishes in under 3 seconds.

The "Expected notes" column comes from fetching the two files with curl on 2026-10-16.
Sites change, so treat it as a starting point and re-check by hand.

To attach raw data for a mismatch, use the **Copy raw data** button (see "Debug mode" below).

| # | Category | Site | Expected notes (robots.txt / llms.txt) | Actual score | Mismatches |
|---|----------|------|----------------------------------------|--------------|------------|
| 1 | Big brand | https://www.apple.com/ | robots.txt 200, no AI crawler rules. llms.txt 404 (HTML page) → missing. | | |
| 2 | Big brand | https://github.com/ | robots.txt 200 with rules for GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot (read the rules by hand). llms.txt 200, starts with `# GitHub`. | | |
| 3 | Big brand | https://www.shopify.com/ | robots.txt 200, no AI crawler rules. llms.txt 200, starts with `# Shopify`. | | |
| 4 | Big brand | https://stripe.com/ | robots.txt 200, no AI crawler rules. llms.txt 200, starts with `# Stripe`. | | |
| 5 | Big brand | https://www.cloudflare.com/ | robots.txt 200 with explicit `Allow: /` for GPTBot, Google-Extended, CCBot, PerplexityBot. llms.txt 200. | | |
| 6 | Small business | https://basecamp.com/ | robots.txt 200, no AI crawler rules. llms.txt 404 (HTML page). | | |
| 7 | Small business | https://www.fastmail.com/ | robots.txt 200, no AI crawler rules. llms.txt 404 (HTML page). | | |
| 8 | Small business | https://panic.com/ | robots.txt 200, no AI crawler rules, no Sitemap line. llms.txt 404. | | |
| 9 | Small business | https://www.omnigroup.com/ | robots.txt 200, no AI crawler rules, no Sitemap line. llms.txt 404. | | |
| 10 | Small business | *(pick a local business site you know)* | Check by hand. | | |
| 11 | Indie SaaS | https://aiseenscore.com/ | robots.txt 200, no AI crawler rules. llms.txt 200, starts with `# AI Seen Score`. | | |
| 12 | Indie SaaS | https://plausible.io/ | robots.txt 200, no AI crawler rules. llms.txt 404 (HTML page). | | |
| 13 | Indie SaaS | https://buttondown.com/ | robots.txt 200, no AI crawler rules. llms.txt 200, starts with `# Buttondown`. | | |
| 14 | Indie SaaS | https://tally.so/ | robots.txt 200, no AI crawler rules. llms.txt 200, starts with `# Tally`. | | |
| 15 | Indie SaaS | https://www.lemonsqueezy.com/ | robots.txt 200, no AI crawler rules, has a Sitemap line. llms.txt 404. | | |
| 16 | Client-side SPA | https://excalidraw.com/ | robots.txt 200. **llms.txt returns 200 but is an HTML page** → must count as missing. Expect low raw-HTML text vs rendered text. | | |
| 17 | Client-side SPA | https://squoosh.app/ | **robots.txt 404** (HTML) → "no robots.txt". llms.txt 404. Expect low raw-HTML text vs rendered text. | | |
| 18 | Client-side SPA | https://www.photopea.com/ | robots.txt 200, no AI crawler rules. llms.txt 404. Expect low raw-HTML text vs rendered text. | | |
| 19 | Blocks AI crawlers | https://www.nytimes.com/ | robots.txt 200 with `Disallow: /` for CCBot, ClaudeBot, Google-Extended, GPTBot (and more). Expect warn or fail on crawler access. llms.txt 404. | | |
| 20 | Blocks AI crawlers | https://www.reuters.com/ | robots.txt 200 with rules naming OAI-SearchBot (read them by hand to see whether it is blocked). llms.txt returns 401. | | |

## Extra edge cases worth one run each

- A page that does not exist, e.g. `https://example.com/this-page-does-not-exist`: audit should finish without an error.
- `chrome://extensions`: should show the friendly "Open a public website" message.
- A very slow site: each file request times out after 5 seconds; the audit should still return.

## Debug mode

The **Copy raw data** button copies the collected JSON so you can paste it when reporting a mismatch.

- In `npm run dev` the button is always shown after an audit.
- In a production build it is shown only when the popup URL has `?debug=1`
  (open `chrome-extension://<extension id>/popup.html?debug=1` in a tab; the toolbar popup
  cannot take a query string, so for production-build testing use the dev build instead).
- The button needs a fresh audit: results restored from the 24-hour cache don't carry raw data.
