import type { CheckResult, FetchedFile } from '../types';

/** The request failed or the server errored, so we know nothing about the file. */
export function loadFailed(file: { status: number }): boolean {
  return file.status === 0 || file.status >= 500;
}

/** Many sites answer missing files with their HTML page and status 200. */
export function looksLikeHtml(file: FetchedFile): boolean {
  if (/html/i.test(file.contentType)) return true;
  return /^\s*<(!doctype|html)/i.test(file.text);
}

export function couldNotLoad(id: string, title: string, weight: number, what: string): CheckResult {
  return {
    id,
    title,
    status: 'info',
    summary: `Couldn't load this file (${what}), so this check was skipped.`,
    weight,
  };
}
