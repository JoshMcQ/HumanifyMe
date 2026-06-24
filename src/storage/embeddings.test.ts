// T-62: sample_embeddings table (migration 002) + repository.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { freshHome, cleanupHome } from '../testUtils.js';
import { samples, embeddings, getDb, wipeAll } from './index.js';

const sampleInput = { text: 'x'.repeat(150), labels: ['email'] as ['email'], source: 'paste' as const };

beforeEach(() => {
  freshHome();
});
afterEach(cleanupHome);

describe('migration 002', () => {
  it('applies the v2 embeddings migration', () => {
    getDb();
    const row = getDb()
      .prepare('SELECT COUNT(*) AS n FROM _migrations WHERE version = 2')
      .get() as { n: number };
    expect(row.n).toBe(1);
  });
});

describe('embeddings repository', () => {
  it('put/get round-trips the vector exactly', () => {
    const s = samples.add(sampleInput);
    const vec = new Float32Array([0.1, -0.2, 0.3, 0.4]);
    embeddings.put({ sampleId: s.id, model: 'fake-embed', vector: vec });
    const got = embeddings.get(s.id);
    expect(got).not.toBeNull();
    expect(got!.model).toBe('fake-embed');
    expect(got!.dim).toBe(4);
    expect(Array.from(got!.vector)).toEqual(Array.from(vec));
  });

  it('put is an upsert (re-embedding overwrites)', () => {
    const s = samples.add(sampleInput);
    embeddings.put({ sampleId: s.id, model: 'fake-embed', vector: new Float32Array([1, 0]) });
    embeddings.put({ sampleId: s.id, model: 'v2', vector: new Float32Array([0, 1, 0]) });
    const got = embeddings.get(s.id);
    expect(got!.model).toBe('v2');
    expect(got!.dim).toBe(3);
    expect(embeddings.count()).toBe(1);
  });

  it('has() reports presence for a given model (backfill idempotency)', () => {
    const s = samples.add(sampleInput);
    expect(embeddings.has(s.id, 'fake-embed')).toBe(false);
    embeddings.put({ sampleId: s.id, model: 'fake-embed', vector: new Float32Array([1]) });
    expect(embeddings.has(s.id, 'fake-embed')).toBe(true);
    expect(embeddings.has(s.id, 'other-model')).toBe(false);
  });

  it('list returns all rows, optionally filtered by model', () => {
    const a = samples.add(sampleInput);
    const b = samples.add(sampleInput);
    embeddings.put({ sampleId: a.id, model: 'm1', vector: new Float32Array([1, 0]) });
    embeddings.put({ sampleId: b.id, model: 'm2', vector: new Float32Array([0, 1]) });
    expect(embeddings.list()).toHaveLength(2);
    expect(embeddings.list('m1')).toHaveLength(1);
    expect(embeddings.list('m1')[0]!.sampleId).toBe(a.id);
  });

  it('deleting a sample cascades to its embedding', () => {
    const s = samples.add(sampleInput);
    embeddings.put({ sampleId: s.id, model: 'fake-embed', vector: new Float32Array([1, 2]) });
    expect(embeddings.count()).toBe(1);
    samples.remove(s.id);
    expect(embeddings.get(s.id)).toBeNull();
    expect(embeddings.count()).toBe(0);
  });

  it('humanify_wipe_all clears all embeddings (privacy)', () => {
    const s = samples.add(sampleInput);
    embeddings.put({ sampleId: s.id, model: 'fake-embed', vector: new Float32Array([1, 2, 3]) });
    expect(embeddings.count()).toBe(1);
    wipeAll();
    expect(embeddings.count()).toBe(0);
  });
});
