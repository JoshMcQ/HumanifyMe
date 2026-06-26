import { z } from 'zod';
import { ToolDef } from '../registerTool.js';
import { feedback } from '../../storage/index.js';
import { requireConsent } from '../consent.js';

// Records the user's answer to "did this sound like you?" for one rewrite. The
// yes/kinda/no the skills and CLI present map onto the accept/edit/reject signal
// (see SIGNAL_TO_SOUNDS_LIKE_ME). editedText is accepted for forward-compat but
// NEVER persisted; only the signal and an optional short local reason are stored.
export const recordFeedbackTool: ToolDef<z.ZodTypeAny, z.ZodTypeAny> = {
  name: 'humanify_record_feedback',
  description:
    "Record whether a humanify_text rewrite sounded like the user. Pass the feedbackToken from that rewrite and a signal: 'accept' (sounded like me / used as-is), 'edit' (kinda — I tweaked it), or 'reject' (no — didn't sound like me). Optional short reason. This powers local quality metrics (humanify_metrics) and, only if the user opted in, anonymous aggregate counts.",
  inputSchema: z
    .object({
      token: z.string().uuid(),
      signal: z.enum(['accept', 'edit', 'reject']),
      reason: z.string().max(2000).optional(),
      /** Accepted but never stored — raw user content. Used only to acknowledge. */
      editedText: z.string().optional(),
    })
    .strict(),
  outputSchema: z.object({ recorded: z.boolean(), signal: z.enum(['accept', 'edit', 'reject']) }),
  handler: async (input: {
    token: string;
    signal: 'accept' | 'edit' | 'reject';
    reason?: string;
    editedText?: string;
  }) => {
    requireConsent();
    feedback.record({ token: input.token, signal: input.signal, reason: input.reason ?? null });
    return { recorded: true, signal: input.signal };
  },
};
