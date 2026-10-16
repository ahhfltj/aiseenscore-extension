import { parseRobots } from '../robots';
import type { CheckResult, CollectedData } from '../types';

export function checkSitemap(data: CollectedData): CheckResult {
  const base = { id: 'sitemap', title: 'Sitemap', status: 'info' as const, weight: 0 };
  const robotsOk = data.robotsTxt.status === 200 && !/html/i.test(data.robotsTxt.contentType);
  const listed = robotsOk ? parseRobots(data.robotsTxt.text).sitemaps : [];
  const atDefault = data.sitemap.status === 200 && /xml/i.test(data.sitemap.contentType);

  if (listed.length || atDefault) {
    return { ...base, summary: 'A sitemap was found.', details: [...listed, ...(atDefault ? ['/sitemap.xml'] : [])] };
  }
  return { ...base, summary: 'No sitemap found at /sitemap.xml or in robots.txt.', fix: 'Optional: publish a sitemap.xml and reference it with a Sitemap: line in robots.txt.' };
}
