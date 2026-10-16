import type { CheckResult } from './types';

const FACTOR = { pass: 1, warn: 0.5, fail: 0 } as const;

/** pass = full weight, warn = half, fail = 0; info is excluded. Result is 0–100. */
export function computeScore(results: CheckResult[]): number {
  let earned = 0;
  let possible = 0;
  for (const r of results) {
    if (r.status === 'info') continue;
    earned += r.weight * FACTOR[r.status];
    possible += r.weight;
  }
  return possible === 0 ? 0 : Math.round((earned / possible) * 100);
}
