import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { freshHome, cleanupHome } from '../testUtils.js';
import { buildProfile } from './buildProfile.js';
import { makeProfile } from './fixtures.js';
import { FakeLLMProvider } from '../providers/fake.js';
import { samples, profiles } from '../storage/index.js';

beforeEach(freshHome);
afterEach(cleanupHome);

const text =
  'Honestly the hardest part was getting the tests to run at all. I think we should ship the smaller version first and see what people do.';

function seedSamples(n = 3): void {
  for (let i = 0; i < n; i++) {
    samples.add({ text: `${text} (#${i})`, labels: ['email'], source: 'paste' });
  }
}

describe('buildProfile', () => {
  it('fails clearly under 3 samples', async () => {
    await expect(buildProfile(new FakeLLMProvider(), { force: true })).rejects.toThrow(
      /at least 3 samples/,
    );
  });

  it('redacts samples before the LLM sees them', async () => {
    samples.add({
      text: `contact me at josh@example.com — ${text}`,
      labels: ['email'],
      source: 'paste',
    });
    seedSamples(2);
    const fake = new FakeLLMProvider();
    fake.cannedResponses = [JSON.stringify(makeProfile())];
    await buildProfile(fake, { force: true });
    expect(fake.calls[0]!.user).not.toContain('josh@example.com');
    expect(fake.calls[0]!.user).toContain('[EMAIL_1]');
  });

  it('tolerates code fences around the JSON', async () => {
    seedSamples();
    const fake = new FakeLLMProvider();
    fake.cannedResponses = ['```json\n' + JSON.stringify(makeProfile()) + '\n```'];
    const profile = await buildProfile(fake, { force: true });
    expect(profile.version).toBe(1);
  });

  it('retries once on invalid output, then OUTPUT_INVALID', async () => {
    seedSamples();
    const fake = new FakeLLMProvider();
    fake.cannedResponses = ['not json at all', 'still not json'];
    await expect(buildProfile(fake, { force: true })).rejects.toMatchObject({
      code: 'OUTPUT_INVALID',
    });
    expect(fake.calls).toHaveLength(2);
  });

  it('overrides sampleCount with the true count and persists', async () => {
    seedSamples(4);
    const fake = new FakeLLMProvider();
    fake.cannedResponses = [
      JSON.stringify(makeProfile({ metadata: { sampleCount: 999, labelCoverage: ['email'] } })),
    ];
    const profile = await buildProfile(fake, { force: true });
    expect(profile.metadata.sampleCount).toBe(4);
    expect(profiles.get()?.metadata.sampleCount).toBe(4);
  });

  it('reports progress stages in order', async () => {
    seedSamples();
    const fake = new FakeLLMProvider();
    fake.cannedResponses = [JSON.stringify(makeProfile())];
    const stages: string[] = [];
    await buildProfile(fake, { force: true, onProgress: (p) => stages.push(p.stage) });
    expect(stages[0]).toBe('redacting');
    expect(stages).toContain('calling_llm');
    expect(stages[stages.length - 1]).toBe('persisting');
  });

  it('returns the recent existing profile unless forced', async () => {
    seedSamples();
    profiles.set(makeProfile());
    const fake = new FakeLLMProvider();
    const profile = await buildProfile(fake, { force: false });
    expect(profile).not.toBeNull();
    expect(fake.calls).toHaveLength(0);
  });
});
