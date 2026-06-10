import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

/** Root data directory: ~/.humanifyme, overridable via HUMANIFYME_HOME. */
export function humanifymeHome(): string {
  const override = process.env.HUMANIFYME_HOME;
  const dir = override && override.trim().length > 0
    ? override
    : path.join(os.homedir(), '.humanifyme');
  return dir;
}

export function ensureHome(): string {
  const dir = humanifymeHome();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function configPath(): string {
  return path.join(humanifymeHome(), 'config.json');
}

export function dbPath(): string {
  return path.join(humanifymeHome(), 'data.db');
}
