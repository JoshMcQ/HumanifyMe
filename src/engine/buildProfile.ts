// Profile build pipeline: redact samples → build prompt → call provider →
// schema-validate → persist. Per specs/style-profile-spec.md.

import { redact } from '../privacy/redact.js';
import { samples, profiles, audit } from '../storage/index.js';
import { HumanifyError } from '../mcp/errors.js';
import { LLMProvider } from '../providers/types.js';
import { StyleProfile, StyleProfileSchema } from './styleProfile.js';
import {
  STYLE_ANALYSIS_SYSTEM,
  buildStyleAnalysisUserPrompt,
} from './prompts/styleAnalysis.js';

export type ProfileBuildProgress =
  | { stage: 'redacting'; processed: number; total: number }
  | { stage: 'calling_llm' }
  | { stage: 'validating' }
  | { stage: 'persisting' };

const MIN_SAMPLES = 3;

export async function buildProfile(
  provider: LLMProvider,
  opts: { force?: boolean; onProgress?: (p: ProfileBuildProgress) => void } = {},
): Promise<StyleProfile> {
  const existing = profiles.get();
  if (existing && !opts.force) {
    const ageMs = Date.now() - new Date(existing.generatedAt).getTime();
    if (ageMs < 60 * 60 * 1000) return existing; // recent; force to rebuild
  }

  const all = samples.list();
  if (all.length < MIN_SAMPLES) {
    throw new HumanifyError(
      'BAD_INPUT',
      `profile build needs at least ${MIN_SAMPLES} samples; you have ${all.length}. Add samples with humanify_add_sample or an importer.`,
    );
  }

  // Redact every sample before it leaves the device.
  const redactedBlocks: string[] = [];
  for (let i = 0; i < all.length; i++) {
    const s = all[i]!;
    opts.onProgress?.({ stage: 'redacting', processed: i + 1, total: all.length });
    const { redactedText } = redact(s.text);
    redactedBlocks.push(`--- Sample ${i + 1} (labels: ${s.labels.join(', ')}) ---\n${redactedText}`);
  }

  const system = STYLE_ANALYSIS_SYSTEM;
  const user = buildStyleAnalysisUserPrompt({
    sampleCount: all.length,
    samplesBlock: redactedBlocks.join('\n\n'),
  });

  opts.onProgress?.({ stage: 'calling_llm' });

  let lastError: HumanifyError | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await provider.complete({
      system,
      user,
      maxTokens: 4000,
      temperature: 0.2,
      responseFormat: 'json',
    });
    audit.append({
      provider: provider.name,
      route: provider.route,
      payloadBytes: Buffer.byteLength(system + user, 'utf8'),
      draftLength: 0,
      profileIncluded: false,
      success: true,
      errorCode: null,
    });

    opts.onProgress?.({ stage: 'validating' });
    const parsed = tryParseProfile(result.text, all.length);
    if (parsed.ok) {
      opts.onProgress?.({ stage: 'persisting' });
      return profiles.set(parsed.profile);
    }
    lastError = new HumanifyError('OUTPUT_INVALID', parsed.error, attempt === 0);
  }
  throw lastError ?? new HumanifyError('OUTPUT_INVALID', 'profile validation failed');
}

function tryParseProfile(
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
