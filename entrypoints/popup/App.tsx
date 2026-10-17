import { useEffect, useState } from 'react';
import { loadTab, saveTab, type PopupTab } from '../../src/paid/draft';
import AuditView from './AuditView';
import { ReportTab } from './components/ReportTab';
import { Settings } from './components/Settings';

export default function App() {
  const [tab, setTabState] = useState<PopupTab>('audit');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Reopen on the tab the user was last using.
  useEffect(() => {
    void loadTab().then(setTabState);
  }, []);
  const setTab = (t: PopupTab) => {
    setTabState(t);
    void saveTab(t);
  };

  return (
    <main className="popup">
      <header className="header">
        <img src="/icon/48.png" alt="" width={28} height={28} />
        <h1>AI Seen Score</h1>
        <button type="button" className="secondary icon-btn gear" aria-label="Settings" aria-pressed={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </button>
      </header>

      {settingsOpen ? (
        <Settings onClose={() => setSettingsOpen(false)} />
      ) : (
        <>
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'audit'} className={tab === 'audit' ? 'tab active' : 'tab'} onClick={() => setTab('audit')}>
              Audit
            </button>
            <button type="button" role="tab" aria-selected={tab === 'report'} className={tab === 'report' ? 'tab active' : 'tab'} onClick={() => setTab('report')}>
              AI mention report
            </button>
          </div>
          {tab === 'audit' ? <AuditView /> : <ReportTab openSettings={() => setSettingsOpen(true)} />}
        </>
      )}
    </main>
  );
}
