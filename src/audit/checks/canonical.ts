import type { CheckResult, CollectedData } from '../types';

const bare = (host: string) => host.replace(/^www\./, '').toLowerCase();

export function checkCanonical(data: CollectedData): CheckResult {
  const base = { id: 'canonical', title: 'Canonical URL', weight: 3 };
  const href = data.canonical;
  if (!href) {
    return { ...base, status: 'warn', summary: 'No canonical link found.', fix: 'Add <link rel="canonical"> with the full URL of this page.' };
  }
  if (!/^https?:\/\//i.test(href)) {
    return { ...base, status: 'warn', summary: 'The canonical link is relative.', details: [href], fix: 'Use a full URL, including https:// and the domain.' };
  }
  try {
    if (bare(new URL(href).hostname) !== bare(new URL(data.origin).hostname)) {
      return { ...base, status: 'warn', summary: 'The canonical link points to another domain.', details: [href], fix: 'Point the canonical link at this site unless the content really lives elsewhere.' };
    }
  } catch {
    return { ...base, status: 'warn', summary: 'The canonical link is not a valid URL.', details: [href], fix: 'Use a full, valid URL.' };
  }
  return { ...base, status: 'pass', summary: 'A full canonical URL is set.', details: [href] };
}
