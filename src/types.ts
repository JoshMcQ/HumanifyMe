// Shared domain types. Single source of truth for the closed sets used across
// storage, engine, tools, and CLI. Mirrors docs/api-contract.md.

import { z } from 'zod';

export const CONTEXT_LABELS = [
  'casual',
  'professional',
  'annoyed',
  'polite',
  'direct',
  'sales',
  'email',
  'text',
  'linkedin',
] as const;
export type ContextLabel = (typeof CONTEXT_LABELS)[number];
export const ContextLabelSchema = z.enum(CONTEXT_LABELS);

export const DIRECTIVES = [
  'more_like_me',
  'more_professional',
  'less_aggressive',
  'shorter',
  'warmer',
  'more_direct',
] as const;
export type Directive = (typeof DIRECTIVES)[number];
export const DirectiveSchema = z.enum(DIRECTIVES);

export const PROVIDERS = ['anthropic', 'openai', 'gemini', 'ollama'] as const;
export type ProviderName = (typeof PROVIDERS)[number];
export const ProviderNameSchema = z.enum(PROVIDERS);

export const SAMPLE_SOURCES = [
  'paste',
  'chatgpt',
  'claude',
  'gmail',
  'slack',
  'messages',
  'text-file',
  'active-learning',
] as const;
export type SampleSource = (typeof SAMPLE_SOURCES)[number];
export const SampleSourceSchema = z.enum(SAMPLE_SOURCES);

export interface SampleRecord {
  id: string;
  text: string;
  labels: ContextLabel[];
  source: SampleSource;
  createdAt: string;
  charCount: number;
}

export interface AuditEntry {
  id: number;
  timestamp: string;
  provider: string;
  route: string;
  payloadBytes: number;
  draftLength: number;
  profileIncluded: boolean;
  success: boolean;
  errorCode: string | null;
}

export interface DiffSegment {
  type: 'unchanged' | 'added' | 'removed';
  text: string;
}

export interface RewriteResponse {
  rewrite: string;
  diff: DiffSegment[];
  notes?: string;
  providerLatencyMs: number;
  tokens: { input: number; output: number };
  redactionApplied: boolean;
  /** Opaque handle (uuid) for recording "did this sound like you?" feedback on
   *  this specific rewrite via humanify_record_feedback. Minted per call. */
  feedbackToken: string;
}

export const MAX_DRAFT_CHARS = 8000;
export const MIN_SAMPLE_CHARS = 100;
export const AUDIT_CAP = 20;
export const CACHE_CAP = 50;
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
