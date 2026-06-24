import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { freshHome, cleanupHome } from '../../testUtils.js';
import { executeTool } from '../registerTool.js';
import { humanifyTextTool } from './rewrite.js';
import { recordFeedbackTool } from './feedback.js';
import { acceptConsent } from '../consent.js';
import { setProviderOverride, FakeLLMProvider } from '../../providers/index.js';
import { profiles, feedback } from '../../storage/index.js';
import { makeProfile } from '../../engine/fixtures.js';
import { HumanifyError } from '../errors.js';

beforeEach(freshHome);
afterEach(cleanupHome);

async function rewriteOnce(): Promise<string> {
  acceptConsent();
  profiles.set(makeProfile());
  const fake = new FakeLLMProvider();
  fake.cannedResponses = ['hey — quick heads up, the launch moved to friday. thanks'];
  setProviderOverride(fake);
  const out = await executeTool(humanifyTextTool, {
    draft: 'I am writing to inform you that the launch has been rescheduled to Friday.',
    contextLabel: 'email',
  });
  return out.feedbackToken as string;
}

describe('feedback signal in every rewrite', () => {
  it('humanify_text returns a feedbackToken and creates a pending feedback row', async () => {
    const token = await rewriteOnce();
    expect(token).toMatch(/^[0-9a-f-]{36}$/);
    const row = feedback.get(token)!;
    expect(row).not.toBeNull();
    expect(row.signal).toBeNull();
    expect(row.context_label).toBe('email');
    expect(row.provider).toBe('fake');
  });

  it('humanify_record_feedback records the signal and feeds metrics', async () => {
    const token = await rewriteOnce();
    const res = await executeTool(recordFeedbackTool, { token, signal: 'accept', reason: 'sounds like me' });
    expect(res).toEqual({ recorded: true, signal: 'accept' });

    const m = feedback.metrics();
    expect(m.recorded).toBe(1);
    expect(m.acceptRate).toBe(1);
    expect(m.soundsLikeMe).toEqual({ y: 1, kinda: 0, n: 0 });
  });

  it('editedText is accepted but never persisted (privacy)', async () => {
    const token = await rewriteOnce();
    await executeTool(recordFeedbackTool, {
      token,
      signal: 'edit',
      editedText: 'my private rewritten text that must never be stored',
    });
    const row = feedback.get(token)!;
    expect(row.signal).toBe('edit');
    // No column holds the edited text; reason stays null when not given.
    expect(JSON.stringify(row)).not.toContain('must never be stored');
  });

  it('recording an unknown token surfaces NOT_FOUND', async () => {
    acceptConsent();
    await expect(
      executeTool(recordFeedbackTool, {
        token: '00000000-0000-4000-8000-000000000000',
        signal: 'accept',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
