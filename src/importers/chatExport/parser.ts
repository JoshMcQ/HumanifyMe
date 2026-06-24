// Parses ChatGPT and Claude chat-export archives into candidate user-authored
// samples. Only `role === 'user'` turns survive. See specs/sample-ingestion-spec.md.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { HumanifyError } from '../../mcp/errors.js';

const require = createRequire(import.meta.url);

export interface ExtractedTurn {
  text: string;
  inferredLabel: string;
}

export type ExportFormat = 'chatgpt' | 'claude';

const MIN_TURN_CHARS = 60;

export function detectAndParse(inputPath: string): { format: ExportFormat; turns: ExtractedTurn[] } {
  const conversations = loadConversationsJson(inputPath);
  return parseConversations(conversations);
}

function loadConversationsJson(inputPath: string): unknown {
  if (!fs.existsSync(inputPath)) {
    throw new HumanifyError('BAD_INPUT', `path does not exist: ${inputPath}`);
  }
  const stat = fs.statSync(inputPath);
  if (stat.isDirectory()) {
    const file = path.join(inputPath, 'conversations.json');
    if (!fs.existsSync(file)) {
      throw new HumanifyError('BAD_INPUT', `no conversations.json found in ${inputPath}`);
    }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  if (inputPath.endsWith('.zip')) {
    // Lazy import keeps adm-zip out of the startup path.
    const AdmZip = requireAdmZip();
    const zip = new AdmZip(inputPath);
    const entry = zip
      .getEntries()
      .find((e: { entryName: string }) => e.entryName.endsWith('conversations.json'));
    if (!entry) {
      throw new HumanifyError('BAD_INPUT', `no conversations.json inside ${inputPath}`);
    }
    return JSON.parse(entry.getData().toString('utf8'));
  }
  if (inputPath.endsWith('.json')) {
    return JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  }
  throw new HumanifyError('BAD_INPUT', 'expected a .zip, a .json, or an extracted export directory');
}

function requireAdmZip(): new (p: string) => {
  getEntries(): Array<{ entryName: string; getData(): Buffer }>;
} {
  // Deferred require so the dependency loads only when an import runs.
  return (require('adm-zip') as { default?: unknown }).default ?? require('adm-zip');
}

export function parseConversations(data: unknown): {
  format: ExportFormat;
  turns: ExtractedTurn[];
} {
  if (!Array.isArray(data)) {
    throw new HumanifyError('BAD_INPUT', 'conversations.json is not an array');
  }
  // ChatGPT exports: [{ mapping: { id: { message: { author: { role }, content: { parts } } } } }]
  // Claude exports:  [{ chat_messages: [{ sender: 'human'|'assistant', text }] }]
  const first = data[0] as Record<string, unknown> | undefined;
  if (first && 'mapping' in first) return { format: 'chatgpt', turns: parseChatGpt(data) };
  if (first && 'chat_messages' in first) return { format: 'claude', turns: parseClaude(data) };
  if (data.length === 0) return { format: 'chatgpt', turns: [] };
  throw new HumanifyError('BAD_INPUT', 'unrecognized export format (neither ChatGPT nor Claude)');
}

function parseChatGpt(data: unknown[]): ExtractedTurn[] {
  const turns: ExtractedTurn[] = [];
  for (const convo of data as Array<{ mapping?: Record<string, unknown> }>) {
    if (!convo.mapping) continue;
    for (const node of Object.values(convo.mapping)) {
      const message = (node as { message?: unknown }).message as
        | {
            author?: { role?: string };
            content?: { content_type?: string; parts?: unknown[] };
          }
        | null
        | undefined;
      if (!message || message.author?.role !== 'user') continue;
      const parts = message.content?.parts ?? [];
      const text = parts.filter((p): p is string => typeof p === 'string').join('\n').trim();
      pushIfUsable(turns, text);
    }
  }
  return turns;
}

function parseClaude(data: unknown[]): ExtractedTurn[] {
  const turns: ExtractedTurn[] = [];
  for (const convo of data as Array<{ chat_messages?: unknown[] }>) {
    for (const msg of convo.chat_messages ?? []) {
      const m = msg as { sender?: string; text?: string; content?: Array<{ type?: string; text?: string }> };
      if (m.sender !== 'human') continue;
      const text = (m.text ?? m.content?.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n') ?? '').trim();
      pushIfUsable(turns, text);
    }
  }
  return turns;
}

function pushIfUsable(turns: ExtractedTurn[], text: string): void {
  if (text.length < MIN_TURN_CHARS) return;
  if (isCodeHeavy(text)) return;
  turns.push({ text, inferredLabel: inferLabel(text) });
}

/** Heuristic: > 50% of characters are non-prose (code-ish) → drop. */
export function isCodeHeavy(text: string): boolean {
  if (/```/.test(text)) {
    const codeBlocks = text.match(/```[\s\S]*?```/g) ?? [];
    const codeLen = codeBlocks.reduce((n, b) => n + b.length, 0);
    if (codeLen / text.length > 0.5) return true;
  }
  const nonProse = text.replace(/[A-Za-z0-9\s.,'’!?;:()-]/g, '').length;
  return nonProse / text.length > 0.25;
}

/** Cheap context-label heuristic; the user can re-label later. */
export function inferLabel(text: string): string {
  const lower = text.toLowerCase();
  if (/\b(hi|hello|hey)\b[\s\S]*\b(regards|best|thanks|sincerely)\b/.test(lower)) return 'email';
  if (/\b(linkedin|networking|connection request)\b/.test(lower)) return 'linkedin';
  if (/\b(deal|pricing|discount|proposal|pitch)\b/.test(lower)) return 'sales';
  if (/\b(angry|frustrated|unacceptable|annoyed)\b/.test(lower)) return 'annoyed';
  if (/\b(please|could you|would you mind)\b/.test(lower)) return 'polite';
  if (text.length < 200) return 'text';
  return 'casual';
}
