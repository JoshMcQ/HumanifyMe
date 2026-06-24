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

// v2 (M8): local embeddings of samples, used as the retrieval key for the
// rewrite engine. One row per sample; ON DELETE CASCADE keeps it in lockstep
// with samples. Vectors are Float32Array bytes; `model` invalidates on change.
const MIGRATION_002 = `
CREATE TABLE sample_embeddings (
  sample_id   TEXT PRIMARY KEY REFERENCES samples(id) ON DELETE CASCADE,
  model       TEXT NOT NULL,
  dim         INTEGER NOT NULL,
  vector      BLOB NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX sample_embeddings_model ON sample_embeddings(model);
`;

// v3 (M9): per-rewrite feedback signal, the basis of the validation metrics.
// One row per rewrite the user saw (created pending, signal NULL); the signal is
// filled in when they answer "did this sound like you?". context_label/provider/
// latency are denormalized from the audit row so metrics need no join, and so the
// cloud aggregate (counts only) can be computed without touching any content.
// reason is local-only meta-feedback and is NEVER shipped. Raw drafts/edits are
// never stored here.
const MIGRATION_003 = `
CREATE TABLE feedback (
  token          TEXT PRIMARY KEY,
  audit_id       INTEGER,
  context_label  TEXT,
  provider       TEXT,
  latency_ms     INTEGER,
  signal         TEXT,
  reason         TEXT,
  created_at     TEXT NOT NULL,
  recorded_at    TEXT
);
CREATE INDEX feedback_created_at ON feedback(created_at);
CREATE INDEX feedback_signal ON feedback(signal);
`;

export const MIGRATIONS: Migration[] = [
  { version: 1, name: '001_init', sql: MIGRATION_001 },
  { version: 2, name: '002_embeddings', sql: MIGRATION_002 },
  { version: 3, name: '003_feedback', sql: MIGRATION_003 },
];
