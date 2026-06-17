import { readConfig } from '../config/index.js';
import { HumanifyError } from '../mcp/errors.js';
import { ProviderName } from '../types.js';
import { AnthropicProvider } from './anthropic.js';
import { EmbeddingProvider } from './embeddings.js';
import { GeminiProvider } from './gemini.js';
import { LexicalEmbeddingProvider } from './lexical-embeddings.js';
import { OllamaProvider, OpenAIProvider } from './openai.js';
import { LLMProvider } from './types.js';

export { FakeLLMProvider, FakeEmbeddingProvider } from './fake.js';
export type { LLMProvider, CompletionArgs, CompletionResult } from './types.js';
export type { EmbeddingProvider } from './embeddings.js';

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

/** Test seam: when set, getEmbeddingProvider returns this instead. */
let embeddingOverride: EmbeddingProvider | null = null;
export function setEmbeddingProviderOverride(p: EmbeddingProvider | null): void {
  embeddingOverride = p;
}

let lexicalEmbedder: LexicalEmbeddingProvider | null = null;

/**
 * The embedder used for retrieval. Defaults to the dependency-free lexical
 * embedder (Q-18); opt-in local neural embedders (MiniLM/Ollama) will be
 * selected here via config.rag.embedder once that config block lands (T-65/66).
 */
export function getEmbeddingProvider(): EmbeddingProvider {
  if (embeddingOverride) return embeddingOverride;
  if (!lexicalEmbedder) lexicalEmbedder = new LexicalEmbeddingProvider();
  return lexicalEmbedder;
}

function missingKey(provider: string): HumanifyError {
  return new HumanifyError(
    'MISSING_API_KEY',
    `no API key configured for ${provider}. Run "humanifyme provider set ${provider} --api-key <key>" or call humanify_set_provider.`,
  );
}
