import { browser } from 'wxt/browser';
import { BUY_URL } from '../../../src/paid/config';
import { clearJob } from '../../../src/paid/store';
import type { ReportJob } from '../../../src/paid/types';

export function ReportProgress({ job }: { job: ReportJob }) {
  const pct = job.total ? Math.round((job.completed.length / job.total) * 100) : 0;
  const active = job.status === 'creating' || job.status === 'running';

  return (
    <section className="view" aria-label="Report progress">
      {active && (
        <>
          <p className="progress-label" role="status">
            {job.status === 'creating' ? 'Starting your report…' : `Question ${Math.min(job.completed.length + 1, job.total)} of ${job.total}…`}
          </p>
          <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-bar determinate" style={{ width: `${Math.max(pct, 6)}%` }} />
          </div>
          <p className="hint">You can close this window. The report keeps running and will be here when you come back.</p>
        </>
      )}

      {job.status === 'paused' && (
        <>
          <p className="error" role="alert">{job.error?.message}</p>
          <p className="hint">{job.completed.length} of {job.total} questions are done. Your credit is kept.</p>
          <button type="button" className="primary" onClick={() => browser.runtime.sendMessage({ type: 'paid/resume' })}>
            Try again
          </button>
        </>
      )}

      {job.status === 'failed' && (
        <>
          <p className="error" role="alert">{job.error?.message}</p>
          {job.error?.kind === 'no_credits' && (
            <p><a href={BUY_URL} target="_blank" rel="noopener noreferrer">Buy report credits</a></p>
          )}
          <button type="button" className="secondary" onClick={() => void clearJob()}>
            Back to the form
          </button>
        </>
      )}
    </section>
  );
}
