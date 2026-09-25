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
import { retrieveExemplars } from './retrieve.js';
import { computeDiff } from './diff.js';
import { budgetExemplars, maskDraft, runRewriteLoop } from './core.js';

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
  const { redactedText, map, applied } = maskDraft(args.draft);
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

  let lastAuditId: number | null = null;
  const { completion: result, notes: loopNotes } = await runRewriteLoop({
    draftLength: args.draft.length,
    redactedDraft: redactedText,
    fingerprint,
    variant,
    retrievedExemplars,
    directives,
    provider: args.provider,
    onCall: ({ payloadBytes, success, errorCode }) => {
      const id = audit.append({
        provider: args.provider.name,
        route: args.provider.route,
        payloadBytes,
        draftLength: args.draft.length,
        profileIncluded: true,
        success,
        errorCode,
      });
      if (success) lastAuditId = id;
    },
  });
  notes.push(...loopNotes);

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
