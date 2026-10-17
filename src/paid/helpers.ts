import { MAX_COMPETITORS, MAX_QUESTIONS, MIN_QUESTIONS, RETENTION_DAYS } from './config';
import type { RecentReport, ReportInput } from './types';

/** Shows only the last 4 characters. */
export function maskKey(key: string): string {
  const k = key.trim();
  return k.length <= 4 ? '••••' : `••••••••${k.slice(-4)}`;
}

/** Three editable starting points; generic wording, no product names. */
export function exampleQuestions(category: string): string[] {
  const c = category.trim() || 'product';
  return [
    `What's the best ${c} for small businesses?`,
    `Which ${c} would you recommend, and why?`,
    `What are the top ${c} options and how do they compare?`,
  ];
}

export function parseCompetitors(text: string): string[] {
  return [...new Set(text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean))].slice(0, MAX_COMPETITORS);
}

export type FormErrors = Partial<Record<'brand' | 'domain' | 'category' | 'questions' | 'competitors', string>>;

export function validateInput(input: ReportInput): FormErrors {
  const errors: FormErrors = {};
  if (!input.brand.trim()) errors.brand = 'Enter your brand name.';
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(normalizeWebsite(input.domain))) errors.domain = 'Enter your website, like example.com.';
  if (!input.category.trim()) errors.category = 'Enter a category, like "invoicing software".';
  const qs = input.questions.map((q) => q.trim()).filter(Boolean);
  if (qs.length < MIN_QUESTIONS || qs.length > MAX_QUESTIONS) errors.questions = `Add ${MIN_QUESTIONS} to ${MAX_QUESTIONS} questions.`;
  else if (qs.some((q) => q.length > 200)) errors.questions = 'Keep each question under 200 characters.';
  if (input.competitors.length > MAX_COMPETITORS) errors.competitors = `Up to ${MAX_COMPETITORS} competitors.`;
  return errors;
}

/** "https://www.Example.com/path" -> "example.com" */
export function normalizeWebsite(value: string): string {
  return value.trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0] ?? '';
}

export function cleanInput(input: ReportInput): ReportInput {
  return {
    brand: input.brand.trim(),
    domain: normalizeWebsite(input.domain),
    category: input.category.trim(),
    competitors: input.competitors.map((c) => c.trim()).filter(Boolean).slice(0, MAX_COMPETITORS),
    questions: input.questions.map((q) => q.trim()).filter(Boolean),
  };
}

const DAY = 86_400_000;

/** Drops reports past the 30-day retention (the server deletes them too) and caps the list. */
export function pruneRecent(list: RecentReport[], now = Date.now(), max = 20): RecentReport[] {
  return list
    .filter((r) => now - r.createdAt < RETENTION_DAYS * DAY)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, max);
}

/** True when one "competitor" looks like several names typed without commas (e.g. "Wave FreshBooks Zoho Xero"). */
export function competitorsLookMerged(text: string): boolean {
  return text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .some((entry) => entry.split(/\s+/).filter(Boolean).length >= 4 || entry.length > 40);
}

const GENERIC_CATEGORIES = new Set([
  'software', 'app', 'apps', 'tool', 'tools', 'service', 'services', 'platform', 'platforms',
  'business', 'product', 'products', 'company', 'companies', 'website', 'solution', 'solutions',
]);

/** One broad word makes the engines ask a clarifying question instead of recommending anything. */
export function isTooGenericCategory(category: string): boolean {
  return GENERIC_CATEGORIES.has(category.trim().toLowerCase());
}
