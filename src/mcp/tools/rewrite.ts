import { z } from 'zod';
import { ToolDef } from '../registerTool.js';
import { profiles } from '../../storage/index.js';
import { getProvider } from '../../providers/index.js';
import { rewrite } from '../../engine/rewrite.js';
import { rateLimit } from '../rateLimit.js';
import { requireConsent } from '../consent.js';
import { HumanifyError } from '../errors.js';
import {
  ContextLabelSchema,
  DirectiveSchema,
  MAX_DRAFT_CHARS,
  ProviderNameSchema,
} from '../../types.js';

export const humanifyTextTool: ToolDef<z.ZodTypeAny, z.ZodTypeAny> = {
  name: 'humanify_text',
  description:
    "Rewrite a draft (usually AI-generated) so it reads in the user's own voice, using their stored style profile. The headline tool: call this whenever the user wants text to 'sound like me' or 'less AI'.",
  inputSchema: z.object({
    draft: z.string().min(1).max(MAX_DRAFT_CHARS),
    contextLabel: ContextLabelSchema.optional(),
    directives: z.array(DirectiveSchema).optional(),
    provider: ProviderNameSchema.optional(),
  }).strict(),
  outputSchema: z.object({
    rewrite: z.string(),
    diff: z.array(
      z.object({ type: z.enum(['unchanged', 'added', 'removed']), text: z.string() }),
    ),
    notes: z.string().optional(),
    providerLatencyMs: z.number(),
    tokens: z.object({ input: z.number(), output: z.number() }),
    redactionApplied: z.boolean(),
    feedbackToken: z.string(),
  }),
  handler: async (input: {
    draft: string;
    contextLabel?: z.infer<typeof ContextLabelSchema>;
    directives?: z.infer<typeof DirectiveSchema>[];
    provider?: z.infer<typeof ProviderNameSchema>;
  }) => {
    requireConsent();
    const profile = profiles.get();
    if (!profile) {
      throw new HumanifyError(
        'BAD_INPUT',
        'no style profile exists yet. Add at least 3 samples (humanify_add_sample) and run humanify_build_profile first.',
      );
    }
    rateLimit.consume();
    return rewrite({
      draft: input.draft,
      profile,
      contextLabel: input.contextLabel ?? 'email',
      directives: input.directives ?? ['more_like_me'],
      provider: getProvider(input.provider),
    });
  },
};
