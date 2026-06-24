import { describe, expect, it } from 'vitest';
import { redact } from './redact.js';
import { restore } from './restore.js';

// Secret-SHAPED but entirely synthetic fixtures. They are assembled by
// concatenation so the literal credential patterns never appear verbatim in this
// file — that stops secret scanners (GitGuardian, gitleaks) from flagging these
// test inputs as real leaks. They authenticate to nothing; their only purpose is
// to prove redact() masks strings of these shapes. Do NOT inline them back into a
// single literal, or the scanners will (falsely) flag this file again.
const FAKE_GITHUB_PAT = 'ghp_' + 'abcdefghijklmnopqrstuvwxyz1234567890';
const FAKE_GOOGLE_KEY = 'AIza' + 'SyA-1234567890abcdefghijklmnopqrstu';
const FAKE_OPENAI_KEY = 'sk-' + 'abcdefghijklmnopqrstuvwxyz123456';
const FAKE_AWS_KEY = 'AKIA' + 'IOSFODNN7EXAMPLE';
const FAKE_JWT = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  'eyJzdWIiOiIxMjM0NTY3ODkwIn0',
  'dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
].join('.');

describe('redactor', () => {
  it.each([
    ['email', 'reach me at josh@example.com today', '[EMAIL_1]'],
    ['phone (US dashes)', 'call 555-867-5309 now', '[PHONE_1]'],
    ['phone (parens)', 'call (415) 555-2671 now', '[PHONE_1]'],
    ['phone (E.164)', 'call +14155552671 now', '[PHONE_1]'],
    ['card (Luhn-valid)', 'card 4111 1111 1111 1111 expires', '[CARD_1]'],
    ['openai-style key', `use ${FAKE_OPENAI_KEY} here`, '[API_KEY_1]'],
    ['github token', `token ${FAKE_GITHUB_PAT} ok`, '[API_KEY_1]'],
    ['google key', `key ${FAKE_GOOGLE_KEY} set`, '[API_KEY_1]'],
    ['bearer', 'auth Bearer <test-fixture-removed> done', '[API_KEY_1]'],
    ['aws key', `id ${FAKE_AWS_KEY} used`, '[AWS_KEY_1]'],
    ['jwt', `jwt ${FAKE_JWT} end`, '[TOKEN_1]'],
    ['address', 'I live at 123 Main Street, Apt 4B in town', '[ADDRESS_1]'],
  ])('masks %s', (_name, input, placeholder) => {
    const { redactedText, applied } = redact(input);
    expect(applied).toBe(true);
    expect(redactedText).toContain(placeholder);
  });

  it('numbers repeated pattern types', () => {
    const { redactedText } = redact('a@b.com wrote to c@d.org');
    expect(redactedText).toContain('[EMAIL_1]');
    expect(redactedText).toContain('[EMAIL_2]');
  });

  it('reuses the placeholder for identical values', () => {
    const { redactedText, map } = redact('a@b.com and again a@b.com');
    expect(Object.keys(map)).toHaveLength(1);
    expect(redactedText.match(/\[EMAIL_1\]/g)).toHaveLength(2);
  });

  it('does not Luhn-flag arbitrary numbers', () => {
    const { redactedText } = redact('order number 1234 5678 9012 3456 shipped');
    expect(redactedText).not.toContain('[CARD');
  });

  it('round-trips: restore(redact(t)) === t', () => {
    const texts = [
      'hi sarah, email me at josh@example.com or call 555-867-5309. card is 4111 1111 1111 1111.',
      'two addrs: a@b.com then c@d.org, and a@b.com again',
      `token Bearer <test-fixture-removed> plus ${FAKE_AWS_KEY}`,
    ];
    for (const t of texts) {
      const { redactedText, map } = redact(t);
      expect(restore(redactedText, map)).toBe(t);
    }
  });

  it('restore tolerates a dropped suffix', () => {
    const { map } = redact('mail josh@example.com');
    expect(restore('contact [EMAIL] soon', map)).toBe('contact josh@example.com soon');
  });

  const GOLDEN_NON_PII = [
    'The meeting moved to Thursday because the conference room flooded.',
    'I think we should ship the smaller version first and see what users do.',
    'Thanks for sending that over. The numbers look better than I expected.',
    "Honestly the hardest part was getting the tests to run at all.",
    'Let me know what you think about the proposal when you get a chance.',
    'We sold 1,200 units in March, up from 900 in February.',
    'The recipe needs 2 cups of flour and 3 eggs, baked at 350 degrees.',
    'Version 2.0 ships next quarter with the redesigned dashboard.',
    'Chapter 12 was the strongest part of the book by a wide margin.',
    'My flight lands at 9:45 so I should be at the office before lunch.',
    'The dog knocked over the plant again. Third time this week.',
    'Our standup is at 10 and usually runs about fifteen minutes.',
    'I disagree with the framing but the underlying data seems solid.',
    'Can you re-run the report with Q3 numbers included this time?',
    'The hotel was fine. Nothing special, but clean and quiet.',
    'She finished the marathon in just under four hours.',
    'Pushing the deadline by two weeks gives us room for proper QA.',
    'That bug only shows up when the cache is cold, which is why it was missed.',
    'I read about 30 pages a night, so I will finish it this month.',
    'The contractor says the kitchen will take six weeks, so plan for ten.',
  ];

  it('golden: no false positives on 20 plain-prose paragraphs', () => {
    for (const text of GOLDEN_NON_PII) {
      const { applied, redactedText } = redact(text);
      expect(applied, `false positive in: "${text}" -> "${redactedText}"`).toBe(false);
    }
  });
});
