import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { ApiError, ERROR_MESSAGES, getReport } from '../../../src/paid/api';
import { getLicense } from '../../../src/paid/store';
import type { QuestionSummary, ReportData } from '../../../src/paid/types';

function QuestionCard({ s }: { s: QuestionSummary }) {
  const failed = s.answersTotal - s.answersOk;
  return (
    <li className="q-card">
      <p className="q-title">{s.question}</p>
      <p className="q-main">
        Mentioned in {s.mentionedCount} of {s.answersOk} answers
      </p>
      {s.mentionedCount > 0 && (
        <p className="q-line">{s.bestPosition ? `Best position in a list: #${s.bestPosition}` : 'Not placed in a ranked list'}</p>
      )}
      {s.competitors.length > 0 && (
        <p className="q-line">Other names mentioned: {s.competitors.slice(0, 5).map((c) => `${c.name} (${c.count})`).join(', ')}</p>
      )}
      {s.topCitedDomains.length > 0 && (
        <p className="q-line">Sources the engines looked at: {s.topCitedDomains.map((d) => d.domain).join(', ')}</p>
      )}
      {s.needsReviewCount > 0 && <p className="q-note">{s.needsReviewCount} answer{s.needsReviewCount === 1 ? '' : 's'} could not be fully checked automatically.</p>}
      {failed > 0 && <p className="q-note">{failed} answer{failed === 1 ? '' : 's'} failed and {failed === 1 ? 'is' : 'are'} not counted.</p>}
    </li>
  );
}

export function ReportResults({ reportId, onBack, backLabel }: { reportId: string; onBack: () => void; backLabel: string }) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const key = (await getLicense())?.key;
        if (!key) return setError('Add your license key in Settings to open reports.');
        setReport(await getReport(key, reportId));
      } catch (err) {
        setError(ERROR_MESSAGES[err instanceof ApiError ? err.kind : 'server']);
      }
    })();
  }, [reportId]);

  async function copyJson() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  function openPdf() {
    // report.html is an unlisted WXT page; its path is not in the generated PublicPath union.
    void browser.tabs.create({ url: `${browser.runtime.getURL('/report.html' as never)}?id=${encodeURIComponent(reportId)}` });
  }

  const answers = report?.summary.reduce((n, s) => n + s.answersOk, 0) ?? 0;
  return (
    <section className="view" aria-label="Report results">
      <button type="button" className="secondary" onClick={onBack}>{backLabel}</button>
      {error && <p className="error" role="alert">{error}</p>}
      {!report && !error && <p className="hint" role="status">Loading report…</p>}
      {report && (
        <>
          <h2 className="view-title">{report.brand}</h2>
          <p className="audited">
            Based on {answers} answer{answers === 1 ? '' : 's'} from {report.engines.length} engine{report.engines.length === 1 ? '' : 's'}.
            {report.status !== 'done' && ` Report status: ${report.status}.`}
          </p>
          <ul className="q-list">{report.summary.map((s) => <QuestionCard key={s.questionIndex} s={s} />)}</ul>
          <p className="hint">This shows what the answer engines said when we asked. Answers change over time and this is not a ranking.</p>
          <button type="button" className="primary" onClick={openPdf} disabled={report.status !== 'done'}>Download PDF</button>
          <button type="button" className="secondary" onClick={copyJson}>{copied ? 'Copied' : 'Copy raw JSON'}</button>
        </>
      )}
    </section>
  );
}
