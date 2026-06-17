// T-61: production default embedder. Dependency-free lexical embedding
// (word unigrams + bigrams, hashed, L2-normalized). Deterministic, offline.

import { describe, expect, test } from 'vitest';
import { LexicalEmbeddingProvider } from './lexical-embeddings.js';

function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
}

describe('LexicalEmbeddingProvider', () => {
  test('one unit-normalized vector per text, of length dim', async () => {
    const p = new LexicalEmbeddingProvider();
    const [a, b] = await p.embed(['have you started the flash script', 'foo bar']);
    expect(a).toHaveLength(p.dim);
    expect(Math.sqrt(dot(a!, a!))).toBeCloseTo(1, 5);
    expect(Math.sqrt(dot(b!, b!))).toBeCloseTo(1, 5);
  });

  test('is deterministic across instances (no per-instance state)', async () => {
    const [a] = await new LexicalEmbeddingProvider().embed(['the flash script']);
    const [b] = await new LexicalEmbeddingProvider().embed(['the flash script']);
    expect(Array.from(a!)).toEqual(Array.from(b!));
  });

  test('shared-phrase text ranks above disjoint text', async () => {
    const p = new LexicalEmbeddingProvider();
    const [draft, related, disjoint] = await p.embed([
      'have you been working on the flash script',
      'are you still working on the flash script',
      'lunch plans for saturday afternoon',
    ]);
    expect(dot(draft!, related!)).toBeGreaterThan(dot(draft!, disjoint!));
  });

  test('uses bigrams: word order matters', async () => {
    const p = new LexicalEmbeddingProvider();
    const [base, exact, reordered] = await p.embed([
      'flash script',
      'flash script',
      'script flash',
    ]);
    // identical text is maximally similar; same words reversed shares unigrams
    // but not bigrams, so it must score strictly lower.
    expect(dot(base!, exact!)).toBeCloseTo(1, 5);
    expect(dot(base!, reordered!)).toBeLessThan(dot(base!, exact!));
  });

  test('empty / whitespace text yields a zero vector, never NaN', async () => {
    const p = new LexicalEmbeddingProvider();
    const [v] = await p.embed(['   ']);
    for (const x of v!) expect(Number.isNaN(x)).toBe(false);
    expect(dot(v!, v!)).toBe(0);
  });
});
