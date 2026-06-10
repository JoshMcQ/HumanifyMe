// Shared test fixture: a minimal valid StyleProfile.

import { StyleProfile } from './styleProfile.js';

export function makeProfile(overrides: Partial<StyleProfile> = {}): StyleProfile {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    base: {
      sentenceLength: { average: 'medium', variance: 'high' },
      formality: 2,
      directness: 4,
      humor: 'dry',
      profanity: 'mild',
      contractions: 'always',
      oxfordComma: true,
      punctuationHabits: {
        emDash: 'frequent',
        semicolon: 'rare',
        ellipsis: 'rare',
        exclamation: 'sometimes',
        parentheses: 'sometimes',
      },
      capitalization: { sentenceCase: true, titleCase: 'never', allLowercase: false },
      commonPhrases: ['long story short', 'to be fair'],
      wordsToAvoid: ['leverage', 'delighted', 'seamless'],
      greetings: ['hey'],
      signoffs: ['thanks', '—J'],
      howTheyAskQuestions: 'Short, direct questions. Rarely hedges.',
      howTheyDisagree: 'States disagreement plainly, then gives one reason.',
      howTheyApologize: 'Brief, owns it, moves to the fix.',
      howTheyGiveInstructions: 'Numbered steps, no fluff.',
      exemplars: ['hey — quick one. can you resend the deck? thanks'],
    },
    contexts: {
      professional: {
        overrides: { formality: 3 },
        notes: 'Slightly more formal at work, still uses contractions.',
        exemplars: ['Hey team, quick update on the launch timeline.'],
      },
    },
    metadata: { sampleCount: 5, labelCoverage: ['email', 'professional'] },
    ...overrides,
  };
}
