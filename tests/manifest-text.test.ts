import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const LOCALES = ['en', 'es', 'de', 'pt_BR', 'ja'];
const read = (l: string) => JSON.parse(readFileSync(`public/_locales/${l}/messages.json`, 'utf8')) as Record<string, { message: string }>;

describe('manifest text', () => {
  it.each(LOCALES)('%s has a name (<=45) and summary (<=132)', (l) => {
    const m = read(l);
    expect(m.extName!.message.length).toBeGreaterThan(0);
    expect(m.extName!.message.length).toBeLessThanOrEqual(45);
    expect(m.extDescription!.message.length).toBeGreaterThan(0);
    expect(m.extDescription!.message.length).toBeLessThanOrEqual(132);
  });
  it('keeps the product name and avoids AI product names', () => {
    for (const l of LOCALES) {
      const { extName, extDescription } = read(l);
      expect(extName!.message).toContain('AI Seen Score');
      expect(`${extName!.message} ${extDescription!.message}`).not.toMatch(/chatgpt|openai|perplexity|gemini|claude/i);
    }
  });
});
