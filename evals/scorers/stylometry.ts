// T5 (stylometric distance) scorer per specs/evals-spec.md. Authorship-style
// features (sentence length, word length, punctuation/contraction/casing rates)
// compared to the writer's sample centroid, z-normalized so features on
// different scales contribute comparably. Lower distance = closer to the voice.
// Deterministic; no network. A fast pre-screen, never the final word.

function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function words(text: string): string[] {
  return text.match(/\b[\w']+\b/g) ?? [];
}

/** Fixed-length feature vector. Order is stable across calls. */
export function styleFeatures(text: string): number[] {
  const sentences = splitSentences(text);
  const w = words(text);
  const nWords = w.length || 1;
  const nSentences = sentences.length || 1;

  const avgSentenceLen = w.length / nSentences;
  const avgWordLen = w.reduce((sum, x) => sum + x.length, 0) / nWords;
  const commaRate = (text.match(/,/g)?.length ?? 0) / nWords;
  const exclamationRate = (text.match(/!/g)?.length ?? 0) / nSentences;
  const questionRate = (text.match(/\?/g)?.length ?? 0) / nSentences;
  const dashRate = (text.match(/—|--/g)?.length ?? 0) / nWords;
  const contractionRate = w.filter((x) => /['’]/.test(x)).length / nWords;
  const lowercaseStartRate =
    sentences.filter((s) => /^[a-z]/.test(s)).length / nSentences;

  return [
    avgSentenceLen,
    avgWordLen,
    commaRate,
    exclamationRate,
    questionRate,
    dashRate,
    contractionRate,
    lowercaseStartRate,
  ];
}

/** Euclidean distance of `text`'s features to the sample centroid, with each
 *  feature z-normalized by the sample set's own spread. */
export function styleDistance(text: string, samples: string[]): number {
  if (samples.length === 0) return 0;
  const vectors = samples.map(styleFeatures);
  const dim = vectors[0]!.length;

  const mean = new Array(dim).fill(0);
  for (const v of vectors) for (let j = 0; j < dim; j++) mean[j] += v[j]! / vectors.length;

  const variance = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let j = 0; j < dim; j++) {
      const d = v[j]! - mean[j];
      variance[j] += (d * d) / vectors.length;
    }
  }
  const std = variance.map((x) => Math.sqrt(x));

  const t = styleFeatures(text);
  let sum = 0;
  for (let j = 0; j < dim; j++) {
    // Stable floor: when a feature has ~no spread across samples, normalize by
    // its own magnitude so a deviation lands at order ~1 rather than blowing up
    // and letting one feature dominate the distance.
    const s = Math.max(std[j], 0.25 * Math.abs(mean[j]), 0.01);
    const z = (t[j]! - mean[j]) / s;
    sum += z * z;
  }
  return Math.sqrt(sum);
}
