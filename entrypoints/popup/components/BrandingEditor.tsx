import { useEffect, useState } from 'react';
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
  }

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3 className="view-title">White-label PDF</h3>
      <p className="hint" style={{ marginTop: 0 }}>Your company name and logo replace ours on the PDF. They are stored only in this browser.</p>
      <label htmlFor="brand-name" className="label">Company name</label>
      <input id="brand-name" className="input" maxLength={MAX_COMPANY_NAME} value={name} onChange={(e) => setName(e.target.value)} />
      <label htmlFor="brand-logo" className="label">Logo (PNG, JPEG or WebP, up to 200 KB)</label>
      <input id="brand-logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => void pickLogo(e.target.files?.[0])} />
      {logo && <img src={logo} alt="Logo preview" style={{ display: 'block', maxHeight: 40, maxWidth: 160, marginTop: 8 }} />}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="button-row">
        <button type="button" className="primary" onClick={() => void save()}>{saved ? 'Saved' : 'Save branding'}</button>
        <button type="button" className="secondary" onClick={() => void clear()}>Clear</button>
      </div>
    </div>
  );
}
