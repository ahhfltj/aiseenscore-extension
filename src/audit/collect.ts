import { browser } from 'wxt/browser';
import type { CollectedData } from './types';

export const UNSUPPORTED_PAGE_MESSAGE = 'Open a public website, then run the audit again.';

const RESTRICTED_HOSTS = new Set(['chromewebstore.google.com']);

/** True only for public http(s) pages we are allowed to inject into. */
export function isAuditableUrl(url: string | undefined): boolean {
  if (!url) return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  if (RESTRICTED_HOSTS.has(u.hostname)) return false;
  if (u.hostname === 'chrome.google.com' && u.pathname.startsWith('/webstore')) return false;
  return true;
}

/**
 * Injected into the page by browser.scripting.executeScript, so it is serialized:
 * it must stay self-contained (no imports or outer variables used inside).
 */
export async function collectPageData(): Promise<CollectedData> {
  const TIMEOUT_MS = 5000;
  const FILE_CAP = 100 * 1024;
  const JSONLD_CAP = 200 * 1024;

  async function request(path: string, method = 'GET') {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(path, {
        method,
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'follow',
        signal: ctrl.signal,
      });
      const text = method === 'HEAD' ? '' : await res.text();
      return { res, text, error: undefined as string | undefined };
    } catch (e) {
      return { res: null, text: '', error: e instanceof Error ? e.message : String(e) };
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchFile(path: string) {
    const r = await request(path);
    return {
      status: r.res ? r.res.status : 0,
      contentType: r.res?.headers.get('content-type') ?? '',
      text: r.text.slice(0, FILE_CAP),
      ...(r.error ? { error: r.error } : {}),
    };
  }

  async function fetchSitemap() {
    let r = await request('/sitemap.xml', 'HEAD');
    // Some servers reject HEAD; fall back to GET.
    if (!r.res || r.res.status === 405 || r.res.status === 501) r = await request('/sitemap.xml');
    return {
      status: r.res ? r.res.status : 0,
      contentType: r.res?.headers.get('content-type') ?? '',
      ...(r.error ? { error: r.error } : {}),
    };
  }

  async function fetchRawHtml() {
    const r = await request(location.href);
    const html = r.text;
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return {
      status: r.res ? r.res.status : 0,
      xRobotsTag: r.res?.headers.get('x-robots-tag') ?? '',
      strippedTextLength: stripped.length,
      hasH1: /<h1[\s>]/i.test(html),
      ...(r.error ? { error: r.error } : {}),
    };
  }

  const meta = (name: string) =>
    document.querySelector<HTMLMetaElement>(`meta[name="${name}" i]`)?.content.trim() ?? '';

  const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'))
    .slice(0, 100)
    .map((h) => ({
      level: Number(h.tagName[1]),
      text: (h.textContent ?? '').replace(/\s+/g, ' ').trim(),
    }));

  const jsonLd: string[] = [];
  let jsonLdSize = 0;
  for (const s of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
    const t = s.textContent ?? '';
    if (jsonLdSize + t.length > JSONLD_CAP) break;
    jsonLdSize += t.length;
    jsonLd.push(t);
  }

  const [rawHtml, robotsTxt, llmsTxt, llmsFullTxt, sitemap] = await Promise.all([
    fetchRawHtml(),
    fetchFile('/robots.txt'),
    fetchFile('/llms.txt'),
    fetchFile('/llms-full.txt'),
    fetchSitemap(),
  ]);

  return {
    url: location.href,
    origin: location.origin,
    lang: document.documentElement.getAttribute('lang')?.trim() ?? '',
    title: document.title.trim(),
    metaDescription: meta('description'),
    metaRobots: meta('robots'),
    canonical:
      document.querySelector<HTMLLinkElement>('link[rel~="canonical" i]')?.getAttribute('href')?.trim() ?? '',
    headings,
    jsonLd,
    renderedTextLength: document.body?.innerText.length ?? 0,
    rawHtml,
    robotsTxt,
    llmsTxt,
    llmsFullTxt,
    sitemap,
  };
}

export type CollectOutcome =
  | { ok: true; data: CollectedData }
  | { ok: false; message: string };

/** Runs the collection on the active tab, or explains why it can't. */
export async function runCollect(): Promise<CollectOutcome> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !isAuditableUrl(tab.url)) {
    return { ok: false, message: UNSUPPORTED_PAGE_MESSAGE };
  }
  try {
    const [injection] = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: collectPageData,
    });
    if (!injection?.result) return { ok: false, message: UNSUPPORTED_PAGE_MESSAGE };
    return { ok: true, data: injection.result as CollectedData };
  } catch {
    // Injection is refused on pages Chrome protects (e.g. error pages).
    return { ok: false, message: UNSUPPORTED_PAGE_MESSAGE };
  }
}
