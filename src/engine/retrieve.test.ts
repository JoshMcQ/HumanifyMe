// T-64: retrieve the user's own past messages most similar to a draft, for use
// as few-shot voice exemplars. Cosine + recency, MMR diversity, dedup,
// cold-start threshold. Uses the real (deterministic) lexical embedder.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { freshHome, cleanupHome } from '../testUtils.js';
import { samples } from '../storage/index.js';
import { retrieveExemplars } from './retrieve.js';

const LABELS = ['casual'] as ['casual'];
function add(text: string) {
  return samples.add({ text, labels: LABELS, source: 'paste' });
}

const FLASH_1 =
  'hey david have you been working on the flash script at all, just wanted to check if you had it covered or if i should pick it up this week';
const FLASH_2 =
  'are you still planning to work on the flash script this sprint, if not i can take it over since i have bandwidth after the release ships out';
const LUNCH =
  'can we grab lunch on saturday afternoon, i was thinking we could try that new taco place downtown near the office if you are free around noon';
const DEPLOY =
  'the deployment failed again last night, looks like the database migration timed out, going to retry it this morning and watch the logs closely';
const REPORT =
  'thanks for sending over the report, i read through it and it looks solid, just a couple small typos on page three otherwise good to go from me';
const NOTES =
  'i took some notes during the standup meeting this morning about the roadmap and the priorities for next quarter so we can all stay aligned ok';

beforeEach(() => {
  freshHome();
});
afterEach(cleanupHome);

describe('retrieveExemplars (T-64)', () => {
  it('returns [] under the cold-start threshold', async () => {
    add(FLASH_1);
    add(LUNCH);
    add(DEPLOY); // 3 < default minSamples 5
    expect(await retrieveExemplars('have you done the flash script')).toEqual([]);
  });

  it('ranks the draft-relevant samples on top (and backfills missing embeddings)', async () => {
    add(FLASH_1);
    add(LUNCH);
    add(DEPLOY);
    add(REPORT);
    add(NOTES);
    add(FLASH_2);
    const out = await retrieveExemplars(
      'hey have you started on the flash script yet or should i grab it',
    );
    expect(out.length).toBeGreaterThan(0);
    // the single best match must be one of the flash-script messages
    expect([FLASH_1, FLASH_2]).toContain(out[0]!.text);
    // both flash-script messages should be retrieved
    const texts = out.map((e) => e.text);
    expect(texts).toContain(FLASH_1);
    expect(texts).toContain(FLASH_2);
  });

  it('respects topK', async () => {
    add(FLASH_1);
    add(LUNCH);
    add(DEPLOY);
    add(REPORT);
    add(NOTES);
    add(FLASH_2);
    const out = await retrieveExemplars('flash script', { topK: 3 });
    expect(out.length).toBe(3);
  });

  it('dedups near-identical samples (cosine > 0.97)', async () => {
    add(FLASH_1);
    add(FLASH_1); // exact duplicate
    add(LUNCH);
    add(DEPLOY);
    add(REPORT);
    const out = await retrieveExemplars('flash script status check', { topK: 5 });
    expect(out.filter((e) => e.text === FLASH_1).length).toBe(1);
  });

  it('returns [] for an empty draft', async () => {
    add(FLASH_1);
    add(LUNCH);
    add(DEPLOY);
    add(REPORT);
    add(NOTES);
    expect(await retrieveExemplars('   ')).toEqual([]);
  });
});
