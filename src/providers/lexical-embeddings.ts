// Production default embedder (T-61, per docs/open-questions.md Q-18).
// Dependency-free, offline, deterministic lexical embedding: word unigrams +
// bigrams hashed into a fixed-width vector, TF-weighted, L2-normalized. Strong
// for the short messages this tool targets (coworker pings, PR notes, commits)
// with zero native deps and zero install weight. Neural embedders (MiniLM,
// Ollama) are opt-in upgrades behind the same EmbeddingProvider interface.

import { EmbeddingProvider } from './embeddings.js';
import { fnv1a } from './hash.js';

export class LexicalEmbeddingProvider implements EmbeddingProvider {
  readonly model = 'lexical-v1';
  readonly dim: number;

  constructor(dim = 512) {
    this.dim = dim;
  }

  async embed(texts: string[]): Promise<Float32Array[]> {
    return texts.map((t) => this.embedOne(t));
  }

  private embedOne(text: string): Float32Array {
    const v = new Float32Array(this.dim);
    const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    const bump = (feature: string): void => {
      const idx = fnv1a(feature) % this.dim;
      v[idx] = (v[idx] ?? 0) + 1;
    };
    for (let i = 0; i < tokens.length; i++) {
      bump('u:' + tokens[i]);
      if (i > 0) bump('b:' + tokens[i - 1] + ' ' + tokens[i]);
    }
    let norm = 0;
    for (let i = 0; i < this.dim; i++) {
      const x = v[i] ?? 0;
      norm += x * x;
    }
    norm = Math.sqrt(norm);
    // Zero vector (no tokens) stays zero — never divide by zero / produce NaN.
    if (norm > 0) {
      for (let i = 0; i < this.dim; i++) v[i] = (v[i] ?? 0) / norm;
    }
    return v;
  }
}
