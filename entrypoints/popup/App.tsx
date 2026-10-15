import { useState } from 'react';
import { runCollect } from '../../src/audit/collect';

export default function App() {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [json, setJson] = useState('');

  async function onRun() {
    setRunning(true);
    setMessage('');
    setJson('');
    const outcome = await runCollect();
    if (outcome.ok) setJson(JSON.stringify(outcome.data, null, 2));
    else setMessage(outcome.message);
    setRunning(false);
  }

  return (
    <main className="popup">
      <header className="header">
        <img src="/icon/48.png" alt="" width={28} height={28} />
        <h1>AI Seen Score</h1>
      </header>
      <button type="button" className="primary" onClick={onRun} disabled={running}>
        {running ? 'Checking…' : 'Run audit'}
      </button>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {json && <pre className="raw">{json}</pre>}
    </main>
  );
}
