# Acceptance Criteria

Long-form AC for tasks T-01 through T-10 live in `tasks/task-breakdown.md`. This file holds the shorter AC for tasks T-11 onward (Milestones 2–7) so we have a complete map of what "done" looks like without prematurely expanding implementation notes for tasks the agent will not touch for weeks.

When picking up any of these tasks, the agent must first expand it into the full T-NN template (objective, files, implementation notes, AC, tests, risk, dependencies) in `tasks/task-breakdown.md` and then begin work.

---

## Milestone 2 — Style profile generator

- **T-11** Provider abstraction (`LLMProvider` interface + `FakeLLMProvider`). AC: interface compiles; FakeLLMProvider deterministic; pure functions; covered by unit tests.
- **T-12** Anthropic provider implementation. AC: successful call returns `{ text, inputTokens, outputTokens, latencyMs }`; 401/429/5xx map to spec error codes; CI uses recorded fixtures, not live API.
- **T-13** OpenAI provider implementation. AC: same as T-12.
- **T-14** Gemini provider implementation. AC: same as T-12.
- **T-15** `humanify_set_provider` and `humanify_test_key` tools + CLI. AC: setting a valid provider works; testing returns valid/invalid; invalid keys do not crash the server.
- **T-16** Style-analysis prompt builder. AC: substitutes redacted samples into the template from `prompts/style-analysis-prompt.md`; no unsubstituted tokens in output; stays under 12k chars for 20 samples.
- **T-17** Style-analysis pipeline. AC: valid samples produce a valid `StyleProfile` stored in SQLite; schema-fail triggers one retry then surfaces an error.
- **T-18** `humanify_build_profile` tool. AC: callable from MCP; emits progress events through the SDK progress channel.
- **T-19** `humanify_get_profile`, `humanify_update_profile`, `humanify_delete_profile` tools. AC: all CRUD operations validate against the `StyleProfile` schema before persistence.
- **T-20** Resource `humanify://profile.md` (plain-English summary). AC: rendering covers every field; updates whenever the profile changes.
- **T-21** Resource `humanify://profile` (raw JSON). AC: returns current profile JSON or 404 if none.
- **T-22** CLI: `profile show|edit|rm|rebuild`, `provider set|test`. AC: `edit` opens `$EDITOR` on a temp file, validates on save, persists or aborts cleanly.

## Milestone 3 — Rewrite engine

- **T-23** Rewrite-prompt builder. AC: builds system+user prompt with merged fingerprint + directives + redacted draft. Total < 7,000 tokens.
- **T-24** Rewrite pipeline. AC: full pipeline per `specs/rewrite-engine-spec.md`. Returns `RewriteResponse`.
- **T-25** Restore redactions in output. AC: placeholders never appear in the final visible rewrite.
- **T-26** Diff computation. AC: word-level diff for the before/after view; identical text yields a single `unchanged` segment.
- **T-27** Length policy enforcement. AC: rewrites outside the configured band trigger one retry; final result respects the band or surfaces a warning.
- **T-28** Directive conflict resolution. AC: contradictory directives resolve per spec rules with a `notes` warning.
- **T-29** Rewrite cache in SQLite. AC: identical inputs short-circuit to cache; LRU eviction at 50.
- **T-30** Failure handling for 401/429/5xx/network/output-invalid. AC: each surfaces the right error code; backoff matches spec.
- **T-31** `humanify_text` tool. AC: end-to-end from agent to provider to response.
- **T-32** Per-draft length cap + per-day rate limit. AC: 8,000 char cap enforced; > N rewrites/day surfaces a warning (configurable, default 200).

## Milestone 4 — Plugin packaging

- **T-33** Build script that packages `humanifyme.plugin/` from the source tree. AC: produces a directory matching `specs/plugin-spec.md`.
- **T-34** `plugin.json` manifest. AC: passes validation in both Cowork and Claude Code dev loaders.
- **T-35** `mcp/server.json` referencing `npx -y humanifyme-mcp@latest`. AC: agent spawns the MCP and lists `humanify_text` etc. as available tools.
- **T-36** Skill `humanify`. AC: triggers on "humanify this," "rewrite in my voice," etc.; calls `humanify_text` with the draft from context.
- **T-37** Skill `build-voice-profile`. AC: walks the user through 3 samples conversationally; ends with a profile and a confirmation.
- **T-38** Skill `humanify-pr`. AC: triggers when the user is writing a PR description; calls `humanify_text` with `contextLabel: "professional"` and `directives: ["more_like_me", "shorter"]`.
- **T-39** Cowork plugin install + smoke test (manual). AC: documented in `docs/install/cowork.md`; manual test recorded.
- **T-40** Claude Code plugin install + smoke test (manual). AC: documented in `docs/install/claude-code.md`; manual test recorded.
- **T-41** Install snippets for Cursor / Continue / Cline / Windsurf / Zed / ChatGPT desktop in `docs/install/`. AC: each snippet validated manually on the agent.
- **T-42** Plugin bundle size budget. AC: bundle < 5 MB unpacked.

## Milestone 5 — Onboarding, audit, multi-provider QA

- **T-43** `humanifyme setup` full flow (consent → provider → samples → build → demo rewrite → survey). AC: completes in < 3 minutes on a clean machine.
- **T-44** `humanify_audit_list` tool + `humanifyme audit` CLI. AC: returns/prints last 20 entries by metadata only.
- **T-45** Multi-provider CI matrix (recorded fixtures per provider). AC: CI runs the rewrite pipeline against each provider's fixture.
- **T-46** Banned-words copy audit script. AC: CI fails if banned words appear in user-facing strings (CLI output, plugin descriptions, skill triggers).
- **T-47** Material-privacy-change banner mechanism. AC: a config flag marks a release as "material privacy change"; first start after update prints a notice once.
- **T-48** Opt-in error reporting (off by default). AC: toggling on persists; toggling off purges; sample event makes it to the configured sink only when on.
- **T-49** Ollama provider stub (preview). AC: `humanify_set_provider --provider ollama --base-url ...` configures; `humanify_test_key` returns valid if reachable.
- **T-50** Alpha cohort install kit (loom + README). AC: kit shared with first 10 alpha users.

## Milestone 6 — Landing page

- **T-51** Site scaffold (Astro static, deployed to Cloudflare Pages). AC: humanifyme.com resolves; SSL valid.
- **T-52** Hero, how-it-works, supported-agents grid, privacy, install CTAs. AC: copy reviewed against the banned-words list.
- **T-53** Before/after demo section (PR description + Slack post). AC: real, non-cherry-picked examples.
- **T-54** Per-agent install pages at `/install/<agent>` with copy-paste snippets. AC: each page tested by following its own instructions on a clean machine.
- **T-55** Privacy policy + ToS. AC: plain-English drafts that match `specs/privacy-security-spec.md`.
- **T-56** Performance + analytics-free build. AC: Lighthouse perf ≥ 95 mobile and desktop; zero third-party network requests.

## Milestone 7 — Beta release checklist

- **T-57** Submit Cowork marketplace listing. AC: listing approved; install button live.
- **T-58** Submit Claude Code marketplace listing. AC: same.
- **T-59** Publish `humanifyme` and `humanifyme-mcp` to npm. AC: `npx -y humanifyme-mcp@latest` runs on Mac, Linux, Windows.
- **T-60** Alpha cohort recruitment + tracking. AC: 10–30 alpha users installed and surveyed.
