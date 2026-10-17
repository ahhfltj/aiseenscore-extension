import { describe, expect, it } from 'vitest';
import { ApiError, checkLicense, createReport, getReport, kindFor, runQuestion } from '../src/paid/api';
import { cleanInput, exampleQuestions, maskKey, normalizeWebsite, parseCompetitors, pruneRecent, validateInput } from '../src/paid/helpers';
import { driveJob, startingJob, type RunnerDeps } from '../src/paid/runner';
import type { ReportData, ReportInput, ReportJob } from '../src/paid/types';

const input: ReportInput = { brand: 'Acme', domain: 'acme.io', category: 'invoicing software', competitors: [], questions: ['q1', 'q2', 'q3'] };

describe('helpers', () => {
  it('masks all but the last 4 characters', () => {
    expect(maskKey('ABCD-1234-WXYZ')).toBe('••••••••WXYZ');
    expect(maskKey('abc')).toBe('••••');
    expect(maskKey('ABCD-1234-WXYZ')).not.toContain('ABCD');
  });
  it('builds three example questions from the category', () => {
    const qs = exampleQuestions('invoicing software');
    expect(qs).toHaveLength(3);
    expect(qs[0]).toBe("What's the best invoicing software for small businesses?");
  });
  it('normalises websites and competitor lists', () => {
    expect(normalizeWebsite('https://www.Acme.io/pricing?x=1')).toBe('acme.io');
    expect(parseCompetitors('Wave, FreshBooks,, Wave\nZoho, A, B, C, D')).toEqual(['Wave', 'FreshBooks', 'Zoho', 'A', 'B']);
  });
  it('validates the form', () => {
    expect(validateInput(input)).toEqual({});
    expect(validateInput({ ...input, brand: ' ' }).brand).toBeTruthy();
    expect(validateInput({ ...input, domain: 'not a site' }).domain).toBeTruthy();
    expect(validateInput({ ...input, questions: ['q1', 'q2'] }).questions).toBeTruthy();
    expect(validateInput({ ...input, questions: ['q', 'q', 'q', 'q', 'q', 'q'] }).questions).toBeTruthy();
    expect(validateInput({ ...input, questions: ['q', 'q', 'x'.repeat(201)] }).questions).toBeTruthy();
    expect(cleanInput({ ...input, brand: ' Acme ', questions: ['a ', '', 'b', 'c'] })).toMatchObject({ brand: 'Acme', questions: ['a', 'b', 'c'] });
  });
  it('drops recent reports older than 30 days', () => {
    const now = 100 * 86_400_000;
    const list = [{ id: 'old', brand: 'a', createdAt: now - 31 * 86_400_000 }, { id: 'new', brand: 'b', createdAt: now - 86_400_000 }];
    expect(pruneRecent(list, now).map((r) => r.id)).toEqual(['new']);
  });
});

describe('api', () => {
  const res = (status: number, body: object = {}) => new Response(JSON.stringify(body), { status });
  it('maps server responses to error kinds', () => {
    expect(kindFor(402)).toBe('no_credits');
    expect(kindFor(429, 'rate_limited')).toBe('rate_limited');
    expect(kindFor(429, 'report_in_progress')).toBe('busy');
    expect(kindFor(503, 'daily_spend_cap_reached')).toBe('spend_cap');
    expect(kindFor(503)).toBe('unavailable');
    expect(kindFor(409, 'question_in_progress')).toBe('in_progress');
    expect(kindFor(502, 'all_engines_failed')).toBe('engines_failed');
    expect(kindFor(404)).toBe('not_found');
    expect(kindFor(500)).toBe('server');
  });
  it('throws typed errors, including for network failures', async () => {
    await expect(createReport('KEY-12345678', input, { fetchImpl: (async () => res(402, { error: 'no_credits' })) as typeof fetch })).rejects.toMatchObject({ kind: 'no_credits' });
    await expect(checkLicense('KEY-12345678', { fetchImpl: (async () => { throw new TypeError('fail'); }) as typeof fetch })).rejects.toMatchObject({ kind: 'network' });
  });
  it('sends the key in the body for POST and in a header (never the URL) for GET', async () => {
    const seen: { url: string; init: RequestInit }[] = [];
    const f = (async (url: string, init: RequestInit) => (seen.push({ url, init }), res(200, {}))) as unknown as typeof fetch;
    await getReport('SECRET-KEY-1', 'rep1', { fetchImpl: f, base: 'http://x' });
    await runQuestion('SECRET-KEY-1', 'rep1', 2, { fetchImpl: f, base: 'http://x' });
    expect(seen[0]!.url).toBe('http://x/v1/reports/rep1');
    expect(seen[0]!.url).not.toContain('SECRET');
    expect((seen[0]!.init.headers as Record<string, string>)['X-License-Key']).toBe('SECRET-KEY-1');
    expect(JSON.parse(seen[1]!.init.body as string)).toEqual({ licenseKey: 'SECRET-KEY-1', questionIndex: 2 });
  });
});

