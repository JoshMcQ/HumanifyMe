// T4 (AI-smell reduction) scorer per specs/evals-spec.md. The production
// analyzer owns the phrase bank so evaluation and user-facing results cannot
// drift into separate definitions.

import { countAiTellPhrases } from '../../src/quality/aiSigns.js';

export interface AiSmellResult {
  count: number;
  per100Words: number;
  hits: string[];
}

export function aiSmellScore(text: string): AiSmellResult {
  const { count, hits } = countAiTellPhrases(text);
  const words = (text.match(/\b[\w']+\b/g) ?? []).length || 1;
  return { count, per100Words: (count / words) * 100, hits };
}
