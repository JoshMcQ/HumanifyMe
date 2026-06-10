import { z } from 'zod';
import { ToolDef } from '../registerTool.js';
import { wipeAll } from '../../storage/index.js';

export const wipeAllTool: ToolDef<z.ZodTypeAny, z.ZodTypeAny> = {
  name: 'humanify_wipe_all',
  description:
    'Delete ALL HumanifyMe data: samples, profile, cache, audit log. Irrevocable. Requires confirm: "DELETE EVERYTHING".',
  inputSchema: z.object({ confirm: z.literal('DELETE EVERYTHING') }).strict(),
  outputSchema: z.object({ wiped: z.literal(true) }),
  handler: () => {
    wipeAll();
    return { wiped: true as const };
  },
};
