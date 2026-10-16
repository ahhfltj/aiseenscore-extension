import { crawlerStatuses, parseRobots } from '../robots';
import type { CheckResult, CollectedData } from '../types';
import { couldNotLoad, looksLikeHtml, loadFailed } from './util';

const ID = 'ai-crawler-access';
const TITLE = 'AI crawler access (robots.txt)';
const WEIGHT = 25;

export function checkAiCrawlerAccess(data: CollectedData): CheckResult {
  const file = data.robotsTxt;
  if (loadFailed(file)) return couldNotLoad(ID, TITLE, WEIGHT, '/robots.txt');

  const missing = file.status >= 400 || (file.status === 200 && looksLikeHtml(file));
  if (missing) {
    return {
      id: ID,
      title: TITLE,
      status: 'pass',
      summary: 'No robots.txt, so crawlers are allowed by default.',
      details: ['No robots.txt was found at /robots.txt.'],
      weight: WEIGHT,
    };
  }

  let path = '/';
  try {
    const u = new URL(data.url);
    path = u.pathname + u.search;
  } catch {
    /* keep "/" */
  }

  const statuses = crawlerStatuses(parseRobots(file.text), path);
  const details = statuses.map(
    ({ crawler, status }) => `${crawler.userAgent} (${crawler.operator}, ${crawler.purpose}): ${status}`,
  );
  const restricted = (s: string) => s === 'blocked' || s === 'partial';
  const liveBlocked = statuses.filter((s) => s.crawler.purpose !== 'training' && restricted(s.status));
  const trainingBlocked = statuses.filter((s) => s.crawler.purpose === 'training' && restricted(s.status));

  if (liveBlocked.length) {
    return {
      id: ID,
      title: TITLE,
      status: 'fail',
      summary: `robots.txt blocks crawlers that fetch pages to answer questions: ${liveBlocked
        .map((s) => s.crawler.userAgent)
        .join(', ')}.`,
      details,
      fix: 'If you want these crawlers to read this page, remove the Disallow rules that apply to them in robots.txt.',
      weight: WEIGHT,
    };
  }
  if (trainingBlocked.length) {
    return {
      id: ID,
      title: TITLE,
      status: 'warn',
      summary: `robots.txt blocks crawlers used for model training: ${trainingBlocked
        .map((s) => s.crawler.userAgent)
        .join(', ')}.`,
      details,
      fix: 'This is a valid choice. It mainly affects training, not live answers, so change it only if you want that content used for training.',
      weight: WEIGHT,
    };
  }
  return {
    id: ID,
    title: TITLE,
    status: 'pass',
    summary: 'robots.txt does not block the AI crawlers we check.',
    details,
    weight: WEIGHT,
  };
}
