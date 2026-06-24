// Pure stats aggregation — no bindings, no I/O, fully unit-testable. Turns the
// raw feedback_events stream into the precomputed /api/stats shape.
//
// Unifying rule (see DECISIONS.md D8): MCP installs ship CUMULATIVE counts, so we
// keep only the latest event per anonymous id and sum those. Try-It rewrites and
// survey Q1 answers fold onto the same accept/edit/reject = y/kinda/n axis so the
// public page shows one number.

import type { EventRow, SignalCounts, Stats } from './types.js';

const emptyCounts = (): SignalCounts => ({ total: 0, accept: 0, edit: 0, reject: 0 });

/** ISO week key like "2026-W26", for the by_week trend. */
export function isoWeek(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7; // Mon=1..Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - day); // nearest Thursday
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

type SLM = 'y' | 'kinda' | 'n';
const SIGNAL_TO_SLM: Record<string, SLM> = { accept: 'y', edit: 'kinda', reject: 'n' };

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function addCounts(into: Record<string, SignalCounts>, key: string, signal: 'accept' | 'edit' | 'reject' | null): void {
  into[key] ??= emptyCounts();
  into[key]!.total++;
  if (signal) into[key]![signal]++;
}

export function computeStats(events: EventRow[], now: string): Stats {
  const slm = { y: 0, kinda: 0, n: 0 };
  const byContext: Record<string, SignalCounts> = {};
  const byProvider: Record<string, SignalCounts> = {};
  const byWeek: Record<string, number> = {};
  let totalRewrites = 0;

  // 1. MCP: keep the latest event per anonymous install (cumulative semantics).
  const latestByAnon = new Map<string, EventRow>();
  for (const e of events) {
    if (e.source !== 'mcp' || !e.anon) continue;
    const prev = latestByAnon.get(e.anon);
    if (!prev || e.ts > prev.ts) latestByAnon.set(e.anon, e);
  }
  for (const e of latestByAnon.values()) {
    const totals = (e.payload.totals ?? {}) as Record<string, unknown>;
    totalRewrites += num(totals.rewrites);
    const s = (e.payload.sounds_like_me ?? {}) as Record<string, unknown>;
    slm.y += num(s.y);
    slm.kinda += num(s.kinda);
    slm.n += num(s.n);
    byWeek[isoWeek(e.ts)] = (byWeek[isoWeek(e.ts)] ?? 0) + num(totals.rewrites);
    mergeCounts(byContext, e.payload.by_context);
    mergeCounts(byProvider, e.payload.by_provider);
  }
  const totalUsers = latestByAnon.size;

  // 2. Try-It widget: one rewrite per event, single signal.
  for (const e of events) {
    if (e.source !== 'try-it') continue;
    const signal = normalizeSignal(e.payload.signal);
    totalRewrites += 1;
    if (signal) slm[SIGNAL_TO_SLM[signal]!]++;
    addCounts(byContext, String(e.payload.contextLabel ?? 'try-it'), signal);
    if (e.payload.provider) addCounts(byProvider, String(e.payload.provider), signal);
    byWeek[isoWeek(e.ts)] = (byWeek[isoWeek(e.ts)] ?? 0) + 1;
  }

  // 3. Survey Q1: folds onto the sounds-like-me axis only (not a rewrite).
  for (const e of events) {
    if (e.source !== 'survey') continue;
    const v = normalizeSlm(e.payload.soundsLikeMe ?? e.payload.q1);
    if (v) slm[v]++;
  }

  const rated = slm.y + slm.kinda + slm.n;
  return {
    total_users: totalUsers,
    total_rewrites: totalRewrites,
    sounds_like_me: slm,
    accept_rate: rated === 0 ? 0 : slm.y / rated,
    by_context: byContext,
    by_provider: byProvider,
    by_week: byWeek,
    updated_at: now,
  };
}

function mergeCounts(into: Record<string, SignalCounts>, raw: unknown): void {
  if (!raw || typeof raw !== 'object') return;
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== 'object') continue;
    const c = val as Record<string, unknown>;
    into[key] ??= emptyCounts();
    into[key]!.total += num(c.total);
    into[key]!.accept += num(c.accept);
    into[key]!.edit += num(c.edit);
    into[key]!.reject += num(c.reject);
  }
}

function normalizeSignal(v: unknown): 'accept' | 'edit' | 'reject' | null {
  return v === 'accept' || v === 'edit' || v === 'reject' ? v : null;
}
function normalizeSlm(v: unknown): SLM | null {
  if (v === 'y' || v === 'kinda' || v === 'n') return v;
  if (v === 'yes') return 'y';
  if (v === 'no') return 'n';
  return null;
}
