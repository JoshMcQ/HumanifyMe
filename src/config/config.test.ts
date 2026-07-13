import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { freshHome, cleanupHome } from '../testUtils.js';
import { readConfig, writeConfig, updateConfig } from './index.js';
import { DEFAULT_CONFIG } from './schema.js';
import {
  getProviderApiKey,
  setProviderApiKey,
  setSecretStoreOverride,
  type SecretStore,
} from './secrets.js';

let home: string;
beforeEach(() => {
  home = freshHome();
});
afterEach(cleanupHome);

describe('config layer', () => {
  it('first read writes a default config', () => {
    const config = readConfig();
    expect(config).toEqual(DEFAULT_CONFIG);
    expect(fs.existsSync(path.join(home, 'config.json'))).toBe(true);
  });

  it('write/read round-trip', () => {
    setProviderApiKey('anthropic', 'test-provider-key');
    updateConfig((c) => {
      c.providers.anthropic = { credentialStored: true };
      c.defaultProvider = 'anthropic';
    });
    expect(readConfig().providers.anthropic?.credentialStored).toBe(true);
    expect(getProviderApiKey('anthropic')).toBe('test-provider-key');
    expect(fs.readFileSync(path.join(home, 'config.json'), 'utf8')).not.toContain('test-provider-key');
  });

  it('migrates a legacy inline key into the secret store before rewriting config', () => {
    const legacy = {
      ...structuredClone(DEFAULT_CONFIG),
      version: 1,
      providers: { anthropic: { apiKey: 'legacy-provider-key', model: 'legacy-model' } },
    };
    fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify(legacy));

    const config = readConfig();

    expect(config.providers.anthropic).toEqual({ credentialStored: true, model: 'legacy-model' });
    expect(config.version).toBe(2);
    expect(getProviderApiKey('anthropic')).toBe('legacy-provider-key');
    const migratedFile = fs.readFileSync(path.join(home, 'config.json'), 'utf8');
    expect(migratedFile).not.toContain('legacy-provider-key');
    expect(JSON.parse(migratedFile).version).toBe(2);
  });

  it('rolls back all keychain writes when a multi-provider migration fails', () => {
    const values = new Map<string, string>();
    let setCalls = 0;
    let failOnSet = Number.POSITIVE_INFINITY;
    const store: SecretStore = {
      get: (service, account) => values.get(`${service}:${account}`) ?? null,
      set: (service, account, secret) => {
        setCalls += 1;
        if (setCalls === failOnSet) throw new Error('simulated keychain write failure');
        values.set(`${service}:${account}`, secret);
      },
      delete: (service, account) => {
        values.delete(`${service}:${account}`);
      },
    };
    setSecretStoreOverride(store);
    setProviderApiKey('anthropic', 'existing-anthropic-key');
    setCalls = 0;
    failOnSet = 2;

    const legacy = {
      ...structuredClone(DEFAULT_CONFIG),
      version: 1,
      providers: {
        anthropic: { apiKey: 'new-anthropic-key' },
        openai: { apiKey: 'new-openai-key' },
      },
    };
    const original = JSON.stringify(legacy);
    fs.writeFileSync(path.join(home, 'config.json'), original);

    expect(() => readConfig()).toThrow(/simulated keychain write failure/);
    expect(getProviderApiKey('anthropic')).toBe('existing-anthropic-key');
    expect(getProviderApiKey('openai')).toBeNull();
    expect(fs.readFileSync(path.join(home, 'config.json'), 'utf8')).toBe(original);
  });

  it('leaves a legacy file untouched when the OS keychain is unavailable', () => {
    const unavailableStore: SecretStore = {
      get: () => null,
      set: () => {
        throw new Error('credential service unavailable');
      },
      delete: () => undefined,
    };
    setSecretStoreOverride(unavailableStore);
    const legacy = {
      ...structuredClone(DEFAULT_CONFIG),
      version: 1,
      providers: { anthropic: { apiKey: 'still-in-legacy-file' } },
    };
    const original = JSON.stringify(legacy);
    fs.writeFileSync(path.join(home, 'config.json'), original);

    expect(() => readConfig()).toThrow(/does not fall back to plaintext storage/);
    expect(fs.readFileSync(path.join(home, 'config.json'), 'utf8')).toBe(original);
  });

  it('restores the keychain when a migrated legacy config fails schema validation', () => {
    const legacy = {
      ...structuredClone(DEFAULT_CONFIG),
      version: 1,
      rateLimitPerDay: -1,
      providers: { anthropic: { apiKey: 'invalid-config-key' } },
    };
    const original = JSON.stringify(legacy);
    fs.writeFileSync(path.join(home, 'config.json'), original);

    expect(() => readConfig()).toThrow(/failed validation/);
    expect(getProviderApiKey('anthropic')).toBeNull();
    expect(fs.readFileSync(path.join(home, 'config.json'), 'utf8')).toBe(original);
  });

  it('malformed JSON surfaces a clear error', () => {
    readConfig();
    fs.writeFileSync(path.join(home, 'config.json'), '{not json');
    expect(() => readConfig()).toThrow(/not valid JSON/);
  });

  it('unknown provider fails closed', () => {
    readConfig();
    const raw = JSON.parse(fs.readFileSync(path.join(home, 'config.json'), 'utf8'));
    raw.defaultProvider = 'skynet';
    fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify(raw));
    expect(() => readConfig()).toThrow(/failed validation/);
  });

  it('rejects writing an invalid config', () => {
    expect(() => writeConfig({ ...DEFAULT_CONFIG, rateLimitPerDay: -1 })).toThrow();
  });

  it('preserves the existing config when the atomic replace fails', () => {
    readConfig();
    const file = path.join(home, 'config.json');
    const original = fs.readFileSync(file, 'utf8');
    const rename = vi.spyOn(fs, 'renameSync').mockImplementation(() => {
      throw new Error('simulated rename failure');
    });
    try {
      expect(() => writeConfig({ ...DEFAULT_CONFIG, rateLimitPerDay: 201 })).toThrow(
        /simulated rename failure/,
      );
    } finally {
      rename.mockRestore();
    }

    expect(fs.readFileSync(file, 'utf8')).toBe(original);
    expect(fs.readdirSync(home).some((entry) => entry.endsWith('.tmp'))).toBe(false);
  });

  it('default config has a rag block with the documented defaults', () => {
    const rag = readConfig().rag;
    expect(rag).toEqual({
      enabled: true,
      embedder: 'lexical',
      minSamples: 5,
      topK: 5,
      mmrLambda: 0.7,
      dedupCosine: 0.97,
    });
  });

  it('a config written before rag existed still reads and gets rag defaults', () => {
    readConfig();
    const raw = JSON.parse(fs.readFileSync(path.join(home, 'config.json'), 'utf8'));
    delete raw.rag; // simulate a pre-M8 config on disk
    fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify(raw));
    const cfg = readConfig();
    expect(cfg.rag.embedder).toBe('lexical');
    expect(cfg.rag.enabled).toBe(true);
  });

  it('rag.enabled round-trips', () => {
    updateConfig((c) => {
      c.rag.enabled = false;
    });
    expect(readConfig().rag.enabled).toBe(false);
  });

  it('rejects an out-of-range rag value', () => {
    readConfig();
    const raw = JSON.parse(fs.readFileSync(path.join(home, 'config.json'), 'utf8'));
    raw.rag = { ...raw.rag, mmrLambda: 2 };
    fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify(raw));
    expect(() => readConfig()).toThrow(/failed validation/);
  });

  const itPosix = process.platform === 'win32' ? it.skip : it;
  itPosix('file perms are 0600 after write on POSIX', () => {
    readConfig();
    const mode = fs.statSync(path.join(home, 'config.json')).mode & 0o777;
    expect(mode).toBe(0o600);
  });
});
