// SQLite via the Node built-in driver (node:sqlite, Node >= 22.5).
// Chosen over better-sqlite3 to keep `npx -y humanifyme` free of native
// compilation. See specs/mcp-server-spec.md Runtime.

import fs from 'node:fs';
import { createRequire } from 'node:module';
import type { DatabaseSync } from 'node:sqlite';
import { dbPath, ensureHome } from '../paths.js';
import { MIGRATIONS } from './migrations/index.js';

// node:sqlite is loaded lazily (and via require, not a static import) so the
// entrypoints can install their warning filter before the driver emits its
// ExperimentalWarning -- static externals get hoisted above all bundle code.
const require = createRequire(import.meta.url);

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  ensureHome();
  const { DatabaseSync: Driver } = require('node:sqlite') as typeof import('node:sqlite');
  db = new Driver(dbPath());
  db.exec('PRAGMA journal_mode = WAL');
  // Enforce ON DELETE CASCADE (sample_embeddings -> samples). node:sqlite
  // leaves FK enforcement off by default; it is per-connection.
  db.exec('PRAGMA foreign_keys = ON');
  applyMigrations(db);
  return db;
}

function applyMigrations(d: DatabaseSync): void {
  d.exec(
    'CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)',
  );
  const appliedRows = d.prepare('SELECT version FROM _migrations').all() as unknown as {
    version: number;
  }[];
  const applied = new Set(appliedRows.map((r) => r.version));
  for (const m of MIGRATIONS) {
    if (applied.has(m.version)) continue;
    d.exec('BEGIN');
    try {
      d.exec(m.sql);
      d.prepare('INSERT INTO _migrations (version, applied_at) VALUES (?, ?)').run(
        m.version,
        new Date().toISOString(),
      );
      d.exec('COMMIT');
    } catch (err) {
      d.exec('ROLLBACK');
      throw err;
    }
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/** Deletes the DB file and re-initializes the v1 schema. */
export function deleteAndReinitDb(): void {
  closeDb();
  const file = dbPath();
  for (const suffix of ['', '-wal', '-shm']) {
    const p = file + suffix;
    if (fs.existsSync(p)) fs.rmSync(p);
  }
  getDb();
}
