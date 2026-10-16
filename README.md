# AI Seen Score

A Chrome extension (Manifest V3) that checks how readable the current page is for AI crawlers.
One click gives a 0–100 score and a plain-English fix list. It checks:

- whether `robots.txt` lets AI crawlers in
- noindex / AI opt-out directives
- `llms.txt`
- structured data (JSON-LD)
- title, meta description, headings, canonical URL and language
- how much of the page text depends on JavaScript

Everything runs in your browser. The free tier sends nothing anywhere except requests to the site being audited.

## Requirements

- Node.js 20 or newer
- Chrome

## Run in dev mode

```bash
npm install
npm run dev
```

WXT opens Chrome with the extension loaded and reloads it when you change code.
If no window opens, build once and load it by hand:

1. `npm run build`
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and choose `.output/chrome-mv3`.

In dev mode the popup shows a **Copy raw data** button after an audit, for reporting mismatches.

## Test

```bash
npm test            # unit tests (Vitest)
npm run typecheck   # tsc --noEmit
```

Checks are pure functions over collected data, so they are tested without a browser.
To validate against real sites, use the table in [docs/test-sites.md](docs/test-sites.md).

## Build a production zip

```bash
npm run zip
```

The zip is written to `.output/` (for example `.output/aiseenscore-extension-0.1.0-chrome.zip`).

## Project layout

```
entrypoints/popup/   React popup UI
entrypoints/background.ts
src/audit/           collect.ts (injected into the page), checks/, robots.ts, score.ts
src/config/          ai-crawlers.ts (review regularly: operators change user-agents)
src/storage.ts       result cache (last 20 origins, 24 hours)
tests/               unit tests and fixtures
docs/test-sites.md   real-site validation table
```

## Rules this project follows

- Manifest V3, no remotely hosted code.
- Permissions: `activeTab`, `scripting`, `storage` only. No host permissions.
- No analytics or telemetry in the free tier.
- Recommendations are low-risk housekeeping, never promises about AI results.
