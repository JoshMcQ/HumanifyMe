import { z } from 'zod';

export const ProviderConfigSchema = z.object({
  anthropic: z.object({ apiKey: z.string(), model: z.string().optional() }).strict().optional(),
  openai: z.object({ apiKey: z.string(), model: z.string().optional() }).strict().optional(),
  gemini: z.object({ apiKey: z.string(), model: z.string().optional() }).strict().optional(),
  ollama: z.object({ baseUrl: z.string().url(), model: z.string() }).strict().optional(),
}).strict();

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
};
