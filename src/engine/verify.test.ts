import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { sanitizeRewrite, stripAiDashes, verifyRewrite, issuesToFeedback } from './verify.js';
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

describe('stripAiDashes', () => {
  it('turns a clause-break em-dash into a comma', () => {
    expect(stripAiDashes('i went home — it was late')).toBe('i went home, it was late');
  });
  it('handles an unspaced em-dash', () => {
    expect(stripAiDashes('the deck—resend it')).toBe('the deck, resend it');
  });
  it('handles an en-dash used as a clause break', () => {
    expect(stripAiDashes('yes – absolutely')).toBe('yes, absolutely');
  });
  it('keeps number ranges intact as a hyphen, not a comma', () => {
    expect(stripAiDashes('pages 10–20 today')).toBe('pages 10-20 today');
  });
  it('preserves a decimal version next to a dash', () => {
    expect(stripAiDashes('version 2.3 — the latest')).toBe('version 2.3, the latest');
  });
  it('leaves dash-free text untouched', () => {
    expect(stripAiDashes('no dashes here at all')).toBe('no dashes here at all');
  });
  it('does not leave a stray comma before terminal punctuation', () => {
    expect(stripAiDashes('done—.')).toBe('done.');
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

describe('verifyRewrite — casing/register adherence', () => {
  it('flags re-introduced sentence-case for an all-lowercase writer', () => {
    const issues = verifyRewrite({
      redactedDraft: 'please send the deck. i need it for the meeting.',
      rewrite: 'Hey, can you send the deck? I need it for the meeting tomorrow.',
      wordsToAvoid: [],
      capitalization: { sentenceCase: false, allLowercase: true },
    });
    expect(issues).toContainEqual({ kind: 'casing', detail: 'lowercase' });
  });

  it('flags a flattened all-lowercase rewrite for a sentence-case writer', () => {
    const issues = verifyRewrite({
      redactedDraft: 'Please send the deck. I need it for the meeting.',
      rewrite: 'hey, can you send the deck? i need it for the meeting tomorrow.',
      wordsToAvoid: [],
      capitalization: { sentenceCase: true, allLowercase: false },
    });
    expect(issues).toContainEqual({ kind: 'casing', detail: 'sentence_case' });
  });

  it('tolerates a single proper-noun/acronym capital for a lowercase writer', () => {
    const issues = verifyRewrite({
      redactedDraft: 'did sarah reply yet',
      rewrite: 'hey — did you hear back? Sarah said she would check today.',
      wordsToAvoid: [],
      capitalization: { sentenceCase: false, allLowercase: true },
    });
    expect(issues.find((i) => i.kind === 'casing')).toBeUndefined();
  });

  it('passes when casing already matches the writer (lowercase)', () => {
    const issues = verifyRewrite({
      redactedDraft: 'send the deck',
      rewrite: 'hey can you resend the deck? i need it for the meeting. thanks',
      wordsToAvoid: [],
      capitalization: { sentenceCase: false, allLowercase: true },
    });
    expect(issues.find((i) => i.kind === 'casing')).toBeUndefined();
  });

  it('is a no-op when no capitalization info is supplied (back-compat)', () => {
    const issues = verifyRewrite({
      redactedDraft: 'send the deck',
      rewrite: 'Hey. Can you resend the deck? I need it.',
      wordsToAvoid: [],
    });
    expect(issues.find((i) => i.kind === 'casing')).toBeUndefined();
  });

  it('renders targeted casing feedback for each direction', () => {
    expect(issuesToFeedback([{ kind: 'casing', detail: 'lowercase' }])).toMatch(/lowercase/i);
    expect(issuesToFeedback([{ kind: 'casing', detail: 'sentence_case' }])).toMatch(
      /capital|sentence/i,
    );
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

  it('retries when an all-lowercase writer gets sentence-cased output, with casing feedback', async () => {
    const fake = new FakeLLMProvider();
    fake.cannedResponses = [
      // Attempt 0: model "corrected" the casual writer to sentence case (numbers/URL kept).
      `Quick update on the rollout. Version 2.3 ships on 6/14. Migration notes are at https://example.com/notes for details.`,
      // Attempt 1: matches the writer's all-lowercase register.
      `quick update — version 2.3 ships on 6/14, migration notes at https://example.com/notes if you want details.`,
    ];
    const out = await rewrite({
      draft,
      profile, // makeProfile() — an all-lowercase writer
      contextLabel: 'professional',
      directives: [],
      provider: fake,
    });
    expect(fake.calls).toHaveLength(2);
    expect(fake.calls[1]!.system).toMatch(/lowercase/i);
    expect(out.notes ?? '').toBe('');
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

  it('strips em-dashes for a writer whose register is dash-free', async () => {
    const dashFree = makeProfile();
    dashFree.base.punctuationHabits.emDash = 'rare';
    const fake = new FakeLLMProvider();
    fake.cannedResponses = [
      'quick update on the rollout, version 2.3 ships on 6/14 — migration notes are at https://example.com/notes for anyone who wants them.',
    ];
    const out = await rewrite({
      draft,
      profile: dashFree,
      contextLabel: 'professional',
      directives: [],
      provider: fake,
    });
    expect(fake.calls).toHaveLength(1); // strip is deterministic, no retry needed
    expect(out.rewrite).not.toMatch(/[–—]/); // the AI tell is gone
    expect(out.rewrite).toContain('2.3'); // numbers survive
    expect(out.rewrite).toContain('6/14');
    expect(out.rewrite).toContain('https://example.com/notes'); // url survives
  });

  it('keeps em-dashes for a writer who actually uses them', async () => {
    const fake = new FakeLLMProvider();
    fake.cannedResponses = [
      'quick update on the rollout, version 2.3 ships on 6/14 — migration notes at https://example.com/notes if you want them.',
    ];
    const out = await rewrite({
      draft,
      profile, // makeProfile() uses emDash: 'frequent'
      contextLabel: 'professional',
      directives: [],
      provider: fake,
    });
    expect(out.rewrite).toMatch(/—/);
  });
});
