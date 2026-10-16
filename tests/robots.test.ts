import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AI_CRAWLERS } from '../src/config/ai-crawlers';
import { crawlerStatuses, isAllowed, parseRobots } from '../src/audit/robots';

const load = (name: string) => parseRobots(readFileSync(`tests/fixtures/${name}`, 'utf8'));
const statusOf = (robots: ReturnType<typeof parseRobots>, ua: string, path = '/') =>
  crawlerStatuses(robots, path).find((s) => s.crawler.userAgent === ua)?.status;

describe('crawler list', () => {
  it('includes the required user-agents', () => {
    const names = AI_CRAWLERS.map((c) => c.userAgent);
    for (const n of ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot',
      'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended',
      'CCBot', 'meta-externalagent', 'Bytespider', 'Amazonbot']) {
      expect(names).toContain(n);
    }
  });
});

describe('parseRobots / isAllowed', () => {
  it('empty file allows everything and has no rule for any crawler', () => {
    const r = load('robots-empty.txt');
    expect(isAllowed(r, 'GPTBot', '/anything')).toBe(true);
    expect(crawlerStatuses(r, '/').every((s) => s.status === 'no-rule')).toBe(true);
  });

  it('Disallow: / for all blocks every crawler', () => {
    const r = load('robots-block-all.txt');
    expect(isAllowed(r, 'GPTBot', '/')).toBe(false);
    expect(crawlerStatuses(r, '/page').every((s) => s.status === 'blocked')).toBe(true);
  });

  it('blocks only GPTBot when only it is disallowed', () => {
    const r = load('robots-gptbot-blocked.txt');
    expect(statusOf(r, 'GPTBot')).toBe('blocked');
    expect(statusOf(r, 'ClaudeBot')).toBe('allowed');
    expect(isAllowed(r, 'ClaudeBot', '/x')).toBe(true);
  });

  it('longer Allow overrides shorter Disallow', () => {
    const r = load('robots-allow-override.txt');
    expect(isAllowed(r, 'GPTBot', '/private/secret')).toBe(false);
    expect(isAllowed(r, 'GPTBot', '/private/public/page')).toBe(true);
    expect(isAllowed(r, 'GPTBot', '/open')).toBe(true);
  });

  it('on a tie Allow wins', () => {
    const r = parseRobots('User-agent: *\nDisallow: /page\nAllow: /page\n');
    expect(isAllowed(r, 'GPTBot', '/page')).toBe(true);
  });

  it('supports * and $ wildcards', () => {
    const r = load('robots-wildcards.txt');
    expect(isAllowed(r, 'GPTBot', '/files/report.pdf')).toBe(false);
    expect(isAllowed(r, 'GPTBot', '/files/report.pdf?download=1')).toBe(true);
    expect(isAllowed(r, 'GPTBot', '/search?q=shoes')).toBe(false);
    expect(isAllowed(r, 'GPTBot', '/search/help')).toBe(true);
  });

  it('matches user-agents case-insensitively', () => {
    const r = load('robots-case.txt');
    expect(isAllowed(r, 'GPTBot', '/')).toBe(false);
    expect(isAllowed(r, 'gptbot', '/')).toBe(false);
    expect(isAllowed(r, 'ClaudeBot', '/')).toBe(true);
  });

  it('a specific group overrides "*" completely', () => {
    const r = load('robots-multi-agent.txt');
    expect(statusOf(r, 'GPTBot')).toBe('blocked');
    expect(statusOf(r, 'ClaudeBot')).toBe('blocked');
    expect(statusOf(r, 'CCBot')).toBe('blocked');
    expect(statusOf(r, 'PerplexityBot')).toBe('allowed');
  });

  it('ignores comments and unknown lines, and collects sitemaps', () => {
    const r = load('robots-comments.txt');
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0]?.agents).toEqual(['*']);
    expect(isAllowed(r, 'GPTBot', '/admin/x')).toBe(false);
    expect(isAllowed(r, 'GPTBot', '/')).toBe(true);
    expect(r.sitemaps).toEqual(['https://example.com/sitemap.xml']);
  });

  it('handles CRLF line endings', () => {
    const r = load('robots-crlf.txt');
    expect(r.groups).toHaveLength(2);
    expect(isAllowed(r, 'PerplexityBot', '/')).toBe(false);
    expect(isAllowed(r, 'GPTBot', '/tmp/x')).toBe(false);
    expect(isAllowed(r, 'GPTBot', '/ok')).toBe(true);
    expect(r.sitemaps).toEqual(['https://example.com/sm.xml']);
  });

  it('empty Disallow allows everything', () => {
    const r = parseRobots('User-agent: *\nDisallow:\n');
    expect(isAllowed(r, 'GPTBot', '/x')).toBe(true);
  });

  it('merges multiple groups for the same agent', () => {
    const r = parseRobots('User-agent: GPTBot\nDisallow: /a\n\nUser-agent: GPTBot\nDisallow: /b\n');
    expect(isAllowed(r, 'GPTBot', '/a')).toBe(false);
    expect(isAllowed(r, 'GPTBot', '/b')).toBe(false);
  });
});

describe('crawlerStatuses', () => {
  it('reports partial when only the current path is blocked', () => {
    const r = parseRobots('User-agent: GPTBot\nDisallow: /pricing\n');
    expect(statusOf(r, 'GPTBot', '/pricing')).toBe('partial');
    expect(statusOf(r, 'GPTBot', '/')).toBe('allowed');
  });

  it('reports partial when / is blocked but the current path is allowed', () => {
    const r = parseRobots('User-agent: GPTBot\nDisallow: /\nAllow: /blog/\n');
    expect(statusOf(r, 'GPTBot', '/blog/post')).toBe('partial');
  });

  it('reports no-rule when no group applies to the crawler', () => {
    const r = parseRobots('User-agent: Googlebot\nDisallow: /x\n');
    expect(statusOf(r, 'GPTBot')).toBe('no-rule');
  });
});
