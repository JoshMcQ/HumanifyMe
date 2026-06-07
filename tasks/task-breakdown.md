# Task Breakdown

Each task is a unit of work an agent can pick up alone. Format:

```
T-NN — Task subject
Milestone: M?
Objective: ...
Files likely affected: ...
Implementation notes: ...
Acceptance criteria: ...
Tests required: ...
Risk: low | medium | high
Depends on: T-?? (or none)
```

Pick the lowest-numbered task whose dependencies are done. Do one task at a time. When done, verify the acceptance criteria, then stop and report.

---

## Milestone 1 — MCP server scaffold + storage + sample tools

### T-01 — Scaffold a Node.js MCP server with TypeScript
- **Objective:** Create the build + runtime scaffold so all later tasks have a place to land.
- **Files:** `package.json`, `tsconfig.json`, `tsup.config.ts` (or equivalent), `.eslintrc.cjs`, `.prettierrc`, `src/index.ts`, `src/server.ts`, `bin/humanifyme-mcp`, `bin/humanifyme`, `README.md` (developer setup section).
- **Implementation notes:** Use `@modelcontextprotocol/sdk`. TS strict mode. ESLint + Prettier. Vitest. Build with `tsup` to a single ESM bundle. Two binaries: `humanifyme-mcp` (the MCP server, stdio) and `humanifyme` (the CLI). Stub a `PING` tool that returns `{ version, buildTime }`.
- **Acceptance criteria:**
  - `npm run build` produces `dist/humanifyme-mcp.mjs` and `dist/humanifyme.mjs`.
  - `npx . humanifyme-mcp` starts and speaks the MCP handshake (verified by the SDK's `Client` in a smoke test).
  - `npx . humanifyme --help` prints help.
  - `npm test` passes (one trivial smoke test).
  - No `chrome.runtime` or `manifest.json` anywhere.
- **Tests required:** smoke test that boots the MCP server and exchanges the handshake.
- **Risk:** low.
- **Depends on:** none.

### T-02 — Storage: SQLite layer with migrations
- **Objective:** A typed module that wraps SQLite for samples, profiles, cache, and audit. No other code touches the DB directly.
- **Files:** `src/storage/index.ts`, `src/storage/db.ts`, `src/storage/migrations/001_init.sql`, `src/storage/repositories/{samples,profiles,cache,audit}.ts`, `src/storage/*.test.ts`.
- **Implementation notes:** Use `better-sqlite3`. DB at `${HUMANIFYME_HOME || '~/.humanifyme'}/data.db`. Migrations stored as SQL files, applied at startup; tracked in a `_migrations` table. zod schemas for inputs/outputs. Repositories: `samples.list/add/remove/clear`, `profile.get/set/clear`, `cache.{get,put,evict}`, `audit.append/list/clear`.
- **Acceptance criteria:**
  - First start creates `~/.humanifyme/data.db` with schema version 1.
  - All inputs validated with zod; invalid writes throw.
  - `wipeAll()` deletes the DB file and re-initializes.
- **Tests required:** unit tests for every repository method including invalid-input rejection and `wipeAll`.
- **Risk:** medium (foundation; bugs cascade).
- **Depends on:** T-01.

### T-03 — Config file layer
- **Objective:** Read/write `~/.humanifyme/config.json` with strict schema.
- **Files:** `src/config/index.ts`, `src/config/schema.ts`, `src/config/*.test.ts`.
- **Implementation notes:** Default config from `specs/mcp-server-spec.md`. zod-validated. On write, restrict file perms to 0600 on POSIX; on Windows, set ACLs to current user (best-effort, document if not implemented). On read, fail closed for unknown providers.
- **Acceptance criteria:**
  - First start writes a default config.
  - Reading a malformed config surfaces a clear error.
  - File perms are 0600 after write on POSIX.
- **Tests required:** unit tests for read/write/round-trip and perm enforcement (skip the perm assertion on Windows).
- **Risk:** medium.
- **Depends on:** T-01.

### T-04 — Implement the redactor
- **Objective:** Pure-function redactor used before any text leaves the device.
- **Files:** `src/privacy/redact.ts`, `src/privacy/patterns.ts`, `src/privacy/restore.ts`, `src/privacy/*.test.ts`.
- **Implementation notes:** Patterns from `specs/privacy-security-spec.md`. `redact(text)` returns `{ redactedText, map }`. `restore(text, map)` reverses. Map keys are unique per placeholder, sequenced so two emails become `[EMAIL_1]` and `[EMAIL_2]`.
- **Acceptance criteria:**
  - All listed patterns are masked.
  - `restore(redact(t).redactedText, redact(t).map) === t` for the test suite.
  - No false-positive on plain prose without PII (golden test of 20 paragraphs).
- **Tests required:** parameterized tests for each pattern type, golden tests for non-PII text.
- **Risk:** high (regression leaks PII).
- **Depends on:** T-01.

### T-05 — MCP tool registration framework
- **Objective:** A typed pattern for registering tools that handles zod validation, error mapping, and audit-log emission.
- **Files:** `src/mcp/registerTool.ts`, `src/mcp/errors.ts`, `src/mcp/*.test.ts`.
- **Implementation notes:** `registerTool({ name, inputSchema, outputSchema, handler })` wires the tool into the SDK server, validates input, calls handler, validates output, maps thrown errors to MCP error responses with our error codes from `docs/api-contract.md`, and appends an audit entry.
- **Acceptance criteria:**
  - Unknown input fields are rejected with `BAD_INPUT`.
  - A handler throwing `Error('whatever')` produces a clean `PROVIDER_ERROR` (or appropriate code) response without leaking stack traces.
- **Tests required:** unit tests for valid/invalid input and error mapping.
- **Risk:** medium (every tool flows through here).
- **Depends on:** T-01, T-02.

### T-06 — Sample tools: add, list, delete
- **Objective:** First user-visible MCP tools.
- **Files:** `src/mcp/tools/samples.ts`, `src/mcp/tools/samples.test.ts`.
- **Implementation notes:** `humanify_add_sample`, `humanify_list_samples`, `humanify_delete_sample`. Validate `text.length >= 100`, `labels.length >= 1`. Return previews truncated to 200 chars in list.
- **Acceptance criteria:**
  - Adding a valid sample returns its `id`.
  - Listing returns paginated previews.
  - Deleting an unknown id returns a clean error.
- **Tests required:** unit tests through the registered tool path.
- **Risk:** low.
- **Depends on:** T-05, T-02.

### T-07 — Wipe-all tool + CLI
- **Objective:** The privacy commitment is implementable. Wire it now while the surface is small.
- **Files:** `src/mcp/tools/wipe.ts`, `src/cli/commands/wipe.ts`, `src/mcp/tools/wipe.test.ts`.
- **Implementation notes:** `humanify_wipe_all` requires `confirm: 'DELETE EVERYTHING'`. CLI command `humanifyme wipe --confirm` performs the same with an interactive `[y/N]` prompt.
- **Acceptance criteria:**
  - Wrong confirm string → `BAD_INPUT`.
  - Right confirm string → DB file deleted and re-initialized empty.
- **Tests required:** unit tests + CLI integration test.
- **Risk:** medium.
- **Depends on:** T-02, T-05.

### T-08 — Audit log infrastructure (ring buffer, content-free)
- **Objective:** Even before LLM calls exist, log the channel so later tasks just emit events.
- **Files:** `src/audit/index.ts`, `src/audit/*.test.ts`.
- **Implementation notes:** Ring buffer of 20 entries in the SQLite `audit_log` table. Each entry: timestamp, provider, route, payloadBytes, draftLength, profileIncluded, success, errorCode (no content). `audit.list()` newest-first.
- **Acceptance criteria:**
  - Adding entries beyond 20 evicts the oldest.
  - Audit tool/CLI returns newest-first.
- **Tests required:** unit tests.
- **Risk:** low.
- **Depends on:** T-02.

### T-09 — CLI shell + first commands
- **Objective:** A working `humanifyme` CLI with the subcommands we have so far.
- **Files:** `src/cli/index.ts`, `src/cli/commands/{sample,wipe,audit}.ts`.
- **Implementation notes:** Use `commander` or `citty`. Subcommands talk to the same storage and tool layers as the MCP, not via the MCP transport (we are not running the server to use the CLI).
- **Acceptance criteria:**
  - `humanifyme sample add --label email,professional <path>` adds a sample.
  - `humanifyme sample list` prints previews.
  - `humanifyme audit` prints the last 20 entries.
  - `humanifyme wipe --confirm` clears everything.
- **Tests required:** integration tests via the CLI binary.
- **Risk:** low.
- **Depends on:** T-06, T-07, T-08.

### T-10 — `humanifyme setup` CLI skeleton
- **Objective:** Skeleton of the onboarding flow so M5 has a place to flesh it out.
- **Files:** `src/cli/commands/setup.ts`, `src/cli/commands/setup.test.ts`.
- **Implementation notes:** Implements step 1 (consent) only. Stores `consentAcceptedAt` in config. Later steps print "coming in M2/M3."
- **Acceptance criteria:**
  - Running `humanifyme setup` walks step 1 and persists consent.
  - Re-running shows "already accepted."
- **Tests required:** CLI integration test with simulated stdin.
- **Risk:** low.
- **Depends on:** T-03, T-09.

### T-10A — Importer: ChatGPT / Claude chat-export ingestion
- **Objective:** The unlock for "actually sounds like me" at MVP — pull bulk samples from a user's existing chat history without OAuth or servers.
- **Files:** `src/mcp/tools/importChatExport.ts`, `src/cli/commands/importChatExport.ts`, `src/importers/chatExport/{parser,classifier,index}.ts`, plus tests.
- **Implementation notes:** Accept a path to a `.zip` or extracted directory. Detect format by canonical filenames (`conversations.json` for ChatGPT, equivalent for Claude). Parse JSON, keep only turns where `role === 'user'`, drop turns < 60 chars, drop code-heavy turns (heuristic > 50% non-prose chars). Infer a context label per turn (cheap heuristic; user can re-label). Return the first 5 extracted samples for confirmation; commit on confirm. Pass everything through the redactor. Do not persist the raw archive anywhere we control. See `specs/sample-ingestion-spec.md`.
- **Acceptance criteria:**
  - A real ChatGPT export `.zip` is parsed and yields > 0 extracted samples.
  - Assistant turns never appear in samples.
  - Code-heavy turns (> 50% non-prose) are excluded; verified by fixture.
  - Preview mode returns 5 samples without committing.
  - Commit mode writes all extracted samples to the `samples` table with `source = 'chatgpt'` (or `'claude'`).
- **Tests required:** unit tests on the parser with redacted ChatGPT and Claude export fixtures; CLI integration test.
- **Risk:** medium (this is the path that determines whether voice profiles are good enough at MVP).
- **Depends on:** T-04, T-06.

### T-10B — Importer: generic text/markdown/docx file ingestion
- **Objective:** Lets writers with an existing collection of writing (Obsidian, Substack drafts, a `/writings/` folder) bulk-import.
- **Files:** `src/mcp/tools/importTextFiles.ts`, `src/cli/commands/importTextFiles.ts`, `src/importers/textFiles/index.ts`, plus tests.
- **Implementation notes:** Accept a glob pattern or directory path, plus a required default label. Iterate matching files; accepted formats: `.txt`, `.md`, `.docx` (via `mammoth`). Skip files < 100 chars. Split files > 8000 chars at paragraph boundaries. Each chunk becomes one sample with the supplied label. Redact before persist. `source = 'text-file'`.
- **Acceptance criteria:**
  - A directory of mixed `.md`/`.txt`/`.docx` files imports correctly.
  - Files under min length are skipped with a clear log.
  - Oversize files split into multiple samples without losing content.
- **Tests required:** unit tests with fixture files; CLI integration test.
- **Risk:** low.
- **Depends on:** T-04, T-06.

---

## Notes on later milestones

Tasks T-11 through T-60 are listed in `tasks/acceptance-criteria.md` with short AC. They will be expanded into the same long-form structure as the first 10 tasks once Milestone 1 is in progress. Expanding all 60 now without working code is overplanning and would invite churn.

The first 10 tasks (T-01 through T-10) are sufficient to start coding and to discover the next round of detail.
