// Entrypoint for the `humanifyme` CLI. Talks to the same storage and engine
// layers as the MCP — no transport in between.

import './suppressExperimentalWarnings.js';
import fs from 'node:fs';
import { Command } from 'commander';
import { VERSION } from './version.js';
import { samples, audit, wipeAll, profiles, feedback } from './storage/index.js';
import { readConfig, updateConfig, writeConfig } from './config/index.js';
import {
  deleteProviderApiKey,
  getProviderApiKey,
  setProviderApiKey,
  type CloudProviderName,
} from './config/secrets.js';
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
import {
  ContextLabelSchema,
  DirectiveSchema,
  PROVIDERS,
  CONTEXT_LABELS,
  type ProviderName,
} from './types.js';
import { analyzeAiWriting, formatAiWritingAnalysis } from './quality/aiSigns.js';
import { runSetupFlow, type SetupIo, type SetupServices } from './onboarding/setupFlow.js';

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
  .option('--model <model>', 'model override')
  .option('--base-url <url>', 'base URL (ollama or self-hosted)')
  .action(async (name: string, opts: { model?: string; baseUrl?: string }) => {
    const parsed = PROVIDERS.find((p) => p === name);
    if (!parsed) {
      console.error(`unknown provider "${name}". options: ${PROVIDERS.join(', ')}`);
      process.exitCode = 1;
      return;
    }
    if (parsed !== 'ollama' && (!process.stdin.isTTY || !process.stdout.isTTY)) {
      console.error(
        `cloud credentials require a secure interactive prompt. Open a terminal and run: humanifyme provider set ${parsed}`,
      );
      process.exitCode = 1;
      return;
    }
    const apiKey = parsed === 'ollama' ? undefined : await promptSecret(`${parsed} API key (input hidden): `);
    const previousConfig = readConfig();
    const cloudProvider = parsed === 'ollama' ? null : (parsed as CloudProviderName);
    const previousApiKey = cloudProvider ? getProviderApiKey(cloudProvider) : null;
    let valid = false;
    let validationError: unknown;
    try {
      configureProvider(parsed, { ...opts, apiKey });
      valid = await getProvider(parsed).testKey();
    } catch (error) {
      validationError = error;
    }
    if (!valid) {
      writeConfig(previousConfig);
      if (cloudProvider) restoreProviderApiKey(cloudProvider, previousApiKey);
    }
    if (valid) {
      console.log(`${parsed} configuration saved. Provider works.`);
    } else {
      const detail = validationError
        ? ` ${validationError instanceof Error ? validationError.message : String(validationError)}`
        : '';
      console.error(`${parsed} configuration not saved: provider validation failed.${detail}`);
      process.exitCode = 1;
    }
  });

provider
  .command('test')
  .description('test the configured key')
  .action(async () => {
    const name = readConfig().defaultProvider;
    const valid = await getProvider().testKey();
    console.log(`${name}: ${valid ? 'key works' : 'key INVALID or unreachable'}`);
    if (!valid) process.exitCode = 1;
  });

