import type { ContextLabel, ProviderName } from '../types.js';

export interface SetupIo {
  write(message: string): void;
  ask(question: string): Promise<string>;
  askSecret(question: string): Promise<string>;
  askMultiline(instructions: string): Promise<string>;
}

export interface SetupServices {
  consentAccepted(): boolean;
  acceptConsent(): void;
  configuredProvider(): ProviderName | null;
  configureProvider(provider: ProviderName, secret?: string): void;
  clearProvider(provider: ProviderName): void;
  testProvider(provider: ProviderName): Promise<boolean>;
  sampleCount(): number;
  addSample(text: string, label: ContextLabel): Promise<void>;
  hasProfile(): boolean;
  buildProfile(): Promise<string>;
  runDemo(draft: string): Promise<{ rewrite: string; feedbackToken: string }>;
  recordFeedback(token: string, signal: 'accept' | 'edit' | 'reject'): Promise<void>;
  sharingEnabled(): boolean;
  setSharing(enabled: boolean): void;
}

export interface SetupResult {
  completed: boolean;
  stoppedAt?: 'consent' | 'provider' | 'samples' | 'profile';
}

const PROVIDERS: readonly ProviderName[] = ['anthropic', 'openai', 'gemini', 'ollama'];
const SAMPLE_LABELS: readonly ContextLabel[] = ['email', 'casual', 'professional'];
const DEMO_DRAFT =
  'I am writing to follow up regarding the project update. Please let me know if you have had an opportunity to review it and whether there are any next steps I should be aware of.';

export async function runSetupFlow(io: SetupIo, services: SetupServices): Promise<SetupResult> {
  io.write('HumanifyMe setup\n');

  if (!services.consentAccepted()) {
    io.write('1 of 5: Privacy and consent');
    const sendsRedactedText = await askYesNo(
      io,
      'I understand that redacted samples and drafts go only to the provider I configure. Continue? [y/N] ',
    );
    if (!sendsRedactedText) return stop(io, 'consent', 'Nothing was stored.');

    const keepsSamplesLocal = await askYesNo(
      io,
      'I understand that my original writing samples stay on this machine. Continue? [y/N] ',
    );
    if (!keepsSamplesLocal) return stop(io, 'consent', 'Nothing was stored.');
    services.acceptConsent();
    io.write('Consent recorded locally.');
  } else {
    io.write('1 of 5: Privacy and consent - already complete');
  }

  let provider = services.configuredProvider();
  if (!provider) {
    io.write('\n2 of 5: Choose a model provider');
    provider = await chooseProvider(io);
    const secret = provider === 'ollama' ? undefined : await readRequiredSecret(io, provider);
    services.configureProvider(provider, secret);
    io.write(`Testing ${provider}...`);
    let providerWorks = false;
    try {
      providerWorks = await services.testProvider(provider);
    } catch {
      providerWorks = false;
    }
    if (!providerWorks) {
      services.clearProvider(provider);
      return stop(
        io,
        'provider',
        `${provider} could not be reached or rejected the credential. Run setup again to retry.`,
      );
    }
    io.write(`${provider} is ready.`);
  } else {
    io.write(`\n2 of 5: Provider - ${provider} is already configured`);
  }

  let count = services.sampleCount();
  if (count < 3) {
    io.write(`\n3 of 5: Add writing samples - ${count} of 3 minimum`);
    io.write('Use things you actually wrote. A sent email or message is better than polished copy.');
    while (count < 3) {
      const label = SAMPLE_LABELS[count % SAMPLE_LABELS.length]!;
      const text = (
        await io.askMultiline(
          `Paste sample ${count + 1} (${label}, at least 100 characters). Finish with a line containing only .done. Enter .skip to stop setup.`,
        )
      ).trim();
      if (text === '.skip' || text.length === 0) {
        return stop(
          io,
          'samples',
          `You have ${count} samples. Setup saved your progress; run it again when you are ready.`,
        );
      }
      if (text.length < 100) {
        io.write(`That sample is ${text.length} characters; the minimum is 100. Nothing was saved.`);
        continue;
      }
      await services.addSample(text, label);
      count++;
      io.write(`Saved sample ${count} of 3 locally.`);
    }
  } else {
    io.write(`\n3 of 5: Writing samples - ${count} already stored`);
  }

  if (!services.hasProfile()) {
    io.write('\n4 of 5: Building your voice profile');
    try {
      const summary = await services.buildProfile();
      io.write(summary);
    } catch (error) {
      return stop(io, 'profile', `Profile build failed: ${errorMessage(error)}. Run setup again to retry.`);
    }
  } else {
    io.write('\n4 of 5: Voice profile - already built');
  }

  io.write('\n5 of 5: First rewrite');
  if (await askYesNo(io, 'Run a small test rewrite now? [Y/n] ', true)) {
    try {
      const result = await services.runDemo(DEMO_DRAFT);
      io.write(`Before:\n${DEMO_DRAFT}\n\nAfter:\n${result.rewrite}`);
      const answer = (await io.ask('Did this sound like you? [y]es / [e]dited / [n]o / [enter] skip: '))
        .trim()
        .toLowerCase();
      const signal = feedbackSignal(answer);
      if (signal) await services.recordFeedback(result.feedbackToken, signal);
    } catch (error) {
      io.write(`The test rewrite failed: ${errorMessage(error)}. Your profile is saved; retry with humanifyme rewrite.`);
    }
  }

  if (!services.sharingEnabled()) {
    io.write('\nOptional: share anonymous quality counts');
    io.write('This sends counts by context/provider and latency at most once a day. It never sends text.');
    services.setSharing(await askYesNo(io, 'Share anonymous counts? [y/N] '));
  }

  io.write('\nSetup complete. Ask your agent to "humanify this," or run: humanifyme rewrite draft.txt');
  return { completed: true };
}

async function chooseProvider(io: SetupIo): Promise<ProviderName> {
  io.write('1. Anthropic\n2. OpenAI\n3. Gemini\n4. Ollama (local)');
  for (;;) {
    const answer = (await io.ask('Provider [1-4 or name]: ')).trim().toLowerCase();
    const byNumber = Number(answer);
    if (Number.isInteger(byNumber) && byNumber >= 1 && byNumber <= PROVIDERS.length) {
      return PROVIDERS[byNumber - 1]!;
    }
    const byName = PROVIDERS.find((candidate) => candidate === answer);
    if (byName) return byName;
    io.write('Choose anthropic, openai, gemini, or ollama.');
  }
}

async function readRequiredSecret(io: SetupIo, provider: ProviderName): Promise<string> {
  for (;;) {
    const secret = (await io.askSecret(`${provider} API key (input hidden): `)).trim();
    if (secret) return secret;
    io.write('The API key cannot be empty.');
  }
}

async function askYesNo(io: SetupIo, question: string, defaultYes = false): Promise<boolean> {
  const answer = (await io.ask(question)).trim().toLowerCase();
  if (!answer) return defaultYes;
  return answer === 'y' || answer === 'yes';
}

function feedbackSignal(answer: string): 'accept' | 'edit' | 'reject' | null {
  if (answer === 'y' || answer === 'yes') return 'accept';
  if (answer === 'e' || answer === 'edit' || answer === 'edited') return 'edit';
  if (answer === 'n' || answer === 'no') return 'reject';
  return null;
}

function stop(
  io: SetupIo,
  stoppedAt: NonNullable<SetupResult['stoppedAt']>,
  message: string,
): SetupResult {
  io.write(message);
  return { completed: false, stoppedAt };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
