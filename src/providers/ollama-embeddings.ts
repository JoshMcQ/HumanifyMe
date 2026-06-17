// Optional local-neural embedder via Ollama (M8, opt-in behind rag.embedder).
// Local endpoint the user runs themselves; no cloud call. Never on the default
// path — the dependency-free lexical embedder is the default.

import { EmbeddingProvider } from './embeddings.js';
import { HumanifyError } from '../mcp/errors.js';

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly model: string;
  readonly dim = 768; // nominal (nomic-embed-text); the actual length is stored per row.
  private readonly embedModel: string;

  constructor(
    private readonly baseUrl: string,
    embedModel = 'nomic-embed-text',
  ) {
    this.embedModel = embedModel;
    this.model = `ollama:${embedModel}`;
  }

  async embed(texts: string[]): Promise<Float32Array[]> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/api/embeddings`;
    const out: Float32Array[] = [];
    for (const text of texts) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: this.embedModel, prompt: text }),
      });
      if (!res.ok) {
        throw new HumanifyError('PROVIDER_ERROR', `Ollama embeddings request failed: ${res.status}`);
      }
      const json = (await res.json()) as { embedding?: number[] };
      if (!json.embedding) {
        throw new HumanifyError('PROVIDER_ERROR', 'Ollama returned no embedding');
      }
      out.push(Float32Array.from(json.embedding));
    }
    return out;
  }
}
