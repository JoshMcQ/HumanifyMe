import { z } from 'zod';
import { ToolDef } from '../registerTool.js';
import { audit } from '../../storage/index.js';

export const auditListTool: ToolDef<z.ZodTypeAny, z.ZodTypeAny> = {
  name: 'humanify_audit_list',
  description:
    'List the most recent outbound requests HumanifyMe made (metadata only, never content): provider, route, payload size, draft length, success.',
  inputSchema: z.object({ limit: z.number().int().min(1).max(100).optional() }).strict(),
  outputSchema: z.object({
    entries: z.array(
      z.object({
        id: z.number(),
        timestamp: z.string(),
        provider: z.string(),
        route: z.string(),
        payloadBytes: z.number(),
        draftLength: z.number(),
        profileIncluded: z.boolean(),
        success: z.boolean(),
        errorCode: z.string().nullable(),
      }),
    ),
  }),
  handler: (input: { limit?: number }) => ({ entries: audit.list(input.limit ?? 20) }),
};
