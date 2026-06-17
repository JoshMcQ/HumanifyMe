// T4 (AI-smell reduction) scorer per specs/evals-spec.md. Density of generic-AI
// "tell" phrases — the verbal fingerprints that make text read as machine-
// written. Lower is better. Deterministic; no network.

/** Public list of AI-tell phrases/words. Matched whole-word (case-insensitive),
 *  so "leverage" is caught but not substrings of unrelated words. */
export const AI_TELL_PHRASES: string[] = [
  'delighted to',
  'i hope this message finds you',
  'i hope this email finds you',
  "in today's fast-paced",
  'in the world of',
  'it is worth noting',
  "it's worth noting",
  'it is important to note',
  'a testament to',
  'navigating the',
  'tapestry',
  'leverage',
  'leveraging',
  'seamless',
  'seamlessly',
  'unlock',
  'supercharge',
  'empower',
  'world-class',
  'cutting-edge',
  'game-changer',
  'game-changing',
  'robust',
  'furthermore',
  'moreover',
  'in conclusion',
  'rest assured',
  'at the end of the day',
  'that being said',
  'dive into',
  'deep dive',
  'delve into',
  'elevate',
  'streamline',
  'underscore',
  'pave the way',
  'in summary',
  'needless to say',
  'first and foremost',
  'a wide range of',
  'plays a crucial role',
  'plays a vital role',
  'embark on',
  'paradigm',
  'holistic',
  'synergy',
  'synergistic',
  'utilize',
  'facilitate',
  'commendable',
  'meticulous',
  'whilst',
  'aforementioned',
];

export interface AiSmellResult {
  count: number;
  per100Words: number;
  hits: string[];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function aiSmellScore(text: string): AiSmellResult {
  const hits: string[] = [];
  for (const phrase of AI_TELL_PHRASES) {
    const re = new RegExp(`\\b${escapeRegex(phrase)}\\b`, 'gi');
    const matches = text.match(re);
    if (matches) for (let i = 0; i < matches.length; i++) hits.push(phrase);
  }
  const words = (text.match(/\b[\w']+\b/g) ?? []).length || 1;
  return { count: hits.length, per100Words: (hits.length / words) * 100, hits };
}
