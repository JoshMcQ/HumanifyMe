import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { freshHome, cleanupHome } from '../../testUtils.js';
import { executeTool } from '../registerTool.js';
import { addSampleTool, listSamplesTool, deleteSampleTool } from './samples.js';
import { wipeAllTool } from './wipe.js';
import { auditListTool } from './audit.js';
import { humanifyTextTool } from './rewrite.js';
import { buildProfileTool, getProfileTool, updateProfileTool, deleteProfileTool } from './profile.js';
import { HumanifyError } from '../errors.js';
import { samples, profiles, audit } from '../../storage/index.js';
import { acceptConsent } from '../consent.js';
import { setProviderOverride, FakeLLMProvider } from '../../providers/index.js';
import { makeProfile } from '../../engine/fixtures.js';
import { rateLimit } from '../rateLimit.js';

beforeEach(() => {
  freshHome();
  rateLimit.reset();
});
afterEach(() => {
  setProviderOverride(null);
  cleanupHome();
});

const longText = 'I think we should ship the smaller version first and see what users actually do with it. '.repeat(3);

describe('sample tools', () => {
  it('add returns id; list returns truncated previews; delete works', async () => {
    const { id } = await executeTool(addSampleTool, {
      text: 'z'.repeat(450),
      labels: ['email'],
    });
    expect(id).toBeTruthy();
    const { samples: list } = await executeTool(listSamplesTool, {});
    expect(list).toHaveLength(1);
    expect(list[0].text.length).toBeLessThanOrEqual(201); // 200 + ellipsis
    await executeTool(deleteSampleTool, { id });
    expect(samples.list()).toHaveLength(0);
  });

  it('delete of unknown id returns a clean NOT_FOUND error', async () => {
    try {
      await executeTool(deleteSampleTool, { id: 'nope' });
      expect.unreachable();
    } catch (err) {
      expect((err as HumanifyError).code).toBe('NOT_FOUND');
    }
  });

  it('rejects short text with BAD_INPUT', async () => {
    try {
      await executeTool(addSampleTool, { text: 'short', labels: ['email'] });
      expect.unreachable();
    } catch (err) {
      expect((err as HumanifyError).code).toBe('BAD_INPUT');
    }
  });
});

describe('wipe tool', () => {
  it('wrong confirm string → BAD_INPUT', async () => {
    try {
      await executeTool(wipeAllTool, { confirm: 'delete everything' });
      expect.unreachable();
    } catch (err) {
      expect((err as HumanifyError).code).toBe('BAD_INPUT');
    }
  });

  it('right confirm string wipes', async () => {
    samples.add({ text: longText, labels: ['email'], source: 'paste' });
    const out = await executeTool(wipeAllTool, { confirm: 'DELETE EVERYTHING' });
    expect(out.wiped).toBe(true);
    expect(samples.list()).toHaveLength(0);
  });
});

describe('audit tool', () => {
  it('returns entries newest-first', async () => {
    audit.append({ provider: 'a', route: '/r', payloadBytes: 1, draftLength: 1, profileIncluded: false, success: true });
    audit.append({ provider: 'b', route: '/r', payloadBytes: 1, draftLength: 1, profileIncluded: false, success: true });
    const { entries } = await executeTool(auditListTool, {});
    expect(entries[0].provider).toBe('b');
  });
});

describe('profile tools', () => {
  it('get returns null before build', async () => {
    const { profile } = await executeTool(getProfileTool, {});
    expect(profile).toBeNull();
  });

  it('build_profile requires consent', async () => {
    try {
      await executeTool(buildProfileTool, {});
      expect.unreachable();
    } catch (err) {
      expect((err as HumanifyError).code).toBe('MISSING_CONSENT');
    }
  });

  it('build_profile needs 3+ samples', async () => {
    acceptConsent();
    setProviderOverride(new FakeLLMProvider());
    try {
      await executeTool(buildProfileTool, {});
      expect.unreachable();
    } catch (err) {
      expect((err as HumanifyError).message).toMatch(/at least 3 samples/);
    }
  });

  it('build_profile end-to-end with fake provider', async () => {
    acceptConsent();
    for (const label of ['email', 'casual', 'professional'] as const) {
      samples.add({ text: longText, labels: [label], source: 'paste' });
    }
    const fake = new FakeLLMProvider();
    fake.cannedResponses = [JSON.stringify(makeProfile({ metadata: { sampleCount: 3, labelCoverage: ['email', 'casual', 'professional'] } }))];
    setProviderOverride(fake);
    const { profile } = await executeTool(buildProfileTool, { force: true });
    expect(profile.version).toBe(1);
    expect(profiles.get()).not.toBeNull();
    // the prompt the LLM saw contains the samples
    expect(fake.calls[0]!.user).toContain('3 writing samples');
  });

  it('update/delete profile', async () => {
    await executeTool(updateProfileTool, { profile: makeProfile() });
    expect(profiles.get()).not.toBeNull();
    const out = await executeTool(deleteProfileTool, {});
    expect(out.deleted).toBe(true);
    expect(profiles.get()).toBeNull();
  });
});

describe('humanify_text tool', () => {
  it('fails cleanly without a profile', async () => {
    acceptConsent();
    setProviderOverride(new FakeLLMProvider());
    try {
      await executeTool(humanifyTextTool, { draft: 'hello there friend' });
      expect.unreachable();
    } catch (err) {
      expect((err as HumanifyError).message).toMatch(/no style profile/);
    }
  });

  it('rewrites end-to-end with fake provider', async () => {
    acceptConsent();
    profiles.set(makeProfile());
    const fake = new FakeLLMProvider();
    fake.cannedResponses = ['hey — quick heads up, the launch moved to Friday. thanks'];
    setProviderOverride(fake);
    const out = await executeTool(humanifyTextTool, {
      draft: 'I am writing to inform you that the launch has been rescheduled to Friday.',
      contextLabel: 'email',
    });
    expect(out.rewrite).toContain('Friday');
    expect(out.diff.length).toBeGreaterThan(0);
    expect(out.redactionApplied).toBe(false);
    // the draft was sent, the profile was in the system prompt
    expect(fake.calls[0]!.system).toContain('wordsToAvoid');
  });

  it('redacts PII before the provider sees it, restores after', async () => {
    acceptConsent();
    profiles.set(makeProfile());
    const fake = new FakeLLMProvider();
    fake.cannedResponses = ['email me at [EMAIL_1] — thanks'];
    setProviderOverride(fake);
    const out = await executeTool(humanifyTextTool, {
      draft: 'Please contact me at josh@example.com about the contract renewal soon.',
    });
    expect(fake.calls[0]!.user).not.toContain('josh@example.com');
    expect(fake.calls[0]!.user).toContain('[EMAIL_1]');
    expect(out.rewrite).toContain('josh@example.com');
    expect(out.redactionApplied).toBe(true);
  });

  it('over-length draft → BAD_INPUT (schema cap)', async () => {
    acceptConsent();
    profiles.set(makeProfile());
    setProviderOverride(new FakeLLMProvider());
    try {
      await executeTool(humanifyTextTool, { draft: 'x'.repeat(8001) });
      expect.unreachable();
    } catch (err) {
      expect((err as HumanifyError).code).toBe('BAD_INPUT');
    }
  });
});
