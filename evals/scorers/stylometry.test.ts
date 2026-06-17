// T5 (stylometric distance) scorer per specs/evals-spec.md. Deterministic, no
// network. Distance from a candidate's style features to the writer's sample
// centroid (z-normalized so no single feature dominates). Lower = closer voice.

import { describe, expect, it } from 'vitest';
import { styleDistance, styleFeatures } from './stylometry.js';

const SAMPLES = [
  'hey can you resend the deck? thanks',
  "yeah that works for me, let's do friday",
  'no worries, take your time on it',
  'did you get a chance to look at the script yet?',
  'sounds good — i’ll ping you when it’s ready',
];

describe('styleFeatures', () => {
  it('returns a fixed-length numeric vector', () => {
    const v = styleFeatures('hey there, how are you?');
    expect(Array.isArray(v)).toBe(true);
    expect(v.length).toBeGreaterThan(3);
    expect(v.every((x) => Number.isFinite(x))).toBe(true);
  });

  it('does not crash on empty text', () => {
    expect(styleFeatures('').every((x) => Number.isFinite(x))).toBe(true);
  });
});

describe('styleDistance (T5)', () => {
  it('text in the writer’s style is closer than text that is not', () => {
    const likeWriter = 'hey did you grab the report yet? no rush';
    const unlikeWriter =
      'I am writing to formally request your immediate attention regarding the aforementioned matter, as it is of considerable importance.';
    const near = styleDistance(likeWriter, SAMPLES);
    const far = styleDistance(unlikeWriter, SAMPLES);
    expect(far).toBeGreaterThan(near);
  });

  it('returns a finite non-negative number', () => {
    const d = styleDistance('hey thanks', SAMPLES);
    expect(Number.isFinite(d)).toBe(true);
    expect(d).toBeGreaterThanOrEqual(0);
  });
});
