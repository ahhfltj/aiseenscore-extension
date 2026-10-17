import { ApiError, ERROR_MESSAGES } from './api';
import type { ApiErrorKind, ReportData, ReportInput, ReportJob } from './types';

export interface RunnerDeps {
  getKey: () => Promise<string | null>;
  getJob: () => Promise<ReportJob | null>;
  setJob: (job: ReportJob) => Promise<void>;
  createReport: (key: string, input: ReportInput) => Promise<{ reportId: string; questionCount: number }>;
  runQuestion: (key: string, reportId: string, index: number) => Promise<void>;
  getReport: (key: string, reportId: string) => Promise<ReportData>;
  onDone: (job: ReportJob) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
}

const IN_PROGRESS_WAIT_MS = 3000;
const IN_PROGRESS_MAX_TRIES = 40; // about two minutes
const TRANSIENT_WAITS_MS = [2000, 5000];

/** Errors that leave the report resumable (the credit is kept). */
const PAUSE_KINDS: ApiErrorKind[] = ['network', 'server', 'unavailable', 'spend_cap', 'rate_limited', 'in_progress'];

export function startingJob(input: ReportInput, now = Date.now()): ReportJob {
  return { input, total: input.questions.length, completed: [], status: 'creating', startedAt: now };
}

function withError(job: ReportJob, err: unknown): ReportJob {
  const kind: ApiErrorKind = err instanceof ApiError ? err.kind : 'server';
  const status = PAUSE_KINDS.includes(kind) && job.reportId ? 'paused' : 'failed';
  return { ...job, status, error: { kind, message: ERROR_MESSAGES[kind] } };
}

/** Retries network/5xx a couple of times; everything else surfaces immediately. */
async function withRetry<T>(fn: () => Promise<T>, deps: RunnerDeps): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (err) {
      const transient = err instanceof ApiError && (err.kind === 'network' || err.kind === 'server');
      if (!transient || i >= TRANSIENT_WAITS_MS.length) throw err;
      await deps.sleep(TRANSIENT_WAITS_MS[i]!);
    }
  }
}

/**
 * Drives the stored job to completion. Safe to call again after the worker restarts:
 * the server's /run is idempotent, and finished questions are skipped.
 */
export async function driveJob(deps: RunnerDeps): Promise<void> {
  let job = await deps.getJob();
  if (!job || job.status === 'done' || job.status === 'failed') return;

  const key = await deps.getKey();
  const save = async (next: ReportJob) => {
    job = next;
    await deps.setJob(next);
  };
  if (!key) return save({ ...job, status: 'failed', error: { kind: 'invalid', message: 'Add your license key in Settings first.' } });

  try {
    if (!job.reportId) {
      // Creating deducts one credit server-side; persist the id right away so a restart resumes instead of paying twice.
      // Not retried automatically: creating is not idempotent. A lost response is refunded by the server after 30 minutes.
      const created = await deps.createReport(key, job.input);
      await save({ ...job, reportId: created.reportId, total: created.questionCount, status: 'running', error: undefined });
    } else {
      await save({ ...job, status: 'running', error: undefined });
    }

    for (let q = 0; q < job.total; q++) {
      if (job.completed.includes(q)) continue;
      for (let tries = 0; ; tries++) {
        try {
          await withRetry(() => deps.runQuestion(key, job!.reportId!, q), deps);
          break;
        } catch (err) {
          if (err instanceof ApiError && err.kind === 'in_progress' && tries < IN_PROGRESS_MAX_TRIES) {
            await deps.sleep(IN_PROGRESS_WAIT_MS);
            continue;
          }
          throw err;
        }
      }
      await save({ ...job, completed: [...job.completed, q] });
    }

    await withRetry(() => deps.getReport(key, job!.reportId!), deps);
    await save({ ...job, status: 'done' });
    await deps.onDone(job);
  } catch (err) {
    await save(withError(job, err));
  }
}
