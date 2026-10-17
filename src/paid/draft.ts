import { browser } from 'wxt/browser';
import { MAX_COMPETITORS, MAX_QUESTIONS } from './config';

// The popup closes whenever the user clicks outside it, which wipes React state.
// The unsent form is therefore kept in chrome.storage.local (this browser only, never sent anywhere).

export interface ReportDraft {
  brand: string;
  domain: string;
  category: string;
  competitors: string;
  questions: string[];
  /** true while the questions are still the auto-generated examples */
  autoQuestions: boolean;
}

export const emptyDraft = (): ReportDraft => ({
  brand: '',
  domain: '',
  category: '',
  competitors: '',
  questions: ['', '', ''],
  autoQuestions: true,
});

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

/** Storage can hold anything (older versions, manual edits): accept only a well-formed draft. */
export function sanitizeDraft(raw: unknown): ReportDraft {
  if (!raw || typeof raw !== 'object') return emptyDraft();
  const r = raw as Record<string, unknown>;
  const questions = Array.isArray(r.questions) ? r.questions.map((q) => str(q, 200)).slice(0, MAX_QUESTIONS) : [];
  while (questions.length < 3) questions.push('');
  return {
    brand: str(r.brand, 100),
    domain: str(r.domain, 253),
    category: str(r.category, 100),
    competitors: str(r.competitors, MAX_COMPETITORS * 101),
    questions,
    autoQuestions: r.autoQuestions !== false,
  };
}

export const isEmptyDraft = (d: ReportDraft) =>
  !d.brand && !d.domain && !d.category && !d.competitors && d.questions.every((q) => !q);

const KEY = 'reportDraft';

export async function loadDraft(): Promise<ReportDraft | null> {
  try {
    const raw = (await browser.storage.local.get(KEY))[KEY];
    return raw ? sanitizeDraft(raw) : null;
  } catch {
    return null;
  }
}

export async function saveDraft(draft: ReportDraft): Promise<void> {
  try {
    await browser.storage.local.set({ [KEY]: draft });
  } catch {
    /* drafts are a convenience */
  }
}

export async function clearDraft(): Promise<void> {
  try {
    await browser.storage.local.remove(KEY);
  } catch {
    /* ignore */
  }
}

const TAB_KEY = 'popupTab';
export type PopupTab = 'audit' | 'report';

export async function loadTab(): Promise<PopupTab> {
  try {
    return (await browser.storage.local.get(TAB_KEY))[TAB_KEY] === 'report' ? 'report' : 'audit';
  } catch {
    return 'audit';
  }
}

export async function saveTab(tab: PopupTab): Promise<void> {
  try {
    await browser.storage.local.set({ [TAB_KEY]: tab });
  } catch {
    /* ignore */
  }
}
