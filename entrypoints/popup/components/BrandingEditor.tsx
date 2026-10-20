import { useEffect, useRef, useState } from 'react';
import { cleanCompanyName, logoProblem, MAX_COMPANY_NAME, safeLogoSrc } from '../../../src/paid/helpers';
import { getBranding, removeBranding, saveBranding } from '../../../src/paid/store';

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

/** White-label branding for the PDF. Saved only in this browser. */
export function BrandingEditor() {
  const [name, setName] = useState('');
  const [logo, setLogo] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getBranding().then((b) => {
      if (!b) return;
      setName(b.companyName);
      setLogo(safeLogoSrc(b.logoDataUrl));
    });
  }, []);

  async function pickLogo(file: File | undefined) {
    setError('');
    if (!file) return;
    setFileName(file.name);
    const problem = logoProblem(file);
    if (problem) return setError(problem);
    try {
      setLogo(await readAsDataUrl(file));
    } catch {
      setError('Could not read that file.');
    }
  }

  async function save() {
    setError('');
    const companyName = cleanCompanyName(name);
    if (!companyName && !logo) return setError('Add a company name or a logo.');
    await saveBranding({ companyName, ...(logo ? { logoDataUrl: logo } : {}) });
    setName(companyName);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function clear() {
    await removeBranding();
    setName('');
    setLogo(undefined);
    setFileName('');
    if (fileInput.current) fileInput.current.value = '';
  }

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3 className="view-title">White-label PDF</h3>
      <p className="hint" style={{ marginTop: 0 }}>Your company name and logo replace ours on the PDF. They are stored only in this browser.</p>
      <label htmlFor="brand-name" className="label">Company name</label>
      <input id="brand-name" className="input" maxLength={MAX_COMPANY_NAME} value={name} onChange={(e) => setName(e.target.value)} />
      <label htmlFor="brand-logo" className="label">Logo (PNG, JPEG or WebP, up to 200 KB)</label>
      {/* The native file control is labelled in the browser's language; this keeps the UI in English. */}
      <input
        ref={fileInput}
        id="brand-logo"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => void pickLogo(e.target.files?.[0])}
      />
      <div className="button-row" style={{ marginTop: 0, alignItems: 'center' }}>
        <button type="button" className="secondary" onClick={() => fileInput.current?.click()}>Choose logo</button>
        <span className="hint" style={{ margin: 0 }}>{fileName || (logo ? 'Saved logo' : 'No file chosen')}</span>
      </div>
      {logo && <img src={logo} alt="Logo preview" style={{ display: 'block', maxHeight: 40, maxWidth: 160, marginTop: 8 }} />}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="button-row">
        <button type="button" className="primary" onClick={() => void save()}>{saved ? 'Saved' : 'Save branding'}</button>
        <button type="button" className="secondary" onClick={() => void clear()}>Clear</button>
      </div>
    </div>
  );
}
