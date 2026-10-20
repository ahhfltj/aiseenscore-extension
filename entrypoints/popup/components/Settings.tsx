import { useState } from 'react';
import { ApiError, checkLicense, ERROR_MESSAGES } from '../../../src/paid/api';
import { BUY_URL } from '../../../src/paid/config';
import { maskKey, withoutCredits } from '../../../src/paid/helpers';
import { removeLicense, saveLicense } from '../../../src/paid/store';
import { useStore } from '../../../src/paid/useStore';

export function Settings({ onClose }: { onClose: () => void }) {
  const { license, loaded, reload } = useStore();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function verify(key: string) {
    setBusy(true);
    setError('');
    try {
      const res = await checkLicense(key);
      if (!res.valid) {
        // Refreshing the key that is already saved: zero its credits locally too.
        if (license && license.key === key) {
          await saveLicense(withoutCredits(license, Date.now()));
          await reload();
        }
        setError(res.status === 'revoked' ? 'This key is no longer active.' : "We don't recognise that key. Check it and try again.");
        return;
      }
      await saveLicense({ key, creditsLeft: res.creditsLeft ?? 0, creditsTotal: res.creditsTotal ?? 0, checkedAt: Date.now() });
      setValue('');
      await reload();
    } catch (err) {
      setError(ERROR_MESSAGES[err instanceof ApiError ? err.kind : 'server']);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="view" aria-label="Settings">
      <h2 className="view-title">License key</h2>

      {loaded && license ? (
        <div className="card">
          <p className="key-mask">{maskKey(license.key)}</p>
          <p className="credits">
            {license.creditsLeft} of {license.creditsTotal} report credits left
          </p>
          <div className="button-row">
            <button type="button" className="secondary" onClick={() => verify(license.key)} disabled={busy}>
              {busy ? 'Checking…' : 'Refresh credits'}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={async () => {
                await removeLicense();
                await reload();
              }}
            >
              Remove key
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) void verify(value.trim());
          }}
        >
          <label htmlFor="license-key" className="label">
            Paste the key from your purchase email
          </label>
          <input
            id="license-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input"
          />
          <button type="submit" className="primary" disabled={busy || !value.trim()}>
            {busy ? 'Checking…' : 'Activate'}
          </button>
        </form>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <p className="hint">
        <a href={BUY_URL} target="_blank" rel="noopener noreferrer">
          Buy report credits
        </a>
      </p>
      <p className="hint">Your key is stored only in this browser. It is sent to our server to check your credits and run reports.</p>
      <button type="button" className="secondary" onClick={onClose}>
        Back
      </button>
    </section>
  );
}
