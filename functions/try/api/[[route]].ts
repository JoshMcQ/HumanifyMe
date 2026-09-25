// humanifyme.com/try backend (Cloudflare Pages Function):
//   POST /try/api/profile  { samples[] }                           -> { profile }
//   POST /try/api/rewrite  { profile, samples[], draft, context }   -> { id, rewrite, notes }
//   POST /try/api/review   { id, soundsLikeMe, wouldSend, comment, shareText, draft?, rewrite? }
// Runs the same engine code as the CLI (src/engine/core.ts). Nothing a visitor
// types is stored unless they tick "share" on the review. /api/* belongs to the
// separate feedback Worker, hence the /try prefix.

import { runRewriteLoop, budgetExemplars, parseProfile, maskDraft } from '../../../src/engine/core.js';
import { mergeFingerprint, StyleProfileSchema } from '../../../src/engine/styleProfile.js';
import { STYLE_ANALYSIS_SYSTEM, buildStyleAnalysisUserPrompt } from '../../../src/engine/prompts/styleAnalysis.js';
import { redact } from '../../../src/privacy/redact.js';
import { restore } from '../../../src/privacy/restore.js';
import { HumanifyError } from '../../../src/mcp/errors.js';
import { AnthropicProvider } from '../../../src/providers/anthropic.js';
import { CONTEXT_LABELS, ContextLabel, MAX_DRAFT_CHARS } from '../../../src/types.js';

interface D1Stmt {
  bind(...v: unknown[]): D1Stmt;
  run(): Promise<{ meta: { changes: number } }>;
  first<T>(): Promise<T | null>;
}
interface Env {
  ANTHROPIC_API_KEY: string;
  DB: { prepare(sql: string): D1Stmt };
  PER_IP_DAILY?: string;
  GLOBAL_DAILY?: string;
}
type Ctx = { request: Request; env: Env; params: { route?: string[] } };

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

class BadInput extends Error {}
const str = (v: unknown, name: string, min: number, max: number): string => {
  if (typeof v !== 'string') throw new BadInput(`${name} is required`);
  const t = v.trim();
  if (t.length < min) throw new BadInput(`${name} is too short (min ${min} characters)`);
  if (t.length > max) throw new BadInput(`${name} is too long (max ${max} characters)`);
  return t;
};
function samplesFrom(v: unknown): string[] {
  if (!Array.isArray(v)) throw new BadInput('samples must be a list');
  const s = v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  if (s.length < 3) throw new BadInput('paste at least 3 messages you wrote');
  if (s.length > 10) throw new BadInput('10 samples max');
  return s.map((x, i) => str(x, `sample ${i + 1}`, 20, 4000));
}

let schemaReady = false;
async function ensureSchema(db: Env['DB']) {
  if (schemaReady) return;
  await db.prepare('CREATE TABLE IF NOT EXISTS try_limits (k TEXT PRIMARY KEY, n INTEGER NOT NULL)').run();
  await db
    .prepare(
      'CREATE TABLE IF NOT EXISTS try_trials (id TEXT PRIMARY KEY, at TEXT NOT NULL, context TEXT, sample_count INTEGER, draft_chars INTEGER, rewrite_chars INTEGER, latency_ms INTEGER, notes INTEGER, sounds_like_me INTEGER, would_send TEXT, comment TEXT, reviewed_at TEXT, shared_draft TEXT, shared_rewrite TEXT)',
    )
    .run();
  schemaReady = true;
}

async function sha(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}

/** Counts one model-backed request against per-visitor and global daily caps. */
async function spend(env: Env, ip: string): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  // ponytail: hard spend ceiling; raise GLOBAL_DAILY if the trial gets popular.
  const caps: Array<[string, number]> = [
    [`global:${day}`, Number(env.GLOBAL_DAILY ?? 1500)],
    [`ip:${day}:${await sha(`${ip}|${day}|humanifyme`)}`, Number(env.PER_IP_DAILY ?? 25)],
  ];
  for (const [k, cap] of caps) {
    const r = await env.DB.prepare(
      'INSERT INTO try_limits (k, n) VALUES (?1, 1) ON CONFLICT(k) DO UPDATE SET n = n + 1 WHERE n < ?2',
    )
      .bind(k, cap)
      .run();
    if (r.meta.changes === 0) return false;
  }
  return true;
}

