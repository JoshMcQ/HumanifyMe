// Minimal structural types for the Cloudflare bindings the worker uses. Declaring
// them here (rather than pulling @cloudflare/workers-types) keeps the worker
// self-contained and lets tests supply fakes backed by node:sqlite + a Map.

export interface D1Result<T = unknown> {
  results: T[];
}
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<{ success: boolean }>;
  all<T = unknown>(): Promise<D1Result<T>>;
  first<T = unknown>(): Promise<T | null>;
}
export interface D1Like {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<unknown> | unknown;
}

export interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

export interface Env {
  DB: D1Like;
  RL: KVLike;
}

export type FeedbackSource = 'mcp' | 'try-it' | 'survey';

export interface EventRow {
  id: number;
  source: FeedbackSource;
  anon: string | null;
  payload: Record<string, unknown>;
  ts: string;
}

export interface SignalCounts {
  total: number;
  accept: number;
  edit: number;
  reject: number;
}

export interface Stats {
  total_users: number;
  total_rewrites: number;
  sounds_like_me: { y: number; kinda: number; n: number };
  accept_rate: number;
  by_context: Record<string, SignalCounts>;
  by_provider: Record<string, SignalCounts>;
  by_week: Record<string, number>;
  latency_p50: number;
  latency_p95: number;
  updated_at: string;
}
