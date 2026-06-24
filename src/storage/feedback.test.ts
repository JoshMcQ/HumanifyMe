import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { freshHome, cleanupHome } from '../testUtils.js';
import { feedback } from './repositories/feedback.js';
import { HumanifyError } from '../mcp/errors.js';

beforeEach(freshHome);
afterEach(cleanupHome);

function pending(over: Partial<{ contextLabel: string; provider: string; latencyMs: number }> = {}): string {
  const token = randomUUID();
  feedback.createPending({
    token,
    auditId: null,
    contextLabel: over.contextLabel ?? 'email',
    provider: over.provider ?? 'anthropic',
    latencyMs: over.latencyMs ?? 100,
  });
  return token;
}

describe('feedback repository', () => {
  it('createPending then record fills the signal', () => {
    const token = pending();
    expect(feedback.get(token)?.signal).toBeNull();
    feedback.record({ token, signal: 'accept', reason: 'spot on' });
    const row = feedback.get(token)!;
    expect(row.signal).toBe('accept');
    expect(row.reason).toBe('spot on');
    expect(row.recorded_at).not.toBeNull();
  });

  it('recording an unknown token throws NOT_FOUND', () => {
    expect(() => feedback.record({ token: randomUUID(), signal: 'accept' })).toThrowError(
      HumanifyError,
    );
    try {
      feedback.record({ token: randomUUID(), signal: 'reject' });
    } catch (err) {
      expect((err as HumanifyError).code).toBe('NOT_FOUND');
    }
  });

  it('metrics computes rates, sounds-like-me, and per-dimension counts', () => {
    const a = pending({ contextLabel: 'email', provider: 'anthropic', latencyMs: 100 });
    const b = pending({ contextLabel: 'email', provider: 'anthropic', latencyMs: 300 });
    const c = pending({ contextLabel: 'casual', provider: 'openai', latencyMs: 500 });
    pending({ contextLabel: 'casual', provider: 'openai', latencyMs: 700 }); // left unrecorded

    feedback.record({ token: a, signal: 'accept' });
    feedback.record({ token: b, signal: 'edit' });
    feedback.record({ token: c, signal: 'reject' });

    const m = feedback.metrics();
    expect(m.total).toBe(4);
    expect(m.recorded).toBe(3);
    expect(m.acceptRate).toBeCloseTo(1 / 3);
    expect(m.editRate).toBeCloseTo(1 / 3);
    expect(m.rejectRate).toBeCloseTo(1 / 3);
    // derived sounds-like-me: accept->y, edit->kinda, reject->n
    expect(m.soundsLikeMe).toEqual({ y: 1, kinda: 1, n: 1 });
    expect(m.byContext.email).toEqual({ total: 2, accept: 1, edit: 1, reject: 0 });
    expect(m.byContext.casual!.total).toBe(2);
    expect(m.byProvider.anthropic!.accept).toBe(1);
    // latencies 100,300,500,700 → p50 ~300, p95 = 700
    expect(m.latencyP50).toBe(300);
    expect(m.latencyP95).toBe(700);
  });

  it('metrics honors the since window', () => {
    const old = pending();
    feedback.record({ token: old, signal: 'reject' });
    // A far-future "since" excludes everything.
    const m = feedback.metrics({ since: '2999-01-01T00:00:00.000Z' });
    expect(m.total).toBe(0);
    expect(m.recorded).toBe(0);
  });

  it('wipe clears feedback (privacy)', () => {
    pending();
    expect(feedback.count()).toBe(1);
    feedback.clear();
    expect(feedback.count()).toBe(0);
  });
});
