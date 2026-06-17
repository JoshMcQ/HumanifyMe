// Deterministic providers for tests. Never touch the network.

import { EmbeddingProvider } from './embeddings.js';
import { fnv1a } from './hash.js';
import { CompletionArgs, CompletionResult, LLMProvider } from './types.js';

export class FakeLLMProvider implements LLMProvider {
  readonly name = 'fake';
  readonly route = '/fake';
  calls: CompletionArgs[] = [];

  /** If set, returns these responses in order (then repeats the last). */
  cannedResponses: string[] = [];
  /** If set, throws this error on the next call. */
  failWith: Error | null = null;

  async complete(args: CompletionArgs): Promise<CompletionResult> {
    this.calls.push(args);
    if (this.failWith) {
      const err = this.failWith;
      this.failWith = null;
      throw err;
    }
    let text: string;
    if (this.cannedResponses.length > 0) {
      const idx = Math.min(this.calls.length - 1, this.cannedResponses.length - 1);
      text = this.cannedResponses[idx]!;
    } else {
      // Deterministic echo: stable transform of the user content.
      text = `[fake-rewrite] ${args.user.slice(0, 400)}`;
    }
    return {
      text,
      inputTokens: Math.ceil((args.system.length + args.user.length) / 4),
      outputTokens: Math.ceil(text.length / 4),
      latencyMs: 1,
    };
  }

  async testKey(): Promise<boolean> {
    return true;
  }
}

/**
 * Deterministic embedding provider for tests. Hashes word tokens into a fixed
 * number of buckets (bag-of-words), then L2-normalizes so cosine similarity
 * equals the dot product. Identical text → identical vector; texts sharing
 * words score higher than disjoint texts — enough to drive retrieval ranking
 * tests without loading the ONNX model or hitting the network.
 */
export class FakeEmbeddingProvider implements EmbeddingProvider {
  readonly model = 'fake-embed';
  readonly dim: number;
  /** Records each batch for assertions. */
  calls: string[][] = [];

  constructor(dim = 64) {
    this.dim = dim;
  }

  async embed(texts: string[]): Promise<Float32Array[]> {
    this.calls.push(texts);
    return texts.map((t) => this.embedOne(t));
  }

  private embedOne(text: string): Float32Array {
    const v = new Float32Array(this.dim);
    const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    for (const tok of tokens) {
      const idx = fnv1a(tok) % this.dim;
      v[idx] = (v[idx] ?? 0) + 1;
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
