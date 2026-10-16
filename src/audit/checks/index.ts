import type { CheckResult, CollectedData } from '../types';
import { checkAiCrawlerAccess } from './ai-crawler-access';
import { checkAiMetaOptout } from './ai-meta-optout';
import { checkCanonical } from './canonical';
import { checkHeadings } from './headings';
import { checkJsDependency } from './js-dependency';
import { checkLang } from './lang';
import { checkLlmsTxt } from './llms-txt';
import { checkMetaDescription } from './meta-description';
import { checkSitemap } from './sitemap';
import { checkStructuredData } from './structured-data';
import { checkTitle } from './title';

const CHECKS: ((data: CollectedData) => CheckResult)[] = [
  checkAiCrawlerAccess,
  checkAiMetaOptout,
  checkLlmsTxt,
  checkStructuredData,
  checkTitle,
  checkMetaDescription,
  checkHeadings,
  checkJsDependency,
  checkCanonical,
  checkLang,
  checkSitemap,
];

export function runChecks(data: CollectedData): CheckResult[] {
  return CHECKS.map((check) => check(data));
}
