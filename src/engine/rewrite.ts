// The rewrite pipeline per specs/rewrite-engine-spec.md. One implementation,
// shared by the MCP tool layer and the CLI.

import { createHash, randomUUID } from 'node:crypto';
import {
  ContextLabel,
  Directive,
  MAX_DRAFT_CHARS,
  RewriteResponse,
} from '../types.js';
import { redact } from '../privacy/redact.js';
import { restore } from '../privacy/restore.js';
import { HumanifyError } from '../mcp/errors.js';
import { cache, audit, samples, feedback } from '../storage/index.js';
import { getEmbeddingProvider } from '../providers/index.js';
import { readConfig } from '../config/index.js';
import { LLMProvider } from '../providers/types.js';
import { StyleProfile, mergeFingerprint } from './styleProfile.js';
import { buildRewriteSystemPrompt, buildRewriteUserPrompt } from './prompts/rewrite.js';
import { retrieveExemplars } from './retrieve.js';
import { computeDiff } from './diff.js';
import { sanitizeRewrite, stripAiDashes, verifyRewrite, issuesToFeedback } from './verify.js';

/** Budget for retrieved exemplars in the system prompt: cap per-exemplar and
 *  total length, trimming lowest-ranked first so the fingerprint is never cut. */
const EXEMPLAR_MAX_CHARS = 500;
const EXEMPLAR_TOTAL_CHARS = 2000;

function budgetExemplars(redactedExemplars: string[]): string[] {
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

export interface RewriteArgs {
  draft: string;
  profile: StyleProfile;
  contextLabel: ContextLabel;
  directives: Directive[];
  provider: LLMProvider;
}

export async function rewrite(args: RewriteArgs): Promise<RewriteResponse> {
  const notes: string[] = [];

  if (args.draft.length === 0) throw new HumanifyError('BAD_INPUT', 'draft is empty');
  if (args.draft.length > MAX_DRAFT_CHARS) {
    throw new HumanifyError(
      'OVER_LENGTH_CAP',
      `draft is ${args.draft.length} chars; the cap is ${MAX_DRAFT_CHARS}`,
    );
  }

  // Directive normalization per the interaction rules.
  let directives = args.directives.length > 0 ? [...args.directives] : (['more_like_me'] as Directive[]);
  if (directives.includes('more_direct') && directives.includes('less_aggressive')) {
    directives = directives.filter((d) => d !== 'more_direct');
    notes.push('more_direct and less_aggressive conflict; less_aggressive won.');
  }

  // Cache check. The rag signature invalidates the cache when the voice-memory
  // corpus changes (a profile hash alone would not — samples live separately).
  const key = cacheKey(args.profile, args.contextLabel, directives, args.draft, ragSignature());
  const hit = cache.get(key);
  if (hit) return attachFeedback(hit, args, null);

  // Redact.
  const { redactedText, map, applied } = redact(args.draft);
  if (redactedText.replace(/\[[A-Z_0-9]+\]/g, '').trim().length === 0) {
    throw new HumanifyError(
      'EMPTY_AFTER_REDACTION',
      'the draft contained nothing but redactable content; nothing to rewrite',
    );
  }

  // Merge fingerprint for the requested context.
  const variant = args.profile.contexts[args.contextLabel];
  if (!variant) {
    notes.push(`Profile has no '${args.contextLabel}' samples yet — using your base voice.`);
  }
  const fingerprint = mergeFingerprint(args.profile.base, variant?.overrides);

  // Retrieve the user's own most-similar past messages (M8) as the primary
  // voice signal. Redact each at SEND time — never trust store-time redaction —
  // and budget them so the fingerprint is never crowded out. Retrieval must
  // never block a rewrite: any error or cold start degrades to profile-only.
  // Honors the rag.* config block (opt-out + tunables).
  const rag = readConfig().rag;
  let retrievedExemplars: string[] = [];
  if (rag.enabled) {
    try {
      const exemplars = await retrieveExemplars(redactedText, {
        topK: rag.topK,
        minSamples: rag.minSamples,
        mmrLambda: rag.mmrLambda,
        dedupCosine: rag.dedupCosine,
      });
      retrievedExemplars = budgetExemplars(exemplars.map((e) => redact(e.text).redactedText));
    } catch {
      retrievedExemplars = [];
    }
    if (retrievedExemplars.length === 0) {
      const n = samples.count();
      if (n > 0 && n < rag.minSamples) {
        notes.push(
          `Voice memory is still small (${n} sample${n === 1 ? '' : 's'}) — rewriting from your profile. Import more of your messages for sharper voice matching.`,
        );
      }
    }
  }

  const user = buildRewriteUserPrompt(redactedText);
  const shorter = directives.includes('shorter');

  let result: { text: string; inputTokens: number; outputTokens: number; latencyMs: number } | null =
    null;
  let lengthReminder: string | undefined;
  let lastAuditId: number | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const system = buildRewriteSystemPrompt({
      fingerprintJson: JSON.stringify(fingerprint, null, 2),
      contextNotes: variant?.notes ?? '',
      contextExemplars: variant?.exemplars ?? [],
      retrievedExemplars,
      directives,
      lengthReminder,
    });

    let completion;
    try {
      completion = await args.provider.complete({
        system,
        user,
        maxTokens: 2500,
        temperature: 0.6,
      });
      lastAuditId = audit.append({
        provider: args.provider.name,
        route: args.provider.route,
        payloadBytes: Buffer.byteLength(system + user, 'utf8'),
        draftLength: args.draft.length,
        profileIncluded: true,
        success: true,
        errorCode: null,
      });
    } catch (err) {
      const he = err instanceof HumanifyError ? err : new HumanifyError('PROVIDER_ERROR', String(err));
      audit.append({
        provider: args.provider.name,
        route: args.provider.route,
        payloadBytes: Buffer.byteLength(system + user, 'utf8'),
        draftLength: args.draft.length,
        profileIncluded: true,
        success: false,
        errorCode: he.code,
      });
      throw he;
    }

    let text = sanitizeRewrite(completion.text, redactedText);
    // Em-dashes are the loudest AI tell. If this writer's own style is dash-free,
    // strip them deterministically instead of trusting the model to have behaved.
    if (fingerprint.punctuationHabits.emDash === 'rare') {
      text = stripAiDashes(text);
    }
    if (text.length === 0) {
      lengthReminder = 'Your previous attempt returned empty output. You must return the rewritten draft.';
      continue;
    }

    const ratio = text.length / args.draft.length;
    const outOfBand = shorter ? ratio > 0.95 : ratio < 0.7 || ratio > 1.3;
    // Deterministic quality gate: introduced banned words, dropped numbers,
    // lost URLs, mangled redaction placeholders, and casing that drifts from the
    // writer's learned register (lowercase vs. sentence case).
    const issues = verifyRewrite({
      redactedDraft: redactedText,
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
            : `Your previous attempt was ${Math.round(ratio * 100)}% of the input length. Stay between 70% and 130%.`,
        );
      }
      if (issues.length > 0) feedback.push(issuesToFeedback(issues));
      lengthReminder = feedback.join(' ');
      result = completion;
      result.text = text;
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
    result = completion;
    result.text = text;
    break;
  }

  if (!result || result.text.trim().length === 0) {
    throw new HumanifyError('OUTPUT_INVALID', 'the model returned empty output twice', false);
  }

  const restored = restore(result.text.trim(), map);
  const response: RewriteResponse = {
    rewrite: restored,
    diff: computeDiff(args.draft, restored),
    ...(notes.length > 0 ? { notes: notes.join(' ') } : {}),
    providerLatencyMs: result.latencyMs,
    tokens: { input: result.inputTokens, output: result.outputTokens },
    redactionApplied: applied,
    feedbackToken: '', // stamped by attachFeedback below (also for cache hits)
  };

  cache.put(key, response);
  return attachFeedback(response, args, lastAuditId);
}

