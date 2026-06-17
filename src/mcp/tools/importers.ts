import { z } from 'zod';
import { ToolDef } from '../registerTool.js';
import { previewChatExport, commitChatExport } from '../../importers/chatExport/index.js';
import { importTextFiles } from '../../importers/textFiles/index.js';
import { backfillEmbeddings } from '../../engine/voiceMemory.js';
import { ContextLabelSchema } from '../../types.js';

export const importChatExportTool: ToolDef<z.ZodTypeAny, z.ZodTypeAny> = {
  name: 'humanify_import_chat_export',
  description:
    'Import writing samples from a ChatGPT or Claude data-export (.zip, conversations.json, or extracted directory). Only user-authored turns are kept; code-heavy turns are dropped; everything is redacted before storage. Call with commit:false first to preview 5 samples, then commit:true.',
  inputSchema: z.object({
    path: z.string().min(1),
    commit: z.boolean().default(false),
  }).strict(),
  outputSchema: z.object({
    format: z.string(),
    committed: z.boolean(),
    totalExtracted: z.number().optional(),
    imported: z.number().optional(),
    skipped: z.number().optional(),
    preview: z
      .array(z.object({ text: z.string(), inferredLabel: z.string() }))
      .optional(),
  }),
  handler: async (input: { path: string; commit: boolean }) => {
    if (!input.commit) {
      const p = previewChatExport(input.path);
      return {
        format: p.format,
        committed: false,
        totalExtracted: p.totalExtracted,
        preview: p.preview,
      };
    }
    const r = commitChatExport(input.path);
    await backfillEmbeddings();
    return { format: r.format, committed: true, imported: r.imported, skipped: r.skipped };
  },
};

export const importTextFilesTool: ToolDef<z.ZodTypeAny, z.ZodTypeAny> = {
  name: 'humanify_import_text_files',
  description:
    "Bulk-import writing samples from a directory (or single file) of .txt/.md/.docx the user wrote — notes, blog drafts, an Obsidian vault. Requires a default context label. Files are redacted before storage; oversize files split at paragraph boundaries.",
  inputSchema: z.object({
    path: z.string().min(1),
    label: ContextLabelSchema,
  }).strict(),
  outputSchema: z.object({
    imported: z.number(),
    filesProcessed: z.number(),
    skippedTooShort: z.array(z.string()),
  }),
  handler: async (input: { path: string; label: z.infer<typeof ContextLabelSchema> }) => {
    const r = await importTextFiles(input.path, input.label);
    await backfillEmbeddings();
    return r;
  },
};
