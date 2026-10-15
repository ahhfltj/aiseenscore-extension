export type CheckStatus = 'pass' | 'warn' | 'fail' | 'info';

export interface CheckResult {
  id: string;
  title: string;
  status: CheckStatus;
  summary: string;
  details?: string[];
  fix?: string;
  weight: number;
}

export interface AuditResult {
  url: string;
  origin: string;
  auditedAt: number;
  score: number;
  results: CheckResult[];
  error?: string;
}

/** Result of fetching one same-origin file. status 0 means the request failed (see error). */
export interface FetchedFile {
  status: number;
  contentType: string;
  text: string;
  error?: string;
}

export interface RawHtmlInfo {
  status: number;
  xRobotsTag: string;
  strippedTextLength: number;
  hasH1: boolean;
  error?: string;
}

export interface HeadingInfo {
  level: number;
  text: string;
}

export interface SitemapInfo {
  status: number;
  contentType: string;
  error?: string;
}

/** Plain serializable object returned by the function injected into the page. */
export interface CollectedData {
  url: string;
  origin: string;
  lang: string;
  title: string;
  metaDescription: string;
  metaRobots: string;
  canonical: string;
  headings: HeadingInfo[];
  jsonLd: string[];
  renderedTextLength: number;
  rawHtml: RawHtmlInfo;
  robotsTxt: FetchedFile;
  llmsTxt: FetchedFile;
  llmsFullTxt: FetchedFile;
  sitemap: SitemapInfo;
}
