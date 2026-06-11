// Deterministic post-generation verification. This is the quality moat:
// existing "humanizers" introduce whitespace artifacts, drop numbers, and
// flatten constraints. We verify mechanically and retry with targeted
// feedback instead of hoping the model behaved.
//
// Two layers:
//   sanitizeRewrite()  - fixes what can be fixed deterministically (whitespace).
//   verifyRewrite()    - detects what needs a retry (dropped commitments,
//                        profile violations, mangled placeholders).

export interface VerifyIssue {
  kind: 'banned_word' | 'missing_number' | 'missing_url' | 'missing_placeholder';
  detail: string;
}

/**
 * Whitespace sanitation. Never touches meaning:
 * - collapses runs of spaces/tabs the draft didn't have
 * - strips trailing whitespace per line
 * - collapses 3+ consecutive newlines to 2
 */
export function sanitizeRewrite(rewrite: string, draft: string): string {
  let out = rewrite.replace(/[ \t]+$/gm, '');
  if (!/ {2}/.test(draft)) {
    out = out.replace(/([^\n]) {2,}/g, '$1 ');
  }
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

const NUMBER_RE = /\d+(?:[.,:\/-]\d+)*%?/g;
const URL_RE = /https?:\/\/[^\s)\]>"']+/g;
const PLACEHOLDER_RE = /\[[A-Z][A-Z_]*_\d+\]/g;

/**
 * Checks a candidate rewrite against the (redacted) draft and the profile.
 * All checks compare against the *redacted* draft so PII never flows here.
 */
export function verifyRewrite(args: {
  redactedDraft: string;
  rewrite: string;
  wordsToAvoid: string[];
}): VerifyIssue[] {
  const issues: VerifyIssue[] = [];
  const draftLower = args.redactedDraft.toLowerCase();
  const rewriteLower = args.rewrite.toLowerCase();

  // 1. Banned words: flag only words the model INTRODUCED (a banned word the
  //    user's own draft contained is a meaning-preservation question, not a
  //    violation).
  for (const word of args.wordsToAvoid) {
    const w = word.trim().toLowerCase();
    if (w.length < 2) continue;
    const re = new RegExp(`(?:^|[^a-z])${escapeRegex(w)}(?:[^a-z]|$)`, 'i');
    if (re.test(rewriteLower) && !re.test(draftLower)) {
      issues.push({ kind: 'banned_word', detail: word });
    }
  }

  // 2. Numbers: every digit-bearing token in the draft must survive verbatim.
  //    Dates, prices, versions, issue numbers — the things that cost real
  //    money when a rewrite silently drops or alters them.
  const draftForNumbers = args.redactedDraft.replace(PLACEHOLDER_RE, ' ');
  for (const num of unique(draftForNumbers.match(NUMBER_RE) ?? [])) {
    if (!args.rewrite.includes(num)) {
      issues.push({ kind: 'missing_number', detail: num });
    }
  }

  // 3. URLs must survive byte-for-byte.
  for (const url of unique(args.redactedDraft.match(URL_RE) ?? [])) {
    if (!args.rewrite.includes(url)) {
      issues.push({ kind: 'missing_url', detail: url });
    }
  }

  // 4. Redaction placeholders must survive so restore() can reinsert the
  //    user's real values. (restore tolerates a dropped numeric suffix, so
  //    [EMAIL] for [EMAIL_1] is acceptable; a fully absent placeholder is not.)
  for (const ph of unique(args.redactedDraft.match(PLACEHOLDER_RE) ?? [])) {
    const bare = ph.replace(/_\d+\]$/, ']');
    if (!args.rewrite.includes(ph) && !args.rewrite.includes(bare)) {
      issues.push({ kind: 'missing_placeholder', detail: ph });
    }
  }

  return issues;
}

/** Renders issues as targeted retry feedback for the model. */
export function issuesToFeedback(issues: VerifyIssue[]): string {
  const parts: string[] = [];
  const banned = issues.filter((i) => i.kind === 'banned_word').map((i) => i.detail);
  const numbers = issues.filter((i) => i.kind === 'missing_number').map((i) => i.detail);
  const urls = issues.filter((i) => i.kind === 'missing_url').map((i) => i.detail);
  const placeholders = issues.filter((i) => i.kind === 'missing_placeholder').map((i) => i.detail);
  if (banned.length) {
    parts.push(
      `Your previous attempt used ${banned.map((b) => `"${b}"`).join(', ')} — this person never uses ${banned.length > 1 ? 'these words' : 'this word'}. Replace with something they would say.`,
    );
  }
  if (numbers.length) {
    parts.push(`Your previous attempt dropped or altered: ${numbers.join(', ')}. Every number must appear exactly as in the draft.`);
  }
  if (urls.length) {
    parts.push(`Your previous attempt lost the link(s): ${urls.join(' ')}. Include them verbatim.`);
  }
  if (placeholders.length) {
    parts.push(`Your previous attempt dropped the placeholder(s) ${placeholders.join(', ')}. They must appear verbatim in the output.`);
  }
  return parts.join(' ');
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
