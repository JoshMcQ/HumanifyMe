import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { handleRequest, recompute } from '../src/worker.js';
import type { Env } from '../src/types.js';

const SCHEMA = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'schema.sql'),
  'utf8',
);

// FakeD1: the real worker SQL, executed against an in-memory node:sqlite. Mirrors
// the D1 prepare().bind().run()/all()/first() surface (DECISIONS D6).
class FakeD1 {
  db = new DatabaseSync(':memory:');
  prepare(sql: string) {
    const stmt = this.db.prepare(sql);
    let bound: unknown[] = [];
    const api = {
      bind(...vals: unknown[]) {
        bound = vals;
        return api;
      },
      async run() {
        stmt.run(...(bound as never[]));
        return { success: true };
      },
      async all<T = unknown>() {
        return { results: stmt.all(...(bound as never[])) as T[] };
      },
      async first<T = unknown>() {
        return (stmt.get(...(bound as never[])) as T) ?? null;
      },
    };
    return api;
  }
  exec(sql: string) {
    this.db.exec(sql);
  }
}

class FakeKV {
  m = new Map<string, string>();
  async get(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  async put(k: string, v: string) {
    this.m.set(k, v);
  }
}

let env: Env;
const NOW = Date.parse('2026-06-24T12:00:00.000Z');

beforeEach(() => {
  const db = new FakeD1();
  db.exec(SCHEMA);
  env = { DB: db, RL: new FakeKV() };
});

function post(body: unknown, ip = '1.2.3.4', now = NOW): Promise<Response> {
  return handleRequest(
    new Request('https://humanifyme.com/api/feedback', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json', 'CF-Connecting-IP': ip },
    }),
    env,
    now,
  );
}

describe('feedback worker — intake', () => {
  it('accepts an mcp aggregate and reflects it in stats', async () => {
    const r = await post({
      source: 'mcp',
      anonymousId: 'anon-1',
      totals: { rewrites: 10, rated: 8, accept: 6, edit: 1, reject: 1 },
      sounds_like_me: { y: 6, kinda: 1, n: 1 },
      by_context: { email: { total: 8, accept: 6, edit: 1, reject: 1 } },
      by_provider: { anthropic: { total: 8, accept: 6, edit: 1, reject: 1 } },
      latency_p50: 800,
      latency_p95: 2000,
    });
    expect(r.status).toBe(200);

    const stats = await recompute(env, new Date(NOW).toISOString());
    expect(stats.total_users).toBe(1);
    expect(stats.total_rewrites).toBe(10);
    expect(stats.sounds_like_me).toEqual({ y: 6, kinda: 1, n: 1 });
    expect(stats.accept_rate).toBeCloseTo(6 / 8);
    expect(stats.by_context.email!.accept).toBe(6);
  });

  it('dedups cumulative mcp ships to the latest per install', async () => {
    await post({ source: 'mcp', anonymousId: 'anon-1', totals: { rewrites: 3 }, sounds_like_me: { y: 3, kinda: 0, n: 0 } }, '1.1.1.1', NOW);
    await post({ source: 'mcp', anonymousId: 'anon-1', totals: { rewrites: 9 }, sounds_like_me: { y: 8, kinda: 1, n: 0 } }, '1.1.1.1', NOW + 1000);
    const stats = await recompute(env, new Date(NOW).toISOString());
    expect(stats.total_users).toBe(1);
    expect(stats.total_rewrites).toBe(9); // latest wins, not 3+9
    expect(stats.sounds_like_me).toEqual({ y: 8, kinda: 1, n: 0 });
  });

  it('unifies try-it rewrites onto the same numbers', async () => {
    await post({ source: 'mcp', anonymousId: 'a', totals: { rewrites: 2 }, sounds_like_me: { y: 2, kinda: 0, n: 0 } });
    await post({ source: 'try-it', signal: 'reject', contextLabel: 'email' });
    await post({ source: 'try-it', signal: 'accept' });
    const stats = await recompute(env, new Date(NOW).toISOString());
    expect(stats.total_rewrites).toBe(4); // 2 mcp + 2 try-it
    expect(stats.sounds_like_me).toEqual({ y: 3, kinda: 0, n: 1 });
  });

  it('folds survey Q1 onto sounds-like-me', async () => {
    await post({ source: 'survey', soundsLikeMe: 'kinda', recommend: 8, text: 'private survey note' });
    const stats = await recompute(env, new Date(NOW).toISOString());
    expect(stats.sounds_like_me).toEqual({ y: 0, kinda: 1, n: 0 });
    // survey isn't a rewrite
    expect(stats.total_rewrites).toBe(0);
  });

  it('rejects invalid json (400) and invalid payload (422)', async () => {
    const bad = await handleRequest(
      new Request('https://humanifyme.com/api/feedback', { method: 'POST', body: 'not json', headers: { 'CF-Connecting-IP': 'x' } }),
      env,
      NOW,
    );
    expect(bad.status).toBe(400);
    expect((await post({ source: 'mcp' })).status).toBe(422); // missing totals/anon
    expect((await post({ source: 'bogus' })).status).toBe(422);
  });

  it('rate-limits at 60 req/min per IP', async () => {
    for (let i = 0; i < 60; i++) {
      const r = await post({ source: 'try-it', signal: 'accept' }, '9.9.9.9', NOW);
      expect(r.status).toBe(200);
    }
    const blocked = await post({ source: 'try-it', signal: 'accept' }, '9.9.9.9', NOW);
    expect(blocked.status).toBe(429);
    // a different IP is unaffected
    expect((await post({ source: 'try-it', signal: 'accept' }, '8.8.8.8', NOW)).status).toBe(200);
  });
});

describe('feedback worker — stats endpoint', () => {
  it('GET /api/stats serves a counts-only aggregate, no content', async () => {
    await post({ source: 'survey', soundsLikeMe: 'n', text: 'LEAKABLE_SECRET' });
    const res = await handleRequest(new Request('https://humanifyme.com/api/stats'), env, NOW);
    expect(res.status).toBe(200);
    const raw = await res.text();
    expect(raw).not.toContain('LEAKABLE_SECRET');
    const stats = JSON.parse(raw);
    expect(stats).toHaveProperty('total_users');
    expect(stats).toHaveProperty('updated_at');
  });

  it('serves the cron-precomputed cache when present', async () => {
    await post({ source: 'mcp', anonymousId: 'a', totals: { rewrites: 5 }, sounds_like_me: { y: 5, kinda: 0, n: 0 } });
    await recompute(env, new Date(NOW).toISOString()); // simulate the cron
    const res = await handleRequest(new Request('https://humanifyme.com/api/stats'), env, NOW);
    expect((await res.json() as { total_rewrites: number }).total_rewrites).toBe(5);
  });

  it('unknown route is 404', async () => {
    const res = await handleRequest(new Request('https://humanifyme.com/nope'), env, NOW);
    expect(res.status).toBe(404);
  });
});
