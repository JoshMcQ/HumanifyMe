import { z } from 'zod';
import { ToolDef } from '../registerTool.js';
import { updateConfig, readConfig, writeConfig } from '../../config/index.js';
import { getProvider } from '../../providers/index.js';
import { ProviderNameSchema } from '../../types.js';

export const setProviderTool: ToolDef<z.ZodTypeAny, z.ZodTypeAny> = {
  name: 'humanify_set_provider',
  description:
    'Configure local Ollama and make it the default. Cloud API keys are intentionally rejected in MCP tool arguments because the host model can see them; configure cloud providers with the interactive `humanifyme setup` CLI instead.',
  inputSchema: z
    .object({
      provider: z.literal('ollama'),
      baseUrl: z.string().url().optional(),
      model: z.string().optional(),
    })
    .strict(),
  outputSchema: z.object({ provider: z.string(), valid: z.boolean() }),
  handler: async (input: {
    provider: 'ollama';
    baseUrl?: string;
    model?: string;
  }) => {
    const previousConfig = readConfig();
    const baseUrl = input.baseUrl ?? 'http://localhost:11434';
    const model = input.model ?? 'llama3.2:3b';
    updateConfig((c) => {
      c.providers.ollama = { baseUrl, model };
      c.defaultProvider = 'ollama';
    });
    let valid = false;
    try {
      valid = await getProvider(input.provider).testKey();
    } catch (error) {
      writeConfig(previousConfig);
      throw error;
    }
    if (!valid) writeConfig(previousConfig);
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
