// Migration registry. The canonical SQL also lives in the sibling .sql files;
// it is inlined here so the bundle and test runner need no special loaders.
// When adding a migration: add the NNN_name.sql file AND register it here.

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

const MIGRATION_001 = `
CREATE TABLE samples (
  id          TEXT PRIMARY KEY,
  text        TEXT NOT NULL,
  labels      TEXT NOT NULL,
  source      TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  char_count  INTEGER NOT NULL
);
CREATE INDEX samples_created_at ON samples(created_at);
CREATE INDEX samples_source ON samples(source);

CREATE TABLE profiles (
  id          TEXT PRIMARY KEY,
  profile     TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE rewrite_cache (
  key         TEXT PRIMARY KEY,
  response    TEXT NOT NULL,
  last_used   TEXT NOT NULL
);
CREATE INDEX rewrite_cache_last_used ON rewrite_cache(last_used);

CREATE TABLE audit_log (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp        TEXT NOT NULL,
  provider         TEXT NOT NULL,
  route            TEXT NOT NULL,
  payload_bytes    INTEGER NOT NULL,
  draft_length     INTEGER NOT NULL,
  profile_included INTEGER NOT NULL,
  success          INTEGER NOT NULL,
  error_code       TEXT
);
`;

export const MIGRATIONS: Migration[] = [
  { version: 1, name: '001_init', sql: MIGRATION_001 },
];
