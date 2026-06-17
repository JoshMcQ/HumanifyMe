// T-63: embed-on-ingest. Every sample that enters storage gets a vector, and a
// backfill self-heals any that were missed (idempotent).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { freshHome, cleanupHome } from '../testUtils.js';
import { samples, embeddings } from '../storage/index.js';
import { getEmbeddingProvider } from '../providers/index.js';
import { backfillEmbeddings, embedSample } from './voiceMemory.js';
import { addSampleTool } from '../mcp/tools/samples.js';

const input = { text: 'x'.repeat(150), labels: ['email'] as ['email'], source: 'paste' as const };

beforeEach(() => {
  freshHome();
});
afterEach(cleanupHome);

describe('voice memory ingest (T-63)', () => {
  it('embedSample writes a vector under the active model', async () => {
    const s = samples.add(input);
    await embedSample(s.id, s.text);
    const rec = embeddings.get(s.id);
    expect(rec).not.toBeNull();
    expect(rec!.model).toBe(getEmbeddingProvider().model);
    expect(rec!.dim).toBe(getEmbeddingProvider().dim);
  });

  it('backfillEmbeddings is idempotent and covers all samples', async () => {
    samples.add(input);
    samples.add(input);
    expect(await backfillEmbeddings()).toBe(2);
    expect(embeddings.count()).toBe(2);
    expect(await backfillEmbeddings()).toBe(0);
    expect(embeddings.count()).toBe(2);
  });

  it('humanify_add_sample writes an embedding as part of ingest', async () => {
    const out = (await addSampleTool.handler({ text: 'y'.repeat(150), labels: ['email'] })) as {
      id: string;
    };
    expect(embeddings.get(out.id)).not.toBeNull();
  });
});
