import { z } from 'zod';
import { ToolDef } from '../registerTool.js';
import { updateConfig, readConfig } from '../../config/index.js';
import { getProvider } from '../../providers/index.js';
import { ProviderNameSchema } from '../../types.js';
import { HumanifyError } from '../errors.js';

export const setProviderTool: ToolDef<z.ZodTypeAny, z.ZodTypeAny> = {
  name: 'humanify_set_provider',
  description:
    'Configure an LLM provider (anthropic | openai | gemini | ollama) and make it the default. Stores the API key locally in ~/.humanifyme/config.json. Validates the key with a 1-token ping.',
  inputSchema: z.object({
    provider: ProviderNameSchema,
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional(),
    model: z.string().optional(),
  }).strict(),
  outputSchema: z.object({ provider: z.string(), valid: z.boolean() }),
  handler: async (input: {
    provider: z.infer<typeof ProviderNameSchema>;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  }) => {
    if (input.provider === 'ollama') {
      const baseUrl = input.baseUrl ?? 'http://localhost:11434';
      const model = input.model ?? 'llama3.2:3b';
      updateConfig((c) => {
        c.providers.ollama = { baseUrl, model };
        c.defaultProvider = 'ollama';
      });
    } else {
      if (!input.apiKey) {
        throw new HumanifyError('BAD_INPUT', `apiKey is required for provider ${input.provider}`);
      }
      const name = input.provider as 'anthropic' | 'openai' | 'gemini';
      updateConfig((c) => {
        c.providers[name] = {
          apiKey: input.apiKey!,
          ...(input.model ? { model: input.model } : {}),
        };
        c.defaultProvider = name;
      });
    }
    const valid = await getProvider(input.provider).testKey();
    return { provider: input.provider, valid };
  },
};

export const testKeyTool: ToolDef<z.ZodTypeAny, z.ZodTypeAny> = {
  name: 'humanify_test_key',
  description: 'Confirm the configured API key works with a cheap (≤1 token) ping.',
  inputSchema: z.object({ provider: ProviderNameSchema.optional() }).strict(),
  outputSchema: z.object({ valid: z.boolean(), provider: z.string() }),
  handler: async (input: { provider?: z.infer<typeof ProviderNameSchema> }) => {
    const name = input.provider ?? readConfig().defaultProvider;
    const valid = await getProvider(name).testKey();
    return { valid, provider: name };
  },
};
