// SPDX-License-Identifier: MIT
//
// The ONLY module that ships anything to HumanifyMe's own servers, and it ships
// COUNTS ONLY. No draft, no rewrite, no edited text, no reason strings — ever.
// Off unless the user opted in (config.shareAnonymousFeedback). At most once per
// 24h. Auditable on purpose: this file is MIT-licensed so anyone can verify the
// exact bytes that leave the machine. See specs/privacy-security-spec.md.

import { createHash, randomUUID } from 'node:crypto';
import { readConfig, updateConfig } from '../config/index.js';
import { feedback } from '../storage/index.js';
import type { FeedbackMetrics } from '../storage/index.js';

export const FEEDBACK_ENDPOINT = 'https://humanifyme.com/api/feedback';
export const SHIP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const ID_SALT = 'humanifyme-anon-v1';

/** Minimal fetch shape so tests can inject a FakeFetch with no network. */
export type FetchLike = (url: string, init: RequestInit) => Promise<{ ok: boolean; status: number }>;

export interface ShipResult {
  shipped: boolean;
  reason?: 'disabled' | 'recent' | 'empty' | 'error';
  status?: number;
}

/** Opaque, one-time, non-reversible install id. Generated lazily the first time
 *  the user opts in; persisted in config so the same install counts as one. */
export function getOrCreateAnonymousId(): string {
  const existing = readConfig().shareAnonymousId;
  if (existing) return existing;
  const id = createHash('sha256').update(randomUUID() + ID_SALT).digest('hex');
  updateConfig((c) => {
    c.shareAnonymousId = id;
  });
  return id;
}

/** The exact body shipped — counts and dimensions only. Exported so tests (and
 *  auditors) can assert it contains nothing resembling content. */
export function buildAggregate(
  anonymousId: string,
  m: FeedbackMetrics,
): Record<string, unknown> {
  return {
    source: 'mcp',
    anonymousId,
    since: null, // cumulative all-time; the server dedups by latest-per-anonymousId
    totals: {
      rewrites: m.total,
      rated: m.recorded,
      // counts (NOT rates): accept==sounds-like-me.y, edit==kinda, reject==n
      accept: m.soundsLikeMe.y,
      edit: m.soundsLikeMe.kinda,
      reject: m.soundsLikeMe.n,
    },
    by_context: m.byContext,
    by_provider: m.byProvider,
    sounds_like_me: m.soundsLikeMe,
    latency_p50: m.latencyP50,
    latency_p95: m.latencyP95,
  };
}

/** Ships the anonymous aggregate if (and only if) opted in and >24h since last.
 *  Cumulative all-time metrics each time → idempotent server-side. Never throws;
 *  returns why it did or didn't ship. fetchImpl/now are injectable for tests. */
export async function shipFeedback(
  opts: { fetchImpl?: FetchLike; now?: number } = {},
): Promise<ShipResult> {
  const cfg = readConfig();
  if (!cfg.shareAnonymousFeedback) return { shipped: false, reason: 'disabled' };

  const now = opts.now ?? Date.now();
  if (cfg.lastSharedAt) {
    const last = Date.parse(cfg.lastSharedAt);
    if (!Number.isNaN(last) && now - last < SHIP_INTERVAL_MS) {
      return { shipped: false, reason: 'recent' };
    }
  }

  const m = feedback.metrics();
  if (m.total === 0) return { shipped: false, reason: 'empty' };

  const anonymousId = getOrCreateAnonymousId();
  const body = buildAggregate(anonymousId, m);
  const doFetch = (opts.fetchImpl ?? (globalThis.fetch as unknown as FetchLike)) as FetchLike;

  try {
    const res = await doFetch(FEEDBACK_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { shipped: false, reason: 'error', status: res.status };
  } catch {
    return { shipped: false, reason: 'error' };
  }

  updateConfig((c) => {
    c.lastSharedAt = new Date(now).toISOString();
  });
  return { shipped: true, status: 200 };
}

/** Fire-and-forget startup hook. Never blocks or throws into the caller. */
export function maybeShipFeedbackOnStartup(): void {
  void shipFeedback().catch(() => {
    /* shipping is best-effort and must never affect server startup */
  });
}
