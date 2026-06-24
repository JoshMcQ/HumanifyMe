# DECISIONS log — Milestone 9 (validation + public feedback infra)

Autonomous build. Each entry records an ambiguity the mission left open and how it
was resolved: the rule is "ship fastest while honoring the privacy spec." Locked
decisions from the mission brief are NOT re-litigated here.

## D0 — License split (from locked decision #1)
MIT for `src/privacy/`, `src/network/`, `src/engine/verify.ts`, and the redactor
patterns (`src/privacy/patterns.ts`). Everything else — notably
`src/engine/rewrite.ts`, the prompt templates under `prompts/` and
`src/engine/prompts/`, and the bundled skills under `humanifyme.plugin/skills/` —
stays proprietary. Implemented as: root `LICENSE` is a source-available/proprietary
notice that enumerates the MIT paths; `LICENSE-MIT.txt` holds the MIT text; each
MIT file carries an `SPDX-License-Identifier: MIT` header.

## D1 — Static HTML site, not Astro
The mission names `site/proof.astro` and `site/alpha-survey.astro`, but the repo's
`site/` is plain static HTML (`index.html`, `privacy.html`, `terms.html`) with no
Astro toolchain. Standing up Astro would add a build system, dependencies, and CI
wiring for two pages. Shipping fastest = `site/proof.html` and
`site/alpha-survey.html` as static pages matching the existing style, with vanilla
JS fetching `/api/stats`. Same user-visible result, no new toolchain.

## D2 — Outbound telemetry lives in `src/network/`; the destination scan becomes real
`tasks/test-plan.md` describes an "outbound-destination scan" but no test
implemented it, and the path it named (`src/engine/providers/`) is wrong — providers
live in `src/providers/`. Per locked decision #4/#5 the feedback POST goes through a
new `src/network/` module. Implemented the scan as an actual test
(`src/network/outbound-scan.test.ts`) that statically asserts only `src/providers/`
and `src/network/` issue `fetch(`, and only to an allowlisted set of hosts
(provider APIs + `humanifyme.com`). Closes the long-standing debt note.

## D3 — Feedback model: one signal axis, sounds-like-me derived
`humanify_record_feedback` takes `signal: accept|edit|reject`; the bundled skills and
CLI ask "did this sound like you? [yes/kinda/no]". Rather than store two correlated
axes, the yes/kinda/no answer maps to the signal (yes→accept, kinda→edit, no→reject)
and `sounds_like_me` is derived at metrics time (accept→y, edit→kinda, reject→n).
One source of truth, satisfies both the mission's tool signature and the metrics
shape.

## D4 — `editedText` is never persisted
The tool accepts `editedText` (mission signature) but it is raw user content, so it
is NOT stored. It is used only transiently to derive a numeric edit magnitude if
needed. `reason` (short meta-feedback about the rewrite, not the user's draft) is
stored locally only and is NEVER included in the cloud aggregate. The cloud ship is
counts only — no reason, no editedText, no draft, ever.

## D6 — Worker tested with real-SQLite fake bindings, not the miniflare toolchain
The mission says "Worker tests via miniflare." Standing up `@cloudflare/vitest-pool-workers`
would add a heavy, separately-configured test runner that conflicts with the repo's
single root vitest. Instead the worker's logic is written as pure handlers that take
the D1/KV bindings as parameters, and tests inject a `FakeD1` backed by an in-memory
`node:sqlite` (so the worker's real SQL actually runs) plus a `FakeKV` Map. Same
guarantees, runs in the existing suite, no toolchain split. `wrangler.toml` still
declares the real bindings + cron for deployment; real miniflare integration can be
layered on later without changing the handlers.

## D7 — Survey free-text is retained; /api/stats stays counts-only
The alpha survey (STEP 7) explicitly asks an optional "anything that didn't sound
like you?" free-text. That is voluntarily-submitted survey feedback, not a private
draft flowing through the engine, so it is stored in the event payload for Joshua to
read. The public `/api/stats` aggregate remains counts-only — it never surfaces the
free-text or any survey/try-it string content. The STEP-3 MCP ship remains strictly
counts-only with no free-text at all.

## D8 — total_users counts opted-in MCP installs; total_rewrites unifies MCP + Try-It
`total_users` on /api/stats = distinct MCP anonymous installs (the "N opted-in users"
headline). `total_rewrites` sums MCP rewrites (deduped to the latest cumulative ship
per install) plus Try-It widget rewrites. The sounds-like-me donut and accept_rate
unify MCP + Try-It + survey Q1 onto one axis (accept/y, edit/kinda, reject/n), so
/proof shows one number as the mission requires.

## D5 — feedbackToken minted per rewrite, including cache hits
Every `rewrite()` return (fresh or cache hit) mints a fresh `feedbackToken` and a
pending feedback row (signal NULL) capturing context label, provider, and latency.
The cached response object is cloned before stamping the new token so the cache
entry is not mutated. This guarantees each rewrite the user sees has its own
feedback handle.
