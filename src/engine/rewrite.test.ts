import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { freshHome, cleanupHome } from '../testUtils.js';
import { rewrite } from './rewrite.js';
import { makeProfile } from './fixtures.js';
import { FakeLLMProvider } from '../providers/fake.js';
import { HumanifyError } from '../mcp/errors.js';
import { cache } from '../storage/index.js';
import { mergeFingerprint } from './styleProfile.js';

beforeEach(freshHome);
afterEach(cleanupHome);

const profile = makeProfile();
const draft =
  'I am writing to let you know that the quarterly report has been completed and is ready for your review at your earliest convenience.';

function fakeWith(text: string): FakeLLMProvider {
  const fake = new FakeLLMProvider();
  fake.cannedResponses = [text];
  return fake;
}

describe('rewrite pipeline', () => {
  it('happy path returns rewrite + diff + tokens', async () => {
    const out = await rewrite({
      draft,
      profile,
      contextLabel: 'email',
      directives: ['more_like_me'],
      provider: fakeWith('hey — the quarterly report is done. take a look when you get a chance. thanks'),
    });
    expect(out.rewrite).toContain('quarterly report');
    expect(out.diff.some((d) => d.type === 'added')).toBe(true);
    expect(out.tokens.input).toBeGreaterThan(0);
  });

  it('empty draft → BAD_INPUT; over-cap → OVER_LENGTH_CAP', async () => {
    const p = fakeWith('x');
    await expect(
      rewrite({ draft: '', profile, contextLabel: 'email', directives: [], provider: p }),
    ).rejects.toMatchObject({ code: 'BAD_INPUT' });
    await expect(
      rewrite({ draft: 'x'.repeat(8001), profile, contextLabel: 'email', directives: [], provider: p }),
    ).rejects.toMatchObject({ code: 'OVER_LENGTH_CAP' });
  });

  it('draft that is all PII → EMPTY_AFTER_REDACTION', async () => {
    await expect(
      rewrite({
        draft: 'josh@example.com',
        profile,
        contextLabel: 'email',
        directives: [],
        provider: fakeWith('x'),
      }),
    ).rejects.toMatchObject({ code: 'EMPTY_AFTER_REDACTION' });
  });

  it('conflicting directives: less_aggressive beats more_direct, with a note', async () => {
    const fake = fakeWith(draft);
    const out = await rewrite({
      draft,
      profile,
      contextLabel: 'email',
      directives: ['more_direct', 'less_aggressive'],
      provider: fake,
    });
    expect(out.notes).toMatch(/less_aggressive won/);
    expect(fake.calls[0]!.system).not.toContain('Selected directives this turn: more_direct');
  });

  it('unknown context falls back to base voice with a note', async () => {
    const out = await rewrite({
      draft,
      profile, // profile has no 'linkedin' variant
      contextLabel: 'linkedin',
      directives: [],
      provider: fakeWith(draft),
    });
    expect(out.notes).toMatch(/no 'linkedin' samples/);
  });

  it('out-of-band length triggers a single retry with a reminder', async () => {
    const fake = new FakeLLMProvider();
    fake.cannedResponses = ['too short', draft]; // first attempt 8% of length, then fine
    const out = await rewrite({
      draft,
      profile,
      contextLabel: 'email',
      directives: [],
      provider: fake,
    });
    expect(fake.calls).toHaveLength(2);
    expect(fake.calls[1]!.system).toMatch(/previous attempt was/);
    expect(out.rewrite).toBe(draft);
  });

  it('empty output twice → OUTPUT_INVALID', async () => {
    const fake = new FakeLLMProvider();
    fake.cannedResponses = ['', ''];
    await expect(
      rewrite({ draft, profile, contextLabel: 'email', directives: [], provider: fake }),
    ).rejects.toMatchObject({ code: 'OUTPUT_INVALID' });
  });

  it('provider HumanifyError propagates and is audited as failure', async () => {
    const fake = new FakeLLMProvider();
    fake.failWith = new HumanifyError('INVALID_API_KEY', 'bad key');
    await expect(
      rewrite({ draft, profile, contextLabel: 'email', directives: [], provider: fake }),
    ).rejects.toMatchObject({ code: 'INVALID_API_KEY' });
  });

  it('cache hit short-circuits the provider', async () => {
    const fake = fakeWith(draft);
    const args = { draft, profile, contextLabel: 'email' as const, directives: [], provider: fake };
    await rewrite(args);
    expect(cache.count()).toBe(1);
    await rewrite(args);
    expect(fake.calls).toHaveLength(1); // second call served from cache
  });
});

describe('mergeFingerprint', () => {
  it('applies overrides shallowly and nested objects deeply', () => {
    const merged = mergeFingerprint(profile.base, {
      formality: 5,
      punctuationHabits: { emDash: 'rare' } as never,
    });
    expect(merged.formality).toBe(5);
    expect(merged.punctuationHabits.emDash).toBe('rare');
    expect(merged.punctuationHabits.semicolon).toBe(profile.base.punctuationHabits.semicolon);
    expect(merged.directness).toBe(profile.base.directness);
  });
});
