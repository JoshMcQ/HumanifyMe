import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { freshHome, cleanupHome } from '../testUtils.js';
import { samples, profiles, cache, audit, wipeAll, getDb } from './index.js';
import { makeProfile } from '../engine/fixtures.js';

let home: string;
beforeEach(() => {
  home = freshHome();
});
afterEach(cleanupHome);

describe('db init', () => {
  it('first start creates data.db with schema v1', () => {
    getDb();
    expect(fs.existsSync(path.join(home, 'data.db'))).toBe(true);
    const row = getDb().prepare('SELECT MAX(version) AS v FROM _migrations').get() as { v: number };
    expect(row.v).toBe(1);
  });
});

describe('samples repository', () => {
  const valid = { text: 'x'.repeat(150), labels: ['email'] as ['email'], source: 'paste' as const };

  it('add/list/get/remove round-trip', () => {
    const rec = samples.add(valid);
    expect(rec.id).toBeTruthy();
    expect(samples.list()).toHaveLength(1);
    expect(samples.get(rec.id)?.charCount).toBe(150);
    expect(samples.remove(rec.id)).toBe(true);
    expect(samples.list()).toHaveLength(0);
  });

  it('rejects short text', () => {
    expect(() => samples.add({ ...valid, text: 'too short' })).toThrow();
  });

  it('rejects empty labels', () => {
    expect(() => samples.add({ ...valid, labels: [] as never })).toThrow();
  });

  it('rejects unknown label and unknown source', () => {
    expect(() => samples.add({ ...valid, labels: ['nope'] as never })).toThrow();
    expect(() => samples.add({ ...valid, source: 'nope' as never })).toThrow();
  });

  it('filters by label', () => {
    samples.add(valid);
    samples.add({ ...valid, labels: ['casual'] as never });
    expect(samples.list({ label: 'email' })).toHaveLength(1);
  });

  it('remove of unknown id returns false', () => {
    expect(samples.remove('nope')).toBe(false);
  });
});

describe('profiles repository', () => {
  it('get returns null when empty; set/get round-trip; clear', () => {
    expect(profiles.get()).toBeNull();
    profiles.set(makeProfile());
    expect(profiles.get()?.version).toBe(1);
    expect(profiles.clear()).toBe(true);
    expect(profiles.get()).toBeNull();
  });

  it('rejects invalid profile', () => {
    expect(() => profiles.set({ version: 2 } as never)).toThrow();
  });
});

describe('cache repository', () => {
  const resp = {
    rewrite: 'hi',
    diff: [],
    providerLatencyMs: 1,
    tokens: { input: 1, output: 1 },
    redactionApplied: false,
  };

  it('put/get round-trip and miss', () => {
    expect(cache.get('k')).toBeNull();
    cache.put('k', resp);
    expect(cache.get('k')?.rewrite).toBe('hi');
  });

  it('evicts LRU past 50 entries', () => {
    for (let i = 0; i < 55; i++) cache.put(`k${i}`, resp);
    expect(cache.count()).toBe(50);
    expect(cache.get('k0')).toBeNull(); // oldest evicted
    expect(cache.get('k54')).not.toBeNull();
  });
});

describe('audit repository', () => {
  const entry = {
    provider: 'anthropic',
    route: '/v1/messages',
    payloadBytes: 100,
    draftLength: 50,
    profileIncluded: true,
    success: true,
  };

  it('appends and lists newest-first', () => {
    audit.append({ ...entry, draftLength: 1 });
    audit.append({ ...entry, draftLength: 2 });
    const list = audit.list();
    expect(list[0]!.draftLength).toBe(2);
  });

  it('ring buffer caps at 20', () => {
    for (let i = 0; i < 25; i++) audit.append(entry);
    expect(audit.list(100)).toHaveLength(20);
  });

  it('rejects invalid input', () => {
    expect(() => audit.append({ ...entry, payloadBytes: -1 })).toThrow();
  });
});

describe('wipeAll', () => {
  it('deletes everything, re-inits, preserves consent, logs one audit entry', async () => {
    const consent = await import('../mcp/consent.js');
    consent.acceptConsent();
    samples.add({ text: 'y'.repeat(150), labels: ['email'], source: 'paste' });
    wipeAll();
    expect(samples.list()).toHaveLength(0);
    expect(consent.consentStatus()).toBeTruthy();
    const entries = audit.list();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.route).toBe('WIPE_ALL');
  });

  it('--full clears consent too', async () => {
    const consent = await import('../mcp/consent.js');
    consent.acceptConsent();
    wipeAll({ full: true });
    expect(consent.consentStatus()).toBeUndefined();
  });
});
