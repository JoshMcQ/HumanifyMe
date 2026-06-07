# Test Plan

## Test pyramid

- **Unit (Vitest):** pure functions — redactor, fingerprint merge, prompt builders, schema validators, diff. Target ≥ 90% line coverage in `src/engine/`, `src/privacy/`, `src/storage/`.
- **Integration (Vitest):** message router, MCP tool handlers against the `FakeLLMProvider`. Target full coverage of the tool contract in `docs/api-contract.md`.
- **End-to-end (Vitest + MCP SDK client):** spin up `humanifyme-mcp` as a subprocess, connect with the SDK's `Client`, exercise the tool catalog.
- **Manual QA:** plugin install on Cowork and Claude Code, install-snippet test on Cursor, before every release.

## Test environments

- CI: GitHub Actions. Node 20 and Node 22. Linux primary, macOS and Windows on releases.
- No live LLM calls in CI. Use `FakeLLMProvider` or recorded HTTP fixtures via `nock`-style interceptors.
- Live LLM smoke test runs nightly against a small key per provider with strict spend cap; alerts on a webhook.

## Non-functional tests

- **Bundle size budgets** per `specs/mcp-server-spec.md`. CI fails if exceeded.
- **Banned-words scan** of all user-facing strings against the list in `specs/onboarding-spec.md`.
- **Privacy regression suite:** test cases asserting that `redact()` masks each pattern in `specs/privacy-security-spec.md`. CI fails if any pattern regresses.
- **Outbound-destination scan:** static check that no source file outside `src/engine/providers/` issues an HTTP request. CI fails on violations.
- **Filesystem scope scan:** static check that no source file outside `src/storage/` and `src/config/` reads/writes files. CI fails on violations.
- **Audit log assertions:** every test that triggers an outbound LLM call asserts that exactly one audit entry was added.

## Required tests per milestone

### M1

- Storage CRUD for samples and config.
- Redactor pattern coverage (every pattern, plus golden non-PII tests).
- Sample tool validation (min length, label required).
- Wipe-all integration test.
- MCP handshake smoke test.

### M2

- Style-analysis prompt golden test.
- Pipeline test with FakeLLMProvider returning a fixture profile.
- Schema validation rejects extra fields, passes for fixtures.
- Profile-edit round-trip preserves every field type.
- One recorded-fixture test per provider (Anthropic, OpenAI, Gemini).

### M3

- Rewrite pipeline with directives.
- Restore-redaction correctness.
- Diff correctness across edge cases (empty, identical, single-word change).
- Length-band retry behavior.
- Cache hit/miss and LRU eviction.
- Each failure mode (401, 429, 5xx, network, empty output, schema fail).

### M4

- Plugin manifest validates against Cowork's schema.
- Plugin manifest validates against Claude Code's schema.
- Each skill triggers in a recorded transcript fixture.
- Plugin bundle size budget enforcement in CI.

### M5

- Onboarding e2e: setup → consent → provider → samples → first rewrite.
- Audit list returns correct shape after a rewrite.
- Banned-words CI scan green.

## Test data

- `tests/fixtures/samples/*.txt` — anonymized writing samples for prompt-building tests.
- `tests/fixtures/profiles/*.json` — fixture `StyleProfile` blobs.
- `tests/fixtures/llm/{anthropic,openai,gemini}/*.json` — recorded provider responses (one per failure mode, one per success).
- `tests/fixtures/plugins/{cowork,claude-code}/manifest.expected.json` — manifests the build should produce.

## Coverage gating

CI fails if:

- Coverage in `src/privacy/`, `src/engine/`, `src/storage/` drops below 90%.
- A new dependency is added without being added to the lockfile + license audit.
- A new outbound destination appears in `src/engine/providers/` without an update to `specs/privacy-security-spec.md`.
- A new filesystem path outside `~/.humanifyme/` is read/written outside the `editor` flow.

## Manual release checklist

Before every release tag:

- [ ] Fresh install on a clean machine via `npx -y humanifyme-mcp@latest`.
- [ ] Install the plugin in Cowork; verify the MCP appears and `humanify_text` is callable.
- [ ] Install the plugin in Claude Code; verify `/humanify` slash command works.
- [ ] Apply the Cursor install snippet on a clean profile; verify tool calls succeed.
- [ ] Walk the full `humanifyme setup` onboarding.
- [ ] Build a profile from 5 real samples.
- [ ] Rewrite a draft from the CLI.
- [ ] Rewrite a draft from each plugin host (Cowork + Claude Code).
- [ ] Toggle "send anonymous error reports" on and off.
- [ ] Run `humanifyme wipe --confirm` and verify everything is gone.
- [ ] Read the in-CLI copy aloud; if any phrase reads like AI, rewrite it.
