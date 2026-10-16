import type { CheckResult, CollectedData } from '../types';

export function checkAiMetaOptout(data: CollectedData): CheckResult {
  const base = { id: 'ai-meta-optout', title: 'Indexing and AI opt-out directives', weight: 10 };
  const tokens = `${data.metaRobots},${data.rawHtml.xRobotsTag}`.toLowerCase().split(/[\s,:]+/);

  if (tokens.includes('noindex')) {
    return {
      ...base,
      status: 'fail',
      summary: 'This page asks not to be indexed (noindex).',
      details: [`meta robots: ${data.metaRobots || '(none)'}`, `X-Robots-Tag: ${data.rawHtml.xRobotsTag || '(none)'}`],
      fix: 'Remove noindex from the meta robots tag or X-Robots-Tag header if this page should be found.',
    };
  }
  const optOuts = ['noai', 'noimageai'].filter((t) => tokens.includes(t));
  if (optOuts.length) {
    return {
      ...base,
      status: 'warn',
      summary: `This page asks AI tools not to use its content (${optOuts.join(', ')}).`,
      details: [`meta robots: ${data.metaRobots || '(none)'}`, `X-Robots-Tag: ${data.rawHtml.xRobotsTag || '(none)'}`],
      fix: 'This is a valid choice. Remove noai / noimageai only if you want AI tools to use this content.',
    };
  }
  return { ...base, status: 'pass', summary: 'No noindex or AI opt-out directives found.' };
}
