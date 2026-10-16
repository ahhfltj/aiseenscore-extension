// robots.txt parser following RFC 9309. Pure: no browser APIs.
import { AI_CRAWLERS, type AiCrawler } from '../config/ai-crawlers';

export interface RobotsRule {
  allow: boolean;
  path: string;
}

export interface RobotsGroup {
  agents: string[]; // lower-cased
  rules: RobotsRule[];
}

export interface ParsedRobots {
  groups: RobotsGroup[];
  sitemaps: string[];
}

export type CrawlerAccess = 'allowed' | 'blocked' | 'partial' | 'no-rule';

export interface CrawlerStatus {
  crawler: AiCrawler;
  status: CrawlerAccess;
}

export function parseRobots(text: string): ParsedRobots {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;
  let collectingAgents = false;

  for (const rawLine of text.replace(/^﻿/, '').split(/\r\n|\r|\n/)) {
    const line = rawLine.replace(/#.*/, '').trim();
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (field === 'user-agent') {
      // Consecutive User-agent lines share one group; one after rules starts a new group.
      if (!current || !collectingAgents) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      collectingAgents = true;
    } else if (field === 'allow' || field === 'disallow') {
      collectingAgents = false;
      if (current) current.rules.push({ allow: field === 'allow', path: value });
    } else if (field === 'sitemap') {
      if (value) sitemaps.push(value);
    }
  }
  return { groups, sitemaps };
}

/** Groups that apply to this user-agent: its own groups, else the "*" groups. */
function applicableRules(robots: ParsedRobots, userAgent: string): RobotsRule[] | null {
  const ua = userAgent.toLowerCase();
  const specific = robots.groups.filter((g) => g.agents.includes(ua));
  const matched = specific.length ? specific : robots.groups.filter((g) => g.agents.includes('*'));
  if (!matched.length) return null;
  return matched.flatMap((g) => g.rules);
}

function patternToRegExp(pattern: string): RegExp {
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const source = body
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp('^' + source + (anchored ? '$' : ''));
}

export function hasApplicableGroup(robots: ParsedRobots, userAgent: string): boolean {
  return applicableRules(robots, userAgent) !== null;
}

/** Longest matching rule wins; on a tie Allow wins. No matching rule means allowed. */
export function isAllowed(robots: ParsedRobots, userAgent: string, path: string): boolean {
  const rules = applicableRules(robots, userAgent);
  if (!rules) return true;

  let best: RobotsRule | null = null;
  for (const rule of rules) {
    if (rule.path === '') continue; // "Disallow:" with no value allows everything
    if (!patternToRegExp(rule.path).test(path)) continue;
    if (
      !best ||
      rule.path.length > best.path.length ||
      (rule.path.length === best.path.length && rule.allow && !best.allow)
    ) {
      best = rule;
    }
  }
  return best ? best.allow : true;
}

export function crawlerStatuses(robots: ParsedRobots, currentPath: string): CrawlerStatus[] {
  return AI_CRAWLERS.map((crawler) => {
    if (!hasApplicableGroup(robots, crawler.userAgent)) {
      return { crawler, status: 'no-rule' as const };
    }
    const root = isAllowed(robots, crawler.userAgent, '/');
    const page = isAllowed(robots, crawler.userAgent, currentPath);
    const status: CrawlerAccess = root && page ? 'allowed' : !root && !page ? 'blocked' : 'partial';
    return { crawler, status };
  });
}
