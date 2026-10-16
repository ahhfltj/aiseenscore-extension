// AI crawler user-agents we report on.
// Review this list regularly: operators add, rename and retire user-agents.

export type CrawlerPurpose = 'training' | 'search' | 'user-request';

export interface AiCrawler {
  userAgent: string;
  operator: string;
  purpose: CrawlerPurpose;
}

export const AI_CRAWLERS: readonly AiCrawler[] = [
  { userAgent: 'GPTBot', operator: 'OpenAI', purpose: 'training' },
  { userAgent: 'OAI-SearchBot', operator: 'OpenAI', purpose: 'search' },
  { userAgent: 'ChatGPT-User', operator: 'OpenAI', purpose: 'user-request' },
  { userAgent: 'ClaudeBot', operator: 'Anthropic', purpose: 'training' },
  { userAgent: 'Claude-SearchBot', operator: 'Anthropic', purpose: 'search' },
  { userAgent: 'Claude-User', operator: 'Anthropic', purpose: 'user-request' },
  { userAgent: 'PerplexityBot', operator: 'Perplexity', purpose: 'search' },
  { userAgent: 'Perplexity-User', operator: 'Perplexity', purpose: 'user-request' },
  { userAgent: 'Google-Extended', operator: 'Google', purpose: 'training' },
  { userAgent: 'Applebot-Extended', operator: 'Apple', purpose: 'training' },
  { userAgent: 'CCBot', operator: 'Common Crawl', purpose: 'training' },
  { userAgent: 'meta-externalagent', operator: 'Meta', purpose: 'training' },
  { userAgent: 'Bytespider', operator: 'ByteDance', purpose: 'training' },
  { userAgent: 'Amazonbot', operator: 'Amazon', purpose: 'training' },
];
