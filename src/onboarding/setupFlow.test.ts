import { describe, expect, it } from 'vitest';
import type { ContextLabel, ProviderName } from '../types.js';
import { runSetupFlow, type SetupIo, type SetupServices } from './setupFlow.js';

class FakeIo implements SetupIo {
  output: string[] = [];
  constructor(
    private answers: string[] = [],
    private secrets: string[] = [],
    private samples: string[] = [],
  ) {}
  write(message: string): void {
    this.output.push(message);
  }
  async ask(): Promise<string> {
    return this.answers.shift() ?? '';
  }
  async askSecret(): Promise<string> {
    return this.secrets.shift() ?? '';
  }
  async askMultiline(): Promise<string> {
    return this.samples.shift() ?? '';
  }
}

function fakeServices(overrides: Partial<SetupServices> = {}) {
  const calls = {
    consent: 0,
    configured: [] as Array<{ provider: ProviderName; secret?: string }>,
    cleared: [] as ProviderName[],
    samples: [] as Array<{ text: string; label: ContextLabel }>,
    feedback: [] as Array<{ token: string; signal: 'accept' | 'edit' | 'reject' }>,
    sharing: [] as boolean[],
    builds: 0,
  };
  let count = 0;
  const services: SetupServices = {
    consentAccepted: () => false,
    acceptConsent: () => {
      calls.consent++;
    },
    configuredProvider: () => null,
    configureProvider: (provider, secret) => {
      calls.configured.push({ provider, ...(secret ? { secret } : {}) });
    },
    clearProvider: (provider) => {
      calls.cleared.push(provider);
    },
    testProvider: async () => true,
    sampleCount: () => count,
    addSample: async (text, label) => {
      calls.samples.push({ text, label });
      count++;
    },
    hasProfile: () => false,
    buildProfile: async () => {
      calls.builds++;
      return 'Profile: direct, casual, short sentences.';
    },
    runDemo: async () => ({ rewrite: 'hey, did you get a chance to review this?', feedbackToken: 'token-1' }),
    recordFeedback: async (token, signal) => {
      calls.feedback.push({ token, signal });
    },
    sharingEnabled: () => false,
    setSharing: (enabled) => {
      calls.sharing.push(enabled);
    },
    ...overrides,
  };
  return { services, calls };
}

const sample = (marker: string) => `${marker} ${'This is something I actually wrote in my own ordinary voice. '.repeat(2)}`;

describe('runSetupFlow', () => {
  it('completes a fresh install in one guided flow', async () => {
    const io = new FakeIo(
      ['y', 'y', '1', 'y', 'y', 'n'],
      ['sk-ant-test'],
      [sample('email'), sample('casual'), sample('professional')],
    );
    const { services, calls } = fakeServices();

    await expect(runSetupFlow(io, services)).resolves.toEqual({ completed: true });
    expect(calls.consent).toBe(1);
    expect(calls.configured).toEqual([{ provider: 'anthropic', secret: 'sk-ant-test' }]);
    expect(calls.samples.map((entry) => entry.label)).toEqual(['email', 'casual', 'professional']);
    expect(calls.builds).toBe(1);
    expect(calls.feedback).toEqual([{ token: 'token-1', signal: 'accept' }]);
    expect(calls.sharing).toEqual([false]);
    expect(io.output.at(-1)).toContain('Setup complete');
  });

  it('does not repeat completed steps for a returning user', async () => {
    const io = new FakeIo(['n']);
    const { services, calls } = fakeServices({
      consentAccepted: () => true,
      configuredProvider: () => 'ollama',
      sampleCount: () => 8,
      hasProfile: () => true,
      sharingEnabled: () => true,
    });

    expect(await runSetupFlow(io, services)).toEqual({ completed: true });
    expect(calls.consent).toBe(0);
    expect(calls.configured).toEqual([]);
    expect(calls.samples).toEqual([]);
    expect(calls.builds).toBe(0);
    expect(calls.sharing).toEqual([]);
  });

  it('re-prompts an invalid provider choice', async () => {
    const io = new FakeIo(['y', 'y', 'not-a-provider', '4', 'n'], [], ['.skip']);
    const { services, calls } = fakeServices();

    expect(await runSetupFlow(io, services)).toEqual({ completed: false, stoppedAt: 'samples' });
    expect(calls.configured).toEqual([{ provider: 'ollama' }]);
    expect(io.output).toContain('Choose anthropic, openai, gemini, or ollama.');
  });

  it('rejects short samples without saving them', async () => {
    const io = new FakeIo(['y', 'y', '4'], [], ['too short', sample('valid'), '.skip']);
    const { services, calls } = fakeServices();

    expect(await runSetupFlow(io, services)).toEqual({ completed: false, stoppedAt: 'samples' });
    expect(calls.samples).toHaveLength(1);
    expect(io.output.some((line) => line.includes('minimum is 100'))).toBe(true);
  });

  it('stops before collecting samples when provider validation fails', async () => {
    const io = new FakeIo(['y', 'y', 'openai'], ['bad-key']);
    const { services, calls } = fakeServices({ testProvider: async () => false });

    expect(await runSetupFlow(io, services)).toEqual({ completed: false, stoppedAt: 'provider' });
    expect(calls.samples).toEqual([]);
    expect(calls.builds).toBe(0);
    expect(calls.cleared).toEqual(['openai']);
  });

  it('treats a provider exception as a retryable validation failure', async () => {
    const io = new FakeIo(['y', 'y', 'gemini'], ['bad-key']);
    const { services, calls } = fakeServices({
      testProvider: async () => {
        throw new Error('network unavailable');
      },
    });

    expect(await runSetupFlow(io, services)).toEqual({ completed: false, stoppedAt: 'provider' });
    expect(calls.cleared).toEqual(['gemini']);
  });

  it('keeps a completed profile when the optional demo rewrite fails', async () => {
    const io = new FakeIo(['y', 'n']);
    const { services } = fakeServices({
      consentAccepted: () => true,
      configuredProvider: () => 'ollama',
      sampleCount: () => 3,
      hasProfile: () => true,
      runDemo: async () => {
        throw new Error('model timed out');
      },
    });

    expect(await runSetupFlow(io, services)).toEqual({ completed: true });
    expect(io.output.some((line) => line.includes('Your profile is saved'))).toBe(true);
  });

  it('preserves progress when consent or sample collection is declined', async () => {
    const consentIo = new FakeIo(['n']);
    const consentServices = fakeServices();
    expect(await runSetupFlow(consentIo, consentServices.services)).toEqual({
      completed: false,
      stoppedAt: 'consent',
    });
    expect(consentServices.calls.consent).toBe(0);

    const sampleIo = new FakeIo(['y', 'y', '4'], [], ['.skip']);
    const sampleServices = fakeServices();
    expect(await runSetupFlow(sampleIo, sampleServices.services)).toEqual({
      completed: false,
      stoppedAt: 'samples',
    });
  });
});
