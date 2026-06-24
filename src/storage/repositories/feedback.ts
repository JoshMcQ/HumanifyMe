// Per-rewrite feedback signal + the local metrics aggregation it powers (M9).
//
// Privacy: this table holds COUNTS and dimensions only — context label, provider,
// latency, the accept/edit/reject signal, and an optional short local-only reason.
// It never stores the draft, the rewrite, or the user's edited text. The cloud
// aggregate (src/network) is derived from metrics() and ships counts only.

import { z } from 'zod';
import { getDb } from '../db.js';
import { HumanifyError } from '../../mcp/errors.js';

export type FeedbackSignal = 'accept' | 'edit' | 'reject';
export type SoundsLikeMe = 'y' | 'kinda' | 'n';

/** The single source of truth for the two-axis mapping (see DECISIONS.md D3). */
export const SIGNAL_TO_SOUNDS_LIKE_ME: Record<FeedbackSignal, SoundsLikeMe> = {
  accept: 'y',
  edit: 'kinda',
  reject: 'n',
};

export interface SignalCounts {
  total: number;
  accept: number;
  edit: number;
  reject: number;
}

export interface FeedbackMetrics {
  /** Rewrites that received a feedback handle in the window. */
  total: number;
  /** Of those, how many the user actually answered. */
  recorded: number;
  acceptRate: number;
  editRate: number;
  rejectRate: number;
  byContext: Record<string, SignalCounts>;
  byProvider: Record<string, SignalCounts>;
  latencyP50: number;
  latencyP95: number;
  soundsLikeMe: { y: number; kinda: number; n: number };
}

const CreatePendingSchema = z
  .object({
    token: z.string().uuid(),
    auditId: z.number().int().nullable().default(null),
    contextLabel: z.string().min(1),
    provider: z.string().min(1),
    latencyMs: z.number().int().nonnegative(),
  })
  .strict();
export type CreatePendingInput = z.input<typeof CreatePendingSchema>;

const RecordSchema = z
  .object({
    token: z.string().uuid(),
    signal: z.enum(['accept', 'edit', 'reject']),
    reason: z.string().max(2000).nullable().default(null),
  })
  .strict();
export type RecordInput = z.input<typeof RecordSchema>;

interface Row {
  token: string;
  audit_id: number | null;
  context_label: string | null;
  provider: string | null;
  latency_ms: number | null;
  signal: FeedbackSignal | null;
  reason: string | null;
  created_at: string;
  recorded_at: string | null;
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.ceil(p * sortedAsc.length) - 1);
  return sortedAsc[Math.max(0, idx)]!;
}

export const feedback = {
  /** Records a rewrite the user saw, pending their signal. Token is the handle
   *  returned to the caller so they can answer later. */
  createPending(input: CreatePendingInput): void {
    const v = CreatePendingSchema.parse(input);
    getDb()
      .prepare(
        `INSERT OR REPLACE INTO feedback
           (token, audit_id, context_label, provider, latency_ms, signal, reason, created_at, recorded_at)
         VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, NULL)`,
      )
      .run(v.token, v.auditId, v.contextLabel, v.provider, v.latencyMs, new Date().toISOString());
  },

  /** Fills in the user's signal for a pending token. Throws NOT_FOUND if the
   *  token was never issued (or was wiped). */
  record(input: RecordInput): void {
    const v = RecordSchema.parse(input);
    const info = getDb()
      .prepare(`UPDATE feedback SET signal = ?, reason = ?, recorded_at = ? WHERE token = ?`)
      .run(v.signal, v.reason, new Date().toISOString(), v.token);
    if (Number(info.changes) === 0) {
      throw new HumanifyError('NOT_FOUND', `unknown feedback token: ${v.token}`);
    }
  },

  get(token: string): Row | null {
    const row = getDb().prepare('SELECT * FROM feedback WHERE token = ?').get(token) as
      | Row
      | undefined;
    return row ?? null;
  },

  count(): number {
    const r = getDb().prepare('SELECT COUNT(*) AS n FROM feedback').get() as { n: number };
    return r.n;
  },

  clear(): void {
    getDb().prepare('DELETE FROM feedback').run();
  },

  /** Aggregates the table into the validation metrics. `since` is an ISO string;
   *  rows created before it are excluded. */
  metrics(opts: { since?: string } = {}): FeedbackMetrics {
    const rows = (
      opts.since
        ? (getDb()
            .prepare('SELECT * FROM feedback WHERE created_at >= ? ORDER BY created_at')
            .all(opts.since) as unknown as Row[])
        : (getDb().prepare('SELECT * FROM feedback ORDER BY created_at').all() as unknown as Row[])
    );

    const total = rows.length;
    const recordedRows = rows.filter((r) => r.signal !== null);
    const recorded = recordedRows.length;

    const emptyCounts = (): SignalCounts => ({ total: 0, accept: 0, edit: 0, reject: 0 });
    const byContext: Record<string, SignalCounts> = {};
    const byProvider: Record<string, SignalCounts> = {};
    const slm = { y: 0, kinda: 0, n: 0 };
    let accept = 0;
    let edit = 0;
    let reject = 0;

    for (const r of rows) {
      const ctx = r.context_label ?? 'unknown';
      const prov = r.provider ?? 'unknown';
      byContext[ctx] ??= emptyCounts();
      byProvider[prov] ??= emptyCounts();
      byContext[ctx]!.total++;
      byProvider[prov]!.total++;
      if (r.signal) {
        byContext[ctx]![r.signal]++;
        byProvider[prov]![r.signal]++;
        if (r.signal === 'accept') accept++;
        else if (r.signal === 'edit') edit++;
        else reject++;
        slm[SIGNAL_TO_SOUNDS_LIKE_ME[r.signal]]++;
      }
    }

    const latencies = rows
      .map((r) => r.latency_ms ?? 0)
      .sort((a, b) => a - b);

    const rate = (n: number) => (recorded === 0 ? 0 : n / recorded);
    return {
      total,
      recorded,
      acceptRate: rate(accept),
      editRate: rate(edit),
      rejectRate: rate(reject),
      byContext,
      byProvider,
      latencyP50: percentile(latencies, 0.5),
      latencyP95: percentile(latencies, 0.95),
      soundsLikeMe: slm,
    };
  },
};
