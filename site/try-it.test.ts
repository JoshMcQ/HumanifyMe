// Structural guard for the Try-It widget (runs in the default vitest suite, no
// browser). The full interaction is covered by e2e/try-it.e2e.ts (Playwright).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const html = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'try-it.html'),
  'utf8',
);

describe('try-it.html widget wiring', () => {
  it('has the three rating signals', () => {
    for (const sig of ['accept', 'edit', 'reject']) {
      expect(html).toContain(`data-signal="${sig}"`);
    }
  });

  it('has an optional comment textarea and a send button', () => {
    expect(html).toContain('id="ti-comment"');
    expect(html).toContain('id="ti-send"');
  });

  it('posts to /api/feedback with source try-it', () => {
    expect(html).toContain("var API='/api/feedback'");
    expect(html).toContain("source:'try-it'");
    expect(html).toMatch(/method:'POST'/);
  });

  it('states plainly that no draft is sent to a server', () => {
    expect(html.toLowerCase()).toContain('nothing is sent to us');
  });
});
