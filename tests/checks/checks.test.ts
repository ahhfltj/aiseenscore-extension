import { describe, expect, it } from 'vitest';
import { checkAiCrawlerAccess } from '../../src/audit/checks/ai-crawler-access';
import { checkAiMetaOptout } from '../../src/audit/checks/ai-meta-optout';
import { checkCanonical } from '../../src/audit/checks/canonical';
import { checkHeadings } from '../../src/audit/checks/headings';
import { checkJsDependency } from '../../src/audit/checks/js-dependency';
import { checkLang } from '../../src/audit/checks/lang';
import { checkLlmsTxt } from '../../src/audit/checks/llms-txt';
import { checkMetaDescription } from '../../src/audit/checks/meta-description';
import { checkSitemap } from '../../src/audit/checks/sitemap';
import { checkStructuredData } from '../../src/audit/checks/structured-data';
import { checkTitle } from '../../src/audit/checks/title';
import { buildAuditResult } from '../../src/audit/audit';
import { file, makeData } from './helpers';

const ld = (o: unknown) => JSON.stringify(o);

describe('ai-crawler-access', () => {
  it('passes when robots.txt is missing', () => {
    const r = checkAiCrawlerAccess(makeData());
    expect(r.status).toBe('pass');
    expect(r.summary).toMatch(/allowed by default/);
  });
  it('treats a 200 HTML response as missing', () => {
    const r = checkAiCrawlerAccess(makeData({ robotsTxt: file(200, '<!doctype html><html>', 'text/html') }));
    expect(r.status).toBe('pass');
  });
  it('passes when nothing is blocked', () => {
    expect(checkAiCrawlerAccess(makeData({ robotsTxt: file(200, 'User-agent: *\nAllow: /') })).status).toBe('pass');
  });
  it('warns when only training crawlers are blocked', () => {
    const r = checkAiCrawlerAccess(makeData({ robotsTxt: file(200, 'User-agent: GPTBot\nDisallow: /') }));
    expect(r.status).toBe('warn');
    expect(r.details?.some((d) => d.startsWith('GPTBot'))).toBe(true);
  });
  it('fails when a search or user-request crawler is blocked', () => {
    const r = checkAiCrawlerAccess(makeData({ robotsTxt: file(200, 'User-agent: OAI-SearchBot\nDisallow: /') }));
    expect(r.status).toBe('fail');
    expect(r.fix).toBeTruthy();
  });
  it('fails when everything is blocked', () => {
    expect(checkAiCrawlerAccess(makeData({ robotsTxt: file(200, 'User-agent: *\nDisallow: /') })).status).toBe('fail');
  });
  it('is info when the file could not be loaded', () => {
    expect(checkAiCrawlerAccess(makeData({ robotsTxt: { status: 0, contentType: '', text: '', error: 'x' } })).status).toBe('info');
  });
});

describe('ai-meta-optout', () => {
  it('passes with no directives', () => expect(checkAiMetaOptout(makeData()).status).toBe('pass'));
  it('warns on noai in meta robots', () => expect(checkAiMetaOptout(makeData({ metaRobots: 'index, noai' })).status).toBe('warn'));
  it('warns on noimageai in the header', () => {
    expect(checkAiMetaOptout(makeData({ rawHtml: { status: 200, xRobotsTag: 'noimageai', strippedTextLength: 1, hasH1: true } })).status).toBe('warn');
  });
  it('fails on noindex', () => expect(checkAiMetaOptout(makeData({ metaRobots: 'NoIndex,follow' })).status).toBe('fail'));
});

describe('llms-txt', () => {
  const good = '# Site\n> Summary\n- [A](https://e.com/a)\n- [B](https://e.com/b)\n- [C](https://e.com/c)\n';
  it('passes with a title and 3 links', () => expect(checkLlmsTxt(makeData({ llmsTxt: file(200, good) })).status).toBe('pass'));
  it('warns on a stub', () => expect(checkLlmsTxt(makeData({ llmsTxt: file(200, '# Site\n') })).status).toBe('warn'));
  it('fails when missing', () => expect(checkLlmsTxt(makeData()).status).toBe('fail'));
  it('fails when a 200 response is really HTML', () => {
    expect(checkLlmsTxt(makeData({ llmsTxt: file(200, '<!DOCTYPE html><html></html>', 'text/html') })).status).toBe('fail');
  });
  it('is info when the request failed', () => {
    expect(checkLlmsTxt(makeData({ llmsTxt: { status: 0, contentType: '', text: '', error: 'x' } })).status).toBe('info');
  });
});

describe('structured-data', () => {
  it('passes with Organization plus Product, including @graph', () => {
    const r = checkStructuredData(makeData({ jsonLd: [ld({ '@graph': [{ '@type': 'Organization' }, { '@type': ['Product', 'Thing'] }] })] }));
    expect(r.status).toBe('pass');
    expect(r.details?.[0]).toContain('Product');
  });
  it('passes with top-level arrays', () => {
    expect(checkStructuredData(makeData({ jsonLd: [ld([{ '@type': 'WebSite' }, { '@type': 'FAQPage' }])] })).status).toBe('pass');
  });
  it('warns with only one basic type', () => {
    expect(checkStructuredData(makeData({ jsonLd: [ld({ '@type': 'Organization' })] })).status).toBe('warn');
  });
  it('ignores invalid blocks but reports them', () => {
    const r = checkStructuredData(makeData({ jsonLd: ['{oops', ld({ '@type': 'Organization' })] }));
    expect(r.status).toBe('warn');
    expect(r.details?.join(' ')).toMatch(/1 JSON-LD block/);
  });
  it('fails with none', () => expect(checkStructuredData(makeData()).status).toBe('fail'));
  it('fails when all blocks are invalid', () => expect(checkStructuredData(makeData({ jsonLd: ['{', 'nope'] })).status).toBe('fail'));
});

