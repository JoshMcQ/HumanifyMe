import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { freshHome, cleanupHome } from '../testUtils.js';
import { updateConfig, readConfig } from '../config/index.js';
import { feedback } from '../storage/index.js';
import {
  shipFeedback,
  buildAggregate,
  getOrCreateAnonymousId,
  FEEDBACK_ENDPOINT,
  SHIP_INTERVAL_MS,
  type FetchLike,
} from './feedbackShip.js';

beforeEach(freshHome);
afterEach(cleanupHome);

/** Records calls; configurable ok/status. */
function fakeFetch(ok = true, status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return { ok, status };
  };
  return { fn, calls };
}

function seedRated(signal: 'accept' | 'edit' | 'reject', contextLabel = 'email', provider = 'anthropic') {
  const token = randomUUID();
  feedback.createPending({ token, auditId: null, contextLabel, provider, latencyMs: 150 });
  feedback.record({ token, signal });
}

describe('shipFeedback (opt-in cloud shipping)', () => {
  it('does nothing when sharing is off (the default)', async () => {
    seedRated('accept');
    const { fn, calls } = fakeFetch();
    const res = await shipFeedback({ fetchImpl: fn });
    expect(res).toEqual({ shipped: false, reason: 'disabled' });
    expect(calls).toHaveLength(0);
  });

  it('ships counts-only aggregate when opted in, then records lastSharedAt', async () => {
    updateConfig((c) => {
      c.shareAnonymousFeedback = true;
    });
    seedRated('accept');
    seedRated('reject', 'casual', 'openai');
    const { fn, calls } = fakeFetch();

    const res = await shipFeedback({ fetchImpl: fn, now: Date.parse('2026-06-24T00:00:00.000Z') });
    expect(res.shipped).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(FEEDBACK_ENDPOINT);
    expect(readConfig().lastSharedAt).toBe('2026-06-24T00:00:00.000Z');

    const body = JSON.parse(calls[0]!.init.body as string);
    expect(body.source).toBe('mcp');
    expect(body.totals).toEqual({ rewrites: 2, rated: 2, accept: 1, edit: 0, reject: 1 });
    expect(body.sounds_like_me).toEqual({ y: 1, kinda: 0, n: 1 });
    expect(body.by_context.casual.reject).toBe(1);
  });

  it('the shipped body contains no content — only counts and dimensions', async () => {
    updateConfig((c) => {
      c.shareAnonymousFeedback = true;
    });
    // A reason string is stored locally but must NEVER be shipped.
    const token = randomUUID();
    feedback.createPending({ token, auditId: null, contextLabel: 'email', provider: 'anthropic', latencyMs: 10 });
    feedback.record({ token, signal: 'reject', reason: 'SECRET_REASON_TEXT' });

    const { fn, calls } = fakeFetch();
    await shipFeedback({ fetchImpl: fn });
    const raw = calls[0]!.init.body as string;
    expect(raw).not.toContain('SECRET_REASON_TEXT');
    expect(raw).not.toContain('reason');
  });

  it('respects the 24h cadence', async () => {
    updateConfig((c) => {
      c.shareAnonymousFeedback = true;
      c.lastSharedAt = '2026-06-24T00:00:00.000Z';
    });
    seedRated('accept');
    const { fn, calls } = fakeFetch();
    const tooSoon = Date.parse('2026-06-24T00:00:00.000Z') + SHIP_INTERVAL_MS - 1000;
    expect((await shipFeedback({ fetchImpl: fn, now: tooSoon })).reason).toBe('recent');
    expect(calls).toHaveLength(0);

    const later = Date.parse('2026-06-24T00:00:00.000Z') + SHIP_INTERVAL_MS + 1000;
    expect((await shipFeedback({ fetchImpl: fn, now: later })).shipped).toBe(true);
  });

  it('does not ship an empty aggregate', async () => {
    updateConfig((c) => {
      c.shareAnonymousFeedback = true;
    });
    const { fn, calls } = fakeFetch();
    expect((await shipFeedback({ fetchImpl: fn })).reason).toBe('empty');
    expect(calls).toHaveLength(0);
  });

  it('a server error does not advance lastSharedAt (so it retries)', async () => {
    updateConfig((c) => {
      c.shareAnonymousFeedback = true;
    });
    seedRated('accept');
    const { fn } = fakeFetch(false, 500);
    const res = await shipFeedback({ fetchImpl: fn });
    expect(res).toMatchObject({ shipped: false, reason: 'error', status: 500 });
    expect(readConfig().lastSharedAt).toBeUndefined();
  });

  it('anonymous id is stable across calls', () => {
    const a = getOrCreateAnonymousId();
    const b = getOrCreateAnonymousId();
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('buildAggregate carries counts, not rates', () => {
    seedRated('edit');
    const body = buildAggregate('anon', feedback.metrics());
    expect(body.totals).toMatchObject({ rewrites: 1, rated: 1, edit: 1 });
    expect(JSON.stringify(body)).not.toContain('Rate');
  });
});
