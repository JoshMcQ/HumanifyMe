// Chat-export importer: preview-then-commit. The raw archive is parsed in
// memory; only extracted, redacted samples are persisted. The archive itself
// is never copied into ~/.humanifyme.

import { samples } from '../../storage/index.js';
import { redact } from '../../privacy/redact.js';
import { ContextLabelSchema } from '../../types.js';
import { detectAndParse, ExportFormat } from './parser.js';

export interface ImportPreview {
  format: ExportFormat;
  totalExtracted: number;
  preview: Array<{ text: string; inferredLabel: string }>;
}

export function previewChatExport(inputPath: string): ImportPreview {
  const { format, turns } = detectAndParse(inputPath);
  return {
    format,
    totalExtracted: turns.length,
    preview: turns.slice(0, 5).map((t) => ({
      text: t.text.length > 300 ? t.text.slice(0, 300) + '…' : t.text,
      inferredLabel: t.inferredLabel,
    })),
  };
}

export function commitChatExport(inputPath: string): {
  format: ExportFormat;
  imported: number;
  skipped: number;
} {
  const { format, turns } = detectAndParse(inputPath);
  let imported = 0;
  let skipped = 0;
  for (const turn of turns) {
    const { redactedText } = redact(turn.text);
    if (redactedText.length < 100) {
      skipped++;
      continue;
    }
    const label = ContextLabelSchema.safeParse(turn.inferredLabel);
    samples.add({
      text: redactedText,
      labels: [label.success ? label.data : 'casual'],
      source: format,
    });
    imported++;
  }
  return { format, imported, skipped };
}