// --- analyze ---
program
  .command('analyze [file]')
  .description('Review a draft for recognizable AI-writing signs (reads a file, or stdin)')
  .action((file: string | undefined) => {
    const draft = file ? fs.readFileSync(file, 'utf8') : fs.readFileSync(0, 'utf8');
    console.log(formatAiWritingAnalysis(analyzeAiWriting(draft)));
  });

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
  .description('Guided setup: privacy, provider, samples, profile, first rewrite')
  .action(async () => {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      console.error('setup needs an interactive terminal. Open one and run: npx -y humanifyme setup');
      process.exitCode = 1;
      return;
    }
    try {
      const result = await runSetupFlow(terminalSetupIo(), setupServices());
      if (result.stoppedAt === 'provider' || result.stoppedAt === 'profile') process.exitCode = 1;
    } catch (error) {
      console.error(`setup failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
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

async function promptLine(question: string): Promise<string> {
  const readline = await import('node:readline/promises');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

async function promptMultiline(instructions: string): Promise<string> {
  const readline = await import('node:readline/promises');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(`\n${instructions}`);
  const lines: string[] = [];
  try {
    for await (const line of rl) {
      if (line.trim() === '.done') break;
      if (lines.length === 0 && line.trim() === '.skip') return '.skip';
      lines.push(line);
    }
  } finally {
    rl.close();
  }
  return lines.join('\n');
}

function promptSecret(question: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY || !process.stdin.setRawMode) {
    return Promise.reject(new Error('secret input requires an interactive terminal'));
  }
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    const output = process.stdout;
    const wasRaw = input.isRaw;
    let value = '';

    const cleanup = () => {
      input.off('data', onData);
      input.setRawMode?.(Boolean(wasRaw));
      input.pause();
    };
    const finish = () => {
      cleanup();
      output.write('\n');
      resolve(value);
    };
    const cancel = () => {
      cleanup();
      output.write('\n');
      reject(new Error('input cancelled'));
    };
    const onData = (chunk: Buffer | string) => {
      for (const char of chunk.toString()) {
        if (char === '\u0003') {
          cancel();
          return;
        }
        if (char === '\r' || char === '\n') {
          finish();
          return;
        }
        if (char === '\u0008' || char === '\u007f') {
          value = value.slice(0, -1);
          continue;
        }
        if (char >= ' ') value += char;
      }
    };

    output.write(question);
    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
  });
}

function configureProvider(
  provider: ProviderName,
  opts: { apiKey?: string; model?: string; baseUrl?: string },
): void {
  const config = readConfig();
  if (provider === 'ollama') {
    config.providers.ollama = {
      baseUrl: opts.baseUrl ?? 'http://localhost:11434',
      model: opts.model ?? 'llama3.2:3b',
    };
    config.defaultProvider = provider;
    writeConfig(config);
    return;
  }

  if (!opts.apiKey) throw new Error(`an API key is required for ${provider}`);
  const previousApiKey = getProviderApiKey(provider);
  setProviderApiKey(provider, opts.apiKey);
  config.providers[provider] = {
    ...config.providers[provider],
    credentialStored: true,
    ...(opts.model ? { model: opts.model } : {}),
  };
  config.defaultProvider = provider;
  try {
    writeConfig(config);
  } catch (error) {
    restoreProviderApiKey(provider, previousApiKey);
    throw error;
  }
}

function terminalSetupIo(): SetupIo {
  return {
    write: (message) => console.log(message),
    ask: promptLine,
    askSecret: promptSecret,
    askMultiline: promptMultiline,
  };
}

function setupServices(): SetupServices {
  return {
    consentAccepted: () => Boolean(consentStatus()),
    acceptConsent: () => {
      acceptConsent();
    },
    configuredProvider: () => {
      const config = readConfig();
      const provider = config.defaultProvider;
      if (provider === 'ollama') return config.providers.ollama ? provider : null;
      return config.providers[provider] && getProviderApiKey(provider) ? provider : null;
    },
    configureProvider: (provider, secret) => {
      configureProvider(provider, { apiKey: secret });
    },
    clearProvider: (provider) => {
      const cloudProvider = provider === 'ollama' ? null : provider;
      const previousApiKey = cloudProvider ? getProviderApiKey(cloudProvider) : null;
      if (cloudProvider) deleteProviderApiKey(cloudProvider);
      try {
        updateConfig((config) => {
          delete config.providers[provider];
        });
      } catch (error) {
        if (cloudProvider) restoreProviderApiKey(cloudProvider, previousApiKey);
        throw error;
      }
    },
    testProvider: async (provider) => getProvider(provider).testKey(),
    sampleCount: () => samples.count(),
    addSample: async (text, label) => {
      const record = samples.add({ text, labels: [label], source: 'paste' });
      await embedSample(record.id, record.text);
    },
    hasProfile: () => Boolean(profiles.get()),
    buildProfile: async () => {
      const profile = await buildProfile(getProvider(), {
        force: true,
        onProgress: (event) => console.log(`  ${event.stage}`),
      });
      return renderProfileMarkdown(profile);
    },
    runDemo: async (draft) => {
      const profile = profiles.get();
      if (!profile) throw new Error('voice profile is missing');
      const result = await rewrite({
        draft,
        profile,
        contextLabel: 'email',
        directives: ['more_like_me'],
        provider: getProvider(),
      });
      return { rewrite: result.rewrite, feedbackToken: result.feedbackToken };
    },
    recordFeedback: async (token, signal) => {
      await executeTool(recordFeedbackTool, { token, signal });
    },
    sharingEnabled: () => readConfig().shareAnonymousFeedback,
    setSharing: (enabled) => {
      updateConfig((config) => {
        config.shareAnonymousFeedback = enabled;
      });
    },
  };
}

function restoreProviderApiKey(provider: CloudProviderName, apiKey: string | null): void {
  if (apiKey !== null) setProviderApiKey(provider, apiKey);
  else deleteProviderApiKey(provider);
}

program.parseAsync(process.argv).catch((err) => {
  console.error(`error: ${err?.message ?? err}`);
  process.exit(1);
});
