import { describe, expect, it } from 'vitest';
import { isAuditableUrl } from '../src/audit/collect';

describe('isAuditableUrl', () => {
  it.each([
    'https://example.com/',
    'http://example.com/page?x=1',
    'https://sub.example.co.uk/a/b',
  ])('allows %s', (url) => expect(isAuditableUrl(url)).toBe(true));

  it.each([
    undefined,
    '',
    'not a url',
    'chrome://extensions',
    'chrome-extension://abc/popup.html',
    'about:blank',
    'file:///Users/a/b.html',
    'https://chromewebstore.google.com/detail/x',
    'https://chrome.google.com/webstore/detail/x',
    'ftp://example.com/',
  ])('rejects %s', (url) => expect(isAuditableUrl(url)).toBe(false));
});