describe('title', () => {
  it('passes at a good length', () => expect(checkTitle(makeData()).status).toBe('pass'));
  it('warns when too short', () => expect(checkTitle(makeData({ title: 'Home' })).status).toBe('warn'));
  it('warns when too long', () => expect(checkTitle(makeData({ title: 'x'.repeat(80) })).status).toBe('warn'));
  it('fails when missing', () => expect(checkTitle(makeData({ title: '' })).status).toBe('fail'));
});

describe('meta-description', () => {
  it('passes at a good length', () => expect(checkMetaDescription(makeData()).status).toBe('pass'));
  it('warns when short', () => expect(checkMetaDescription(makeData({ metaDescription: 'Too short.' })).status).toBe('warn'));
  it('warns when long', () => expect(checkMetaDescription(makeData({ metaDescription: 'x'.repeat(200) })).status).toBe('warn'));
  it('fails when missing', () => expect(checkMetaDescription(makeData({ metaDescription: '' })).status).toBe('fail'));
});

describe('headings', () => {
  it('passes with one h1 and no skips', () => expect(checkHeadings(makeData()).status).toBe('pass'));
  it('warns on multiple h1', () => {
    expect(checkHeadings(makeData({ headings: [{ level: 1, text: 'a' }, { level: 1, text: 'b' }] })).status).toBe('warn');
  });
  it('warns on skipped levels', () => {
    expect(checkHeadings(makeData({ headings: [{ level: 1, text: 'a' }, { level: 3, text: 'b' }] })).status).toBe('warn');
  });
  it('ignores skips after the first 30 headings', () => {
    const hs = [{ level: 1, text: 'a' }, ...Array.from({ length: 29 }, () => ({ level: 2, text: 'b' })), { level: 5, text: 'late' }];
    expect(checkHeadings(makeData({ headings: hs })).status).toBe('pass');
  });
  it('fails without h1', () => expect(checkHeadings(makeData({ headings: [{ level: 2, text: 'a' }] })).status).toBe('fail'));
});

describe('js-dependency', () => {
  const raw = (n: number) => ({ status: 200, xRobotsTag: '', strippedTextLength: n, hasH1: true });
  it('passes at >= 50%', () => expect(checkJsDependency(makeData({ renderedTextLength: 1000, rawHtml: raw(500) })).status).toBe('pass'));
  it('warns between 15% and 50%', () => expect(checkJsDependency(makeData({ renderedTextLength: 1000, rawHtml: raw(300) })).status).toBe('warn'));
  it('fails under 15%', () => {
    const r = checkJsDependency(makeData({ renderedTextLength: 1000, rawHtml: raw(50) }));
    expect(r.status).toBe('fail');
    expect(r.summary).toMatch(/do not run JavaScript/);
  });
  it('passes when the page has almost no text', () => expect(checkJsDependency(makeData({ renderedTextLength: 50, rawHtml: raw(0) })).status).toBe('pass'));
  it('is info when the raw fetch failed', () => {
    expect(checkJsDependency(makeData({ rawHtml: { status: 0, xRobotsTag: '', strippedTextLength: 0, hasH1: false, error: 'x' } })).status).toBe('info');
  });
});

describe('canonical', () => {
  it('passes when absolute and same site', () => expect(checkCanonical(makeData()).status).toBe('pass'));
  it('treats www as the same site', () => {
    expect(checkCanonical(makeData({ canonical: 'https://www.example.com/' })).status).toBe('pass');
  });
  it('warns when relative', () => expect(checkCanonical(makeData({ canonical: '/home' })).status).toBe('warn'));
  it('warns when on another domain', () => expect(checkCanonical(makeData({ canonical: 'https://other.com/' })).status).toBe('warn'));
  it('warns when missing', () => expect(checkCanonical(makeData({ canonical: '' })).status).toBe('warn'));
});

describe('lang', () => {
  it('passes when set', () => expect(checkLang(makeData()).status).toBe('pass'));
  it('warns when missing', () => expect(checkLang(makeData({ lang: '' })).status).toBe('warn'));
});

describe('sitemap', () => {
  it('is always info', () => {
    expect(checkSitemap(makeData()).status).toBe('info');
    expect(checkSitemap(makeData()).weight).toBe(0);
  });
  it('finds a sitemap listed in robots.txt', () => {
    const r = checkSitemap(makeData({ robotsTxt: file(200, 'Sitemap: https://example.com/s.xml') }));
    expect(r.summary).toMatch(/found/);
    expect(r.summary).not.toMatch(/No sitemap/);
  });
  it('finds /sitemap.xml serving XML', () => {
    expect(checkSitemap(makeData({ sitemap: { status: 200, contentType: 'application/xml' } })).summary).not.toMatch(/No sitemap/);
  });
  it('does not count an HTML 200 as a sitemap', () => {
    expect(checkSitemap(makeData({ sitemap: { status: 200, contentType: 'text/html' } })).summary).toMatch(/No sitemap/);
  });
});

describe('buildAuditResult', () => {
  it('combines checks into a scored result', () => {
    const r = buildAuditResult(makeData(), 123);
    expect(r.results).toHaveLength(11);
    expect(r.auditedAt).toBe(123);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
