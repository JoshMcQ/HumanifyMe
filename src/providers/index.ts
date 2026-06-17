import { readConfig } from '../config/index.js';
import { HumanifyError } from '../mcp/errors.js';
import { ProviderName } from '../types.js';
import { AnthropicProvider } from './anthropic.js';
import { EmbeddingProvider } from './embeddings.js';
import { GeminiProvider } from './gemini.js';
import { LexicalEmbeddingProvider } from './lexical-embeddings.js';
import { MiniLmEmbeddingProvider } from './minilm-embeddings.js';
import { OllamaEmbeddingProvider } from './ollama-embeddings.js';
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
let miniLmEmbedder: EmbeddingProvider | null = null;

/**
 * The embedder used for retrieval, selected by config.rag.embedder. Defaults to
 * the dependency-free lexical embedder (Q-18). The neural options (MiniLM via
 * transformers.js, Ollama) are local-only and opt-in; they are never required
 * for the default path.
 */
export function getEmbeddingProvider(): EmbeddingProvider {
  if (embeddingOverride) return embeddingOverride;
  const config = readConfig();
  switch (config.rag.embedder) {
    case 'ollama': {
      const c = config.providers.ollama;
      if (!c?.baseUrl) {
        throw new HumanifyError(
          'MISSING_API_KEY',
          'rag.embedder is "ollama" but no Ollama baseUrl is configured. Run "humanifyme provider set ollama --base-url <url>".',
        );
      }
      return new OllamaEmbeddingProvider(c.baseUrl);
    }
    case 'minilm': {
      if (!miniLmEmbedder) miniLmEmbedder = new MiniLmEmbeddingProvider();
      return miniLmEmbedder;
    }
    case 'lexical':
    default: {
      if (!lexicalEmbedder) lexicalEmbedder = new LexicalEmbeddingProvider();
      return lexicalEmbedder;
    }
  }
}

function missingKey(provider: string): HumanifyError {
  return new HumanifyError(
    'MISSING_API_KEY',
    `no API key configured for ${provider}. Run "humanifyme provider set ${provider} --api-key <key>" or call humanify_set_provider.`,
  );
}
