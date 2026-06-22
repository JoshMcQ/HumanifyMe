// RAG ablation runner (internal eval). Makes real Anthropic calls — run by hand
// via `npx tsx evals/harness/runAblation.ts`, NOT in the vitest CI path.
//
// Runs TWO writers of opposite register (casual/lowercase and formal/sentence-
// case) through the same generic-AI drafts. For each draft: rewrite RAG-on and
// RAG-off, score with the deterministic T4 (AI-smell), T5 (stylometry), and
// casing-fidelity scorers, and have Anthropic act as a blind judge ("which
// rewrite sounds more like this writer?"). The casing column is the proof that
// the engine adapts capitalization to the actual user instead of a house style.
// Writes a Markdown report to evals/results/. No secrets are written or printed.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readConfig, writeConfig, updateConfig } from '../../src/config/index.js';
import { DEFAULT_CONFIG } from '../../src/config/schema.js';
import { samples, profiles, closeDb } from '../../src/storage/index.js';
import { getProvider } from '../../src/providers/index.js';
import { rewrite } from '../../src/engine/rewrite.js';
import type { ContextLabel } from '../../src/types.js';
import type { StyleProfile } from '../../src/engine/styleProfile.js';
import { WRITERS, DRAFTS } from '../corpus/writer.js';
import { aiSmellScore } from '../scorers/aiSmell.js';
import { styleDistance } from '../scorers/stylometry.js';
import { uppercaseStartRate } from '../scorers/casing.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, '..', 'results');

async function rewriteWith(
  rag: boolean,
  draft: string,
  contextLabel: ContextLabel,
  profile: StyleProfile,
): Promise<string> {
  updateConfig((c) => {
    c.rag.enabled = rag;
  });
  const res = await rewrite({
    draft,
    profile,
    contextLabel,
    directives: ['more_like_me'],
    provider: getProvider('anthropic'),
  });
  return res.rewrite;
}

async function judge(
  samplesText: string[],
  optionA: string,
  optionB: string,
): Promise<'A' | 'B' | '?'> {
  const provider = getProvider('anthropic');
  const system =
    'You are a forensic linguist. Given real messages a person wrote, you decide which of two rewrites sounds more like that same person actually wrote it — judging voice (word choice, greetings, rhythm, punctuation, capitalization, formality), not which is "better writing". Answer with a single character: A or B. No explanation.';
  const user = `Real messages this person wrote:\n${samplesText.map((s) => `- ${s}`).join('\n')}\n\nRewrite A:\n${optionA}\n\nRewrite B:\n${optionB}\n\nWhich sounds more like the same person — A or B? Answer with only "A" or "B".`;
  const res = await provider.complete({ system, user, maxTokens: 4, temperature: 0 });
  const m = res.text.trim().toUpperCase().match(/[AB]/);
  return (m?.[0] as 'A' | 'B') ?? '?';
}

type Row = {
  draft: string;
  on: string;
  off: string;
  onSmell: number;
  offSmell: number;
  onDist: number;
  offDist: number;
  onCase: number;
  offCase: number;
  judgePrefersOn: boolean | null;
};

type WriterResult = {
  name: string;
  expectSentenceCase: boolean;
  rows: Row[];
  agg: {
    avgOnDist: number;
    avgOffDist: number;
    avgOnSmell: number;
    avgOffSmell: number;
    avgOnCase: number;
    avgOffCase: number;
    judgeOnWinRate: number;
    judged: number;
  };
};

async function runWriter(
  writer: (typeof WRITERS)[number],
  realKey: string,
): Promise<WriterResult> {
  // Isolate into a throwaway eval home per writer so corpora never bleed together.
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'humanifyme-eval-'));
  process.env.HUMANIFYME_HOME = home;
  closeDb();
  writeConfig({
    ...DEFAULT_CONFIG,
    defaultProvider: 'anthropic',
    providers: { anthropic: { apiKey: realKey } },
    consentAcceptedAt: new Date().toISOString(),
  });

  profiles.set(writer.profile);
  for (const text of writer.samples) samples.add({ text, labels: ['casual'], source: 'paste' });

  const rows: Row[] = [];
  for (let i = 0; i < DRAFTS.length; i++) {
    const { draft, contextLabel } = DRAFTS[i]!;
    const label = contextLabel as ContextLabel;
    try {
      const on = await rewriteWith(true, draft, label, writer.profile);
      const off = await rewriteWith(false, draft, label, writer.profile);
      // Blind judge: alternate which slot RAG-on occupies to cancel position bias.
      const onIsA = i % 2 === 0;
      const verdict = await judge(writer.samples, onIsA ? on : off, onIsA ? off : on);
      const judgePrefersOn = verdict === '?' ? null : onIsA ? verdict === 'A' : verdict === 'B';

      rows.push({
        draft,
        on,
        off,
        onSmell: aiSmellScore(on).count,
        offSmell: aiSmellScore(off).count,
        onDist: styleDistance(on, writer.samples),
        offDist: styleDistance(off, writer.samples),
        onCase: uppercaseStartRate(on),
        offCase: uppercaseStartRate(off),
        judgePrefersOn,
      });
      process.stdout.write(`  [${writer.name}] draft ${i + 1}/${DRAFTS.length} done\n`);
    } catch (err) {
      process.stdout.write(`  [${writer.name}] draft ${i + 1} failed: ${(err as Error).message}\n`);
    }
  }

  closeDb();
  fs.rmSync(home, { recursive: true, force: true });

  const n = rows.length || 1;
  const avg = (f: (r: Row) => number) => rows.reduce((s, r) => s + f(r), 0) / n;
  const judged = rows.filter((r) => r.judgePrefersOn !== null);
  const onWins = judged.filter((r) => r.judgePrefersOn).length;
  return {
    name: writer.name,
    expectSentenceCase: writer.expectSentenceCase,
    rows,
    agg: {
      avgOnDist: avg((r) => r.onDist),
      avgOffDist: avg((r) => r.offDist),
      avgOnSmell: avg((r) => r.onSmell),
      avgOffSmell: avg((r) => r.offSmell),
      avgOnCase: avg((r) => r.onCase),
      avgOffCase: avg((r) => r.offCase),
      judgeOnWinRate: judged.length ? onWins / judged.length : 0,
      judged: judged.length,
    },
  };
}

