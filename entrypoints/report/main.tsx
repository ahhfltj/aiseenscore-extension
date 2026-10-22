import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ApiError, ERROR_MESSAGES, getReport } from '../../src/paid/api';
import { safeLogoSrc } from '../../src/paid/helpers';
import { auditForDomain, mergeBrands, nextSteps, pickExcerpt, splitByMentions, type NextSteps } from '../../src/paid/insights';
import { getBranding, getLicense } from '../../src/paid/store';
import { loadAllResults } from '../../src/storage';
import type { Branding, ReportData } from '../../src/paid/types';
import './style.css';

function Report() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [steps, setSteps] = useState<NextSteps | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const id = new URLSearchParams(location.search).get('id');
        const license = await getLicense();
        if (!id || !license?.key) return setError('Open this page from a report in the extension.');
        // Branding applies only to keys the server marked as white-label.
        if (license.whiteLabel) setBranding(await getBranding());
        const data = await getReport(license.key, id);
        document.title = `${data.brand} – AI mention report`;
        const audit = auditForDomain(await loadAllResults(), data.domain);
        setSteps(nextSteps(data.domain, audit, data.summary));
        setReport(data);
      } catch (err) {
        setError(ERROR_MESSAGES[err instanceof ApiError ? err.kind : 'server']);
      }
    })();
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!report) return <p className="muted">Loading report…</p>;

  const white = Boolean(branding?.companyName || branding?.logoDataUrl);
  const logo = safeLogoSrc(branding?.logoDataUrl);
  const answers = report.summary.reduce((n, s) => n + s.answersOk, 0);
  const date = new Date(report.finishedAt ?? report.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <main className="page">
      <header className="head">
        <div className="who">
          {logo && <img src={logo} alt="" className="logo" />}
          <span className="company">{white ? branding?.companyName : 'AI Seen Score'}</span>
        </div>
        <button type="button" className="print-btn" onClick={() => window.print()}>Print / Save as PDF</button>
      </header>

      <h1>AI mention report: {report.brand}</h1>
      <p className="muted">
        {report.domain} · {report.category} · {date}
      </p>
      <p>
        Based on {answers} answer{answers === 1 ? '' : 's'} from {report.engines.length} AI answer engine{report.engines.length === 1 ? '' : 's'}, asked with web search on the date above.
      </p>

      {report.summary.map((s) => {
        const failed = s.answersTotal - s.answersOk;
        const { listed, onceCount } = splitByMentions(
          mergeBrands(s.competitors, { brand: report.brand, domain: report.domain, typedCompetitors: report.competitors ?? [] }),
        );
        const excerpt = pickExcerpt(report.answers ?? [], s.questionIndex, report.engines);
        return (
          <section key={s.questionIndex} className="q">
            <h2>{s.question}</h2>
            <p className="main">Mentioned in {s.mentionedCount} of {s.answersOk} answers</p>
            {s.mentionedCount > 0 && <p>{s.bestPosition ? `Best position in a list: #${s.bestPosition}` : 'Not placed in a ranked list'}</p>}
            {(listed.length > 0 || onceCount > 0) && (
              <p>
                Other names mentioned:{' '}
                {listed.map((c, i) => (
                  <span key={c.name}>
                    {i > 0 && ', '}
                    {c.name} ({c.count})
                    {c.variants.length > 0 && <small className="variants"> incl. {c.variants.join(', ')}</small>}
                  </span>
                ))}
                {onceCount > 0 && <span className="once">{listed.length > 0 ? ' ' : ''}+{onceCount} mentioned once</span>}
              </p>
            )}
            {s.topCitedDomains.length > 0 && <p>Sources the engines looked at: {s.topCitedDomains.map((d) => d.domain).join(', ')}</p>}
            {excerpt && (
              <blockquote className="excerpt">
                {excerpt.text}
                <cite>Excerpt of one answer ({excerpt.engine})</cite>
              </blockquote>
            )}
            {s.needsReviewCount > 0 && <p className="note">{s.needsReviewCount} answer{s.needsReviewCount === 1 ? '' : 's'} could not be fully checked automatically.</p>}
            {failed > 0 && <p className="note">{failed} answer{failed === 1 ? '' : 's'} failed and {failed === 1 ? 'is' : 'are'} not counted.</p>}
          </section>
        );
      })}

      {steps && (
        <section className="next">
          <h2>What to do next</h2>
          <p className="muted">Low-risk housekeeping to consider. None of this is a promise about how AI engines will answer.</p>
          {steps.audit ? (
            <>
              <p>
                Free site audit score for {report.domain}: <strong>{steps.audit.score}/100</strong>
                <span className="muted"> (run {new Date(steps.audit.auditedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })})</span>
              </p>
              {steps.audit.fixes.length > 0 && (
                <ul>
                  {steps.audit.fixes.map((f) => (
                    <li key={f.title}><strong>{f.title}.</strong> {f.text}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="note no-print">{steps.auditHint}</p>
          )}
          <ul>
            {steps.suggestions.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      )}

      <footer className="foot">
        This report shows what AI answer engines said at the time they were asked. Answers change over time. It is not a ranking and does not predict future results. Excerpts are quoted from AI answers and are not statements by us.
        {!white && ' Generated by AI Seen Score (aiseenscore.com).'}
      </footer>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Report />
  </React.StrictMode>,
);
