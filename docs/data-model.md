# Data Model

All storage is local in MVP. Two stores:

1. **`~/.humanifyme/config.json`** — small structured config: provider, API keys, settings, consent timestamp.
2. **`~/.humanifyme/data.db`** — SQLite database: samples, profile, rewrite cache, audit log.

`HUMANIFYME_HOME` overrides `~/.humanifyme/`.

## Config file

Schema (zod-validated on read and write):

```ts
interface Config {
  version: 1;
  consentAcceptedAt?: string;     // ISO timestamp; required before any LLM call
  defaultProvider: 'anthropic' | 'openai' | 'gemini' | 'ollama';
  providers: {
    anthropic?: { apiKey: string; model?: string };
    openai?:    { apiKey: string; model?: string };
    gemini?:    { apiKey: string; model?: string };
    ollama?:    { baseUrl: string; model: string };
  };
  redactionPatterns: string[];     // user-extensible, defaults from privacy spec
  rateLimitPerDay: number;         // default 200
  autoHumanify: boolean;           // default false
  autoHumanifyAgents: string[];    // default []
  errorReporting: boolean;         // default false
  telemetry: boolean;              // default false
}
```

File perms: 0600 on POSIX. On macOS the MCP attempts to store the API keys in the OS keychain via `keytar` and writes a placeholder reference in `config.json`; on failure, falls back to inline storage with a logged warning.

## SQLite schema (v1)

### `samples`

```sql
CREATE TABLE samples (
  id          TEXT PRIMARY KEY,       -- uuid v4
  text        TEXT NOT NULL,          -- raw user paste, NOT redacted
  labels      TEXT NOT NULL,          -- JSON array, validated against ContextLabel
  source      TEXT NOT NULL,          -- 'paste' | 'chatgpt' | 'claude' | 'gmail' | 'slack' | 'messages' | 'text-file' | 'active-learning'
  created_at  TEXT NOT NULL,          -- ISO timestamp
  char_count  INTEGER NOT NULL        -- denormalized
);
CREATE INDEX samples_created_at ON samples(created_at);
CREATE INDEX samples_source ON samples(source);
```

Constraints enforced in zod before insert: `text.length >= 100`, `labels.length >= 1`, each label in the closed set, `source` in the closed set above.

The `source` column lets the audit view show breakdowns ("you have 12 samples from manual paste, 384 from your ChatGPT export"). It also makes it easy to bulk-remove samples from a specific importer if the user regrets an import.

### `profiles`

```sql
CREATE TABLE profiles (
  id          TEXT PRIMARY KEY,       -- 'current' in MVP (singleton)
  profile     TEXT NOT NULL,          -- JSON; validated against StyleProfile schema
  updated_at  TEXT NOT NULL
);
```

MVP supports exactly one profile per user, keyed by `'current'`.

### `rewrite_cache`

```sql
CREATE TABLE rewrite_cache (
  key         TEXT PRIMARY KEY,       -- sha256(profileHash + contextLabel + sortedDirectives + draftHash)
  response    TEXT NOT NULL,          -- JSON RewriteResponse
  last_used   TEXT NOT NULL
);
CREATE INDEX rewrite_cache_last_used ON rewrite_cache(last_used);
```

LRU eviction at 50 entries.

### `audit_log`

```sql
CREATE TABLE audit_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp       TEXT NOT NULL,
  provider        TEXT NOT NULL,
  route           TEXT NOT NULL,
  payload_bytes   INTEGER NOT NULL,
  draft_length    INTEGER NOT NULL,
  profile_included INTEGER NOT NULL,  -- 0 / 1
  success         INTEGER NOT NULL,
  error_code      TEXT
);
```

Capped at 20 entries; oldest evicted on insert past cap.

### `_migrations`

```sql
CREATE TABLE _migrations (
  version    INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
```

## Schema validation

Every read and write is validated with zod before crossing the storage boundary. Invalid writes throw. Invalid reads (corrupted rows) trigger a one-shot quarantine to a `_quarantine` table with a user-visible warning.

## Wipe semantics

`wipeAll()` runs the following, in order:

1. Close the DB connection.
2. Delete `~/.humanifyme/data.db`.
3. Reset `config.json` to defaults (but preserve `consentAcceptedAt` so the user doesn't have to re-consent — unless `--full` is passed, which also clears consent).
4. Re-initialize the DB with the v1 schema.
5. Append a single audit entry: `provider="self", route="WIPE_ALL", success=true`.

## Migration policy

We are at version 1. Future migrations live in `src/storage/migrations/`. Every migration is a SQL file (`NNN_name.sql`) executed in order at startup. Destructive migrations require user confirmation.

## What is intentionally not stored

- Drafts. The draft the user pasted is in memory only and discarded after the response is returned.
- Long-term rewrite outputs. Cached for 24h in `rewrite_cache`, then evicted.
- Recipient or page metadata. Never collected.
- Host-agent identifiers beyond what the audit needs (and even that is just `provider` of the LLM, not the calling agent).

## Encryption-at-rest

Not in MVP. Documented as a known limit in `specs/privacy-security-spec.md`. Future option: a passphrase-protected DB via SQLCipher when sync ships.
