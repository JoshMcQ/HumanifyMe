import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { freshHome, cleanupHome } from '../testUtils.js';
import { parseConversations, isCodeHeavy } from './chatExport/parser.js';
import { previewChatExport, commitChatExport } from './chatExport/index.js';
import { importTextFiles, splitAtParagraphs } from './textFiles/index.js';
import { samples } from '../storage/index.js';

let home: string;
beforeEach(() => {
  home = freshHome();
});
afterEach(cleanupHome);

const userTurn =
  'Can you help me rewrite this email to my landlord? I want to push back on the rent increase without sounding hostile, but I also want to be clear that I know the market rate.';
const assistantTurn =
  'Of course! Here is a polite but firm draft you could send to your landlord regarding the rent increase situation.';
const codeTurn =
  'fix this: ```js\nconst x = {a:1,b:2};\nfunction f(y){return y.map(z=>z*2).filter(Boolean)}\nconsole.log(f([1,2,3]))\nconst q = [...x, ...x];\n```' +
  ' it throws';

function chatGptExport(): unknown {
  return [
    {
      mapping: {
        n1: { message: { author: { role: 'user' }, content: { content_type: 'text', parts: [userTurn] } } },
        n2: { message: { author: { role: 'assistant' }, content: { content_type: 'text', parts: [assistantTurn] } } },
        n3: { message: { author: { role: 'user' }, content: { content_type: 'text', parts: [codeTurn] } } },
        n4: { message: { author: { role: 'user' }, content: { content_type: 'text', parts: ['short'] } } },
        n5: { message: null },
      },
    },
  ];
}

function claudeExport(): unknown {
  return [
    {
      chat_messages: [
        { sender: 'human', text: userTurn },
        { sender: 'assistant', text: assistantTurn },
        { sender: 'human', text: 'ok thx' },
      ],
    },
  ];
}

describe('chat export parser', () => {
  it('detects ChatGPT format and keeps only user turns', () => {
    const { format, turns } = parseConversations(chatGptExport());
    expect(format).toBe('chatgpt');
    expect(turns).toHaveLength(1);
    expect(turns[0]!.text).toBe(userTurn);
  });

  it('detects Claude format and keeps only human turns', () => {
    const { format, turns } = parseConversations(claudeExport());
    expect(format).toBe('claude');
    expect(turns).toHaveLength(1);
    expect(turns[0]!.text).toBe(userTurn);
  });

  it('assistant text never appears in extracted turns', () => {
    for (const data of [chatGptExport(), claudeExport()]) {
      const { turns } = parseConversations(data);
      expect(turns.every((t) => !t.text.includes('polite but firm draft'))).toBe(true);
    }
  });

  it('drops code-heavy turns', () => {
    expect(isCodeHeavy(codeTurn)).toBe(true);
    expect(isCodeHeavy(userTurn)).toBe(false);
  });

  it('rejects unrecognized formats', () => {
    expect(() => parseConversations([{ wat: true }])).toThrow(/unrecognized/);
    expect(() => parseConversations({ not: 'array' })).toThrow(/not an array/);
  });
});

describe('chat export import (preview/commit)', () => {
  function writeExport(): string {
    const file = path.join(home, 'conversations.json');
    fs.writeFileSync(file, JSON.stringify(chatGptExport()));
    return file;
  }

  it('preview returns up to 5 samples without committing', () => {
    const p = previewChatExport(writeExport());
    expect(p.totalExtracted).toBe(1);
    expect(p.preview).toHaveLength(1);
    expect(samples.count()).toBe(0);
  });

  it('commit persists with source=chatgpt', () => {
    const r = commitChatExport(writeExport());
    expect(r.imported).toBe(1);
    const stored = samples.list();
    expect(stored[0]!.source).toBe('chatgpt');
  });
});

describe('text file importer', () => {
  it('imports mixed .md/.txt, skips short files, splits oversize', async () => {
    const dir = path.join(home, 'writings');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'good.md'), userTurn.repeat(2));
    fs.writeFileSync(path.join(dir, 'short.txt'), 'tiny');
    const big = Array.from({ length: 120 }, (_, i) => `Paragraph ${i}. ${userTurn}`).join('\n\n');
    fs.writeFileSync(path.join(dir, 'big.txt'), big);
    fs.writeFileSync(path.join(dir, 'ignored.pdf'), 'not supported');

    const r = await importTextFiles(dir, 'casual');
    expect(r.skippedTooShort).toContain('short.txt');
    expect(r.filesProcessed).toBe(3);
    expect(r.imported).toBeGreaterThan(2); // big.txt split into multiple
    expect(samples.list().every((s) => s.source === 'text-file')).toBe(true);
  });

  it('splitAtParagraphs loses no content', () => {
    const paragraphs = Array.from({ length: 30 }, (_, i) => `Para ${i} ${'words '.repeat(50)}`.trim());
    const text = paragraphs.join('\n\n');
    const chunks = splitAtParagraphs(text, 2000);
    expect(chunks.length).toBeGreaterThan(1);
    const rejoined = chunks.join('\n\n');
    for (const p of paragraphs) expect(rejoined).toContain(p);
  });

  it('errors on a missing path', async () => {
    await expect(importTextFiles(path.join(home, 'nope'), 'casual')).rejects.toThrow(/does not exist/);
  });
});