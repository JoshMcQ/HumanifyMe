// Generic text/markdown/docx ingestion. See T-10B in tasks/task-breakdown.md.

import fs from 'node:fs';
import path from 'node:path';
import { samples } from '../../storage/index.js';
import { redact } from '../../privacy/redact.js';
import { ContextLabel } from '../../types.js';
import { HumanifyError } from '../../mcp/errors.js';

const MIN_CHARS = 100;
const MAX_CHARS = 8000;
const EXTENSIONS = new Set(['.txt', '.md', '.docx']);

export interface TextImportResult {
  imported: number;
  skippedTooShort: string[];
  filesProcessed: number;
}

export async function importTextFiles(
  dirOrFile: string,
  label: ContextLabel,
): Promise<TextImportResult> {
  if (!fs.existsSync(dirOrFile)) {
    throw new HumanifyError('BAD_INPUT', `path does not exist: ${dirOrFile}`);
  }
  const files = collectFiles(dirOrFile);
  if (files.length === 0) {
    throw new HumanifyError('BAD_INPUT', `no .txt, .md, or .docx files found at ${dirOrFile}`);
  }

  const result: TextImportResult = { imported: 0, skippedTooShort: [], filesProcessed: 0 };
  for (const file of files) {
    const text = (await readFileText(file)).trim();
    result.filesProcessed++;
    if (text.length < MIN_CHARS) {
      result.skippedTooShort.push(path.basename(file));
      continue;
    }
    for (const chunk of splitAtParagraphs(text, MAX_CHARS)) {
      const { redactedText } = redact(chunk);
      if (redactedText.length < MIN_CHARS) continue;
      samples.add({ text: redactedText, labels: [label], source: 'text-file' });
      result.imported++;
    }
  }
  return result;
}

function collectFiles(dirOrFile: string): string[] {
  const stat = fs.statSync(dirOrFile);
  if (stat.isFile()) {
    return EXTENSIONS.has(path.extname(dirOrFile).toLowerCase()) ? [dirOrFile] : [];
  }
  const out: string[] = [];
  for (const entry of fs.readdirSync(dirOrFile, { withFileTypes: true })) {
    const full = path.join(dirOrFile, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      out.push(...collectFiles(full));
    } else if (EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

async function readFileText(file: string): Promise<string> {
  if (path.extname(file).toLowerCase() === '.docx') {
    const mammoth = await import('mammoth');
    const { value } = await mammoth.extractRawText({ path: file });
    return value;
  }
  return fs.readFileSync(file, 'utf8');
}

/** Split oversize text at paragraph boundaries without losing content. */
export function splitAtParagraphs(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = '';
  for (const p of paragraphs) {
    if (current.length + p.length + 2 > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = '';
    }
    // A single paragraph longer than maxChars gets hard-split.
    if (p.length > maxChars) {
      for (let i = 0; i < p.length; i += maxChars) chunks.push(p.slice(i, i + maxChars));
      continue;
    }
    current += (current ? '\n\n' : '') + p;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
