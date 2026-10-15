export type CheckStatus = 'pass' | 'warn' | 'fail' | 'info';

export interface CheckResult {
  id: string;
  title: string;
  status: CheckStatus;
  summary: string;
  details?: string[];
  fix?: string;
  weight: number;
}

export interface AuditResult {
  url: string;
  origin: string;
  auditedAt: number;
  score: number;
  results: CheckResult[];
  error?: string;
}
