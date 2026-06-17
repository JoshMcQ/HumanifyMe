// T4 (AI-smell reduction) scorer per specs/evals-spec.md. Deterministic, no
// network — safe to run in CI. Measures the density of generic-AI tell phrases.

import { describe, expect, it } from 'vitest';
import { aiSmellScore } from './aiSmell.js';

describe('aiSmellScore (T4)', () => {
  it('counts AI-tell phrases and reports the hits', () => {
    const r = aiSmellScore('I am delighted to leverage our seamless, world-class platform.');
    expect(r.count).toBeGreaterThanOrEqual(4);
    expect(r.hits).toContain('delighted to');
    expect(r.hits).toContain('leverage');
    expect(r.hits).toContain('seamless');
    expect(r.hits).toContain('world-class');
  });

  it('scores clean human text as zero', () => {
    const r = aiSmellScore('hey — did you get a chance to look at the flash script? no rush');
    expect(r.count).toBe(0);
    expect(r.per100Words).toBe(0);
  });

  it('per100Words normalizes by length', () => {
    const short = aiSmellScore('we leverage synergy'); // 3 words, ~2 tells
    const padded = aiSmellScore('we leverage synergy ' + 'and then more plain words here too'.repeat(3));
    expect(short.per100Words).toBeGreaterThan(padded.per100Words);
  });

  it('is case-insensitive', () => {
    expect(aiSmellScore('We are DELIGHTED TO help').count).toBeGreaterThanOrEqual(1);
  });
});
