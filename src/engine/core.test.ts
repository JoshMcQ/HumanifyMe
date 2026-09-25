import { describe, expect, it } from 'vitest';
import { maskDraft } from './core.js';
import { restore } from '../privacy/restore.js';
import { looksLikeText } from '../types.js';

describe('maskDraft', () => {
  it('hides code from the model and restores it exactly, including private data inside code', () => {
    const draft =
      'Refactored `authMiddleware.ts` to use `TokenService`.\n\n```ts\nconst to = "ops@example.com";\n```\nPing me at dev@example.com';
    const { redactedText, map, applied } = maskDraft(draft);
    expect(redactedText).not.toContain('`');
    expect(redactedText).not.toContain('example.com');
    expect(redactedText).toContain('[CODE_1]');
    expect(applied).toBe(true);
    expect(restore(redactedText, map)).toBe(draft);
  });

  it('does not report privacy redaction for code-only masking', () => {
    const { applied, redactedText } = maskDraft('rename `fooBar` to `bazQux`');
    expect(applied).toBe(false);
    expect(redactedText).toBe('rename [CODE_1] to [CODE_2]');
  });
});

describe('looksLikeText', () => {
  it('accepts normal writing and rejects binary or mis-decoded input', () => {
    expect(looksLikeText('hey, can we push to 10:30?\n\tthanks — j')).toBe(true);
    expect(looksLikeText('abc\u0000def')).toBe(false);
    expect(looksLikeText('caf' + String.fromCharCode(0xfffd))).toBe(false);
    expect(looksLikeText('\u0001\u0002\u0003' + 'x'.repeat(50))).toBe(false);
  });
});

describe('restore after maskDraft', () => {
  it('restores private data inside code even when the model drops the placeholder number', () => {
    const { redactedText, map } = maskDraft('send it\n\n```\nto = "ops@example.com"\n```');
    const modelOutput = redactedText.replace('[CODE_1]', '[CODE]');
    expect(restore(modelOutput, map)).toBe('send it\n\n```\nto = "ops@example.com"\n```');
  });
});
