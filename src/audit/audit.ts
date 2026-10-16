import { runChecks } from './checks';
import { computeScore } from './score';
import type { AuditResult, CollectedData } from './types';

export function buildAuditResult(data: CollectedData, now = Date.now()): AuditResult {
  const results = runChecks(data);
  return { url: data.url, origin: data.origin, auditedAt: now, score: computeScore(results), results };
}
