import { useEffect, useId, useState } from 'react';
import type { CheckResult } from '../../../src/audit/types';
import { StatusIcon } from './StatusIcon';

export function CheckRow({ check }: { check: CheckResult }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const panelId = useId();
  const expandable = Boolean(check.details?.length || check.fix);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function copyFix() {
    if (!check.fix) return;
    try {
      await navigator.clipboard.writeText(check.fix);
      setCopied(true);
    } catch {
      /* clipboard unavailable */
    }
  }

  const head = (
    <>
      <StatusIcon status={check.status} />
      <span className="row-text">
        <span className="row-title">{check.title}</span>
        <span className="row-summary">{check.summary}</span>
      </span>
      {expandable && (
        <svg className={`chevron${open ? ' open' : ''}`} viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
          <path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );

  return (
    <li className="row">
      {expandable ? (
        <button type="button" className="row-head" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
          {head}
        </button>
      ) : (
        <div className="row-head static">{head}</div>
      )}
      {expandable && open && (
        <div className="row-panel" id={panelId}>
          {check.details && (
            <ul className="details">
              {check.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
          {check.fix && (
            <div className="fix">
              <p>
                <strong>Suggested fix:</strong> {check.fix}
              </p>
              <button type="button" className="secondary" onClick={copyFix} aria-label={`Copy fix for ${check.title}`}>
                {copied ? 'Copied' : 'Copy fix'}
              </button>
              <span className="sr-only" role="status" aria-live="polite">
                {copied ? 'Fix copied to clipboard' : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
