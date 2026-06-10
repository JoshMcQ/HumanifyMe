import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { freshHome, cleanupHome } from '../testUtils.js';
import { readConfig, writeConfig, updateConfig } from './index.js';
import { DEFAULT_CONFIG } from './schema.js';

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
    updateConfig((c) => {
      c.providers.anthropic = { apiKey: 'sk-test' };
      c.defaultProvider = 'anthropic';
    });
    expect(readConfig().providers.anthropic?.apiKey).toBe('sk-test');
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

  const itPosix = process.platform === 'win32' ? it.skip : it;
  itPosix('file perms are 0600 after write on POSIX', () => {
    readConfig();
    const mode = fs.statSync(path.join(home, 'config.json')).mode & 0o777;
    expect(mode).toBe(0o600);
  });
});
