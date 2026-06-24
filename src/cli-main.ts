// Entrypoint for the `humanifyme` CLI. Talks to the same storage and engine
// layers as the MCP — no transport in between.

import './suppressExperimentalWarnings.js';
import fs from 'node:fs';
import { Command } from 'commander';
import { VERSION } from './version.js';
import { samples, audit, wipeAll, profiles, feedback } from './storage/index.js';
import { readConfig, updateConfig } from './config/index.js';
import { acceptConsent, consentStatus } from './mcp/consent.js';
import { getProvider } from './providers/index.js';
import { buildProfile } from './engine/buildProfile.js';
import { rewrite } from './engine/rewrite.js';
import { renderProfileMarkdown } from './engine/profileMarkdown.js';
import { executeTool } from './mcp/registerTool.js';
import { recordFeedbackTool } from './mcp/tools/feedback.js';
import { previewChatExport, commitChatExport } from './importers/chatExport/index.js';
import { importTextFiles } from './importers/textFiles/index.js';
import { backfillEmbeddings, embedSample } from './engine/voiceMemory.js';
import { ContextLabelSchema, DirectiveSchema, PROVIDERS, CONTEXT_LABELS } from './types.js';

const program = new Command();
program.name('humanifyme').description('Make AI sound like you.').version(VERSION);

// --- sample ---
const sample = program.command('sample').description('Manage writing samples');

sample
  .command('add <file>')
  .description('Add a writing sample from a file')
  .requiredOption('--label <labels>', `comma-separated labels (${CONTEXT_LABELS.join('|')})`)
  .action(async (file: string, opts: { label: string }) => {
    const text = fs.readFileSync(file, 'utf8');
    const labels = opts.label.split(',').map((l) => ContextLabelSchema.parse(l.trim()));
    const record = samples.add({ text, labels, source: 'paste' });
    await embedSample(record.id, record.text);
    console.log(`added sample ${record.id} (${record.charCount} chars, labels: ${labels.join(', ')})`);
  });

sample
  .command('list')
  .description('List stored samples')
  .action(() => {
    const rows = samples.list();
    if (rows.length === 0) {
      console.log('no samples yet. add one with: humanifyme sample add <file> --label email');
      return;
    }
    for (const r of rows) {
      const preview = r.text.slice(0, 80).replace(/\s+/g, ' ');
      console.log(`${r.id}  [${r.labels.join(',')}] (${r.source}, ${r.charCount} chars)  ${preview}…`);
    }
    console.log(`\n${rows.length} sample(s).`);
  });

sample
  .command('rm <id>')
  .description('Delete a sample')
  .action((id: string) => {
    console.log(samples.remove(id) ? `deleted ${id}` : `no sample with id ${id}`);
  });

// --- profile ---
const profile = program.command('profile').description('Manage your voice profile');

profile.command('show').description('Show the profile in plain English').action(() => {
  console.log(renderProfileMarkdown(profiles.get()));
});

profile
  .command('rebuild')
  .description('Rebuild the profile from current samples (destroys manual edits)')
  .option('--force', 'rebuild even if the profile is recent', false)
  .action(async (opts: { force: boolean }) => {
    requireConsentCli();
    const p = await buildProfile(getProvider(), {
      force: true,
      onProgress: (e) => console.error(`  ${e.stage}${'processed' in e ? ` ${e.processed}/${e.total}` : ''}`),
    });
    void opts;
    console.log(`profile built from ${p.metadata.sampleCount} samples.`);
  });

profile.command('rm').description('Delete the profile').action(() => {
  console.log(profiles.clear() ? 'profile deleted.' : 'no profile to delete.');
});

