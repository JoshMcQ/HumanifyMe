import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { VERSION } from './version.js';

describe('VERSION', () => {
  it('comes from the package manifest', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as {
      version: string;
    };
    expect(VERSION).toBe(packageJson.version);
  });
});
