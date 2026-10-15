# AI Seen Score – Chrome extension

## What this is

AI Seen Score is a Chrome extension (Manifest V3) for small businesses, indie SaaS founders and freelance SEO consultants.

- **Free tier (this repo, now):** a one-click "AI readability audit" of the page in the current tab. It checks whether AI crawlers are allowed in, whether the site publishes llms.txt, structured data, clear titles and headings, and whether content depends on JavaScript. Output: a 0–100 score plus a fix list in plain English.
- **Paid tier (later, week 2+):** AI mention reports. The extension sends brand name + questions to our own backend (Cloudflare Workers), which calls AI answer engines through their official APIs. Payment is handled by Dodo Payments; users activate a license key in the extension.

Website: https://aiseenscore.com (terms, privacy and refund pages already live).

## Hard rules

- **Manifest V3 only.** No remotely hosted code, no `eval`, no remote fonts or scripts. Everything ships in the bundle.
- **Minimum permissions:** `activeTab`, `scripting`, `storage`. Do NOT request `<all_urls>`, `tabs`, `webRequest`, or host permissions. The audit only runs when the user clicks.
- **No data leaves the browser in the free tier.** No analytics, no telemetry, no external requests except to the audited site itself. This must stay true because it is promised in our privacy policy.
- **Never put API keys or secrets in extension code.** Anything paid goes through our backend.
- **Honest copy.** Recommendations are "low-risk housekeeping", never promises. Never claim a fix will make AI recommend the user. Never say "guaranteed", "rank #1", etc.
- **No trademarked AI product names in the UI or store listing** except when naming a crawler user-agent (e.g. `GPTBot`) in a factual check result.

## Stack

- WXT (https://wxt.dev) + React + TypeScript (strict mode)
- Vitest for unit tests
- Plain CSS modules or a single CSS file; no UI framework, no Tailwind
- Package manager: npm

## Code layout (target)

```
entrypoints/
  popup/            # React popup UI
  background.ts     # service worker (keep minimal)
src/
  audit/
    collect.ts      # function injected into the page: gathers raw data (DOM, robots.txt, llms.txt, raw HTML)
    checks/         # one file per check, pure functions: (data) => CheckResult
    robots.ts       # robots.txt parser (pure, unit-tested)
    score.ts        # weights + total score (pure, unit-tested)
    types.ts
  config/
    ai-crawlers.ts  # list of AI crawler user-agents, easy to update
  storage.ts        # chrome.storage helpers
tests/
  fixtures/         # sample robots.txt, HTML, llms.txt files
```

Keep checks as **pure functions over collected data** so they can be unit-tested without a browser.

## Brand

Colors (match aiseenscore.com):
- paper `#f4f6f5` (background), surface `#ffffff`, ink `#18212b`, muted `#56616d`, rule `#d6dce1`
- signal `#2848c7` (primary / pass accent), marker `#f3d54a` (highlight), miss `#b4432f` (fail)
- Support dark mode with `prefers-color-scheme`.

Font: system stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`). Sentence case everywhere, no ALL CAPS labels.

## Working style

- Before writing code for a multi-file task, show a short plan and wait for my OK.
- After each task: run `npm run typecheck` and `npm test`, and tell me exactly how to verify it in Chrome.
- Small commits with clear messages. Don't commit `.output/`, `node_modules/`, `.env*`.
- Explain decisions briefly in comments only where the reason is not obvious.
