// EmbeddingProvider abstraction (T-61), per specs/rewrite-engine-spec.md
// (Retrieval). Mirrors LLMProvider: provider-specific concepts (ONNX runtime,
// model files) must not leak past this interface. The rewrite/retrieval layers
// depend only on this contract, which keeps the heavy local model a pluggable
// adapter rather than a hard dependency.

export interface EmbeddingProvider {
  /** Embedding model id, stored in sample_embeddings.model so a model change
   *  invalidates and recomputes existing vectors. */
  readonly model: string;
  /** Vector dimensionality (e.g. 384 for all-MiniLM-L6-v2). */
  readonly dim: number;
  /** Embed a batch of texts. Returns one unit-normalized vector per input,
   *  in the same order. Empty/whitespace input yields a zero vector. */
  embed(texts: string[]): Promise<Float32Array[]>;
}
