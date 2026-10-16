import { browser } from 'wxt/browser';
import { useCallback, useEffect, useState } from 'react';
import { buildAuditResult } from '../../src/audit/audit';
import { isAuditableUrl, runCollect, UNSUPPORTED_PAGE_MESSAGE } from '../../src/audit/collect';
import type { AuditResult, CheckResult, CheckStatus, CollectedData } from '../../src/audit/types';
import { formatAgo } from '../../src/audit/verdict';
import { loadFreshResult, saveResult } from '../../src/storage';
import { CheckGroup } from './components/CheckGroup';
import { ScoreSummary } from './components/ScoreSummary';

const GROUPS: { status: CheckStatus; title: string }[] = [
  { status: 'fail', title: 'Fix first' },
  { status: 'warn', title: 'Worth a look' },
  { status: 'pass', title: 'Looks good' },
  { status: 'info', title: 'For your information' },
];

// Developer helper: always on in `npm run dev`, otherwise only with ?debug=1.
const DEBUG = import.meta.env.DEV || new URLSearchParams(location.search).get('debug') === '1';

function hostOf(url: string | undefined): string {
  try {
    return url ? new URL(url).hostname : '';
  } catch {
    return '';
  }
}

export default function App() {
  const [tabUrl, setTabUrl] = useState<string | undefined>();
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [message, setMessage] = useState('');
  const [rawData, setRawData] = useState<CollectedData | null>(null);
  const [rawCopied, setRawCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        setTabUrl(tab?.url);
        if (!isAuditableUrl(tab?.url)) {
          setMessage(UNSUPPORTED_PAGE_MESSAGE);
        } else {
          setResult(await loadFreshResult(new URL(tab!.url!).origin));
        }
      } catch {
        setMessage(UNSUPPORTED_PAGE_MESSAGE);
      }
      setReady(true);
    })();
  }, []);

  const run = useCallback(async () => {
    setRunning(true);
    setMessage('');
    const outcome = await runCollect();
    if (outcome.ok) {
      setRawData(outcome.data);
      const audit = buildAuditResult(outcome.data);
      setResult(audit);
      await saveResult(audit);
    } else {
      setResult(null);
      setMessage(outcome.message);
    }
    setRunning(false);
  }, []);

  async function copyRaw() {
    if (!rawData) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(rawData, null, 2));
      setRawCopied(true);
      setTimeout(() => setRawCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  const canRun = isAuditableUrl(tabUrl);
  const host = hostOf(result?.url ?? tabUrl);
  const byStatus = (s: CheckStatus): CheckResult[] => result?.results.filter((r) => r.status === s) ?? [];

  return (
    <main className="popup" aria-busy={running}>
      <header className="header">
        <img src="/icon/48.png" alt="" width={28} height={28} />
        <div>
          <h1>AI Seen Score</h1>
          {host && <p className="host">{host}</p>}
        </div>
      </header>

      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}

      {ready && !result && canRun && (
        <>
          <button type="button" className="primary" onClick={run} disabled={running}>
            {running ? 'Checking…' : 'Run audit'}
          </button>
          {running ? (
            <div className="progress" role="progressbar" aria-label="Checking this page">
              <div className="progress-bar" />
            </div>
          ) : (
            <p className="hint">Checks how readable this page is for AI crawlers. Runs in your browser; nothing is sent to us.</p>
          )}
        </>
      )}

      {result && (
        <>
          <ScoreSummary score={result.score} />
          <p className="audited">
            Audited {formatAgo(result.auditedAt)}
            {tabUrl && result.url !== tabUrl ? ` · ${new URL(result.url).pathname}` : ''}
          </p>
          {GROUPS.map((g) => (
            <CheckGroup key={g.status} title={g.title} checks={byStatus(g.status)} />
          ))}
          {DEBUG && (
            <button type="button" className="secondary debug" onClick={copyRaw} disabled={!rawData}>
              {rawCopied ? 'Copied' : rawData ? 'Copy raw data' : 'Copy raw data (re-run first)'}
            </button>
          )}
          <footer className="footer">
            <button type="button" className="secondary" onClick={run} disabled={running}>
              {running ? 'Checking…' : 'Re-run'}
            </button>
            <a href="https://aiseenscore.com" target="_blank" rel="noopener noreferrer">
              Want to know if AI answers mention your brand? Coming soon at aiseenscore.com
            </a>
          </footer>
        </>
      )}
    </main>
  );
}
