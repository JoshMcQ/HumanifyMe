import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { freshHome, cleanupHome } from '../../testUtils.js';
import { executeTool } from '../registerTool.js';
import { metricsTool } from './metrics.js';
import { acceptConsent } from '../consent.js';
import { feedback } from '../../storage/index.js';

beforeEach(freshHome);
afterEach(cleanupHome);

function rated(signal: 'accept' | 'edit' | 'reject', contextLabel = 'email', provider = 'anthropic'): void {
  const token = randomUUID();
  feedback.createPending({ token, auditId: null, contextLabel, provider, latencyMs: 200 });
  feedback.record({ token, signal });
}

describe('humanify_metrics tool', () => {
  it('returns the aggregate metrics shape', async () => {
    acceptConsent();
    rated('accept');
    rated('accept', 'casual', 'openai');
    rated('reject', 'casual', 'openai');

    const m = await executeTool(metricsTool, {});
    expect(m.total).toBe(3);
    expect(m.recorded).toBe(3);
    expect(m.acceptRate).toBeCloseTo(2 / 3);
    expect(m.soundsLikeMe).toEqual({ y: 2, kinda: 0, n: 1 });
    expect(m.byContext.email!.accept).toBe(1);
    expect(m.byProvider.openai!.total).toBe(2);
    expect(m.latencyP50).toBe(200);
  });

  it('requires consent', async () => {
    await expect(executeTool(metricsTool, {})).rejects.toMatchObject({ code: 'MISSING_CONSENT' });
  });

  it('empty install reports zeros, not an error', async () => {
    acceptConsent();
    const m = await executeTool(metricsTool, {});
    expect(m.total).toBe(0);
    expect(m.acceptRate).toBe(0);
    expect(m.soundsLikeMe).toEqual({ y: 0, kinda: 0, n: 0 });
  });
});
