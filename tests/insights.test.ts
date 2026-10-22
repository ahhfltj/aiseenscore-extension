import { describe, expect, it } from 'vitest';
import { auditForDomain, engineLabel, mergeBrands, nextSteps, pickExcerpt, splitByMentions, type ReportAnswer } from '../src/paid/insights';
import type { AuditResult, CheckResult } from '../src/audit/types';
import type { QuestionSummary } from '../src/paid/types';

const opts = { brand: 'Acme', domain: 'acme.io', typedCompetitors: [] as string[] };
const byName = (list: ReturnType<typeof mergeBrands>) => names(list).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
const names = (list: ReturnType<typeof mergeBrands>) => list.map((b) => [b.name, b.count]);

describe('mergeBrands', () => {
  it('merges a sub-product into the parent that is also in the list', () => {
    const out = mergeBrands([{ name: 'Notion', count: 3 }, { name: 'Notion Calendar', count: 2 }], opts);
    expect(out).toEqual([{ name: 'Notion', count: 5, variants: ['Notion Calendar'] }]);
  });

  it('merges names sharing a first word even when the parent itself is absent', () => {
    const out = mergeBrands([{ name: 'Ahrefs Brand Radar', count: 2 }, { name: 'Ahrefs Webmaster Tools', count: 1 }], opts);
    expect(names(out)).toEqual([['Ahrefs', 3]]);
    expect(out[0]!.variants.sort()).toEqual(['Ahrefs Brand Radar', 'Ahrefs Webmaster Tools']);
  });

  it('does not merge a lone sub-product whose parent is not named', () => {
    expect(names(mergeBrands([{ name: 'Brand Radar', count: 2 }, { name: 'Semrush', count: 1 }], opts))).toEqual([['Brand Radar', 2], ['Semrush', 1]]);
  });

  it('uses the competitor the user typed as the canonical parent name and spelling', () => {
    const out = mergeBrands([{ name: 'hubspot crm', count: 2 }, { name: 'HubSpot Sales Hub', count: 1 }], { ...opts, typedCompetitors: ['HubSpot'] });
    expect(out).toEqual([{ name: 'HubSpot', count: 3, variants: ['hubspot crm', 'HubSpot Sales Hub'] }]);
  });

  it('never merges a typed competitor into another name', () => {
    const out = mergeBrands([{ name: 'Notion', count: 2 }, { name: 'Notion Calendar', count: 2 }], { ...opts, typedCompetitors: ['Notion Calendar'] });
    expect(byName(out)).toEqual([['Notion', 2], ['Notion Calendar', 2]]);
  });

  it('keeps the user\'s own brand and its variants out of every merge', () => {
    const out = mergeBrands(
      [{ name: 'Acme', count: 2 }, { name: 'Acme Pro', count: 1 }, { name: 'Acme Cloud', count: 1 }, { name: 'Zoho Books', count: 1 }, { name: 'Zoho', count: 1 }],
      opts,
    );
    expect(byName(out)).toEqual([['Acme', 2], ['Acme Cloud', 1], ['Acme Pro', 1], ['Zoho', 2]]);
    expect(out.find((b) => b.name === 'Zoho')!.variants).toEqual(['Zoho Books']);
  });

  it('does not let a competitor swallow the user\'s own brand when it is a prefix', () => {
    const out = mergeBrands([{ name: 'Acme Rival', count: 2 }, { name: 'Acme Rival Plus', count: 1 }], { ...opts, brand: 'Acme Rival' });
    expect(byName(out)).toEqual([['Acme Rival', 2], ['Acme Rival Plus', 1]]);
  });

  it('treats case, punctuation and company suffixes as the same name and sums counts', () => {
    const out = mergeBrands([{ name: 'Zoho', count: 2 }, { name: 'ZOHO Inc.', count: 1 }, { name: 'Fresh-Books', count: 1 }, { name: 'FreshBooks', count: 2 }], opts);
    expect(names(out)).toEqual([['FreshBooks', 3], ['Zoho', 3]]);
  });

  it('matches whole words only', () => {
    expect(names(mergeBrands([{ name: 'Wave', count: 2 }, { name: 'Waveform', count: 1 }], opts))).toEqual([['Wave', 2], ['Waveform', 1]]);
  });

  it('sorts by count, then name, and handles empty input', () => {
    expect(names(mergeBrands([{ name: 'B', count: 1 }, { name: 'A', count: 1 }, { name: 'C', count: 4 }], opts))).toEqual([['C', 4], ['A', 1], ['B', 1]]);
    expect(mergeBrands([], opts)).toEqual([]);
  });
});

describe('splitByMentions', () => {
  it('lists names mentioned 2+ times and counts the rest', () => {
    const merged = [{ name: 'A', count: 3, variants: [] }, { name: 'B', count: 2, variants: [] }, { name: 'C', count: 1, variants: [] }, { name: 'D', count: 1, variants: [] }];
    const r = splitByMentions(merged);
    expect(r.listed.map((b) => b.name)).toEqual(['A', 'B']);
    expect(r.onceCount).toBe(2);
  });
  it('can have nothing listed', () => {
    expect(splitByMentions([{ name: 'C', count: 1, variants: [] }])).toEqual({ listed: [], onceCount: 1 });
  });
});

const ans = (over: Partial<ReportAnswer>): ReportAnswer => ({ questionIndex: 0, engine: 'openai', runIndex: 0, ok: true, answerText: 'Some text here.', extraction: { brandMentioned: false }, ...over });

