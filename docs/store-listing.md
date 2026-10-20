# Chrome Web Store listing: text to paste

Package: run `npm run zip`, upload `.output/aiseenscore-extension-<version>-chrome.zip`.
Privacy policy URL: https://aiseenscore.com/privacy
Support / website: https://aiseenscore.com · support@aiseenscore.com

## Name
AI Seen Score

## Summary (max 132 characters)
Check how readable your site is for AI crawlers, and whether AI answers mention your brand.

## Description
AI Seen Score shows how visible your website is to AI answer engines such as ChatGPT and Perplexity.

FREE SITE AUDIT
Click the extension on any page of your site. It checks the things AI crawlers rely on: robots.txt rules for AI bots, llms.txt, sitemap, structured data, canonical and language tags, and more. You get a score and a plain-language fix list. The audit runs entirely in your browser. Page content is not sent to us.

PAID AI MENTION REPORTS
Enter your brand, website, category and three to five questions your customers ask before they buy. We ask AI answer engines (through their official APIs, with web search on) and report:
- how often your brand is mentioned,
- your best position when the answer is a list,
- which competitors are named instead,
- which sites the engines looked at.
Download the result as a PDF. The White-label pack lets you put your own logo and company name on the PDF.

HONEST BY DESIGN
Reports describe what AI engines answered at the moment we asked. Answers change. This is not a ranking and we make no promise about future results.

PRICING
The audit is free and unlimited. Reports are pay-per-use, with no subscription and credits that never expire: https://aiseenscore.com/#pricing

PRIVACY
No analytics, no trackers, no browsing history. The extension looks at a page only when you click it. Paid reports send only the brand, website, category, competitors, questions and your license key to our server. Report results are deleted after 30 days. Full policy: https://aiseenscore.com/privacy

## Category
Developer Tools (alternative: Productivity)

## Single purpose (Privacy practices tab)
Audit how readable a website is for AI crawlers, and report whether AI answer engines mention a brand.

## Permission justifications
- **activeTab**: reads the tab the user clicked the extension on, only at the moment of the click, to run the audit.
- **scripting**: injects the audit function into that tab to read the page's own head tags and fetch its public files (robots.txt, llms.txt, sitemap) from the same origin.
- **storage**: saves the license key, recent audit and report results, the draft report form, and white-label branding in the user's browser.
- No host permissions are requested. Calls to our server (api.aiseenscore.com) use CORS.

## Remote code
No. All code ships in the package. No eval, no remote scripts or fonts.

## Data usage disclosure (check what applies; confirm against the live privacy policy)
- Authentication information: yes. The license key is sent to our server to check credits and run reports.
- Website content: the free audit does not leave the browser. Paid reports send only text the user types (brand, website address, category, competitors, questions). Declare this in the free-text field.
- Personally identifiable information, health, financial, location, web history, user activity, personal communications: no.
- Certify: data is not sold, not used for unrelated purposes, not used for creditworthiness or lending.

## Screenshots to prepare (1280x800 or 640x400, at least 1, up to 5)
1. The free audit result (score and fix list).
2. The report form with brand and questions filled in.
3. A finished report (mention counts, competitors).
4. The PDF page (use a white-label example).
Optional small promo tile 440x280.

## Review notes (for the reviewer, optional field)
The paid tier needs a license key. A test key for review can be provided on request by support@aiseenscore.com.