function harness(over: Partial<RunnerDeps> = {}, initial?: ReportJob) {
  let job: ReportJob | null = initial ?? startingJob(input, 1);
  const calls: string[] = [];
  const deps: RunnerDeps = {
    getKey: async () => 'KEY-12345678',
    getJob: async () => job,
    setJob: async (j) => void (job = j),
    createReport: async () => (calls.push('create'), { reportId: 'rep1', questionCount: 3 }),
    runQuestion: async (_k, _id, i) => void calls.push(`run${i}`),
    getReport: async () => ({ id: 'rep1' }) as ReportData,
    onDone: async () => void calls.push('done'),
    sleep: async () => {},
    ...over,
  };
  return { deps, calls, job: () => job! };
}

describe('driveJob', () => {
  it('creates, runs each question in order, then finishes', async () => {
    const h = harness();
    await driveJob(h.deps);
    expect(h.calls).toEqual(['create', 'run0', 'run1', 'run2', 'done']);
    expect(h.job()).toMatchObject({ status: 'done', reportId: 'rep1', completed: [0, 1, 2] });
  });

  it('resumes after a restart without creating again or redoing finished questions', async () => {
    const h = harness({}, { ...startingJob(input, 1), reportId: 'rep1', status: 'running', completed: [0, 1] });
    await driveJob(h.deps);
    expect(h.calls).toEqual(['run2', 'done']);
  });

  it('shows out-of-credits as a failure and runs nothing', async () => {
    const h = harness({ createReport: async () => { throw new ApiError('no_credits', 402); } });
    await driveJob(h.deps);
    expect(h.job()).toMatchObject({ status: 'failed', error: { kind: 'no_credits' } });
    expect(h.calls).toEqual([]);
  });

  it('does not retry a failed create (it would charge again)', async () => {
    let n = 0;
    const h = harness({ createReport: async () => { n++; throw new ApiError('network'); } });
    await driveJob(h.deps);
    expect(n).toBe(1);
    expect(h.job().status).toBe('failed');
  });

  it('retries a transient network error once the report exists, then succeeds', async () => {
    let n = 0;
    const h = harness({ runQuestion: async (_k, _id, i) => { if (i === 1 && n++ === 0) throw new ApiError('network'); } });
    await driveJob(h.deps);
    expect(h.job().status).toBe('done');
  });

  it('pauses (resumable, credit kept) when the network stays down mid-report', async () => {
    const h = harness({ runQuestion: async (_k, _id, i) => { if (i === 1) throw new ApiError('network'); } });
    await driveJob(h.deps);
    expect(h.job()).toMatchObject({ status: 'paused', completed: [0], error: { kind: 'network' } });
  });

  it('waits while the same question is still running on the server', async () => {
    let n = 0;
    const h = harness({ runQuestion: async (_k, _id, i) => { if (i === 0 && n++ < 3) throw new ApiError('in_progress', 409); } });
    await driveJob(h.deps);
    expect(h.job().status).toBe('done');
    expect(n).toBe(4);
  });

  it('fails (credit refunded by the server) when every engine failed', async () => {
    const h = harness({ runQuestion: async () => { throw new ApiError('engines_failed', 502); } });
    await driveJob(h.deps);
    expect(h.job()).toMatchObject({ status: 'failed', error: { kind: 'engines_failed' } });
  });

  it('pauses on the daily spend cap and does not mark the report done', async () => {
    const h = harness({ runQuestion: async () => { throw new ApiError('spend_cap', 503); } });
    await driveJob(h.deps);
    expect(h.job()).toMatchObject({ status: 'paused', error: { kind: 'spend_cap' } });
    expect(h.calls).not.toContain('done');
  });

  it('fails clearly when no license key is stored', async () => {
    const h = harness({ getKey: async () => null });
    await driveJob(h.deps);
    expect(h.job().status).toBe('failed');
  });

  it('does nothing for a finished job', async () => {
    const h = harness({}, { ...startingJob(input, 1), status: 'done', reportId: 'rep1', completed: [0, 1, 2] });
    await driveJob(h.deps);
    expect(h.calls).toEqual([]);
  });
});
