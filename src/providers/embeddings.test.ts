// T-61: deterministic embedding provider used to drive retrieval tests without
// touching the network or loading the ONNX model. Mirrors FakeLLMProvider.

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { FakeEmbeddingProvider } from './fake.js';
import { getEmbeddingProvider, setEmbeddingProviderOverride } from './index.js';
import { freshHome, cleanupHome } from '../testUtils.js';
import type { EmbeddingProvider } from './embeddings.js';

function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
}

describe('FakeEmbeddingProvider', () => {
  test('returns one vector per input text, each of length dim', async () => {
    const p: EmbeddingProvider = new FakeEmbeddingProvider();
    const vecs = await p.embed(['hello world', 'foo']);
    expect(vecs).toHaveLength(2);
    expect(vecs[0]).toHaveLength(p.dim);
    expect(vecs[1]).toHaveLength(p.dim);
  });

  test('is deterministic: same text yields identical vectors', async () => {
    const p = new FakeEmbeddingProvider();
    const [a] = await p.embed(['the flash script']);
    const [b] = await p.embed(['the flash script']);
    expect(Array.from(a!)).toEqual(Array.from(b!));
  });

  test('produces L2-normalized vectors (norm ~= 1) for non-empty text', async () => {
    const p = new FakeEmbeddingProvider();
    const [v] = await p.embed(['have you been working on the flash script']);
    expect(Math.sqrt(dot(v!, v!))).toBeCloseTo(1, 5);
  });

  test('identical texts are maximally similar; shared words beat disjoint texts', async () => {
    const p = new FakeEmbeddingProvider();
    const [draft, same, overlap, disjoint] = await p.embed([
      'have you been working on the flash script',
      'have you been working on the flash script',
      'are you still doing the flash script',
      'lunch plans for saturday afternoon',
    ]);
    // cosine == dot product because vectors are unit-normalized
    expect(dot(draft!, same!)).toBeCloseTo(1, 5);
    expect(dot(draft!, overlap!)).toBeGreaterThan(dot(draft!, disjoint!));
  });

  test('empty or whitespace-only text yields a zero vector, never NaN', async () => {
    const p = new FakeEmbeddingProvider();
    const [empty] = await p.embed(['   ']);
    expect(empty).toHaveLength(p.dim);
    for (const x of empty!) expect(Number.isNaN(x)).toBe(false);
    expect(dot(empty!, empty!)).toBe(0);
  });
});

describe('getEmbeddingProvider', () => {
  beforeEach(() => {
    freshHome();
  });
  afterEach(() => {
    setEmbeddingProviderOverride(null);
    cleanupHome();
  });

  test('defaults to the dependency-free lexical provider', () => {
    expect(getEmbeddingProvider().model).toBe('lexical-v1');
  });

  test('honors the test override seam', () => {
    const fake = new FakeEmbeddingProvider();
    setEmbeddingProviderOverride(fake);
    expect(getEmbeddingProvider()).toBe(fake);
  });
});
