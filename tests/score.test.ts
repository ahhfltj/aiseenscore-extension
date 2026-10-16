import { describe, expect, it } from 'vitest';
import { computeScore } from '../src/audit/score';
import type { CheckResult, CheckStatus } from '../src/audit/types';

const r = (status: CheckStatus, weight: number): CheckResult => ({ id: 'x', title: 'x', status, summary: '', weight });

describe('computeScore', () => {
  it('is 100 when everything passes', () => expect(computeScore([r('pass', 60), r('pass', 40)])).toBe(100));
  it('is 0 when everything fails', () => expect(computeScore([r('fail', 60), r('fail', 40)])).toBe(0));
  it('gives half weight for warn', () => expect(computeScore([r('warn', 50), r('warn', 50)])).toBe(50));
  it('excludes info from the total', () => expect(computeScore([r('pass', 25), r('info', 75)])).toBe(100));
  it('normalizes over included weights and rounds', () => expect(computeScore([r('pass', 10), r('fail', 20)])).toBe(33));
  it('returns 0 when nothing is scorable', () => {
    expect(computeScore([])).toBe(0);
    expect(computeScore([r('info', 10)])).toBe(0);
  });
});
