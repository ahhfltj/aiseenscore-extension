import { describe, expect, it } from 'vitest';
import { FRESH_MS, isFresh, pruneResults, type ResultMap } from '../src/storage';
import { formatAgo, verdictFor } from '../src/audit/verdict';
import type { AuditResult } from '../src/audit/types';

const result = (origin: string, auditedAt: number): AuditResult => ({
  url: origin + '/', origin, auditedAt, score: 50, results: [],
});

describe('pruneResults', () => {
  it('keeps the 20 most recent origins', () => {
    const map: ResultMap = {};
    for (let i = 0; i < 25; i++) map[`https://s${i}.com`] = result(`https://s${i}.com`, i);
    const pruned = pruneResults(map);
    expect(Object.keys(pruned)).toHaveLength(20);
    expect(pruned['https://s24.com']).toBeDefined();
    expect(pruned['https://s5.com']).toBeDefined();
    expect(pruned['https://s4.com']).toBeUndefined();
  });
});

describe('isFresh', () => {
  it('is true within 24 hours and false after', () => {
    expect(isFresh(result('https://a.com', 1000), 1000 + FRESH_MS - 1)).toBe(true);
    expect(isFresh(result('https://a.com', 1000), 1000 + FRESH_MS)).toBe(false);
  });
});

describe('verdictFor', () => {
  it.each([[100, 'Easy for AI to read'], [80, 'Easy for AI to read'], [79, 'Some things to fix'], [50, 'Some things to fix'], [49, 'Hard for AI to read'], [0, 'Hard for AI to read']])(
    'score %i', (score, text) => expect(verdictFor(score)).toBe(text),
  );
});

describe('formatAgo', () => {
  it('formats minutes and hours', () => {
    const now = 10_000_000;
    expect(formatAgo(now - 20_000, now)).toBe('just now');
    expect(formatAgo(now - 60_000, now)).toBe('1 minute ago');
    expect(formatAgo(now - 5 * 60_000, now)).toBe('5 minutes ago');
    expect(formatAgo(now - 60 * 60_000, now)).toBe('1 hour ago');
    expect(formatAgo(now - 3 * 3_600_000, now)).toBe('3 hours ago');
  });
});
