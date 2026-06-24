# Task Breakdown

Each task is a unit of work an agent can pick up alone. Format:

```
T-NN, Task subject
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

## Milestone 1, MCP server scaffold + storage + sample tools

### T-01, Scaffold a Node.js MCP server with TypeScript
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

### T-02, Storage: SQLite layer with migrations
- **Objective:** A typed module that wraps SQLite for samples, profiles, cache, and audit. No other code touches the DB directly.
- **Files:** `src/storage/index.ts`, `src/storage/db.ts`, `src/storage/migrations/001_init.sql`, `src/storage/repositories/{samples,profiles,cache,audit}.ts`, `src/storage/*.test.ts`.
- **Implementation notes:** Use the built-in `node:sqlite` (`DatabaseSync`), spec change 2026-06-10, see `specs/mcp-server-spec.md` Runtime; `better-sqlite3` was dropped to keep the npx install path free of native compilation. DB at `${HUMANIFYME_HOME || '~/.humanifyme'}/data.db`. Migrations stored as SQL files, applied at startup; tracked in a `_migrations` table. zod schemas for inputs/outputs. Repositories: `samples.list/add/remove/clear`, `profile.get/set/clear`, `cache.{get,put,evict}`, `audit.append/list/clear`.
- **Acceptance criteria:**
  - First start creates `~/.humanifyme/data.db` with schema version 1.
  - All inputs validated with zod; invalid writes throw.
  - `wipeAll()` deletes the DB file and re-initializes.
- **Tests required:** unit tests for every repository method including invalid-input rejection and `wipeAll`.
- **Risk:** medium (foundation; bugs cascade).
- **Depends on:** T-01.

### T-03, Config file layer
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

### T-04, Implement the redactor
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

### T-05, MCP tool registration framework
- **Objective:** A typed pattern for registering tools that handles zod validation, error mapping, and audit-log emission.
- **Files:** `src/mcp/registerTool.ts`, `src/mcp/errors.ts`, `src/mcp/*.test.ts`.
- **Implementation notes:** `registerTool({ name, inputSchema, outputSchema, handler })` wires the tool into the SDK server, validates input, calls handler, validates output, maps thrown errors to MCP error responses with our error codes from `docs/api-contract.md`, and appends an audit entry.
- **Acceptance criteria:**
  - Unknown input fields are rejected with `BAD_INPUT`.
  - A handler throwing `Error('whatever')` produces a clean `PROVIDER_ERROR` (or appropriate code) response without leaking stack traces.
- **Tests required:** unit tests for valid/invalid input and error mapping.
- **Risk:** medium (every tool flows through here).
- **Depends on:** T-01, T-02.

### T-06, Sample tools: add, list, delete
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

### T-07, Wipe-all tool + CLI
- **Objective:** The privacy commitment is implementable. Wire it now while the surface is small.
- **Files:** `src/mcp/tools/wipe.ts`, `src/cli/commands/wipe.ts`, `src/mcp/tools/wipe.test.ts`.
- **Implementation notes:** `humanify_wipe_all` requires `confirm: 'DELETE EVERYTHING'`. CLI command `humanifyme wipe --confirm` performs the same with an interactive `[y/N]` prompt.
- **Acceptance criteria:**
  - Wrong confirm string → `BAD_INPUT`.
  - Right confirm string → DB file deleted and re-initialized empty.
- **Tests required:** unit tests + CLI integration test.
- **Risk:** medium.
- **Depends on:** T-02, T-05.

### T-08, Audit log infrastructure (ring buffer, content-free)
- **Objective:** Even before LLM calls exist, log the channel so later tasks just emit events.
- **Files:** `src/audit/index.ts`, `src/audit/*.test.ts`.
- **Implementation notes:** Ring buffer of 20 entries in the SQLite `audit_log` table. Each entry: timestamp, provider, route, payloadBytes, draftLength, profileIncluded, success, errorCode (no content). `audit.list()` newest-first.
- **Acceptance criteria:**
  - Adding entries beyond 20 evicts the oldest.
  - Audit tool/CLI returns newest-first.
- **Tests required:** unit tests.
- **Risk:** low.
- **Depends on:** T-02.

### T-09, CLI shell + first commands
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

### T-10, `humanifyme setup` CLI skeleton
- **Objective:** Skeleton of the onboarding flow so M5 has a place to flesh it out.
- **Files:** `src/cli/commands/setup.ts`, `src/cli/commands/setup.test.ts`.
- **Implementation notes:** Implements step 1 (consent) only. Stores `consentAcceptedAt` in config. Later steps print "coming in M2/M3."
- **Acceptance criteria:**
  - Running `humanifyme setup` walks step 1 and persists consent.
  - Re-running shows "already accepted."
- **Tests required:** CLI integration test with simulated stdin.
- **Risk:** low.
- **Depends on:** T-03, T-09.

### T-10A, Importer: ChatGPT / Claude chat-export ingestion
- **Objective:** The unlock for "actually sounds like me" at MVP, pull bulk samples from a user's existing chat history without OAuth or servers.
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

### T-10B, Importer: generic text/markdown/docx file ingestion
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

## Milestone 8, Retrieval-augmented voice (RAG)

These tasks make the user's own past messages the primary voice signal in a rewrite, instead of only the abstract fingerprint in `profiles`. Everything is local-first: embeddings, vectors, and retrieval run on-device, persist only in `~/.humanifyme/data.db` and `~/.humanifyme/models/`, and introduce no backend. Re-read `specs/rewrite-engine-spec.md` (Retrieval), `specs/privacy-security-spec.md`, `docs/data-model.md`, and `docs/open-questions.md` Q-18, Q-22 before starting.

### T-61, Local embedding module
- **Objective:** A deterministic, offline embedding provider so samples and drafts can be turned into vectors on-device, with no network egress outside the providers layer.
- **Files:** `src/engine/providers/embeddings.ts`, `src/engine/providers/fakeEmbedding.ts`, `src/engine/providers/embeddings.test.ts`.
- **Implementation notes:** `embed(texts: string[]) => Promise<Float32Array[]>` using transformers.js/ONNX `all-MiniLM-L6-v2` (384-dim). Model weights cached to `${HUMANIFYME_HOME || '~/.humanifyme'}/models/`; first call downloads them, later calls load from disk. All weight fetching happens inside `src/engine/providers/` so the test-plan outbound-destination scan stays green. Support an offline/bundled override (env or config) so CI and air-gapped installs never hit the network. Provide a `FakeEmbeddingProvider` that returns deterministic vectors (e.g. hashed token features) for tests, no live network in CI. See `specs/rewrite-engine-spec.md` (Retrieval) and `docs/open-questions.md` Q-18.
- **Acceptance criteria:**
  - `embed([...])` returns one 384-dim `Float32Array` per input string.
  - Model weights are written to and re-loaded from `~/.humanifyme/models/`; second run does not re-download.
  - Offline/bundled override path produces embeddings with no network access.
  - No HTTP/socket call originates outside `src/engine/providers/` (verified by the outbound-destination scan in `tasks/test-plan.md`).
  - `FakeEmbeddingProvider.embed()` is deterministic: same input → identical vectors across runs.
  - Line coverage for `src/engine` ≥ 90%.
- **Tests required:** unit tests for shape/determinism, fake-provider determinism, and a cache-reuse test that asserts no second download. CI uses the fake provider only.
- **Risk:** medium (new dependency; model/runtime footprint).
- **Depends on:** none (M3 done).

### T-62, Migration 002 + `sample_embeddings` table + repository
- **Objective:** Durable, schema-validated storage for sample vectors that backfills cleanly and is wiped with everything else.
- **Files:** `src/storage/migrations/002_embeddings.sql`, `src/storage/repositories/embeddings.ts`, `src/storage/repositories/embeddings.test.ts`.
- **Implementation notes:** Migration `002_embeddings.sql` creates `sample_embeddings` (schema v2): `sample_id` (FK → `samples.id`, `ON DELETE CASCADE`), `dim`, `model`, `vector` (BLOB of the Float32Array), `created_at`. Applies at startup via the existing `_migrations` mechanism. On first apply, idempotently backfill embeddings for all existing samples (safe to re-run; never duplicates a row). Repository methods (`upsert`, `getBySampleId`, `listAll`, `clear`) are zod-validated. `wipeAll()` must drop these rows along with the rest. See `docs/data-model.md` and `specs/privacy-security-spec.md`.
- **Acceptance criteria:**
  - Fresh start applies `002` and reports schema version 2.
  - Deleting a sample cascades to its embedding row (no orphans).
  - Backfill is idempotent: running it twice yields exactly one embedding per sample.
  - All repository inputs/outputs are zod-validated; invalid writes throw.
  - `humanify_wipe_all` / `wipeAll()` removes all `sample_embeddings` rows.
- **Tests required:** unit tests for migration apply, cascade delete, idempotent backfill, zod rejection, and wipe.
- **Risk:** medium (storage foundation; bugs cascade).
- **Depends on:** T-61.

### T-63, Embed-on-ingest hook
- **Objective:** Every new sample gets a vector at write time, so retrieval quality keeps up with the user's growing corpus without a manual reindex.
- **Files:** `src/mcp/tools/samples.ts`, `src/importers/chatExport/index.ts`, `src/importers/textFiles/index.ts`, `src/engine/ingest.ts`, plus tests.
- **Implementation notes:** On `humanify_add_sample` and on both importer commit paths, embed the RAW sample text (the embedding is computed from the unredacted text; redaction happens later at send time per T-65) and `upsert` it via the T-62 repository. Reuse the idempotent backfill from T-62 for samples that predate this hook. Never log raw sample text or vectors. Embedding failures must not silently drop the sample, write the sample, surface/queue the embedding error per `specs/privacy-security-spec.md` logging rules.
- **Acceptance criteria:**
  - Adding a sample via the tool produces exactly one `sample_embeddings` row for it.
  - Both importer commit paths (`chatgpt`/`claude` and `text-file`) write embeddings for every committed sample.
  - Re-running backfill over a corpus that mixes embedded and un-embedded samples fills only the gaps.
  - No raw sample text appears in any log output (asserted by test).
- **Tests required:** unit tests through the registered tool path and both importers; a log-capture test asserting no raw sample text is emitted.
- **Risk:** medium.
- **Depends on:** T-62, T-10A, T-10B.

### T-64, Retriever
- **Objective:** Given a draft, select the user's most relevant, diverse past samples to condition the rewrite on.
- **Files:** `src/engine/retrieve.ts`, `src/engine/retrieve.test.ts`.
- **Implementation notes:** `retrieve(draft, { k, minSamples })` embeds the draft (T-61), scores candidates by semantic cosine similarity with a recency tiebreaker, applies MMR for diversity (lambda 0.7), and dedups near-duplicates (cosine > 0.97). Returns top-K=5. Below `rag.minSamples` (=5) total samples, return `[]` to signal cold-start → profile-only fallback (handled in T-65). All thresholds read from config (`rag.*`). Must be deterministic under the `FakeEmbeddingProvider` and a fixed sample fixture so tests are stable. See `specs/rewrite-engine-spec.md` (Retrieval) and `docs/open-questions.md` Q-19, Q-20.
- **Acceptance criteria:**
  - Returns at most K=5 exemplars, ordered by the cosine + recency ranking.
  - Two samples with cosine > 0.97 never both appear (dedup verified by fixture).
  - MMR produces a more diverse set than pure top-cosine on a fixture where the top matches are near-duplicates.
  - Returns `[]` when total sample count < `rag.minSamples`.
  - Deterministic: identical output across runs under the fake provider + fixed fixtures.
- **Tests required:** unit tests for ranking order, recency tiebreaker, dedup, MMR diversity, and the cold-start empty-return threshold.
- **Risk:** medium (retrieval quality is the point of the milestone).
- **Depends on:** T-61, T-62.

### T-65, Wire retrieval into the rewrite pipeline
- **Objective:** Make retrieved exemplars the primary voice signal in the rewrite prompt, with the static profile exemplars demoted to cold-start fallback.
- **Files:** `src/engine/rewrite.ts`, `src/engine/promptBuilder.ts`, `prompts/rewrite-prompt.md`, `specs/rewrite-engine-spec.md`, plus tests.
- **Implementation notes:** Call the T-64 retriever inside `humanify_text`. Redact retrieved exemplars at SEND time (reuse `src/privacy/redact.ts`), embeddings are from raw text, but nothing unredacted leaves the device. Inject them into the new exemplars section of the rewrite prompt per the amended `specs/rewrite-engine-spec.md`; retrieved exemplars are the primary voice signal and `profile.exemplars` are used only on cold-start. Stay within the ~4000-token system-prompt budget: trim retrieved exemplars first (drop lowest-ranked) before trimming anything else. On cold-start (`retrieve` returns `[]`), fall back to profile-only and add a warning to the response `notes`. Preserve exactly one audit entry per rewrite (no extra entries for the retrieval/embedding step). A `FakeLLMProvider` e2e test must assert the retrieved exemplars actually appear in the prompt sent to the provider.
- **Acceptance criteria:**
  - With ≥ `rag.minSamples` samples, the prompt sent to the provider contains the retrieved exemplars (asserted via `FakeLLMProvider`).
  - Retrieved exemplars are redacted at send time; no unredacted exemplar text reaches the provider.
  - System prompt stays within the ~4000-token budget; over-budget cases trim retrieved exemplars first.
  - Cold-start (< `rag.minSamples`) falls back to profile-only and adds a notes warning.
  - Exactly one audit entry is written per rewrite.
- **Tests required:** e2e rewrite test with `FakeLLMProvider` asserting exemplar injection and redaction; token-budget trim test; cold-start fallback test; audit single-entry test.
- **Risk:** high (touches the core rewrite path and the privacy boundary).
- **Depends on:** T-64, T-63.

### T-66, Persistent voice-memory semantics + privacy doc
- **Objective:** Make retrieval an opt-in, persistent, wipeable "voice memory" and document it so the privacy story stays honest.
- **Files:** `src/config/schema.ts`, `specs/privacy-security-spec.md`, `docs/data-model.md`, `prompts/critique-prompt.md` (copy gate), plus config tests.
- **Implementation notes:** Add opt-in `rag.enabled` (plus `rag.minSamples`, `rag.topK`, `rag.mmrLambda`, `rag.dedupThreshold`) to the config schema with safe defaults; when `rag.enabled` is false the rewrite path behaves exactly as M3 (profile-only). Embeddings persist across sessions/restarts (they live in `data.db`). `humanify_wipe_all` clears them (verified end-to-end with T-62). Update `specs/privacy-security-spec.md` and the audit view so they describe embeddings (derived from raw local samples, never sent except as redacted exemplars at rewrite time) consistently. Run all new/changed product copy through the banned-words/copy gate. See `docs/open-questions.md` Q-21, Q-22.
- **Acceptance criteria:**
  - `rag.enabled = false` reproduces M3 behavior exactly (no retrieval, no embedding lookups in the rewrite path).
  - Embeddings survive a process restart and are reused (no recompute) on the next rewrite.
  - `humanify_wipe_all` removes all embeddings; a follow-up rewrite cold-starts.
  - `specs/privacy-security-spec.md` and the audit view describe embedding storage/flow consistently with the implementation.
  - All new copy passes the banned-words list in `CLAUDE.md` / `prompts/critique-prompt.md`.
- **Tests required:** config round-trip + default tests; an opt-out parity test (M3 behavior); a persist-across-restart test; a wipe-then-cold-start test.
- **Risk:** medium (privacy-facing; copy and spec must match code).
- **Depends on:** T-65.

---

## Notes on later milestones

Tasks T-11 through T-60 are listed in `tasks/acceptance-criteria.md` with short AC. They will be expanded into the same long-form structure as the first 10 tasks once Milestone 1 is in progress. Expanding all 60 now without working code is overplanning and would invite churn.

The first 10 tasks (T-01 through T-10) are sufficient to start coding and to discover the next round of detail.
