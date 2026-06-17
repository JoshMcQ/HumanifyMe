// A single-writer corpus for the RAG ablation (internal eval, not the public
// HMB bench). The voice: casual, lowercase-leaning, short sentences, em-dashes,
// "hey" openers — matched to src/engine/fixtures.ts makeProfile().

import { makeProfile } from '../../src/engine/fixtures.js';
import type { StyleProfile } from '../../src/engine/styleProfile.js';

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

/** Generic AI-generated drafts to be rewritten into the writer's voice. */
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
