import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readConfig } from '../../config/index.js';
import { setProviderOverride, FakeLLMProvider } from '../../providers/index.js';
import { cleanupHome, freshHome } from '../../testUtils.js';
import { executeTool } from '../registerTool.js';
import { setProviderTool } from './provider.js';

beforeEach(freshHome);
afterEach(() => {
  setProviderOverride(null);
  cleanupHome();
});

describe('humanify_set_provider', () => {
  it('configures local Ollama without a credential', async () => {
    setProviderOverride(new FakeLLMProvider());
    const result = await executeTool(setProviderTool, {
      provider: 'ollama',
      baseUrl: 'http://127.0.0.1:11434',
      model: 'llama3.2:3b',
    });

    expect(result).toEqual({ provider: 'ollama', valid: true });
    expect(readConfig().providers.ollama).toEqual({
      baseUrl: 'http://127.0.0.1:11434',
      model: 'llama3.2:3b',
    });
  });

  it('rejects cloud credentials in model-visible tool arguments', async () => {
    await expect(
      executeTool(setProviderTool, { provider: 'anthropic', apiKey: 'not-a-real-key' }),
    ).rejects.toMatchObject({ code: 'BAD_INPUT' });
    expect(readConfig().providers.anthropic).toBeUndefined();
  });

  it('restores the previous config and preserves provider errors', async () => {
    class UnavailableProvider extends FakeLLMProvider {
      override async testKey(): Promise<boolean> {
        throw new Error('ollama is unavailable');
      }
    }
    setProviderOverride(new UnavailableProvider());

    await expect(
      executeTool(setProviderTool, {
        provider: 'ollama',
        baseUrl: 'http://127.0.0.1:11434',
        model: 'llama3.2:3b',
      }),
    ).rejects.toThrow('ollama is unavailable');
    expect(readConfig().providers.ollama).toBeUndefined();
  });
});
