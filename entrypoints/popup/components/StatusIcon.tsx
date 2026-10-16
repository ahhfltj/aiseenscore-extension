import type { CheckStatus } from '../../../src/audit/types';

const LABEL: Record<CheckStatus, string> = { fail: 'Needs a fix', warn: 'Worth a look', pass: 'Looks good', info: 'For your information' };

// Distinct shapes, so status never relies on color alone.
export function StatusIcon({ status }: { status: CheckStatus }) {
  return (
    <>
      <svg className={`status-icon ${status}`} viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">
        {status === 'fail' && (
          <>
            <circle cx="10" cy="10" r="9" fill="currentColor" />
            <path d="M6.5 6.5l7 7M13.5 6.5l-7 7" stroke="var(--icon-fg)" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {status === 'warn' && (
          <>
            <path d="M10 1.5l9 16H1z" fill="currentColor" strokeLinejoin="round" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 7.5v4.5M10 14.2v.1" stroke="var(--icon-fg)" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {status === 'pass' && (
          <>
            <circle cx="10" cy="10" r="9" fill="currentColor" />
            <path d="M5.8 10.3l2.9 2.9 5.5-5.8" fill="none" stroke="var(--icon-fg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {status === 'info' && (
          <>
            <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M10 9v5M10 6.2v.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </svg>
      <span className="sr-only">{LABEL[status]}: </span>
    </>
  );
}
