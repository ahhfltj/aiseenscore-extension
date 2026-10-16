import type { CheckResult, CollectedData } from '../types';

export function checkTitle(data: CollectedData): CheckResult {
  const base = { id: 'title', title: 'Page title', weight: 5 };
  const len = data.title.length;
  if (len === 0) {
    return { ...base, status: 'fail', summary: 'This page has no title.', fix: 'Add a <title> of 15–65 characters that says what the page is about.' };
  }
  if (len < 15 || len > 65) {
    return {
      ...base,
      status: 'warn',
      summary: `The title is ${len} characters (15–65 works best).`,
      details: [data.title],
      fix: len < 15 ? 'Make the title a little more descriptive.' : 'Shorten the title so it is not cut off.',
    };
  }
  return { ...base, status: 'pass', summary: `The title is ${len} characters.`, details: [data.title] };
}
