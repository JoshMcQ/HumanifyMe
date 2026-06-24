// SPDX-License-Identifier: MIT
//
// The outbound-destination scan promised by tasks/test-plan.md, finally real.
// It statically guarantees two things about the whole src/ tree:
//   1. Only src/providers/ and src/network/ may issue a fetch() — nothing else
//      can quietly open a socket.
//   2. Every hardcoded outbound host in those two dirs is on a short allowlist,
//      so a new destination can't appear without this test (and a privacy-spec
//      update) noticing.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); // .../src
const ALLOWED_FETCH_DIRS = ['providers', 'network'];
const ALLOWED_HOSTS = new Set([
  'api.anthropic.com',
  'api.openai.com',
  'generativelanguage.googleapis.com',
  'humanifyme.com',
]);

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkTsFiles(full));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      out.push(full);
    }
  }
  return out;
}

const topDir = (file: string) => path.relative(SRC, file).replace(/\\/g, '/').split('/')[0]!;

describe('outbound-destination scan', () => {
  it('only src/providers and src/network issue fetch() calls', () => {
    const offenders: string[] = [];
    for (const file of walkTsFiles(SRC)) {
      if (ALLOWED_FETCH_DIRS.includes(topDir(file))) continue;
      const src = fs.readFileSync(file, 'utf8');
      if (/\bfetch\s*\(/.test(src)) offenders.push(path.relative(SRC, file).replace(/\\/g, '/'));
    }
    expect(offenders).toEqual([]);
  });

  it('every hardcoded outbound host is on the allowlist', () => {
    const hosts = new Set<string>();
    for (const file of walkTsFiles(SRC)) {
      if (!ALLOWED_FETCH_DIRS.includes(topDir(file))) continue;
      const src = fs.readFileSync(file, 'utf8');
      for (const m of src.matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/g)) hosts.add(m[1]!);
    }
    const unexpected = [...hosts].filter((h) => !ALLOWED_HOSTS.has(h));
    expect(unexpected).toEqual([]);
  });
});
