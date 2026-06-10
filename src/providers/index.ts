import { readConfig } from '../config/index.js';
import { HumanifyError } from '../mcp/errors.js';
import { ProviderName } from '../types.js';
import { AnthropicProvider } from './anthropic.js';
import { GeminiProvider } from './gemini.js';
import { OllamaProvider, OpenAIProvider } from './openai.js';
import { LLMProvider } from './types.js';

export { FakeLLMProvider } from './fake.js';
export type { LLMProvider, CompletionArgs, CompletionResult } from './types.js';

/** Test seam: when set, getProvider returns this instead of a real provider. */
let providerOverride: LLMProvider | null = null;
export function setProviderOverride(p: LLMProvider | null): void {
  providerOverride = p;
}

export function getProvider(name?: ProviderName): LLMProvider {
  if (providerOverride) return providerOverride;
  const config = readConfig();
  const provider = name ?? config.defaultProvider;
  switch (provider) {
    case 'anthropic': {
      const c = config.providers.anthropic;
      if (!c?.apiKey) throw missingKey('anthropic');
      return new AnthropicProvider(c.apiKey, c.model);
    }
    case 'openai': {
      const c = config.providers.openai;
      if (!c?.apiKey) throw missingKey('openai');
      return new OpenAIProvider(c.apiKey, c.model);
    }
    case 'gemini': {
      const c = config.providers.gemini;
      if (!c?.apiKey) throw missingKey('gemini');
      return new GeminiProvider(c.apiKey, c.model);
    }
    case 'ollama': {
      const c = config.providers.ollama;
      if (!c?.baseUrl) throw missingKey('ollama');
      return new OllamaProvider(c.baseUrl, c.model);
    }
  }
}

function missingKey(provider: string): HumanifyError {
  return new HumanifyError(
    'MISSING_API_KEY',
    `no API key configured for ${provider}. Run "humanifyme provider set ${provider} --api-key <key>" or call humanify_set_provider.`,
  );
}
