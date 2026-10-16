import { browser } from 'wxt/browser';
import type { AuditResult } from './audit/types';

const KEY = 'auditResults';
export const MAX_ORIGINS = 20;
export const FRESH_MS = 24 * 60 * 60 * 1000;

export type ResultMap = Record<string, AuditResult>;

/** Keeps the most recently audited origins. */
export function pruneResults(map: ResultMap, max = MAX_ORIGINS): ResultMap {
  const kept = Object.entries(map)
    .sort(([, a], [, b]) => b.auditedAt - a.auditedAt)
    .slice(0, max);
  return Object.fromEntries(kept);
}

export function isFresh(result: AuditResult, now = Date.now()): boolean {
  return now - result.auditedAt < FRESH_MS;
}

async function readAll(): Promise<ResultMap> {
  try {
    const stored = await browser.storage.local.get(KEY);
    return (stored[KEY] as ResultMap | undefined) ?? {};
  } catch {
    return {};
  }
}

export async function saveResult(result: AuditResult): Promise<void> {
  try {
    const map = await readAll();
    map[result.origin] = result;
    await browser.storage.local.set({ [KEY]: pruneResults(map) });
  } catch {
    /* caching is optional */
  }
}

/** Returns the saved result for an origin if it is under 24 hours old. */
export async function loadFreshResult(origin: string, now = Date.now()): Promise<AuditResult | null> {
  const result = (await readAll())[origin];
  return result && isFresh(result, now) ? result : null;
}
