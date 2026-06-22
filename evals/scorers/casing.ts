// Casing-fidelity scorer for the RAG ablation. Measures the fraction of
// sentences that begin with a capital letter — the simplest deterministic proxy
// for "lowercase register" vs "normal sentence case". A lowercase writer's
// rewrites should score near 0; a formal writer's near 1. Mirrors the sentence
// split used by the engine's verifier so the eval and the guard agree.

/** Fraction (0–1) of sentences in `text` whose first letter is uppercase.
 *  Sentences with no alphabetic character are ignored. Returns 0 for empty. */
export function uppercaseStartRate(text: string): number {
  const sentences = text
    .split(/(?:[.!?]+\s+|\n+)/)
    .map((s) => s.trim())
    .filter(Boolean);
  let upper = 0;
  let total = 0;
  for (const s of sentences) {
    const m = s.match(/[A-Za-z]/);
    if (!m) continue;
    total++;
    if (m[0] >= 'A' && m[0] <= 'Z') upper++;
  }
  return total === 0 ? 0 : upper / total;
}
