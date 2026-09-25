// Storage-free pieces of the engine: the generate → sanitize → verify → retry
// loop and profile parsing. The local CLI/MCP path (rewrite.ts, buildProfile.ts)
// and the hosted web trial (web/) both run exactly this code.

import { Directive } from '../types.js';
import { redact, RedactionMap } from '../privacy/redact.js';
import { RedactionPattern } from '../privacy/patterns.js';
import { HumanifyError } from '../mcp/errors.js';
import { CompletionResult, LLMProvider } from '../providers/types.js';
import { StyleProfile, StyleProfileSchema, VoiceFingerprint, ContextVariant } from './styleProfile.js';
import { buildRewriteSystemPrompt, buildRewriteUserPrompt } from './prompts/rewrite.js';
import { sanitizeRewrite, stripAiDashes, verifyRewrite, issuesToFeedback } from './verify.js';

// Code is masked like private data so the model cannot restyle it: lowercase
// voices were turning `TokenService` into `tokenservice`. Fenced blocks first.
const CODE_PATTERNS: RedactionPattern[] = [
  { name: 'code_block', placeholder: 'CODE', regex: /```[\s\S]*?```/g },
  { name: 'inline_code', placeholder: 'CODE', regex: /`[^`\n]+`/g },
];

/** Redacts private data, then masks code. `applied` reports privacy redaction
 *  only. Code entries come first in the map so restore() puts code back before
 *  any private placeholders it contains. */
export function maskDraft(draft: string): { redactedText: string; map: RedactionMap; applied: boolean } {
  const privacy = redact(draft);
  const code = redact(privacy.redactedText, CODE_PATTERNS);
  return { redactedText: code.redactedText, map: { ...code.map, ...privacy.map }, applied: privacy.applied };
}

/** Budget for retrieved exemplars in the system prompt: cap per-exemplar and
 *  total length, trimming lowest-ranked first so the fingerprint is never cut. */
const EXEMPLAR_MAX_CHARS = 500;
const EXEMPLAR_TOTAL_CHARS = 2000;

export function budgetExemplars(redactedExemplars: string[]): string[] {
  const out: string[] = [];
  let total = 0;
  for (const ex of redactedExemplars) {
    const trimmed = ex.length > EXEMPLAR_MAX_CHARS ? ex.slice(0, EXEMPLAR_MAX_CHARS) + '…' : ex;
    if (total + trimmed.length > EXEMPLAR_TOTAL_CHARS) break;
    out.push(trimmed);
    total += trimmed.length;
  }
  return out;
}

export interface RewriteLoopArgs {
  redactedDraft: string;
  fingerprint: VoiceFingerprint;
  variant?: ContextVariant;
  retrievedExemplars: string[];
  directives: Directive[];
  provider: LLMProvider;
  /** Called after every provider call (success or failure) with metadata only. */
  onCall?: (call: { payloadBytes: number; success: boolean; errorCode: string | null }) => void;
}

/** Runs the rewrite with one targeted retry. Returns the redacted rewrite text
 *  (placeholders still in place) plus user-facing review notes. */
export async function runRewriteLoop(
  args: RewriteLoopArgs,
): Promise<{ completion: CompletionResult; notes: string[] }> {
  const notes: string[] = [];
  const { fingerprint, variant, directives } = args;
  const user = buildRewriteUserPrompt(args.redactedDraft);
  const shorter = directives.includes('shorter');

  let result: CompletionResult | null = null;
  let lengthReminder: string | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    const system = buildRewriteSystemPrompt({
      fingerprintJson: JSON.stringify(fingerprint, null, 2),
      contextNotes: variant?.notes ?? '',
      contextExemplars: variant?.exemplars ?? [],
      retrievedExemplars: args.retrievedExemplars,
      directives,
      lengthReminder,
    });
    const payloadBytes = new TextEncoder().encode(system + user).length;

    let completion: CompletionResult;
    try {
      completion = await args.provider.complete({ system, user, maxTokens: 2500, temperature: 0.6 });
      args.onCall?.({ payloadBytes, success: true, errorCode: null });
    } catch (err) {
      const he = err instanceof HumanifyError ? err : new HumanifyError('PROVIDER_ERROR', String(err));
      args.onCall?.({ payloadBytes, success: false, errorCode: he.code });
      throw he;
    }

    let text = sanitizeRewrite(completion.text, args.redactedDraft);
    // Em-dashes are the loudest AI tell. If this writer's own style is dash-free,
    // strip them deterministically instead of trusting the model to have behaved.
    if (fingerprint.punctuationHabits.emDash === 'rare') {
      text = stripAiDashes(text);
    }
    if (text.length === 0) {
      lengthReminder = 'Your previous attempt returned empty output. You must return the rewritten draft.';
      continue;
    }

    // Measured against the masked draft: that is what the model saw, and a long
    // code block would otherwise make every faithful rewrite look too short.
    const ratio = text.length / args.redactedDraft.length;
    const outOfBand = shorter ? ratio > 0.95 : ratio < 0.4 || ratio > 1.3;
    // Deterministic quality gate: introduced banned words, dropped numbers,
    // lost URLs, mangled redaction placeholders, and casing that drifts from the
    // writer's learned register (lowercase vs. sentence case).
    const issues = verifyRewrite({
      redactedDraft: args.redactedDraft,
      rewrite: text,
      wordsToAvoid: fingerprint.wordsToAvoid,
      capitalization: {
        sentenceCase: fingerprint.capitalization.sentenceCase,
        allLowercase: fingerprint.capitalization.allLowercase,
      },
    });

    if ((outOfBand || issues.length > 0) && attempt === 0) {
      // Retry once with targeted feedback, per the spec's failure policy.
      const feedback: string[] = [];
      if (outOfBand) {
        feedback.push(
          shorter
            ? `Your previous attempt was ${Math.round(ratio * 100)}% of the input length. It must be 60-80%.`
            : `Your previous attempt was ${Math.round(ratio * 100)}% of the input length. Stay between 40% and 130%.`,
        );
      }
      if (issues.length > 0) feedback.push(issuesToFeedback(issues));
      lengthReminder = feedback.join(' ');
      result = { ...completion, text };
      continue;
    }
    if (outOfBand) {
      notes.push(`Rewrite length is ${Math.round(ratio * 100)}% of the draft, outside the target band.`);
    }
    if (issues.length > 0) {
      notes.push(
        `Could not fully enforce after retry — review before sending: ${issues
          .map((i) => `${i.kind.replace(/_/g, ' ')} (${i.detail})`)
          .join('; ')}.`,
      );
    }
    result = { ...completion, text };
    break;
  }

  if (!result || result.text.trim().length === 0) {
    throw new HumanifyError('OUTPUT_INVALID', 'the model returned empty output twice', false);
  }
  return { completion: result, notes };
}

export function parseProfile(
  text: string,
  sampleCount: number,
): { ok: true; profile: StyleProfile } | { ok: false; error: string } {
  // Tolerate accidental code fences.
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    return { ok: false, error: 'LLM output was not valid JSON' };
  }
  // Normalize: ensure generatedAt + sampleCount are trustworthy regardless of LLM.
  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>;
    obj.generatedAt = new Date().toISOString();
    if (obj.metadata && typeof obj.metadata === 'object') {
      (obj.metadata as Record<string, unknown>).sampleCount = sampleCount;
    }
  }
  const result = StyleProfileSchema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    return { ok: false, error: `profile failed schema validation: ${issues}` };
  }
  return { ok: true, profile: result.data };
}
