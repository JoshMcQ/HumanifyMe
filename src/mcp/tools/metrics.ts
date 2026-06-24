import { z } from 'zod';
import { ToolDef } from '../registerTool.js';
import { feedback } from '../../storage/index.js';
import { requireConsent } from '../consent.js';

// Local-only quality metrics derived from recorded feedback. Counts and rates
// only — no draft, rewrite, or edited text ever passes through here. This is the
// same shape that, if the user opts in, is shipped as an anonymous aggregate.
const SignalCountsSchema = z.object({
  total: z.number(),
  accept: z.number(),
  edit: z.number(),
  reject: z.number(),
});

export const metricsTool: ToolDef<z.ZodTypeAny, z.ZodTypeAny> = {
  name: 'humanify_metrics',
  description:
    'Show how well HumanifyMe is matching the user\'s voice, from their own recorded feedback: total rewrites, accept/edit/reject rates, "sounds like me" breakdown, per-context and per-provider counts, and p50/p95 latency. Local only; counts, never content. Optional `since` (ISO timestamp) windows the stats.',
  inputSchema: z
    .object({ since: z.string().datetime({ offset: true }).optional() })
    .strict(),
  outputSchema: z.object({
    total: z.number(),
    recorded: z.number(),
    acceptRate: z.number(),
    editRate: z.number(),
    rejectRate: z.number(),
    byContext: z.record(SignalCountsSchema),
    byProvider: z.record(SignalCountsSchema),
    latencyP50: z.number(),
    latencyP95: z.number(),
    soundsLikeMe: z.object({ y: z.number(), kinda: z.number(), n: z.number() }),
  }),
  handler: async (input: { since?: string }) => {
    requireConsent();
    return feedback.metrics(input.since ? { since: input.since } : {});
  },
};
