import { z } from 'zod';
import { ToolDef } from '../registerTool.js';
import { samples } from '../../storage/index.js';
import { embedSample } from '../../engine/voiceMemory.js';
import { HumanifyError } from '../errors.js';
import { ContextLabelSchema, MIN_SAMPLE_CHARS } from '../../types.js';

const SampleRecordOut = z.object({
  id: z.string(),
  text: z.string(),
  labels: z.array(ContextLabelSchema),
  source: z.string(),
  createdAt: z.string(),
  charCount: z.number(),
});

export const addSampleTool: ToolDef<z.ZodTypeAny, z.ZodTypeAny> = {
  name: 'humanify_add_sample',
  description:
    'Store a writing sample (something the user actually wrote) so HumanifyMe can learn their voice. Text must be at least 100 characters and carry at least one context label.',
  inputSchema: z.object({
    text: z.string().min(MIN_SAMPLE_CHARS),
    labels: z.array(ContextLabelSchema).min(1),
  }).strict(),
  outputSchema: z.object({ id: z.string() }),
  handler: async (input: { text: string; labels: z.infer<typeof ContextLabelSchema>[] }) => {
    const record = samples.add({ text: input.text, labels: input.labels, source: 'paste' });
    await embedSample(record.id, record.text);
    return { id: record.id };
  },
};

export const listSamplesTool: ToolDef<z.ZodTypeAny, z.ZodTypeAny> = {
  name: 'humanify_list_samples',
  description: 'List stored writing samples (previews truncated to 200 chars).',
  inputSchema: z.object({ label: ContextLabelSchema.optional() }).strict(),
  outputSchema: z.object({ samples: z.array(SampleRecordOut) }),
  handler: (input: { label?: z.infer<typeof ContextLabelSchema> }) => {
    const rows = samples.list(input.label ? { label: input.label } : undefined);
    return {
      samples: rows.map((r) => ({
        ...r,
        text: r.text.length > 200 ? r.text.slice(0, 200) + '…' : r.text,
      })),
    };
  },
};

export const deleteSampleTool: ToolDef<z.ZodTypeAny, z.ZodTypeAny> = {
  name: 'humanify_delete_sample',
  description: 'Delete a stored writing sample by id.',
  inputSchema: z.object({ id: z.string().min(1) }).strict(),
  outputSchema: z.object({ id: z.string() }),
  handler: (input: { id: string }) => {
    const removed = samples.remove(input.id);
    if (!removed) throw new HumanifyError('NOT_FOUND', `no sample with id ${input.id}`);
    return { id: input.id };
  },
};
