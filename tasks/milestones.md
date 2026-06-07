# Milestones

Each milestone has an entry condition (the "gate"), a definition of done, and a short list of the tasks inside it. Task IDs reference `tasks/task-breakdown.md`.

---

## Milestone 0 — Research and specs

**Gate to start:** none. This is the starting milestone.

**Definition of done:**

- All files in `/specs/`, `/docs/`, `/tasks/`, and `/prompts/` exist and are non-empty.
- `specs/product-spec.md`, `specs/mvp-spec.md`, `specs/mcp-server-spec.md`, `specs/plugin-spec.md`, `specs/privacy-security-spec.md` are complete.
- `tasks/task-breakdown.md` has at least the first 10 tasks with acceptance criteria.
- `prompts/` has style-analysis and rewrite prompt templates ready for testing.
- Open questions Q-01 through Q-04 are resolved (name, tagline, providers, Chrome ext pivot).

**Status:** complete.

---

## Milestone 1 — MCP server scaffold + storage + sample tools

**Gate to start:** Milestone 0 done.

**Definition of done:**

- A Node.js MCP server (`humanifyme-mcp`) that runs over stdio and registers with the `@modelcontextprotocol/sdk`.
- `~/.humanifyme/` is created on first run with `config.json` and `data.db`.
- SQLite migrations system in place; v1 schema applied (`samples`, `profiles`, `rewrite_cache`, `audit_log`).
- Sample tools implemented: `humanify_add_sample`, `humanify_list_samples`, `humanify_delete_sample`.
- Wipe tool implemented: `humanify_wipe_all`.
- CLI shell (`humanifyme`) with `sample add|list|rm`, `wipe`, `audit` subcommands.
- Redactor (`src/privacy/redact.ts`) implemented and unit-tested. (Used in M3, built here for early test coverage.)
- No LLM calls yet.

**Tasks inside:** T-01 through T-10 (see `tasks/task-breakdown.md`).

---

## Milestone 2 — Style profile generator

**Gate to start:** M1 done.

**Definition of done:**

- Provider abstraction (`LLMProvider`) with `AnthropicProvider`, `OpenAIProvider`, `GeminiProvider`, and `FakeLLMProvider` implementations.
- Provider config: `humanify_set_provider`, `humanify_test_key`.
- Style-analysis prompt builder.
- `humanify_build_profile` pipeline: redact samples → build prompt → call provider → schema-validate → persist.
- Profile read/edit/delete tools: `humanify_get_profile`, `humanify_update_profile`, `humanify_delete_profile`.
- Resource `humanify://profile.md` (plain-English summary).
- CLI: `humanifyme profile show|edit|rm|rebuild`, `humanifyme provider set|test`.

**Tasks inside:** T-11 through T-22.

---

## Milestone 3 — Rewrite engine

**Gate to start:** M2 done.

**Definition of done:**

- `humanify_text` tool implemented per `specs/rewrite-engine-spec.md`.
- Redaction + restore pass works end-to-end and is unit-tested.
- Diff computation in the response.
- All failure modes from the spec handled with correct error codes.
- Cache hit/miss in SQLite, LRU eviction at 50.
- p50 rewrite latency under 4s on typical drafts.
- CLI: `humanifyme rewrite < draft.txt`.

**Tasks inside:** T-23 through T-32.

---

## Milestone 4 — Plugin packaging

**Gate to start:** M3 done.

**Definition of done:**

- `humanifyme.plugin/` directory built from the source tree with the manifest in `specs/plugin-spec.md`.
- Cowork plugin manifest valid; installs locally via "Install from file" in Cowork.
- Claude Code plugin manifest valid; installs locally via marketplace dev mode.
- Three skills written: `humanify`, `build-voice-profile`, `humanify-pr`. Triggers tested.
- One-line `mcp.json` snippets published in `docs/install/` for Cursor, Continue, Cline, Windsurf, Zed, ChatGPT desktop.

**Tasks inside:** T-33 through T-42.

---

## Milestone 5 — Onboarding, CLI polish, audit, multi-provider QA

**Gate to start:** M4 done.

**Definition of done:**

- `humanifyme setup` CLI walks the four-step onboarding flow.
- `humanify_audit_list` returns the last 20 outbound requests by metadata only.
- `humanifyme audit` CLI renders the audit log.
- Each provider has a recorded fixture test in CI.
- All copy reviewed against the banned-words list.
- The `humanify-pr` skill validated against real PR drafts in two real agents.

**Tasks inside:** T-43 through T-50.

---

## Milestone 6 — Landing page

**Gate to start:** M5 done.

**Definition of done:**

- humanifyme.com hero, how-it-works, supported agents, privacy, install.
- Privacy policy and terms of service drafts published.
- Per-agent install pages at `humanifyme.com/install/<agent>` with copy-paste snippets.
- Open Graph + Twitter card configured.
- Lighthouse perf ≥ 95 mobile and desktop.
- No third-party analytics in launch build until we ship opt-in.

**Tasks inside:** T-51 through T-56.

---

## Milestone 7 — Beta release checklist

**Gate to start:** M6 done, plus alpha exit criteria from `specs/launch-plan.md` met.

**Definition of done:**

- Cowork plugin marketplace listing live.
- Claude Code plugin marketplace listing live.
- npm package `humanifyme` published.
- Screenshots and screen recording finalized.
- Initial alpha cohort (10–30) installed and surveyed.
- Bug triage process documented.
- Day-1 ops checklist (response time targets, monitoring) documented.

**Tasks inside:** T-57 through T-60.
