// Voice memory ingest (T-63). Computes and stores local embeddings of writing
// samples so the rewrite engine can retrieve the user's own most-similar past
// messages per draft. Embeds the stored sample text on-device; never logs
// sample content. The retrieval/redaction-at-send happens later in the engine.

import { getEmbeddingProvider } from '../providers/index.js';
import { embeddings, samples } from '../storage/index.js';

/** Embed one sample's text and store the vector (upsert under the active model). */
export async function embedSample(sampleId: string, text: string): Promise<void> {
  const embedder = getEmbeddingProvider();
  const [vector] = await embedder.embed([text]);
  if (vector) embeddings.put({ sampleId, model: embedder.model, vector });
}

/**
 * Embed every sample that lacks a vector for the active model. Idempotent —
 * safe to call after any ingest path or at startup. Returns how many were
 * embedded this call. This is the safety net that guarantees coverage even if
 * an ingest path forgets to embed inline.
 */
export async function backfillEmbeddings(): Promise<number> {
  const embedder = getEmbeddingProvider();
  const missing = samples.list().filter((s) => !embeddings.has(s.id, embedder.model));
  if (missing.length === 0) return 0;
  const vectors = await embedder.embed(missing.map((s) => s.text));
  missing.forEach((s, i) => {
    const vector = vectors[i];
    if (vector) embeddings.put({ sampleId: s.id, model: embedder.model, vector });
  });
  return missing.length;
}
