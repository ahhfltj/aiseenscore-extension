import type { AuditResult } from '../audit/types';
import type { QuestionSummary } from './types';

// Pure helpers for the report page: brand merging, excerpts and the "What to do next" section.

export interface MergedBrand {
  name: string;
  count: number;
  /** Sub-product names that were counted under this brand. */
  variants: string[];
}

export interface MergeOptions {
  /** The user's own brand and domain: never merged into or out of anything. */
  brand: string;
  domain: string;
  /** Names the user typed as competitors: canonical parent names. */
  typedCompetitors: string[];
}

const COMPANY_SUFFIXES = new Set(['inc', 'ltd', 'llc', 'co', 'corp', 'corporation', 'gmbh', 'limited']);
const SKIP_FIRST_WORDS = new Set(['the', 'a', 'an', 'my', 'new', 'best', 'top']);

function tokens(name: string): string[] {
  const t = name
    .toLowerCase()
    .replace(/[.'’-]+/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  while (t.length > 1 && COMPANY_SUFFIXES.has(t[t.length - 1]!)) t.pop();
  return t;
}

const isPrefix = (a: string[], b: string[]) => a.length > 0 && a.length <= b.length && a.every((w, i) => w === b[i]);
const isProperPrefix = (a: string[], b: string[]) => a.length < b.length && isPrefix(a, b);

interface Item {
  key: string;
  tokens: string[];
  name: string;
  count: number;
}

/** Merges sub-products into their parent brand ("Notion Calendar" -> "Notion"). Variant names are kept. */
export function mergeBrands(entries: { name: string; count: number }[], opts: MergeOptions): MergedBrand[] {
  const own = [tokens(opts.brand), tokens(opts.domain.replace(/\.[a-z]{2,}$/i, ''))].filter((t) => t.length > 0);
  const isOwn = (t: string[]) => own.some((o) => isPrefix(o, t) || isPrefix(t, o));
  const typed = opts.typedCompetitors.map((n) => ({ name: n.trim(), tokens: tokens(n) })).filter((c) => c.tokens.length > 0);
  const typedByKey = new Map(typed.map((c) => [c.tokens.join(' '), c.name]));

  // Same name in different spellings: one item, shown in its most frequent spelling.
  const byKey = new Map<string, Item>();
  const best = new Map<string, number>();
  for (const e of entries) {
    const t = tokens(e.name);
    if (t.length === 0 || e.count <= 0) continue;
    const key = t.join(' ');
    const item = byKey.get(key) ?? { key, tokens: t, name: e.name.trim(), count: 0 };
    item.count += e.count;
    if (e.count > (best.get(key) ?? 0)) {
      best.set(key, e.count);
      item.name = e.name.trim();
    }
    byKey.set(key, item);
  }
  for (const [key, item] of byKey) {
    const canonical = typedByKey.get(key);
    if (canonical) item.name = canonical;
  }

  const items = [...byKey.values()];
  const mergeable = items.filter((i) => !isOwn(i.tokens) && !typedByKey.has(i.key));
  const parents = new Map<string, MergedBrand>(); // parent key -> result
  const standalone: MergedBrand[] = items
    .filter((i) => !mergeable.includes(i))
    .map((i) => ({ name: i.name, count: i.count, variants: [] }));

  const shortest = <T extends { tokens: string[] }>(list: T[]) => list.sort((a, b) => a.tokens.length - b.tokens.length)[0];
  const parentOf = new Map<Item, { key: string; name: string }>();
  const unresolved: Item[] = [];
  for (const item of mergeable) {
    const typedParent = shortest(typed.filter((c) => isProperPrefix(c.tokens, item.tokens)));
    if (typedParent) {
      parentOf.set(item, { key: typedParent.tokens.join(' '), name: typedParent.name });
      continue;
    }
    const listParent = shortest(mergeable.filter((o) => o !== item && isProperPrefix(o.tokens, item.tokens)));
    if (listParent) parentOf.set(item, { key: listParent.key, name: listParent.name });
    else unresolved.push(item);
  }

  // Two or more different names starting with the same word share a parent even when the parent is not named.
  const byFirst = new Map<string, Item[]>();
  for (const item of unresolved) {
    const first = item.tokens[0]!;
    if (item.tokens.length < 2 || first.length < 3 || SKIP_FIRST_WORDS.has(first)) continue;
    byFirst.set(first, [...(byFirst.get(first) ?? []), item]);
  }
  for (const [first, group] of byFirst) {
    if (group.length < 2) continue;
    const top = [...group].sort((a, b) => b.count - a.count)[0]!;
    const word = top.name.split(/\s+/)[0]!.replace(/[^\p{L}\p{N}]+$/u, '');
    for (const item of group) parentOf.set(item, { key: first, name: word });
  }

  const add = (key: string, name: string, count: number, variant?: string) => {
    const p = parents.get(key) ?? { name, count: 0, variants: [] };
    p.count += count;
    if (variant) p.variants.push(variant);
    parents.set(key, p);
  };
  // Parents that are themselves in the list keep their own count.
  for (const item of mergeable) {
    const p = parentOf.get(item);
    if (p) continue;
    add(item.key, item.name, item.count);
  }
  for (const item of [...mergeable].sort((a, b) => b.count - a.count)) {
    const p = parentOf.get(item);
    if (p) add(p.key, p.name, item.count, item.name);
  }

  return [...standalone, ...parents.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Names mentioned at least `min` times are listed; the rest are only counted. */
export function splitByMentions(merged: MergedBrand[], min = 2): { listed: MergedBrand[]; onceCount: number } {
  return { listed: merged.filter((b) => b.count >= min), onceCount: merged.filter((b) => b.count < min).length };
}

// ---------------------------------------------------------------------------

export interface ReportAnswer {
  questionIndex: number;
  engine: string;
  runIndex: number;
  ok: boolean;
  answerText?: string | null;
  extraction?: { brandMentioned?: boolean } | null;
}

/** Engines are labelled by position only; the report never names an AI product. */
export function engineLabel(engine: string, engines: string[]): string {
  const i = engines.indexOf(engine);
  return i >= 0 ? `Engine ${i + 1}` : 'Engine';
}

const EXCERPT_MAX = 320;
const EXCERPT_SENTENCES = 3;

function cleanAnswer(text: string): string {
  const lines = text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\[\d+(?:\s*,\s*\d+)*\]/g, '')
    .replace(/[*_`]+/g, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.replace(/^(?:[-•]|\d+[.)])\s+/, '').replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim())
    .filter(Boolean)
    .map((l) => (/[\p{L}\p{N}]$/u.test(l) ? `${l}.` : l));
  return lines.join(' ');
}

/** One representative answer for a question: prefers one that mentions the brand, then the fuller one. */
export function pickExcerpt(answers: ReportAnswer[], questionIndex: number, engines: string[]): { text: string; engine: string } | null {
  const candidates = answers
    .filter((a) => a.ok && a.questionIndex === questionIndex && a.answerText && a.answerText.trim())
    .map((a) => ({ a, clean: cleanAnswer(a.answerText!) }))
    .filter((c) => c.clean)
    .sort(
      (x, y) =>
        Number(Boolean(y.a.extraction?.brandMentioned)) - Number(Boolean(x.a.extraction?.brandMentioned)) ||
        y.clean.length - x.clean.length ||
        engines.indexOf(x.a.engine) - engines.indexOf(y.a.engine) ||
        x.a.runIndex - y.a.runIndex,
    );
  const top = candidates[0];
  if (!top) return null;
  let text = top.clean.split(/(?<=[.!?])\s+/).slice(0, EXCERPT_SENTENCES).join(' ');
  if (text.length > EXCERPT_MAX) {
    const cut = text.slice(0, EXCERPT_MAX);
    text = `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 1)).replace(/[\s.,;:!?-]+$/, '')}…`;
  }
  return { text, engine: engineLabel(top.a.engine, engines) };
}

// ---------------------------------------------------------------------------

const bareHost = (h: string) => h.toLowerCase().replace(/^www\./, '');

/** The newest saved audit for this report's domain (ignores www and the scheme; subdomains do not count). */
export function auditForDomain(saved: Record<string, AuditResult>, domain: string): AuditResult | null {
  const want = bareHost(domain);
  let found: AuditResult | null = null;
  for (const r of Object.values(saved)) {
    let host = '';
    try {
      host = bareHost(new URL(r.origin).hostname);
    } catch {
      continue;
    }
    if (host === want && (!found || r.auditedAt > found.auditedAt)) found = r;
  }
  return found;
}

export interface NextSteps {
  audit: { score: number; auditedAt: number; fixes: { title: string; text: string }[] } | null;
  auditHint: string;
  suggestions: string[];
}

const OTHER_TEMPLATES = [
  (d: string, n: number) =>
    `${d} was among the sources the engines looked at most often (${n} time${n === 1 ? '' : 's'}). If your brand is listed or described there, checking that the details are accurate and current is low-risk housekeeping.`,
  (d: string, n: number) =>
    `${d} also appeared in the answers (${n} time${n === 1 ? '' : 's'}). If you can edit your own profile or listing there, keep it accurate and consistent with your website.`,
  (d: string, n: number) =>
    `${d} appeared ${n} time${n === 1 ? '' : 's'} as well. Treat it as one more place to check that your public information is consistent.`,
];

export function nextSteps(domain: string, audit: AuditResult | null, summaries: QuestionSummary[]): NextSteps {
  const fixes = audit
    ? audit.results
        .filter((r) => r.status === 'fail' || r.status === 'warn')
        .sort((a, b) => Number(b.status === 'fail') - Number(a.status === 'fail') || b.weight - a.weight)
        .slice(0, 3)
        .map((r) => ({ title: r.title, text: r.fix ?? r.summary }))
    : [];

  const totals = new Map<string, number>();
  for (const s of summaries) for (const d of s.topCitedDomains) totals.set(bareHost(d.domain), (totals.get(bareHost(d.domain)) ?? 0) + d.count);
  const own = bareHost(domain);
  const others = [...totals].filter(([d]) => d !== own).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3);
  const suggestions = others.map(([d, n], i) => OTHER_TEMPLATES[i]!(d, n));
  const ownCount = totals.get(own) ?? 0;
  if (ownCount > 0) {
    suggestions.push(`Your own site (${domain}) was cited ${ownCount} time${ownCount === 1 ? '' : 's'}. Keeping those pages accurate and easy to read is low-risk housekeeping.`);
  }
  if (suggestions.length === 0) {
    suggestions.push('No sources were reported for these questions. Keeping your public pages clear, accurate and easy for crawlers to read is low-risk housekeeping.');
  }

  return {
    audit: audit ? { score: audit.score, auditedAt: audit.auditedAt, fixes } : null,
    auditHint: `Open ${domain} in a tab and click Run audit, then reopen this report to add its score.`,
    suggestions,
  };
}