describe('pickExcerpt', () => {
  it('prefers an answer that mentions the brand', () => {
    const r = pickExcerpt([ans({ engine: 'perplexity', answerText: 'Long answer without the brand. Second.', extraction: { brandMentioned: false } }), ans({ answerText: 'Acme is a good fit. Another.', extraction: { brandMentioned: true } })], 0, ['openai', 'perplexity']);
    expect(r?.text).toBe('Acme is a good fit. Another.');
    expect(r?.engine).toBe('Engine 1');
  });
  it('keeps at most 3 sentences and strips markdown and citation markers', () => {
    const r = pickExcerpt([ans({ answerText: '## Top picks\n\n**Acme** is [great](https://x.com) for freelancers [1]. It is cheap. It is fast. It is old.' })], 0, ['openai']);
    expect(r?.text).toBe('Acme is great for freelancers. It is cheap. It is fast.');
  });
  it('cuts long text without leaving a half word', () => {
    const long = 'word '.repeat(200);
    const r = pickExcerpt([ans({ answerText: long })], 0, ['openai']);
    expect(r!.text.length).toBeLessThanOrEqual(321);
    expect(r!.text.endsWith('…')).toBe(true);
  });
  it('ignores failed answers, other questions and empty text; returns null when nothing fits', () => {
    expect(pickExcerpt([ans({ ok: false }), ans({ questionIndex: 1 }), ans({ answerText: '  ' }), ans({ answerText: null })], 0, ['openai'])).toBeNull();
  });
  it('never names an AI product', () => {
    expect(engineLabel('openai', ['openai', 'perplexity'])).toBe('Engine 1');
    expect(engineLabel('perplexity', ['openai', 'perplexity'])).toBe('Engine 2');
    expect(engineLabel('unknown', ['openai'])).toBe('Engine');
  });
});

const check = (over: Partial<CheckResult>): CheckResult => ({ id: 'x', title: 'T', status: 'pass', summary: 's', weight: 1, ...over });
const audit = (origin: string, auditedAt: number, results: CheckResult[] = []): AuditResult => ({ url: origin + '/', origin, auditedAt, score: 62, results });

describe('auditForDomain', () => {
  it('matches the report domain to a saved origin, ignoring www and scheme, newest first', () => {
    const map = { 'https://www.acme.io': audit('https://www.acme.io', 5), 'http://acme.io': audit('http://acme.io', 9), 'https://other.com': audit('https://other.com', 99) };
    expect(auditForDomain(map, 'acme.io')?.auditedAt).toBe(9);
    expect(auditForDomain(map, 'nope.io')).toBeNull();
    expect(auditForDomain({}, 'acme.io')).toBeNull();
  });
  it('does not match a subdomain or a longer domain', () => {
    expect(auditForDomain({ 'https://blog.acme.io': audit('https://blog.acme.io', 1), 'https://myacme.io': audit('https://myacme.io', 1) }, 'acme.io')).toBeNull();
  });
});

const sum = (domains: [string, number][]): QuestionSummary => ({
  questionIndex: 0, question: 'q', answersTotal: 2, answersOk: 2, mentionedCount: 0, bestPosition: null, competitors: [], needsReviewCount: 0,
  topCitedDomains: domains.map(([domain, count]) => ({ domain, count })),
});

describe('nextSteps', () => {
  it('shows the saved score and up to 3 fixes, failures before warnings', () => {
    const a = audit('https://acme.io', 1, [
      check({ id: 'a', status: 'warn', weight: 9, title: 'Warn big', fix: 'do w' }),
      check({ id: 'b', status: 'fail', weight: 2, title: 'Fail small', summary: 'no fix text' }),
      check({ id: 'c', status: 'fail', weight: 5, title: 'Fail big', fix: 'do f' }),
      check({ id: 'd', status: 'pass', weight: 99 }),
      check({ id: 'e', status: 'warn', weight: 1, title: 'Warn small' }),
    ]);
    const r = nextSteps('acme.io', a, [sum([])]);
    expect(r.audit?.score).toBe(62);
    expect(r.audit?.fixes.map((f) => f.title)).toEqual(['Fail big', 'Fail small', 'Warn big']);
    expect(r.audit?.fixes[1]!.text).toBe('no fix text');
  });
  it('asks the user to run the audit when none is saved', () => {
    const r = nextSteps('acme.io', null, [sum([])]);
    expect(r.audit).toBeNull();
    expect(r.auditHint).toBe('Open acme.io in a tab and click Run audit, then reopen this report to add its score.');
  });
  it('derives up to 3 suggestions from the most-cited other domains, summed across questions', () => {
    const r = nextSteps('acme.io', null, [sum([['a.com', 2], ['b.com', 1], ['acme.io', 5]]), sum([['a.com', 1], ['c.com', 1], ['d.com', 1]])]);
    expect(r.suggestions.length).toBeLessThanOrEqual(4);
    expect(r.suggestions.some((s) => s.includes('a.com'))).toBe(true);
    expect(r.suggestions.some((s) => s.includes('d.com'))).toBe(false);
    expect(r.suggestions.some((s) => s.includes('acme.io'))).toBe(true);
  });
  it('makes no promises', () => {
    const r = nextSteps('acme.io', null, [sum([['a.com', 2], ['b.com', 1], ['c.com', 1]])]);
    for (const s of r.suggestions) expect(s).not.toMatch(/guarantee|rank #?1|will (make|get|improve|increase)/i);
  });
  it('still gives one generic suggestion with no citations', () => {
    expect(nextSteps('acme.io', null, [sum([])]).suggestions).toHaveLength(1);
  });
});
