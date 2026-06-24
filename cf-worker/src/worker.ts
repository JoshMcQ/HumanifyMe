// HumanifyMe feedback worker. Three intake shapes on POST /api/feedback
// (source = mcp | try-it | survey), all written to one feedback_events table.
// GET /api/stats serves a precomputed counts-only aggregate (recomputed by a cron
// every 10 min, cached in KV). KV-based 60 req/min/IP rate limit. No content is
// ever returned by /api/stats — counts and dimensions only.

import type { Env, EventRow, FeedbackSource, Stats } from './types.js';
import { computeStats } from './aggregate.js';

const STATS_KEY = 'stats:current';
const RL_LIMIT = 60; // requests
const RL_WINDOW_S = 60; // per minute

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  });
}

async function rateLimited(env: Env, ip: string, now: number): Promise<boolean> {
  const bucket = Math.floor(now / (RL_WINDOW_S * 1000));
  const key = `rl:${ip}:${bucket}`;
  const current = Number((await env.RL.get(key)) ?? '0');
  if (current >= RL_LIMIT) return true;
  await env.RL.put(key, String(current + 1), { expirationTtl: RL_WINDOW_S * 2 });
  return false;
}

/** Minimal per-source validation. Returns the rows to persist, or null if invalid. */
function validate(body: Record<string, unknown>): { source: FeedbackSource; anon: string | null } | null {
  const source = body.source;
  if (source === 'mcp') {
    if (typeof body.anonymousId !== 'string' || typeof body.totals !== 'object' || body.totals === null) {
      return null;
    }
    return { source, anon: body.anonymousId };
  }
  if (source === 'try-it') {
    if (body.signal !== 'accept' && body.signal !== 'edit' && body.signal !== 'reject') return null;
    return { source, anon: null };
  }
  if (source === 'survey') {
    // Needs at least one recognized field; free-text is optional (DECISIONS D7).
    if (body.soundsLikeMe === undefined && body.q1 === undefined && body.recommend === undefined) {
      return null;
    }
    return { source, anon: null };
  }
  return null;
}

async function recompute(env: Env, nowIso: string): Promise<Stats> {
  const res = await env.DB.prepare(
    'SELECT id, source, anon, payload_json, ts FROM feedback_events',
  ).all<{ id: number; source: FeedbackSource; anon: string | null; payload_json: string; ts: string }>();
  const events: EventRow[] = res.results.map((r) => ({
    id: r.id,
    source: r.source,
    anon: r.anon,
    ts: r.ts,
    payload: safeParse(r.payload_json),
  }));
  const stats = computeStats(events, nowIso);
  await env.RL.put(STATS_KEY, JSON.stringify(stats));
  return stats;
}

function safeParse(s: string): Record<string, unknown> {
  try {
    const v = JSON.parse(s);
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

export async function handleRequest(request: Request, env: Env, now = Date.now()): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  if (url.pathname === '/api/feedback' && request.method === 'POST') {
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    if (await rateLimited(env, ip, now)) return json({ error: 'rate_limited' }, 429);

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ error: 'invalid_json' }, 400);
    }
    const v = validate(body);
    if (!v) return json({ error: 'invalid_payload' }, 422);

    await env.DB.prepare('INSERT INTO feedback_events (source, anon, payload_json, ts) VALUES (?, ?, ?, ?)')
      .bind(v.source, v.anon, JSON.stringify(body), new Date(now).toISOString())
      .run();
    return json({ ok: true });
  }

  if (url.pathname === '/api/stats' && request.method === 'GET') {
    const cached = await env.RL.get(STATS_KEY);
    if (cached) return json(JSON.parse(cached));
    // Cold cache: compute once on demand.
    return json(await recompute(env, new Date(now).toISOString()));
  }

  return json({ error: 'not_found' }, 404);
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
  // Cron trigger (every 10 min, see wrangler.toml) recomputes the cached stats.
  async scheduled(_event: unknown, env: Env): Promise<void> {
    await recompute(env, new Date().toISOString());
  },
};

export { recompute };
