import type { CheckResult, CollectedData } from '../types';

export function checkMetaDescription(data: CollectedData): CheckResult {
  const base = { id: 'meta-description', title: 'Meta description', weight: 5 };
  const len = data.metaDescription.length;
  if (len === 0) {
    return { ...base, status: 'fail', summary: 'This page has no meta description.', fix: 'Add a meta description of 50–160 characters that summarizes the page.' };
  }
  if (len < 50 || len > 160) {
    return {
      ...base,
      status: 'warn',
      summary: `The meta description is ${len} characters (50–160 works best).`,
      details: [data.metaDescription],
      fix: len < 50 ? 'Expand the description with a concrete summary.' : 'Shorten the description so it is not cut off.',
    };
  }
  return { ...base, status: 'pass', summary: `The meta description is ${len} characters.`, details: [data.metaDescription] };
}
