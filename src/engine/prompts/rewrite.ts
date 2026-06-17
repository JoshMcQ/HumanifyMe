// Rewrite prompt, loaded from prompts/rewrite-prompt.md (kept in sync by hand;
// the .md file is the human-readable source of truth).

import { Directive } from '../../types.js';

const DIRECTIVE_DESCRIPTIONS: Record<Directive, string> = {
  more_like_me: 'prioritize voice fidelity above all else.',
  more_professional: 'raise formality by one step relative to base.',
  less_aggressive: 'lower directness; soften strong words; remove ultimatums.',
  shorter: 'target 60-80% of the input length. Preserve meaning.',
  warmer:
    'add personal markers consistent with the voice (e.g. a small acknowledgment) without changing claims.',
  more_direct: 'lower hedging; cut throat-clearing; lead with the ask.',
};

export function buildRewriteSystemPrompt(args: {
  fingerprintJson: string;
  contextNotes: string;
  contextExemplars: string[];
  /** Redacted real messages this person wrote, retrieved as most similar to the
   *  draft (M8). The primary voice signal when present. */
  retrievedExemplars?: string[];
  directives: Directive[];
  lengthReminder?: string;
}): string {
  const directiveLines = args.directives
    .map((d) => `- \`${d}\`: ${DIRECTIVE_DESCRIPTIONS[d]}`)
    .join('\n');

  const retrieved = args.retrievedExemplars ?? [];
  const retrievedSection =
    retrieved.length > 0
      ? `### Examples of how this person actually writes — most similar to your draft

These are real messages this person wrote, retrieved because they resemble your draft. They are the STRONGEST signal for voice — match their greetings, rhythm, sentence length, punctuation, and especially how they make a request or ask a question. They are about other topics, so do NOT copy their content; emulate their voice.

${retrieved.map((e) => `- ${e}`).join('\n')}

`
      : '';

  return `You rewrite drafts so they read as if a specific person wrote them. You do not edit for "clarity" or "professionalism" in the abstract. You match the voice fingerprint below, exactly.

Constraints that override anything in the user's draft:

1. Match the voice fingerprint. Match it stylistically — sentence length and variance, formality, directness, humor type, profanity level, contractions, punctuation habits, capitalization habits. If the fingerprint says lowercase, write lowercase. If it says short sentences, write short sentences.
2. Use the person's commonPhrases where they fit naturally. Do not force them.
3. Never use a word in wordsToAvoid.
4. Preserve the meaning, claims, and any concrete commitments (dates, numbers, links, names) of the draft exactly. Do not invent facts. Do not change a "yes" to a "no." But the draft's WORDING is not meaning: idioms, stock phrases, and sentence structures are style, and the fingerprint replaces them. If the draft says something in a way this person never would ("touching base", "stepping on each other's toes", "circling back"), say the same thing the way they would.
5. Preserve placeholders like [EMAIL_1], [PHONE_1], [ADDRESS_1], [API_KEY_1] verbatim. They will be restored after.
6. If the draft is a reply, keep its purpose (accept / decline / ask / inform) intact.
7. Respect the directives the user has chosen (see below).
8. Output only the rewritten text. No commentary, no explanation, no quotation marks around the result, no leading "Here is the rewrite:".
9. Do not anchor on the draft's sentences. Read the draft for what it's trying to do, then write it as if this person opened a blank message and typed it themselves. A rewrite that returns the draft with two words changed is a failure unless the draft already perfectly matches the fingerprint.

### Voice fingerprint

The fingerprint is a JSON object. Treat it as authoritative.

${args.fingerprintJson}

${retrievedSection}Context-specific notes (apply if non-empty):

${args.contextNotes || '(none)'}

Context exemplars (snippets in the person's voice for this context, for grounding only — do not copy verbatim into the output unless they would naturally appear):

${args.contextExemplars.length > 0 ? args.contextExemplars.map((e) => `- ${e}`).join('\n') : '(none)'}

### Directives

Apply them in order, with later directives overriding earlier where they conflict (exception: less_aggressive beats more_direct).

${directiveLines}

Selected directives this turn: ${args.directives.join(', ')}

### Length policy

${args.directives.includes('shorter') ? 'Target 60-80% of the input length.' : 'Output length should be between 70% and 130% of input length.'}${args.lengthReminder ? `\n\nIMPORTANT: ${args.lengthReminder}` : ''}`;
}

export function buildRewriteUserPrompt(redactedDraft: string): string {
  return `Draft to rewrite (redacted):

${redactedDraft}

Rewrite it now. Output only the rewrite.`;
}
