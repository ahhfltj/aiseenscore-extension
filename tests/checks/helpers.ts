import type { CollectedData, FetchedFile } from '../../src/audit/types';

export const file = (status: number, text = '', contentType = 'text/plain'): FetchedFile => ({ status, contentType, text });

export function makeData(over: Partial<CollectedData> = {}): CollectedData {
  return {
    url: 'https://example.com/',
    origin: 'https://example.com',
    lang: 'en',
    title: 'Example Company – widgets for everyone',
    metaDescription: 'Example Company makes widgets that are easy to use, easy to fix and easy to recycle at home.',
    metaRobots: '',
    canonical: 'https://example.com/',
    headings: [{ level: 1, text: 'Widgets' }, { level: 2, text: 'Why' }],
    jsonLd: [],
    renderedTextLength: 5000,
    rawHtml: { status: 200, xRobotsTag: '', strippedTextLength: 4800, hasH1: true },
    robotsTxt: file(404, 'Not found', 'text/html'),
    llmsTxt: file(404, 'Not found', 'text/html'),
    llmsFullTxt: file(404, 'Not found', 'text/html'),
    sitemap: { status: 404, contentType: 'text/html' },
    ...over,
  };
}
