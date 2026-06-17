// T-64: retrieve a user's own past messages most similar to a draft, to use as
// few-shot voice exemplars in the rewrite prompt. Per specs/rewrite-engine-spec.md
// (Retrieval) and docs/open-questions.md Q-18..Q-22:
//   - semantic cosine over local sample embeddings, recency tiebreaker
//   - MMR diversity so near-duplicates don't crowd the prompt
//   - hard dedup above a cosine threshold
//   - cold-start: return [] below rag.minSamples (engine falls back to profile-only)
// Retrieved text is RAW here; the rewrite pipeline redacts each exemplar at send
// time (T-65). This module never sends anything over the network.

import { getEmbeddingProvider } from '../providers/index.js';
import { embeddings, samples } from '../storage/index.js';
import { backfillEmbeddings } from './voiceMemory.js';

export interface RetrievedExemplar {
  sampleId: string;
  text: string;
  /** Cosine similarity of this sample to the draft. */
  score: number;
}

export interface RetrieveOptions {
  topK?: number;
  minSamples?: number;
  mmrLambda?: number;
  dedupCosine?: number;
}

export const RAG_DEFAULTS = { topK: 5, minSamples: 5, mmrLambda: 0.7, dedupCosine: 0.97 };
/** Below this many samples, retrieval returns [] and the engine stays profile-only. */
export const RAG_MIN_SAMPLES = RAG_DEFAULTS.minSamples;

interface Candidate {
  id: string;
  text: string;
  createdAt: string;
  vector: Float32Array;
  score: number;
}

export async function retrieveExemplars(
  draft: string,
  opts: RetrieveOptions = {},
): Promise<RetrievedExemplar[]> {
  const { topK, minSamples, mmrLambda, dedupCosine } = { ...RAG_DEFAULTS, ...opts };

  // Cold start: not enough voice to retrieve from.
  if (samples.count() < minSamples) return [];

  // Self-heal: ensure every sample has a current-model vector before scoring.
  await backfillEmbeddings();

  const embedder = getEmbeddingProvider();
  const [draftVec] = await embedder.embed([draft]);
  if (!draftVec || l2(draftVec) === 0) return [];

  const sampleById = new Map(samples.list().map((s) => [s.id, s]));
  const candidates: Candidate[] = [];
  for (const e of embeddings.list(embedder.model)) {
    const s = sampleById.get(e.sampleId);
    if (!s) continue;
    candidates.push({
      id: e.sampleId,
      text: s.text,
      createdAt: s.createdAt,
      vector: e.vector,
      score: cosine(draftVec, e.vector),
    });
  }
  if (candidates.length === 0) return [];

  // Greedy MMR selection with a hard dedup gate.
  const selected: Candidate[] = [];
  const pool = candidates.slice();
  while (selected.length < topK && pool.length > 0) {
    let bestIdx = -1;
    let bestVal = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const c = pool[i]!;
      const maxSim = maxSimTo(c, selected);
      const mmr = mmrLambda * c.score - (1 - mmrLambda) * maxSim;
      if (mmr > bestVal || (mmr === bestVal && bestIdx >= 0 && c.createdAt > pool[bestIdx]!.createdAt)) {
        bestVal = mmr;
        bestIdx = i;
      }
    }
    const best = pool.splice(bestIdx, 1)[0]!;
    // Drop near-duplicates of something already chosen.
    if (maxSimTo(best, selected) > dedupCosine) continue;
    selected.push(best);
  }

  return selected.map((c) => ({ sampleId: c.id, text: c.text, score: c.score }));
}

function maxSimTo(c: Candidate, selected: Candidate[]): number {
  let max = 0;
  for (const s of selected) {
    const sim = cosine(c.vector, s.vector);
    if (sim > max) max = sim;
  }
  return max;
}

function l2(v: Float32Array): number {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i]! * v[i]!;
  return Math.sqrt(s);
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
