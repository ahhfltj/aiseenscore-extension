import { API_BASE } from './config';
import type { ApiErrorKind, ReportData, ReportInput } from './types';

export class ApiError extends Error {
  constructor(public kind: ApiErrorKind, public status?: number) {
    super(kind);
  }
}

export const ERROR_MESSAGES: Record<ApiErrorKind, string> = {
  no_credits: "You don't have any report credits left.",
  busy: 'Another report is already running, or you reached the daily limit. Try again later.',
  rate_limited: 'Too many requests. Please wait a minute and try again.',
  spend_cap: "We've reached today's capacity for reports. Your credit is kept. Try again tomorrow.",
  unavailable: 'The service is temporarily unavailable. Please try again in a few minutes.',
  invalid: 'Some details were not accepted. Please check the form and try again.',
  not_found: 'That report was not found. Reports are kept for 30 days.',
  engines_failed: 'The answer engines could not answer. Your credit has been returned.',
  in_progress: 'This question is still running. Waiting for it to finish.',
  network: "Couldn't reach the server. Check your connection and try again.",
  server: 'Something went wrong on our side. Please try again in a few minutes.',
};

export type FetchLike = typeof fetch;
export interface ApiDeps {
  fetchImpl?: FetchLike;
  base?: string;
}

async function call(
  path: string,
  init: RequestInit,
  deps: ApiDeps,
): Promise<unknown> {
  const doFetch = deps.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await doFetch((deps.base ?? API_BASE) + path, init);
  } catch {
    throw new ApiError('network');
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (res.ok) return body;
  throw new ApiError(kindFor(res.status, body.error), res.status);
}

export function kindFor(status: number, code?: string): ApiErrorKind {
  if (status === 402) return 'no_credits';
  if (status === 429) return code === 'rate_limited' ? 'rate_limited' : 'busy';
  if (status === 503) return code === 'daily_spend_cap_reached' ? 'spend_cap' : 'unavailable';
  if (status === 409) return code === 'question_in_progress' ? 'in_progress' : 'engines_failed';
  if (status === 502) return 'engines_failed';
  if (status === 404) return 'not_found';
  if (status === 400) return 'invalid';
  return 'server';
}

const postJson = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

export interface LicenseCheck {
  valid: boolean;
  status?: 'active' | 'revoked';
  creditsLeft?: number;
  creditsTotal?: number;
}

export function checkLicense(licenseKey: string, deps: ApiDeps = {}): Promise<LicenseCheck> {
  return call('/v1/license/check', postJson({ licenseKey }), deps) as Promise<LicenseCheck>;
}

export async function createReport(
  licenseKey: string,
  input: ReportInput,
  deps: ApiDeps = {},
): Promise<{ reportId: string; questionCount: number }> {
  const body = { licenseKey, ...input, competitors: input.competitors.length ? input.competitors : undefined };
  return call('/v1/reports', postJson(body), deps) as Promise<{ reportId: string; questionCount: number }>;
}

export async function runQuestion(
  licenseKey: string,
  reportId: string,
  questionIndex: number,
  deps: ApiDeps = {},
): Promise<void> {
  await call(`/v1/reports/${encodeURIComponent(reportId)}/run`, postJson({ licenseKey, questionIndex }), deps);
}

// The license key travels in a header, never in the URL.
export function getReport(licenseKey: string, reportId: string, deps: ApiDeps = {}): Promise<ReportData> {
  return call(
    `/v1/reports/${encodeURIComponent(reportId)}`,
    { headers: { 'X-License-Key': licenseKey } },
    deps,
  ) as Promise<ReportData>;
}
