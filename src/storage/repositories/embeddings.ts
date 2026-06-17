// Repository for sample_embeddings (M8, T-62). The retrieval key for the
// rewrite engine. Vectors are stored as raw Float32Array bytes in a BLOB.

import { getDb } from '../db.js';

export interface EmbeddingRecord {
  sampleId: string;
  /** Embedding model id; a change invalidates the vector (recompute). */
  model: string;
  dim: number;
  vector: Float32Array;
  createdAt: string;
}

interface Row {
  sample_id: string;
  model: string;
  dim: number;
  vector: Uint8Array;
  created_at: string;
}

function toBlob(vec: Float32Array): Uint8Array {
  return new Uint8Array(vec.buffer, vec.byteOffset, vec.byteLength);
}

function fromBlob(blob: Uint8Array, dim: number): Float32Array {
  // Copy into a fresh, 4-byte-aligned buffer; the stored BLOB may be returned
  // as a view with a non-zero / unaligned byteOffset.
  return new Float32Array(new Uint8Array(blob).buffer, 0, dim);
}

function rowToRecord(row: Row): EmbeddingRecord {
  return {
    sampleId: row.sample_id,
    model: row.model,
    dim: row.dim,
    vector: fromBlob(row.vector, row.dim),
    createdAt: row.created_at,
  };
}

export const embeddings = {
  /** Upsert: re-embedding a sample overwrites its prior vector. */
  put(input: { sampleId: string; model: string; vector: Float32Array }): EmbeddingRecord {
    const record: EmbeddingRecord = {
      sampleId: input.sampleId,
      model: input.model,
      dim: input.vector.length,
      vector: input.vector,
      createdAt: new Date().toISOString(),
    };
    getDb()
      .prepare(
        `INSERT INTO sample_embeddings (sample_id, model, dim, vector, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(sample_id) DO UPDATE SET
           model = excluded.model, dim = excluded.dim,
           vector = excluded.vector, created_at = excluded.created_at`,
      )
      .run(record.sampleId, record.model, record.dim, toBlob(record.vector), record.createdAt);
    return record;
  },

  get(sampleId: string): EmbeddingRecord | null {
    const row = getDb()
      .prepare('SELECT * FROM sample_embeddings WHERE sample_id = ?')
      .get(sampleId) as unknown as Row | undefined;
    return row ? rowToRecord(row) : null;
  },

  /** True if this sample already has a vector for `model` — backfill guard. */
  has(sampleId: string, model: string): boolean {
    const row = getDb()
      .prepare('SELECT 1 AS n FROM sample_embeddings WHERE sample_id = ? AND model = ?')
      .get(sampleId, model) as unknown as { n: number } | undefined;
    return row !== undefined;
  },

  list(model?: string): EmbeddingRecord[] {
    const db = getDb();
    const rows = (
      model
        ? db
            .prepare('SELECT * FROM sample_embeddings WHERE model = ? ORDER BY created_at ASC')
            .all(model)
        : db.prepare('SELECT * FROM sample_embeddings ORDER BY created_at ASC').all()
    ) as unknown as Row[];
    return rows.map(rowToRecord);
  },

  remove(sampleId: string): boolean {
    return getDb().prepare('DELETE FROM sample_embeddings WHERE sample_id = ?').run(sampleId).changes > 0;
  },

  clear(): void {
    getDb().prepare('DELETE FROM sample_embeddings').run();
  },

  count(): number {
    const row = getDb()
      .prepare('SELECT COUNT(*) AS n FROM sample_embeddings')
      .get() as unknown as { n: number };
    return row.n;
  },
};