async function buildProfile(provider: AnthropicProvider, samples: string[]) {
  const blocks = samples.map((s, i) => `--- Sample ${i + 1} (labels: casual) ---\n${redact(s).redactedText}`);
  const user = buildStyleAnalysisUserPrompt({ sampleCount: samples.length, samplesBlock: blocks.join('\n\n') });
  let error = 'profile build failed';
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await provider.complete({ system: STYLE_ANALYSIS_SYSTEM, user, maxTokens: 4000, temperature: 0.2, responseFormat: 'json' });
    const parsed = parseProfile(r.text, samples.length);
    if (parsed.ok) return parsed.profile;
    error = parsed.error;
  }
  throw new HumanifyError('OUTPUT_INVALID', error);
}

function rewriteInput(body: Record<string, unknown>) {
  const samples = samplesFrom(body.samples);
  const draft = str(body.draft, 'draft', 1, MAX_DRAFT_CHARS);
  const context = (CONTEXT_LABELS as readonly string[]).includes(String(body.context))
    ? (body.context as ContextLabel)
    : 'casual';
  const profile = StyleProfileSchema.safeParse(body.profile);
  if (!profile.success) throw new BadInput('voice profile is missing or invalid; rebuild it');
  const { redactedText, map } = maskDraft(draft);
  if (redactedText.replace(/\[[A-Z_0-9]+\]/g, '').trim().length === 0) {
    throw new BadInput('the draft is only emails, numbers, keys or code; nothing to rewrite');
  }
  return { samples, draft, context, profile: profile.data, redactedText, map };
}

async function rewrite(env: Env, provider: AnthropicProvider, input: ReturnType<typeof rewriteInput>) {
  const { samples, draft, context, redactedText, map } = input;
  const variant = input.profile.contexts[context];
  const { completion, notes } = await runRewriteLoop({
    redactedDraft: redactedText,
    fingerprint: mergeFingerprint(input.profile.base, variant?.overrides),
    variant,
    // The visitor's own samples are the voice memory; the CLI retrieves the most
    // similar ones from a larger corpus, here there are only a handful.
    retrievedExemplars: budgetExemplars(samples.map((s) => redact(s).redactedText)),
    directives: ['more_like_me'],
    provider,
  });
  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO try_trials (id, at, context, sample_count, draft_chars, rewrite_chars, latency_ms, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)',
  )
    .bind(id, new Date().toISOString(), context, samples.length, draft.length, completion.text.length, completion.latencyMs, notes.length)
    .run();
  return { id, rewrite: restore(completion.text.trim(), map), notes };
}

async function review(env: Env, body: Record<string, unknown>) {
  const id = str(body.id, 'id', 36, 36);
  const rating = Number(body.soundsLikeMe);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new BadInput('rating must be 1-5');
  const wouldSend = ['yes', 'with_edits', 'no'].includes(String(body.wouldSend)) ? String(body.wouldSend) : null;
  const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 2000) : '';
  const share = body.shareText === true;
  const r = await env.DB.prepare(
    'UPDATE try_trials SET sounds_like_me = ?2, would_send = ?3, comment = ?4, reviewed_at = ?5, shared_draft = ?6, shared_rewrite = ?7 WHERE id = ?1',
  )
    .bind(
      id,
      rating,
      wouldSend,
      comment,
      new Date().toISOString(),
      share ? str(body.draft, 'draft', 1, MAX_DRAFT_CHARS) : null,
      share ? str(body.rewrite, 'rewrite', 1, MAX_DRAFT_CHARS * 2) : null,
    )
    .run();
  if (r.meta.changes === 0) throw new BadInput('unknown trial id');
  return { ok: true };
}

export async function onRequestPost({ request, env, params }: Ctx): Promise<Response> {
  const route = (params.route ?? []).join('/');
  const raw = await request.text();
  if (raw.length > 64_000) return json(413, { error: 'request too large' });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return json(400, { error: 'invalid JSON' });
  }

  try {
    await ensureSchema(env.DB);
    if (route === 'review') return json(200, await review(env, body));
    if (route !== 'profile' && route !== 'rewrite') return json(404, { error: 'not found' });
    // Validate before spending quota so a bad request doesn't burn a visitor's allowance.
    const samples = route === 'profile' ? samplesFrom(body.samples) : null;
    const input = route === 'rewrite' ? rewriteInput(body) : null;
    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    if (!(await spend(env, ip))) {
      return json(429, {
        error: "The free trial hit today's limit. Install the CLI (free, runs with your own key) or try again tomorrow.",
      });
    }
    const provider = new AnthropicProvider(env.ANTHROPIC_API_KEY);
    if (samples) return json(200, { profile: await buildProfile(provider, samples) });
    return json(200, await rewrite(env, provider, input!));
  } catch (e) {
    if (e instanceof BadInput) return json(400, { error: e.message });
    console.error(e);
    return json(502, { error: 'The model call failed. Try again in a moment.' });
  }
}
