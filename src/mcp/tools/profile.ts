import { z } from 'zod';
import { ToolDef } from '../registerTool.js';
import { profiles } from '../../storage/index.js';
import { StyleProfileSchema } from '../../engine/styleProfile.js';
import { buildProfile } from '../../engine/buildProfile.js';
import { getProvider } from '../../providers/index.js';
import { requireConsent } from '../consent.js';

export const getProfileTool: ToolDef<z.ZodTypeAny, z.ZodTypeAny> = {
  name: 'humanify_get_profile',
  description: "Return the user's current style profile, or null if none has been built.",
  inputSchema: z.object({}).strict(),
  outputSchema: z.object({ profile: StyleProfileSchema.nullable() }),
  handler: () => ({ profile: profiles.get() }),
};

export const buildProfileTool: ToolDef<z.ZodTypeAny, z.ZodTypeAny> = {
  name: 'humanify_build_profile',
  description:
    "Build (or rebuild with force:true) the user's style profile from their stored samples. Needs at least 3 samples. Samples are redacted before being sent to the configured LLM provider.",
  inputSchema: z.object({ force: z.boolean().optional() }).strict(),
  outputSchema: z.object({ profile: StyleProfileSchema }),
  handler: async (input: { force?: boolean }, extra?: unknown) => {
    requireConsent();
    const progress =
      extra && typeof extra === 'object' && 'sendNotification' in (extra as object)
        ? undefined // MCP progress is wired in server.ts via the SDK when requested
        : undefined;
    const profile = await buildProfile(getProvider(), {
      force: input.force ?? false,
      onProgress: progress,
    });
    return { profile };
  },
};

export const updateProfileTool: ToolDef<z.ZodTypeAny, z.ZodTypeAny> = {
  name: 'humanify_update_profile',
  description:
    'Replace the style profile with an edited version (schema-validated). Use for manual tweaks; does not call any LLM.',
  inputSchema: z.object({ profile: StyleProfileSchema }).strict(),
  outputSchema: z.object({ profile: StyleProfileSchema }),
  handler: (input: { profile: z.infer<typeof StyleProfileSchema> }) => ({
    profile: profiles.set(input.profile),
  }),
};

export const deleteProfileTool: ToolDef<z.ZodTypeAny, z.ZodTypeAny> = {
  name: 'humanify_delete_profile',
  description: 'Delete the current style profile. Samples are kept.',
  inputSchema: z.object({}).strict(),
  outputSchema: z.object({ deleted: z.literal(true) }),
  handler: () => {
    profiles.clear();
    return { deleted: true as const };
  },
};
