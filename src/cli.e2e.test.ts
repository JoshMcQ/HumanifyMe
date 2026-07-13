import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const homes: string[] = [];

afterEach(() => {
  for (const home of homes.splice(0)) fs.rmSync(home, { recursive: true, force: true });
});

function runCli(args: string[], input = '') {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'humanifyme-cli-test-'));
  homes.push(home);
  return spawnSync(process.execPath, ['--import', 'tsx', 'src/cli-main.ts', ...args], {
    cwd: process.cwd(),
    env: { ...process.env, HUMANIFYME_HOME: home },
    input,
    encoding: 'utf8',
    timeout: 20_000,
  });
}

describe('humanifyme CLI', () => {
  it('analyzes stdin without setup, a profile, or network access', () => {
    const result = runCli(
      ['analyze'],
      'At its core, this robust platform paves the way \u2014 in conclusion, it creates value.',
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('AI-writing review:');
    expect(result.stdout).toContain('2. "At its core, X is about Y"');
    expect(result.stdout).toContain('72. Weird em dash addiction');
    expect(result.stdout).toContain('not an AI detector');
    expect(result.stderr).toBe('');
  });

  it('describes setup as the guided first-run path', () => {
    const result = runCli(['--help']);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(
      /Guided setup: privacy, provider, samples, profile,\s+first rewrite/,
    );
  });

  it('fails clearly instead of hanging when setup has no interactive terminal', () => {
    const result = runCli(['setup']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('setup needs an interactive terminal');
    expect(result.stderr).not.toContain(' at ');
  });

  it('does not accept an empty provider credential in noninteractive use', () => {
    const result = runCli(['provider', 'set', 'anthropic']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('an API key is required for anthropic');
    expect(result.stderr).not.toContain(' at ');
  });
});