/** Mints a fresh feedback token for this rewrite and records a pending feedback
 *  row (context/provider/latency only — never content). Returns a clone of the
 *  response with the token stamped, so a cached response object is never mutated.
 *  Feedback is best-effort: a storage hiccup must never fail a rewrite. */
function attachFeedback(
  response: RewriteResponse,
  args: RewriteArgs,
  auditId: number | null,
): RewriteResponse {
  const feedbackToken = randomUUID();
  try {
    feedback.createPending({
      token: feedbackToken,
      auditId,
      contextLabel: args.contextLabel,
      provider: args.provider.name,
      latencyMs: response.providerLatencyMs,
    });
  } catch {
    // swallow — feedback capture is non-essential to the rewrite itself
  }
  return { ...response, feedbackToken };
}

function cacheKey(
  profile: StyleProfile,
  contextLabel: ContextLabel,
  directives: Directive[],
  draft: string,
  ragSig: string,
): string {
  const profileHash = sha256(JSON.stringify(profile));
  const draftHash = sha256(draft);
  return sha256(
    `${profileHash}|${contextLabel}|${[...directives].sort().join(',')}|${draftHash}|${ragSig}`,
  );
}

/** Cheap signature of everything that affects retrieval, for cache invalidation:
 *  the rag config (enabled + tunables + embedder) and the voice-memory corpus
 *  (count + newest sample timestamp). Changes whenever samples are added/removed
 *  or rag settings change, without running retrieval on the cache-hit path. */
function ragSignature(): string {
  const rag = readConfig().rag;
  const all = samples.list();
  const latest = all[0]?.createdAt ?? '';
  return [
    getEmbeddingProvider().model,
    all.length,
    latest,
    rag.enabled,
    rag.embedder,
    rag.minSamples,
    rag.topK,
    rag.mmrLambda,
    rag.dedupCosine,
  ].join('|');
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}
