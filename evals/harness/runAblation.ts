// RAG ablation runner (internal eval). Makes real Anthropic calls — run by hand
// via `npx tsx evals/harness/runAblation.ts`, NOT in the vitest CI path.
//
// For each draft: rewrite RAG-on and RAG-off, score both with the deterministic
// T4 (AI-smell) and T5 (stylometric distance) scorers, and have Anthropic act as
// a blind judge ("which rewrite sounds more like this writer?"). Writes a
// Markdown report to evals/results/. No secrets are written or printed.

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
import { WRITER_PROFILE, WRITER_SAMPLES, DRAFTS } from '../corpus/writer.js';
import { aiSmellScore } from '../scorers/aiSmell.js';
import { styleDistance } from '../scorers/stylometry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, '..', 'results');

async function rewriteWith(rag: boolean, draft: string, contextLabel: ContextLabel): Promise<string> {
  updateConfig((c) => {
    c.rag.enabled = rag;
  });
  const res = await rewrite({
    draft,
    profile: WRITER_PROFILE,
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
    'You are a forensic linguist. Given real messages a person wrote, you decide which of two rewrites sounds more like that same person actually wrote it — judging voice (word choice, greetings, rhythm, punctuation, formality), not which is "better writing". Answer with a single character: A or B. No explanation.';
  const user = `Real messages this person wrote:\n${samplesText.map((s) => `- ${s}`).join('\n')}\n\nRewrite A:\n${optionA}\n\nRewrite B:\n${optionB}\n\nWhich sounds more like the same person — A or B? Answer with only "A" or "B".`;
  const res = await provider.complete({ system, user, maxTokens: 4, temperature: 0 });
  const m = res.text.trim().toUpperCase().match(/[AB]/);
  return (m?.[0] as 'A' | 'B') ?? '?';
}

async function main(): Promise<void> {
  // 1. Read the real Anthropic key from the default home BEFORE isolating.
  const realKey = readConfig().providers.anthropic?.apiKey;
  if (!realKey) {
    throw new Error('No Anthropic key configured. Run: humanifyme provider set anthropic --api-key <key>');
  }

  // 2. Isolate into a throwaway eval home so we never touch the user's data.
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'humanifyme-eval-'));
  process.env.HUMANIFYME_HOME = home;
  closeDb();
  writeConfig({
    ...DEFAULT_CONFIG,
    defaultProvider: 'anthropic',
    providers: { anthropic: { apiKey: realKey } },
    consentAcceptedAt: new Date().toISOString(),
  });

  // 3. Seed the writer's profile + voice-memory samples.
  profiles.set(WRITER_PROFILE);
  for (const text of WRITER_SAMPLES) samples.add({ text, labels: ['casual'], source: 'paste' });

  // 4. Run the ablation.
  type Row = {
    draft: string;
    on: string;
    off: string;
    onSmell: number;
    offSmell: number;
    onDist: number;
    offDist: number;
    judgePrefersOn: boolean | null;
  };
  const rows: Row[] = [];

  for (let i = 0; i < DRAFTS.length; i++) {
    const { draft, contextLabel } = DRAFTS[i]!;
    const label = contextLabel as ContextLabel;
    try {
      const on = await rewriteWith(true, draft, label);
      const off = await rewriteWith(false, draft, label);

      // Blind judge: alternate which slot RAG-on occupies to cancel position bias.
      const onIsA = i % 2 === 0;
      const verdict = await judge(WRITER_SAMPLES, onIsA ? on : off, onIsA ? off : on);
      const judgePrefersOn =
        verdict === '?' ? null : onIsA ? verdict === 'A' : verdict === 'B';

      rows.push({
        draft,
        on,
        off,
        onSmell: aiSmellScore(on).count,
        offSmell: aiSmellScore(off).count,
        onDist: styleDistance(on, WRITER_SAMPLES),
        offDist: styleDistance(off, WRITER_SAMPLES),
        judgePrefersOn,
      });
      process.stdout.write(`  draft ${i + 1}/${DRAFTS.length} done\n`);
    } catch (err) {
      process.stdout.write(`  draft ${i + 1} failed: ${(err as Error).message}\n`);
    }
  }

  // 5. Aggregate.
  const n = rows.length || 1;
  const avg = (f: (r: Row) => number) => rows.reduce((s, r) => s + f(r), 0) / n;
  const judged = rows.filter((r) => r.judgePrefersOn !== null);
  const onWins = judged.filter((r) => r.judgePrefersOn).length;
  const agg = {
    avgOnDist: avg((r) => r.onDist),
    avgOffDist: avg((r) => r.offDist),
    avgOnSmell: avg((r) => r.onSmell),
    avgOffSmell: avg((r) => r.offSmell),
    judgeOnWinRate: judged.length ? onWins / judged.length : 0,
    judged: judged.length,
  };

  // 6. Report (no secrets).
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const lines: string[] = [];
  lines.push(`# RAG ablation — ${new Date().toISOString()}`);
  lines.push('');
  lines.push('Internal eval: same drafts rewritten with retrieval ON vs OFF, same writer.');
  lines.push('Lower stylometric distance = closer to the writer. Lower AI-smell = fewer generic-AI tells.');
  lines.push('');
  lines.push('## Aggregate');
  lines.push('');
  lines.push(`- Stylometric distance to writer: **ON ${agg.avgOnDist.toFixed(2)}** vs OFF ${agg.avgOffDist.toFixed(2)} (lower is better)`);
  lines.push(`- AI-smell tells per rewrite: ON ${agg.avgOnSmell.toFixed(2)} vs OFF ${agg.avgOffSmell.toFixed(2)}`);
  lines.push(`- Blind judge prefers RAG-ON: **${(agg.judgeOnWinRate * 100).toFixed(0)}%** of ${agg.judged} judged drafts`);
  lines.push('');
  lines.push('## Per-draft');
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    lines.push('');
    lines.push(`### Draft ${i + 1}`);
    lines.push(`> ${r.draft}`);
    lines.push('');
    lines.push(`**RAG-on** (dist ${r.onDist.toFixed(2)}, smell ${r.onSmell}, judge ${r.judgePrefersOn === null ? 'n/a' : r.judgePrefersOn ? 'prefers ON' : 'prefers off'}):`);
    lines.push(`> ${r.on}`);
    lines.push('');
    lines.push(`**RAG-off** (dist ${r.offDist.toFixed(2)}, smell ${r.offSmell}):`);
    lines.push(`> ${r.off}`);
  }
  const outPath = path.join(RESULTS_DIR, `ablation-${stamp}.md`);
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');

  // 7. Cleanup the throwaway home.
  closeDb();
  fs.rmSync(home, { recursive: true, force: true });

  process.stdout.write(`\nReport: ${path.relative(process.cwd(), outPath)}\n`);
  process.stdout.write(
    `ON dist ${agg.avgOnDist.toFixed(2)} vs OFF ${agg.avgOffDist.toFixed(2)} | judge ON ${(agg.judgeOnWinRate * 100).toFixed(0)}%\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`ablation failed: ${(err as Error).message}\n`);
  process.exitCode = 1;
});
