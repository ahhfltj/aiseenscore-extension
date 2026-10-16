import type { CheckResult, CollectedData } from '../types';

export function checkHeadings(data: CollectedData): CheckResult {
  const base = { id: 'headings', title: 'Heading structure', weight: 10 };
  const h1Count = data.headings.filter((h) => h.level === 1).length;
  if (h1Count === 0) {
    return { ...base, status: 'fail', summary: 'This page has no h1 heading.', fix: 'Add one h1 that names the page topic.' };
  }

  const first = data.headings.slice(0, 30);
  const skips: string[] = [];
  for (let i = 1; i < first.length; i++) {
    const prev = first[i - 1]!;
    const cur = first[i]!;
    if (cur.level > prev.level + 1) skips.push(`h${prev.level} → h${cur.level} ("${cur.text.slice(0, 40)}")`);
  }

  const problems: string[] = [];
  if (h1Count > 1) problems.push(`${h1Count} h1 headings`);
  if (skips.length) problems.push('skipped heading levels');
  if (problems.length) {
    return {
      ...base,
      status: 'warn',
      summary: `Heading structure could be clearer: ${problems.join(' and ')}.`,
      details: skips,
      fix: 'Use a single h1 and step down one level at a time (h1, h2, h3).',
    };
  }
  return { ...base, status: 'pass', summary: 'One h1, with no skipped levels.' };
}
