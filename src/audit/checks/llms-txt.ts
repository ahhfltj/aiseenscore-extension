import type { CheckResult, CollectedData } from '../types';
import { couldNotLoad, looksLikeHtml, loadFailed } from './util';

const ID = 'llms-txt';
const TITLE = 'llms.txt';
const WEIGHT = 10;
const NOTE = 'llms.txt is an emerging convention. Adding one is low-risk housekeeping, but it is not proven to change AI answers.';

export function checkLlmsTxt(data: CollectedData): CheckResult {
  const file = data.llmsTxt;
  if (loadFailed(file)) return couldNotLoad(ID, TITLE, WEIGHT, '/llms.txt');

  if (file.status !== 200 || looksLikeHtml(file)) {
    return {
      id: ID,
      title: TITLE,
      status: 'fail',
      summary: 'No llms.txt found.',
      details: [NOTE],
      fix: 'Add a /llms.txt file: a "# Site name" heading, a short summary, then links to your key pages.',
      weight: WEIGHT,
    };
  }

  const hasH1 = /^# \S/m.test(file.text);
  const links = (file.text.match(/\[[^\]]+\]\([^)\s]+\)/g) ?? []).length;
  if (hasH1 && links >= 3) {
    return {
      id: ID,
      title: TITLE,
      status: 'pass',
      summary: `llms.txt found with a title and ${links} links.`,
      details: [NOTE],
      weight: WEIGHT,
    };
  }
  return {
    id: ID,
    title: TITLE,
    status: 'warn',
    summary: 'llms.txt exists but looks incomplete.',
    details: [`Title heading: ${hasH1 ? 'yes' : 'no'}`, `Links: ${links} (at least 3 expected)`, NOTE],
    fix: 'Start with a "# Site name" heading and list at least three key pages as Markdown links.',
    weight: WEIGHT,
  };
}
