import { describe, expect, it } from 'vitest';
import { emptyDraft, isEmptyDraft, sanitizeDraft } from '../src/paid/draft';

describe('sanitizeDraft', () => {
  it('falls back to an empty draft for junk', () => {
    expect(sanitizeDraft(null)).toEqual(emptyDraft());
    expect(sanitizeDraft('x')).toEqual(emptyDraft());
    expect(sanitizeDraft(42)).toEqual(emptyDraft());
  });
  it('keeps a well-formed draft', () => {
    const d = { brand: 'Acme', domain: 'acme.io', category: 'invoicing', competitors: 'Wave, Zoho', questions: ['a', 'b', 'c', 'd'], autoQuestions: false };
    expect(sanitizeDraft(d)).toEqual(d);
  });
  it('drops wrong types, pads to 3 questions and caps at 5', () => {
    const d = sanitizeDraft({ brand: 5, questions: ['a', 7, 'c', 'd', 'e', 'f', 'g'] });
    expect(d.brand).toBe('');
    expect(d.questions).toEqual(['a', '', 'c', 'd', 'e']);
    expect(sanitizeDraft({ questions: ['only'] }).questions).toHaveLength(3);
  });
  it('truncates over-long values', () => {
    expect(sanitizeDraft({ questions: ['x'.repeat(500), '', ''] }).questions[0]).toHaveLength(200);
  });
  it('detects an empty draft', () => {
    expect(isEmptyDraft(emptyDraft())).toBe(true);
    expect(isEmptyDraft({ ...emptyDraft(), brand: 'A' })).toBe(false);
  });
});
