import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { sanitizeRewrite, verifyRewrite, issuesToFeedback } from './verify.js';
import { rewrite } from './rewrite.js';
import { makeProfile } from './fixtures.js';
import { FakeLLMProvider } from '../providers/fake.js';
import { freshHome, cleanupHome } from '../testUtils.js';

describe('sanitizeRewrite', () => {
  it('collapses doubled spaces the draft did not have', () => {
    expect(sanitizeRewrite('hey  John,  quick   update', 'hey John')).toBe('hey John, quick update');
  });

  it('keeps doubled spaces when the draft itself uses them', () => {
    expect(sanitizeRewrite('a  b', 'sentence one.  sentence two.')).toBe('a  b');
  });

  it('strips trailing whitespace per line and collapses 3+ newlines', () => {
    expect(sanitizeRewrite('line one   \n\n\n\nline two  ', 'x')).toBe('line one\n\nline two');
  });
});

describe('verifyRewrite', () => {
  it('flags introduced banned words but not ones already in the draft', () => {
    const issues = verifyRewrite({
      redactedDraft: 'we should leverage the deal and ship it',
      rewrite: 'we should leverage the deal — delighted to ship it',
      wordsToAvoid: ['leverage', 'delighted'],
    });
    expect(issues).toEqual([{ kind: 'banned_word', detail: 'delighted' }]);
  });

  it('does not flag banned words inside larger words', () => {
    const issues = verifyRewrite({
      redactedDraft: 'plain draft',
      rewrite: 'the cleverage of it', // contains "leverage" as substring only
      wordsToAvoid: ['leverage'],
    });
    expect(issues).toEqual([]);
  });

  it('flags dropped numbers, urls, and placeholders', () => {
    const issues = verifyRewrite({
      redactedDraft: 'ship v2.3 by 6/14, docs at https://example.com/spec, mail [EMAIL_1]',
      rewrite: 'ship the new version soon, docs are linked, mail me',
      wordsToAvoid: [],
    });
    const kinds = issues.map((i) => i.kind).sort();
    expect(kinds).toEqual(['missing_number', 'missing_number', 'missing_placeholder', 'missing_url']);
  });

  it('accepts a bare placeholder for a suffixed one (restore handles it)', () => {
    const issues = verifyRewrite({
      redactedDraft: 'mail [EMAIL_1] today',
      rewrite: 'mail [EMAIL] today',
      wordsToAvoid: [],
    });
    expect(issues).toEqual([]);
  });

  it('passes a faithful rewrite', () => {
    const issues = verifyRewrite({
      redactedDraft: 'ship v2.3 by 6/14, docs at https://example.com/spec',
      rewrite: 'hey — v2.3 ships by 6/14, docs: https://example.com/spec',
      wordsToAvoid: ['delighted'],
    });
    expect(issues).toEqual([]);
  });

  it('renders targeted feedback', () => {
    const fb = issuesToFeedback([
      { kind: 'banned_word', detail: 'delighted' },
      { kind: 'missing_number', detail: '6/14' },
    ]);
    expect(fb).toContain('"delighted"');
    expect(fb).toContain('6/14');
  });
});

describe('rewrite pipeline with verification', () => {
  beforeEach(freshHome);
  afterEach(cleanupHome);

  const profile = makeProfile(); // wordsToAvoid includes "leverage", "delighted", "seamless"
  const draft =
    'Quick update on the rollout: version 2.3 ships on 6/14 and the migration notes are at https://example.com/notes for anyone who wants details.';

  it('retries when the model introduces a banned word, with targeted feedback', async () => {
    const fake = new FakeLLMProvider();
    fake.cannedResponses = [
      `Delighted to share: version 2.3 ships on 6/14, notes at https://example.com/notes for details.`,
      `Quick update — version 2.3 ships on 6/14, migration notes at https://example.com/notes if you want details.`,
    ];
    const out = await rewrite({
      draft,
      profile,
      contextLabel: 'professional',
      directives: [],
      provider: fake,
    });
    expect(fake.calls).toHaveLength(2);
    expect(fake.calls[1]!.system).toContain('"delighted"');
    expect(out.rewrite).not.toMatch(/delighted/i);
    expect(out.notes ?? '').toBe('');
  });

  it('retries when a number is dropped; warns if still dropped after retry', async () => {
    const bad = `Quick update on the rollout: the new version ships soon and the migration notes are at https://example.com/notes for anyone who wants details.`;
    const fake = new FakeLLMProvider();
    fake.cannedResponses = [bad, bad];
    const out = await rewrite({
      draft,
      profile,
      contextLabel: 'professional',
      directives: [],
      provider: fake,
    });
    expect(fake.calls).toHaveLength(2);
    expect(out.notes).toMatch(/review before sending/);
    expect(out.notes).toMatch(/2\.3|6\/14/);
  });

  it('sanitizes whitespace without a retry', async () => {
    const fake = new FakeLLMProvider();
    fake.cannedResponses = [
      `Quick update on the rollout:  version 2.3 ships on 6/14 and the migration notes are at https://example.com/notes for anyone who wants details.   `,
    ];
    const out = await rewrite({
      draft,
      profile,
      contextLabel: 'professional',
      directives: [],
      provider: fake,
    });
    expect(fake.calls).toHaveLength(1);
    expect(out.rewrite).not.toMatch(/ {2}/);
    expect(out.rewrite).not.toMatch(/\s$/);
  });
});
