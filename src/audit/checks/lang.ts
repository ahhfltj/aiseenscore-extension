import type { CheckResult, CollectedData } from '../types';

export function checkLang(data: CollectedData): CheckResult {
  const base = { id: 'lang', title: 'Page language', weight: 2 };
  if (data.lang) return { ...base, status: 'pass', summary: `Language is set to "${data.lang}".` };
  return { ...base, status: 'warn', summary: 'The html element has no lang attribute.', fix: 'Add lang to the html tag, for example <html lang="en">.' };
}
