// Build-time API base. Override with WXT_API_BASE (e.g. in .env.local, which is not committed).
const fromEnv = (import.meta.env as Record<string, string | undefined>).WXT_API_BASE;

export const API_BASE: string = (
  fromEnv || (import.meta.env.DEV ? 'http://localhost:8787' : 'https://api.aiseenscore.com')
).replace(/\/$/, '');

export const BUY_URL = 'https://aiseenscore.com/#pricing';
export const MAX_QUESTIONS = 5;
export const MIN_QUESTIONS = 3;
export const MAX_COMPETITORS = 5;
export const RETENTION_DAYS = 30;
