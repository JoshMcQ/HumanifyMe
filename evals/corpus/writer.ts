// Corpus for the RAG ablation (internal eval, not the public HMB bench).
//
// TWO writers with opposite registers, on purpose: the engine must adapt casing
// and grammar to *whoever the user is*, never to a house style. Writer A is
// casual/lowercase; Writer B is formal/sentence-case. The same generic-AI drafts
// are rewritten for both — the proof is that A's rewrites come out lowercase and
// B's come out properly capitalized, measured deterministically (see
// evals/scorers/casing.ts) and confirmed by a blind judge.

import { makeProfile } from '../../src/engine/fixtures.js';
import type { StyleProfile } from '../../src/engine/styleProfile.js';

// ── Writer A: casual, lowercase-leaning (matches src/engine/fixtures.ts) ──
export const WRITER_PROFILE: StyleProfile = makeProfile();

/** The writer's real past messages (the voice-memory corpus). Each >= 100 chars
 *  to satisfy sample validation. */
export const WRITER_SAMPLES: string[] = [
  "hey did you ever get anywhere with the flash script? no rush at all, just trying to figure out if i should pick it up or if you've got it this week",
  "yeah saturday works for me — was thinking we could try that new taco place downtown around noon if you're free, lmk what works for you",
  "no worries, take your time on it. i'm heads down on the release stuff anyway so there's no rush on my end, just ping me whenever it's ready",
  "quick one — did the deploy ever go through last night? saw the migration was timing out so wasn't sure if it finished or if it's still stuck",
  "thanks for sending the doc over, read through it and it looks solid to me. couple tiny typos on page 3 but otherwise good to go, ship it",
  "hey can you resend the deck when you get a sec? i think the link expired and i need it for the thing with the client tomorrow morning, thanks",
];

// ── Writer B: formal, complete sentences, proper capitalization ──
const _defaults = makeProfile();
export const FORMAL_WRITER_PROFILE: StyleProfile = makeProfile({
  base: {
    ..._defaults.base,
    sentenceLength: { average: 'long', variance: 'medium' },
    formality: 4,
    directness: 3,
    humor: 'none',
    profanity: 'none',
    contractions: 'rare',
    oxfordComma: true,
    punctuationHabits: {
      emDash: 'rare',
      semicolon: 'sometimes',
      ellipsis: 'rare',
      exclamation: 'rare',
      parentheses: 'sometimes',
    },
    capitalization: { sentenceCase: true, titleCase: 'sometimes', allLowercase: false },
    commonPhrases: ['that said', 'to clarify'],
    greetings: ['Hi', 'Hello'],
    signoffs: ['Best', 'Thank you'],
    exemplars: ['Hi — could you resend the deck when you have a moment? Thank you.'],
  },
  contexts: {},
  metadata: { sampleCount: 6, labelCoverage: ['email', 'professional'] },
});

/** Writer B's real past messages — formal, properly capitalized, full sentences. */
export const FORMAL_WRITER_SAMPLES: string[] = [
  'Hi — could you let me know whether you have made any progress on the flash script? There is no urgency; I simply want to determine whether I should take it on this week.',
  'Saturday works well for me. I was thinking we might try the new taco place downtown around noon, if that suits you. Please let me know what works.',
  'Please take your time with it. I am focused on the release work at the moment, so there is no rush on my end. Just let me know when it is ready.',
  'Did the deployment complete last night? I noticed that the migration was timing out, so I wanted to confirm whether it finished or whether it is still stuck.',
  'Thank you for sending the document. I read through it and it looks solid. There are a couple of small typos on page 3, but it is otherwise ready to go.',
  'Could you resend the deck when you have a moment? I believe the link has expired, and I need it for the client meeting tomorrow morning. Thank you.',
];

/** The two writers under test, with the casing register each rewrite must hold. */
export const WRITERS: {
  name: string;
  profile: StyleProfile;
  samples: string[];
  /** True if rewrites should keep normal sentence-case starts; false = lowercase. */
  expectSentenceCase: boolean;
}[] = [
  { name: 'A · casual / lowercase', profile: WRITER_PROFILE, samples: WRITER_SAMPLES, expectSentenceCase: false },
  { name: 'B · formal / sentence-case', profile: FORMAL_WRITER_PROFILE, samples: FORMAL_WRITER_SAMPLES, expectSentenceCase: true },
];

/** Generic AI-generated drafts to be rewritten into each writer's voice. */
export const DRAFTS: { contextLabel: string; draft: string }[] = [
  {
    contextLabel: 'casual',
    draft:
      'I am writing to follow up regarding the flash script. Could you please let me know whether you have had an opportunity to make progress on it, or whether it would be beneficial for me to assume responsibility for it this week?',
  },
  {
    contextLabel: 'casual',
    draft:
      'I wanted to reach out to confirm whether you would be available to have lunch this Saturday afternoon. I was thinking we could explore the new taco establishment located downtown, perhaps around noon, should that be convenient for you.',
  },
  {
    contextLabel: 'casual',
    draft:
      'Please be advised that the deployment encountered a failure last night as a result of a database migration timeout. I wanted to inquire as to whether the process ultimately completed successfully or whether it remains in a stuck state.',
  },
  {
    contextLabel: 'casual',
    draft:
      'Thank you very much for sending over the document. I have reviewed it in its entirety and am pleased to report that it appears to be in excellent condition. There are a couple of minor typographical errors on page three; however, it is otherwise ready to proceed.',
  },
  {
    contextLabel: 'casual',
    draft:
      'I would greatly appreciate it if you could resend the presentation deck at your earliest convenience. It appears that the previous link has expired, and I require access to the materials for an upcoming meeting with the client tomorrow morning.',
  },
];