profile
  .command('edit')
  .description('Open the profile JSON in $EDITOR, validate, and save')
  .action(async () => {
    const current = profiles.get();
    if (!current) {
      console.error('no profile yet. run: humanifyme profile rebuild');
      process.exitCode = 1;
      return;
    }
    const os = await import('node:os');
    const path = await import('node:path');
    const { spawnSync } = await import('node:child_process');
    const tmp = path.join(os.tmpdir(), `humanifyme-profile-${Date.now()}.json`);
    fs.writeFileSync(tmp, JSON.stringify(current, null, 2));
    const editor = process.env.EDITOR ?? (process.platform === 'win32' ? 'notepad' : 'vi');
    const result = spawnSync(editor, [tmp], { stdio: 'inherit' });
    if (result.status !== 0) {
      console.error('editor exited non-zero; profile unchanged.');
      fs.rmSync(tmp, { force: true });
      return;
    }
    try {
      const edited = JSON.parse(fs.readFileSync(tmp, 'utf8'));
      profiles.set(edited);
      console.log('profile updated.');
    } catch (err) {
      console.error(`profile NOT saved: ${(err as Error).message}`);
      process.exitCode = 1;
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  });

// --- provider ---
const provider = program.command('provider').description('Configure LLM providers');

provider
  .command('set <name>')
  .description(`set provider (${PROVIDERS.join('|')}) and make it default`)
  .option('--api-key <key>', 'API key (not needed for ollama)')
  .option('--model <model>', 'model override')
  .option('--base-url <url>', 'base URL (ollama or self-hosted)')
  .action(async (name: string, opts: { apiKey?: string; model?: string; baseUrl?: string }) => {
    const parsed = PROVIDERS.find((p) => p === name);
    if (!parsed) {
      console.error(`unknown provider "${name}". options: ${PROVIDERS.join(', ')}`);
      process.exitCode = 1;
      return;
    }
    updateConfig((c) => {
      if (parsed === 'ollama') {
        c.providers.ollama = {
          baseUrl: opts.baseUrl ?? 'http://localhost:11434',
          model: opts.model ?? 'llama3.2:3b',
        };
      } else {
        if (!opts.apiKey) throw new Error(`--api-key is required for ${parsed}`);
        c.providers[parsed] = { apiKey: opts.apiKey, ...(opts.model ? { model: opts.model } : {}) };
      }
      c.defaultProvider = parsed;
    });
    const valid = await getProvider(parsed).testKey();
    console.log(`${parsed} configured. key ${valid ? 'works' : 'FAILED validation'}.`);
  });

provider
  .command('test')
  .description('test the configured key')
  .action(async () => {
    const name = readConfig().defaultProvider;
    const valid = await getProvider().testKey();
    console.log(`${name}: ${valid ? 'key works' : 'key INVALID or unreachable'}`);
  });

// --- rewrite ---
program
  .command('rewrite [file]')
  .description('Rewrite a draft in your voice (reads the file, or stdin if omitted)')
  .option('--context <label>', 'context label', 'email')
  .option('--directives <list>', 'comma-separated directives', 'more_like_me')
  .action(async (file: string | undefined, opts: { context: string; directives: string }) => {
    requireConsentCli();
    const draft = file ? fs.readFileSync(file, 'utf8') : fs.readFileSync(0, 'utf8');
    const profile = profiles.get();
    if (!profile) {
      console.error('no profile yet. run: humanifyme profile rebuild');
      process.exitCode = 1;
      return;
    }
    const result = await rewrite({
      draft: draft.trim(),
      profile,
      contextLabel: ContextLabelSchema.parse(opts.context),
      directives: opts.directives.split(',').map((d) => DirectiveSchema.parse(d.trim())),
      provider: getProvider(),
    });
    console.log(result.rewrite);
    if (result.notes) console.error(`\n[note] ${result.notes}`);
    console.error(
      `\n[${result.providerLatencyMs}ms, ${result.tokens.input}+${result.tokens.output} tokens${result.redactionApplied ? ', redaction applied' : ''}]`,
    );
    // Active-learning loop: ask the one question that makes the metrics real.
    // Only when interactive AND stdin wasn't consumed by a piped draft.
    if (file && process.stdin.isTTY) {
      await promptFeedback(result.feedbackToken);
    }
  });

// --- import ---
const importCmd = program.command('import').description('Bulk-import writing samples');

importCmd
  .command('chat <path>')
  .description('Import from a ChatGPT/Claude export (.zip, conversations.json, or directory)')
  .option('--commit', 'commit instead of preview', false)
  .action(async (p: string, opts: { commit: boolean }) => {
    if (!opts.commit) {
      const preview = previewChatExport(p);
      console.log(`format: ${preview.format}; extractable samples: ${preview.totalExtracted}\n`);
      preview.preview.forEach((s, i) =>
        console.log(`--- preview ${i + 1} [${s.inferredLabel}] ---\n${s.text}\n`),
      );
      console.log('run again with --commit to import.');
    } else {
      const r = commitChatExport(p);
      await backfillEmbeddings();
      console.log(`imported ${r.imported} samples from ${r.format} export (${r.skipped} skipped).`);
    }
  });

importCmd
  .command('files <path>')
  .description('Import .txt/.md/.docx files from a directory')
  .requiredOption('--label <label>', `default label (${CONTEXT_LABELS.join('|')})`)
  .action(async (p: string, opts: { label: string }) => {
    const r = await importTextFiles(p, ContextLabelSchema.parse(opts.label));
    await backfillEmbeddings();
    console.log(`imported ${r.imported} samples from ${r.filesProcessed} files.`);
    if (r.skippedTooShort.length) {
      console.log(`skipped (too short): ${r.skippedTooShort.join(', ')}`);
    }
  });

// --- audit / wipe / setup ---
program
  .command('audit')
  .description('Show the last 20 outbound requests (metadata only, never content)')
  .action(() => {
    const entries = audit.list(20);
    if (entries.length === 0) {
      console.log('no outbound requests yet.');
      return;
    }
    for (const e of entries) {
      console.log(
        `${e.timestamp}  ${e.provider}${e.route}  ${e.payloadBytes}B  draft=${e.draftLength}  profile=${e.profileIncluded ? 'y' : 'n'}  ${e.success ? 'ok' : `FAIL(${e.errorCode})`}`,
      );
    }
  });

program
  .command('metrics')
  .description('Show how well HumanifyMe is matching your voice (local, counts only)')
  .option('--since <iso>', 'only count feedback on or after this ISO timestamp')
  .action((opts: { since?: string }) => {
    const m = feedback.metrics(opts.since ? { since: opts.since } : {});
    if (m.total === 0) {
      console.log('no feedback yet. rewrite something and answer "did this sound like you?"');
      return;
    }
    const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
    console.log(`\nHumanifyMe — your voice-match metrics${opts.since ? ` (since ${opts.since})` : ''}`);
    console.log('─'.repeat(52));
    console.log(`rewrites:        ${m.total}  (${m.recorded} rated)`);
    console.log(`sounds like me:  yes ${m.soundsLikeMe.y} · kinda ${m.soundsLikeMe.kinda} · no ${m.soundsLikeMe.n}`);
    console.log(`accept / edit / reject:  ${pct(m.acceptRate)} / ${pct(m.editRate)} / ${pct(m.rejectRate)}`);
    console.log(`latency:         p50 ${m.latencyP50}ms · p95 ${m.latencyP95}ms`);
    const rows = (label: string, by: Record<string, { total: number; accept: number; edit: number; reject: number }>) => {
      const keys = Object.keys(by).sort();
      if (keys.length === 0) return;
      console.log(`\nby ${label}:`);
      for (const k of keys) {
        const c = by[k]!;
        console.log(`  ${k.padEnd(14)} ${c.total} rewrites  (a${c.accept}/e${c.edit}/r${c.reject})`);
      }
    };
    rows('context', m.byContext);
    rows('provider', m.byProvider);
    console.log('');
  });

program
  .command('wipe')
  .description('Delete ALL HumanifyMe data (samples, profile, cache, audit)')
  .option('--confirm', 'required: confirm deletion', false)
  .option('--full', 'also clear consent', false)
  .action((opts: { confirm: boolean; full: boolean }) => {
    if (!opts.confirm) {
      console.error('refusing to wipe without --confirm. This deletes everything.');
      process.exitCode = 1;
      return;
    }
    wipeAll({ full: opts.full });
    console.log('all HumanifyMe data deleted and re-initialized.');
  });

program
  .command('setup')
  .description('First-run setup: consent, provider, samples, profile')
  .action(async () => {
    console.log('HumanifyMe setup');
    console.log('================');
    if (consentStatus()) {
      console.log('step 1 (consent): already accepted.');
    } else {
      console.log(`
step 1 — consent.

HumanifyMe stores your writing samples ONLY on this machine (~/.humanifyme).
When building your profile or rewriting a draft, redacted text is sent to the
LLM provider YOU configure — and nowhere else. No telemetry, no other servers.
Wipe everything anytime with: humanifyme wipe --confirm
`);
      const accepted = await promptYesNo('Accept and continue? [y/N] ');
      if (!accepted) {
        console.log('setup aborted. nothing stored.');
        return;
      }
      acceptConsent();
      console.log('consent recorded.');
    }
    const config = readConfig();
    const hasProvider = Object.keys(config.providers).length > 0;
    console.log(
      hasProvider
        ? `step 2 (provider): ${config.defaultProvider} configured.`
        : 'step 2 (provider): not configured. run: humanifyme provider set anthropic --api-key <key>',
    );
    const n = samples.count();
    console.log(
      n >= 3
        ? `step 3 (samples): ${n} stored.`
        : `step 3 (samples): ${n} stored; need at least 3. add with: humanifyme sample add <file> --label email  (or: humanifyme import chat <export.zip>)`,
    );
    console.log(
      profiles.get()
        ? 'step 4 (profile): built. try: echo "draft" | humanifyme rewrite'
        : 'step 4 (profile): not built. once you have 3+ samples: humanifyme profile rebuild',
    );

    // Step 5 — opt-in anonymous validation sharing. Default OFF; never content.
    if (readConfig().shareAnonymousFeedback) {
      console.log('step 5 (share results): on. turn off anytime: humanifyme share off');
    } else {
      console.log(`
step 5 — share anonymous results? (optional)

Help others see HumanifyMe actually works. If you turn this on, it sends ONLY
counts — how often rewrites sounded like you, by context/provider, and latency.
No drafts, no rewrites, no text of any kind. Ever. At most once a day.
You can turn it off anytime with: humanifyme share off`);
      const share = await promptYesNo('Share anonymous counts? [y/N] ');
      updateConfig((c) => {
        c.shareAnonymousFeedback = share;
      });
      console.log(
        share
          ? 'step 5 (share results): on, thank you. counts only. off anytime: humanifyme share off'
          : 'step 5 (share results): off. you can opt in later: humanifyme share on',
      );
    }
  });

// --- share (toggle anonymous validation sharing) ---
program
  .command('share <on|off>')
  .description('Turn anonymous results sharing on or off (counts only, never content)')
  .action((state: string) => {
    const on = state === 'on';
    if (state !== 'on' && state !== 'off') {
      console.error('usage: humanifyme share on|off');
      process.exitCode = 1;
      return;
    }
    updateConfig((c) => {
      c.shareAnonymousFeedback = on;
    });
    console.log(`anonymous sharing is now ${on ? 'ON (counts only)' : 'OFF'}.`);
  });

function requireConsentCli(): void {
  if (!consentStatus()) {
    console.error('consent required first. run: humanifyme setup');
    process.exit(1);
  }
}

/** "did this sound like you? [y/e/n]" → records via the feedback tool.
 *  y = accept (used as-is), e = edited it (kinda), n = no. Enter skips. */
async function promptFeedback(token: string): Promise<void> {
  const readline = await import('node:readline/promises');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (
    await rl.question('\ndid this sound like you? [y]es / [e] i edited it / [n]o (enter to skip): ')
  )
    .trim()
    .toLowerCase();
  const signal = ({ y: 'accept', yes: 'accept', e: 'edit', edited: 'edit', n: 'reject', no: 'reject' } as const)[
    answer as 'y' | 'yes' | 'e' | 'edited' | 'n' | 'no'
  ];
  if (!signal) {
    rl.close();
    console.error('[feedback skipped]');
    return;
  }
  const reason =
    signal === 'accept' ? '' : (await rl.question('what felt off? (optional, enter to skip): ')).trim();
  rl.close();
  await executeTool(recordFeedbackTool, { token, signal, ...(reason ? { reason } : {}) });
  console.error('[thanks — recorded locally]');
}

async function promptYesNo(question: string): Promise<boolean> {
  const readline = await import('node:readline/promises');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(question)).trim().toLowerCase();
  rl.close();
  return answer === 'y' || answer === 'yes';
}

program.parseAsync(process.argv).catch((err) => {
  console.error(`error: ${err?.message ?? err}`);
  process.exit(1);
});
