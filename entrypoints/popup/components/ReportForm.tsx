import { browser } from 'wxt/browser';
import { useEffect, useState } from 'react';
import { isAuditableUrl } from '../../../src/audit/collect';
import { MAX_QUESTIONS, MIN_QUESTIONS } from '../../../src/paid/config';
import { clearDraft, emptyDraft, isEmptyDraft, loadDraft, saveDraft } from '../../../src/paid/draft';
import { cleanInput, competitorsLookMerged, exampleQuestions, isTooGenericCategory, parseCompetitors, validateInput, type FormErrors } from '../../../src/paid/helpers';
import type { ReportInput } from '../../../src/paid/types';

export function ReportForm({ creditsLeft, onStart, disabled }: { creditsLeft: number; onStart: (input: ReportInput) => void; disabled: boolean }) {
  const [brand, setBrand] = useState('');
  const [domain, setDomain] = useState('');
  const [category, setCategory] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [questions, setQuestions] = useState<string[]>(emptyDraft().questions);
  const [autoQuestions, setAutoQuestions] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [restored, setRestored] = useState(false);

  // Restore an unsent draft (the popup closes when the user clicks outside it), then prefill the website from the tab.
  useEffect(() => {
    (async () => {
      const draft = await loadDraft();
      if (draft) {
        setBrand(draft.brand);
        setDomain(draft.domain);
        setCategory(draft.category);
        setCompetitors(draft.competitors);
        setQuestions(draft.questions);
        setAutoQuestions(draft.autoQuestions);
      }
      if (!draft?.domain) {
        try {
          const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
          if (isAuditableUrl(tab?.url)) setDomain(new URL(tab!.url!).hostname.replace(/^www\./, ''));
        } catch {
          /* optional */
        }
      }
      setRestored(true);
    })();
  }, []);

  // Save on every change, so nothing is lost if the popup closes mid-typing.
  useEffect(() => {
    if (!restored) return;
    const draft = { brand, domain, category, competitors, questions, autoQuestions };
    void (isEmptyDraft(draft) ? clearDraft() : saveDraft(draft));
  }, [restored, brand, domain, category, competitors, questions, autoQuestions]);

  function fillExamples() {
    if (autoQuestions && category.trim()) setQuestions(exampleQuestions(category));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = cleanInput({ brand, domain, category, competitors: parseCompetitors(competitors), questions });
    const found = validateInput(input);
    setErrors(found);
    if (Object.keys(found).length === 0) {
      onStart(input);
      void clearDraft();
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <p className="credits">{creditsLeft} report credit{creditsLeft === 1 ? '' : 's'} left</p>

      <label htmlFor="brand" className="label">Brand name</label>
      <input id="brand" className="input" value={brand} onChange={(e) => setBrand(e.target.value)} aria-invalid={!!errors.brand} />
      {errors.brand && <p className="error">{errors.brand}</p>}

      <label htmlFor="domain" className="label">Website</label>
      <input id="domain" className="input" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" aria-invalid={!!errors.domain} />
      {errors.domain && <p className="error">{errors.domain}</p>}

      <label htmlFor="category" className="label">Category</label>
      <input
        id="category"
        className="input"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        onBlur={fillExamples}
        placeholder="e.g. invoicing software"
        aria-invalid={!!errors.category}
      />
      {errors.category && <p className="error">{errors.category}</p>}
      {!errors.category && isTooGenericCategory(category) && (
        <p className="warn" role="note">
          Be more specific, for example "invoicing software for freelancers". Very broad categories often get a question back instead of recommendations, which uses a credit without giving useful results.
        </p>
      )}

      <label htmlFor="competitors" className="label">
        Competitors <span className="count">(optional, up to 5, separated by commas)</span>
      </label>
      <input id="competitors" className="input" value={competitors} onChange={(e) => setCompetitors(e.target.value)} />
      {errors.competitors && <p className="error">{errors.competitors}</p>}
      {competitorsLookMerged(competitors) && (
        <p className="warn" role="note">
          This looks like several names in one. Separate competitors with commas, like "Wave, FreshBooks, Xero".
        </p>
      )}

      <fieldset className="questions">
        <legend className="label">Questions people might ask ({MIN_QUESTIONS}–{MAX_QUESTIONS})</legend>
        {questions.map((q, i) => (
          <div className="question-row" key={i}>
            <input
              className="input"
              aria-label={`Question ${i + 1}`}
              value={q}
              maxLength={200}
              onChange={(e) => {
                setAutoQuestions(false);
                setQuestions(questions.map((x, j) => (j === i ? e.target.value : x)));
              }}
            />
            {questions.length > MIN_QUESTIONS && (
              <button type="button" className="secondary icon-btn" aria-label={`Remove question ${i + 1}`} onClick={() => setQuestions(questions.filter((_, j) => j !== i))}>
                ×
              </button>
            )}
          </div>
        ))}
        {questions.length < MAX_QUESTIONS && (
          <button type="button" className="secondary" onClick={() => setQuestions([...questions, ''])}>
            Add a question
          </button>
        )}
        {errors.questions && <p className="error">{errors.questions}</p>}
      </fieldset>

      <button type="submit" className="primary" disabled={disabled || creditsLeft < 1}>
        Run report
      </button>
      <p className="hint">
        Uses 1 credit. We send your brand, website, category and questions to our server to ask AI answer engines. Results are kept for 30 days.
      </p>
    </form>
  );
}