async function main(): Promise<void> {
  // Read the real Anthropic key from the default home BEFORE isolating.
  const realKey = readConfig().providers.anthropic?.apiKey;
  if (!realKey) {
    throw new Error('No Anthropic key configured. Run: humanifyme provider set anthropic --api-key <key>');
  }

  const results: WriterResult[] = [];
  for (const writer of WRITERS) results.push(await runWriter(writer, realKey));

  // Report (no secrets).
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const lines: string[] = [];
  lines.push(`# RAG ablation (two registers) — ${new Date().toISOString()}`);
  lines.push('');
  lines.push('Same generic-AI drafts, two writers of opposite register, retrieval ON vs OFF.');
  lines.push('Lower stylometric distance = closer to the writer. Casing = fraction of sentences that start with a capital (≈0 for a lowercase writer, ≈1 for a formal one).');
  lines.push('');
  lines.push('## Casing adapts to the writer (the headline)');
  lines.push('');
  lines.push('| Writer | Expected | RAG-on casing | RAG-off casing |');
  lines.push('|---|---|---|---|');
  for (const r of results) {
    const expected = r.expectSentenceCase ? 'sentence-case (~1.0)' : 'lowercase (~0.0)';
    lines.push(
      `| ${r.name} | ${expected} | **${r.agg.avgOnCase.toFixed(2)}** | ${r.agg.avgOffCase.toFixed(2)} |`,
    );
  }
  lines.push('');

  for (const r of results) {
    lines.push(`## ${r.name}`);
    lines.push('');
    lines.push(`- Stylometric distance to writer: **ON ${r.agg.avgOnDist.toFixed(2)}** vs OFF ${r.agg.avgOffDist.toFixed(2)} (lower is better)`);
    lines.push(`- Casing (uppercase-start rate): ON ${r.agg.avgOnCase.toFixed(2)} vs OFF ${r.agg.avgOffCase.toFixed(2)} (target ${r.expectSentenceCase ? '~1.0' : '~0.0'})`);
    lines.push(`- AI-smell tells per rewrite: ON ${r.agg.avgOnSmell.toFixed(2)} vs OFF ${r.agg.avgOffSmell.toFixed(2)}`);
    lines.push(`- Blind judge prefers RAG-ON: **${(r.agg.judgeOnWinRate * 100).toFixed(0)}%** of ${r.agg.judged} judged drafts`);
    lines.push('');
    for (let i = 0; i < r.rows.length; i++) {
      const row = r.rows[i]!;
      lines.push(`### Draft ${i + 1}`);
      lines.push(`> ${row.draft}`);
      lines.push('');
      lines.push(`**RAG-on** (dist ${row.onDist.toFixed(2)}, casing ${row.onCase.toFixed(2)}, smell ${row.onSmell}, judge ${row.judgePrefersOn === null ? 'n/a' : row.judgePrefersOn ? 'prefers ON' : 'prefers off'}):`);
      lines.push(`> ${row.on}`);
      lines.push('');
      lines.push(`**RAG-off** (dist ${row.offDist.toFixed(2)}, casing ${row.offCase.toFixed(2)}, smell ${row.offSmell}):`);
      lines.push(`> ${row.off}`);
      lines.push('');
    }
  }

  const outPath = path.join(RESULTS_DIR, `ablation-${stamp}.md`);
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');

  process.stdout.write(`\nReport: ${path.relative(process.cwd(), outPath)}\n`);
  for (const r of results) {
    process.stdout.write(
      `${r.name}: casing ON ${r.agg.avgOnCase.toFixed(2)} (want ${r.expectSentenceCase ? '~1' : '~0'}) | dist ON ${r.agg.avgOnDist.toFixed(2)} vs OFF ${r.agg.avgOffDist.toFixed(2)} | judge ON ${(r.agg.judgeOnWinRate * 100).toFixed(0)}%\n`,
    );
  }
}

main().catch((err) => {
  process.stderr.write(`ablation failed: ${(err as Error).message}\n`);
  process.exitCode = 1;
});
