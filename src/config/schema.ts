import { z } from 'zod';

export const ProviderConfigSchema = z.object({
  anthropic: z.object({ apiKey: z.string(), model: z.string().optional() }).strict().optional(),
  openai: z.object({ apiKey: z.string(), model: z.string().optional() }).strict().optional(),
  gemini: z.object({ apiKey: z.string(), model: z.string().optional() }).strict().optional(),
  ollama: z.object({ baseUrl: z.string().url(), model: z.string() }).strict().optional(),
}).strict();

// Retrieval-augmented voice (M8). Defaults make this opt-out: on by default,
// dependency-free lexical embedder. `.default({})` lets configs written before
// M8 (no `rag` key) still parse and inherit these defaults.
export const RagConfigSchema = z
  .object({
    enabled: z.boolean().default(true),
    embedder: z.enum(['lexical', 'minilm', 'ollama']).default('lexical'),
    minSamples: z.number().int().nonnegative().default(5),
    topK: z.number().int().positive().default(5),
    mmrLambda: z.number().min(0).max(1).default(0.7),
    dedupCosine: z.number().min(0).max(1).default(0.97),
  })
  .strict()
  .default({});

export const ConfigSchema = z.object({
  version: z.literal(1),
  consentAcceptedAt: z.string().datetime({ offset: true }).optional(),
  defaultProvider: z.enum(['anthropic', 'openai', 'gemini', 'ollama']),
  providers: ProviderConfigSchema,
  redactionPatterns: z.array(z.string()),
  rateLimitPerDay: z.number().int().positive(),
  autoHumanify: z.boolean(),
  autoHumanifyAgents: z.array(z.string()),
  errorReporting: z.boolean(),
  telemetry: z.boolean(),
  rag: RagConfigSchema,
  // Anonymous validation sharing (M9). OFF by default — opt-in only, explained in
  // onboarding. When true, the MCP ships AGGREGATE COUNTS (never content) at most
  // once/24h. shareAnonymousId is a one-time opaque id; lastSharedAt gates the cadence.
  shareAnonymousFeedback: z.boolean().default(false),
  shareAnonymousId: z.string().optional(),
  lastSharedAt: z.string().datetime({ offset: true }).optional(),
}).strict();

export type Config = z.infer<typeof ConfigSchema>;

export const DEFAULT_CONFIG: Config = {
  version: 1,
  defaultProvider: 'anthropic',
  providers: {},
  redactionPatterns: ['default'],
  rateLimitPerDay: 200,
  autoHumanify: false,
  autoHumanifyAgents: [],
  errorReporting: false,
  telemetry: false,
  rag: { enabled: true, embedder: 'lexical', minSamples: 5, topK: 5, mmrLambda: 0.7, dedupCosine: 0.97 },
  shareAnonymousFeedback: false,
};
