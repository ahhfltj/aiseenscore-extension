import type { CheckResult, CollectedData } from '../types';
import { couldNotLoad } from './util';

export function checkJsDependency(data: CollectedData): CheckResult {
  const id = 'js-dependency';
  const title = 'Content without JavaScript';
  const weight = 15;
  const raw = data.rawHtml;
  if (raw.status === 0 || raw.error) return couldNotLoad(id, title, weight, 'the page HTML');

  const rendered = data.renderedTextLength;
  // With very little visible text there is nothing meaningful to compare.
  if (rendered < 200) {
    return { id, title, status: 'pass', summary: 'This page has little text, so script dependence is not a concern.', weight };
  }

  const ratio = raw.strippedTextLength / rendered;
  const pct = Math.round(Math.min(ratio, 1) * 100);
  const details = [`Text in the raw HTML: ${raw.strippedTextLength} characters`, `Text after scripts run: ${rendered} characters`];
  const explain = 'Some AI crawlers do not run JavaScript, so text added by scripts may be invisible to them.';

  if (ratio >= 0.5) {
    return { id, title, status: 'pass', summary: `About ${pct}% of the visible text is in the raw HTML.`, details, weight };
  }
  const fix = 'Render the main content on the server (or pre-render the page) so it is in the HTML response.';
  if (ratio >= 0.15) {
    return { id, title, status: 'warn', summary: `Only about ${pct}% of the visible text is in the raw HTML. ${explain}`, details, fix, weight };
  }
  return { id, title, status: 'fail', summary: `Only about ${pct}% of the visible text is in the raw HTML. ${explain}`, details, fix, weight };
}
