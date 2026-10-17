export interface ReportInput {
  brand: string;
  domain: string;
  category: string;
  competitors: string[];
  questions: string[];
}

export type ApiErrorKind =
  | 'no_credits'
  | 'busy' // another report is running, or the daily limit was reached
  | 'rate_limited'
  | 'spend_cap' // our daily capacity is used up; the credit is kept
  | 'unavailable'
  | 'invalid'
  | 'not_found'
  | 'engines_failed' // every answer engine failed; the credit is refunded
  | 'in_progress' // the same question is already running (retry shortly)
  | 'network'
  | 'server';

export type JobStatus = 'creating' | 'running' | 'paused' | 'failed' | 'done';

/** The report being run. Never contains the license key. */
export interface ReportJob {
  input: ReportInput;
  reportId?: string;
  total: number;
  completed: number[];
  status: JobStatus;
  error?: { kind: ApiErrorKind; message: string };
  startedAt: number;
}

export interface RecentReport {
  id: string;
  brand: string;
  createdAt: number;
}

export interface LicenseInfo {
  key: string;
  creditsLeft: number;
  creditsTotal: number;
  checkedAt: number;
}

export interface QuestionSummary {
  questionIndex: number;
  question: string;
  answersTotal: number;
  answersOk: number;
  mentionedCount: number;
  bestPosition: number | null;
  competitors: { name: string; count: number }[];
  topCitedDomains: { domain: string; count: number }[];
  needsReviewCount: number;
}

export interface ReportData {
  id: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  brand: string;
  domain: string;
  category: string;
  questions: string[];
  engines: string[];
  costUsd: number;
  createdAt: string;
  finishedAt: string | null;
  summary: QuestionSummary[];
  answers: unknown[];
}
