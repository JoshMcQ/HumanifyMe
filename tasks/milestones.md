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

**Status:** complete (2026-06-10). Note: storage uses the built-in `node:sqlite` instead of `better-sqlite3` (spec change recorded in `specs/mcp-server-spec.md` Runtime).

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

**Status:** complete (2026-06-10), with one open item: per-provider recorded-fixture tests against live APIs are pending (covered by `FakeLLMProvider` unit tests; live validation blocked in the build environment — run `humanifyme provider test` locally).

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

**Status:** complete (2026-06-10). p50 latency budget not yet measured against a live provider (pipeline overhead measured at <50ms; LLM latency dominates and needs live measurement).

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

**Status:** code complete (2026-06-10): `humanifyme.plugin/` bundle, three skills, install snippets in `docs/install/`. Pending: validating actual installs in Cowork ("Install from file") and Claude Code (marketplace dev mode), and trigger-testing the skills in real agents.

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

**Status:** site built 2026-06-11 (`site/`: index, privacy, terms; per-agent install handled as tabs + anchors on the install section rather than separate pages — revisit if share-links demand it). Pending: deploy to humanifyme.com (Joshua owns the domain), og.png asset, white paper HTML render, Lighthouse run on the live deploy.

---

## Milestone 7 — Beta release checklist

**Gate to start:** M6 done, plus the alpha exit criteria (tracked in the maintainers' internal launch plan) met.

**Definition of done:**

- Cowork plugin marketplace listing live.
- Claude Code plugin marketplace listing live.
- npm package `humanifyme` published.
- Screenshots and screen recording finalized.
- Initial alpha cohort (10–30) installed and surveyed.
- Bug triage process documented.
- Day-1 ops checklist (response time targets, monitoring) documented.

**Tasks inside:** T-57 through T-60.

---

## Milestone 8 — Retrieval-augmented voice (RAG)

**Gate to start:** M3 done (rewrite engine exists to wire retrieval into). This milestone is local-first — embeddings, vectors, and retrieval all run on-device and persist only in `~/.humanifyme/data.db` and `~/.humanifyme/models/`. NO backend is introduced, so it stays inside the MVP rules in `specs/mvp-spec.md` and `CLAUDE.md` hard rule 4.

**Why this milestone exists:** The rewrite engine never feeds the user's actual past messages into a rewrite — it only conditions on the abstract style fingerprint in `profiles`. The static `profile.exemplars` are a frozen, hand-picked few. Retrieval-augmented voice fixes rewrite quality by selecting the user's own most relevant past samples per draft and making them the primary voice signal. See `specs/rewrite-engine-spec.md` (Retrieval) and `docs/open-questions.md` Q-18–Q-22.

**Definition of done:**

- Local offline embeddings via transformers.js/ONNX `all-MiniLM-L6-v2` (384-dim), weights cached in `~/.humanifyme/models/`, fetched only from the `src/engine/providers/` layer so the test-plan outbound-destination scan stays green; offline/bundled override supported (T-61).
- Migration `002_embeddings.sql` adds the `sample_embeddings` table (schema v2), applies on startup, backfills existing samples idempotently, cascades on sample delete, and is cleared by wipe (T-62).
- Every `humanify_add_sample` and importer path writes an embedding from the RAW sample text; no raw sample text is logged (T-63).
- Retriever selects top-K=5 by semantic cosine with a recency tiebreaker, applies MMR diversity (lambda 0.7) and dedup (cosine > 0.97), and returns `[]` below `rag.minSamples` (=5) for profile-only cold-start fallback (T-64).
- Retrieved exemplars are redacted at SEND time and injected as the primary voice signal in the rewrite prompt within the ~4000-token system-prompt budget; cold-start falls back to profile-only with a notes warning; exactly one audit entry per rewrite is preserved (T-65).
- Measurable rewrite-quality improvement over profile-only on the evaluation drafts, and voice memory persists across sessions/restarts; opt-in via `rag.enabled`; `humanify_wipe_all` clears all embeddings; privacy-spec and audit view stay consistent; banned-words/copy gate green (T-66).

**Tasks inside:** T-61 through T-66.

**Status:** complete (2026-06-16). Local voice-memory retrieval wired end to end: `EmbeddingProvider` abstraction with a dependency-free lexical default (opt-in MiniLM/Ollama), `sample_embeddings` table (schema v2, wiped with the DB), embed-on-ingest + idempotent backfill, MMR retriever, retrieval injected into the rewrite as the primary voice signal (redacted at send time, token-budgeted, cold-start fallback), and a `rag.*` config block (opt-out + tunables). Full suite green throughout (134 tests). Remaining before launch readiness: eval harness proving the quality gain (in progress), then Joshua's open-source decision gates publish.

---

## Milestone 9 — Validation + public feedback infrastructure

**Gate to start:** M8 done (a rewrite engine worth measuring). Honors the privacy
spec: local data stays local; the only new outbound path is opt-in (default OFF) and
ships aggregate **counts only**, never content.

**Why this milestone exists:** the engine was proven on synthetic writers but had no
way to learn from, or show, real-world results. M9 adds the feedback loop ("did this
sound like you?"), a local metrics surface, and an opt-in anonymous aggregate that
feeds a public proof page — so quality is measured continuously and provable.

**Definition of done:**

- Every rewrite returns a `feedbackToken`; `humanify_record_feedback` records an
  accept/edit/reject signal into a `feedback` table (counts/dimensions only; edited
  text never persisted). Skills + CLI close with "did this sound like you?".
- `humanify_metrics` (MCP + CLI) reports accept/edit/reject rates, sounds-like-me,
  by-context, by-provider, and p50/p95 latency — locally, counts only.
- Opt-in (`shareAnonymousFeedback`, default false) ships a counts-only aggregate via
  the MIT-licensed `src/network/` at most once/24h; the outbound-destination scan is
  a real test allowlisting only providers + network.
- A Cloudflare Worker (`cf-worker/`) accepts mcp/try-it/survey events into D1 with a
  KV rate limit, and serves a precomputed counts-only `/api/stats` (cron every 10m).
- Public proof page (`site/proof.html`), Try-It feedback widget (`site/try-it.html`),
  and alpha survey (`site/alpha-survey.html`) all feed one unified number.

**Tasks inside:** STEP 1 (feedback signal) → STEP 8 (docs + PR), one commit each.

**Status:** complete (2026-06-24). Built on branch `m9-validation`, one TDD commit per
step; full suite green throughout (~196 tests + worker suite). License split landed
(MIT for privacy/network/verify; rest proprietary). See `DECISIONS.md` for the
autonomously-resolved ambiguities (static HTML vs Astro, outbound-scan location,
feedback model, worker test strategy).
