// Test helper: isolate each test file in a fresh HUMANIFYME_HOME tmp dir.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { closeDb } from './storage/db.js';

export function freshHome(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'humanifyme-test-'));
  process.env.HUMANIFYME_HOME = dir;
  return dir;
}

export function cleanupHome(): void {
  closeDb();
  const dir = process.env.HUMANIFYME_HOME;
  if (dir && dir.includes('humanifyme-test-')) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  delete process.env.HUMANIFYME_HOME;
}
