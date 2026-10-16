import type { CheckResult, CollectedData } from '../types';

const BASIC = ['Organization', 'WebSite'];
const CONTENT = ['Product', 'SoftwareApplication', 'LocalBusiness', 'Article', 'NewsArticle', 'BlogPosting', 'FAQPage'];

function collectNodes(value: unknown, out: Record<string, unknown>[]): void {
  if (Array.isArray(value)) {
    for (const v of value) collectNodes(v, out);
  } else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    out.push(obj);
    if ('@graph' in obj) collectNodes(obj['@graph'], out);
  }
}

export function checkStructuredData(data: CollectedData): CheckResult {
  const base = { id: 'structured-data', title: 'Structured data (JSON-LD)', weight: 15 };
  const types = new Set<string>();
  let invalid = 0;

  for (const block of data.jsonLd) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block);
    } catch {
      invalid++;
      continue;
    }
    const nodes: Record<string, unknown>[] = [];
    collectNodes(parsed, nodes);
    for (const node of nodes) {
      const t = node['@type'];
      for (const name of Array.isArray(t) ? t : [t]) if (typeof name === 'string') types.add(name);
    }
  }

  const details = [
    types.size ? `Types found: ${[...types].join(', ')}` : 'No valid types found.',
    ...(invalid ? [`${invalid} JSON-LD block${invalid > 1 ? 's' : ''} could not be parsed.`] : []),
  ];
  const hasBasic = BASIC.some((t) => types.has(t));
  const hasContent = CONTENT.some((t) => types.has(t));

  if (hasBasic && hasContent) {
    return { ...base, status: 'pass', summary: 'Structured data describes the organization and its content.', details };
  }
  if (types.size > 0) {
    return {
      ...base,
      status: 'warn',
      summary: 'Structured data is present but only partly describes the site.',
      details,
      fix: 'Add JSON-LD for Organization or WebSite, plus the type that fits this page (Product, SoftwareApplication, LocalBusiness, Article or FAQPage).',
    };
  }
  return {
    ...base,
    status: 'fail',
    summary: invalid ? 'Structured data was found but could not be parsed.' : 'No structured data found.',
    details,
    fix: 'Add a JSON-LD script describing your Organization or WebSite, and fix any syntax errors in existing blocks.',
  };
}
