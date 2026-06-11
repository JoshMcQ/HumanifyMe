// The rewrite pipeline per specs/rewrite-engine-spec.md. One implementation,
// shared by the MCP tool layer and the CLI.

import { createHash } from 'node:crypto';
import {
  ContextLabel,
  Directive,
  MAX_DRAFT_CHARS,
  RewriteResponse,
} from '../types.js';
import { redact } from '../privacy/redact.js';
import { restore } from '../privacy/restore.js';
import { HumanifyError } from '../mcp/errors.js';
import { cache, audit } from '../storage/index.js';
import { LLMProvider } from '../providers/types.js';
import { StyleProfile, mergeFingerprint } from './styleProfile.js';
import { buildRewriteSystemPrompt, buildRewriteUserPrompt } from './prompts/rewrite.js';
import { computeDiff } from './diff.js';
import { sanitizeRewrite, verifyRewrite, issuesToFeedback } from './verify.js';

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

  // Cache check.
  const key = cacheKey(args.profile, args.contextLabel, directives, args.draft);
  const hit = cache.get(key);
  if (hit) return hit;

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

  const user = buildRewriteUserPrompt(redactedText);
  const shorter = directives.includes('shorter');

  let result: { text: string; inputTokens: number; outputTokens: number; latencyMs: number } | null =
    null;
  let lengthReminder: string | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    const system = buildRewriteSystemPrompt({
      fingerprintJson: JSON.stringify(fingerprint, null, 2),
      contextNotes: variant?.notes ?? '',
      contextExemplars: variant?.exemplars ?? [],
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
      audit.append({
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

    const text = sanitizeRewrite(completion.text, redactedText);
    if (text.length === 0) {
      lengthReminder = 'Your previous attempt returned empty output. You must return the rewritten draft.';
      continue;
    }

    const ratio = text.length / args.draft.length;
    const outOfBand = shorter ? ratio > 0.95 : ratio < 0.7 || ratio > 1.3;
    // Deterministic quality gate: introduced banned words, dropped numbers,
    // lost URLs, mangled redaction placeholders.
    const issues = verifyRewrite({
      redactedDraft: redactedText,
      rewrite: text,
      wordsToAvoid: fingerprint.wordsToAvoid,
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
  };

  cache.put(key, response);
  return response;
}

function cacheKey(
  profile: StyleProfile,
  contextLabel: ContextLabel,
  directives: Directive[],
  draft: string,
): string {
  const profileHash = sha256(JSON.stringify(profile));
  const draftHash = sha256(draft);
  return sha256(`${profileHash}|${contextLabel}|${[...directives].sort().join(',')}|${draftHash}`);
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}
