import { browser } from 'wxt/browser';
import { useEffect, useState } from 'react';
import { BUY_URL } from '../../../src/paid/config';
import { clearJob } from '../../../src/paid/store';
import { useStore } from '../../../src/paid/useStore';
import type { ReportInput } from '../../../src/paid/types';
import { ReportForm } from './ReportForm';
import { ReportProgress } from './ReportProgress';
import { ReportResults } from './ReportResults';

export function ReportTab({ openSettings }: { openSettings: () => void }) {
  const { loaded, license, job, recent } = useStore();
  const [viewing, setViewing] = useState<string | null>(null);
  const [startError, setStartError] = useState('');

  // Wake the background worker so an unfinished report continues.
  useEffect(() => {
    if (job && (job.status === 'creating' || job.status === 'running')) void browser.runtime.sendMessage({ type: 'paid/resume' }).catch(() => {});
  }, [job?.status]);

  async function start(input: ReportInput) {
    setStartError('');
    const res = (await browser.runtime.sendMessage({ type: 'paid/start', input })) as { ok: boolean; reason?: string } | undefined;
    if (!res?.ok) setStartError('A report is already running.');
  }

  if (!loaded) return <p className="hint" role="status">Loading…</p>;

  if (viewing) return <ReportResults reportId={viewing} onBack={() => setViewing(null)} backLabel="Back" />;

  if (job && job.status === 'done' && job.reportId) {
    return <ReportResults reportId={job.reportId} onBack={() => void clearJob()} backLabel="New report" />;
  }
  if (job) return <ReportProgress job={job} />;

  if (!license) {
    return (
      <section className="view">
        <p>Activate your license key to run an AI mention report.</p>
        <button type="button" className="primary" onClick={openSettings}>Add license key</button>
        <p className="hint"><a href={BUY_URL} target="_blank" rel="noopener noreferrer">Buy report credits</a></p>
      </section>
    );
  }

  return (
    <section className="view">
      <ReportForm creditsLeft={license.creditsLeft} onStart={start} disabled={false} />
      {startError && <p className="error" role="alert">{startError}</p>}
      {license.creditsLeft < 1 && (
        <p className="hint"><a href={BUY_URL} target="_blank" rel="noopener noreferrer">Buy report credits</a></p>
      )}
      {recent.length > 0 && (
        <div className="recent">
          <h2 className="view-title">Recent reports</h2>
          <ul className="rows">
            {recent.map((r) => (
              <li key={r.id} className="row">
                <button type="button" className="row-head" onClick={() => setViewing(r.id)}>
                  <span className="row-text">
                    <span className="row-title">{r.brand}</span>
                    <span className="row-summary">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
