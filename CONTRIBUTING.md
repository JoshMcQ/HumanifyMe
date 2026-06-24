# Contributing to HumanifyMe

HumanifyMe is a local-first MCP server (Node.js + TypeScript) that learns a person's
writing voice and rewrites AI-generated drafts in that voice. It installs as a plugin
in Cowork, Claude Code, Cursor, and any other MCP-compatible agent.

This guide exists so that many people can contribute well without stepping on the
product's core promises. Read it once before your first change. It is short on
ceremony and long on the few things we are strict about: privacy, the spec gate, and
deterministic verification.

---

## 1. Ground rules: read these first

Behavior in this repo is governed by two checked-in files. They are the source of
truth, not this document:

- **`CLAUDE.md`**, rules for Claude Code working in the repo.
- **`AGENTS.md`**, rules for any autonomous coding agent (Copilot, Cursor, Aider, etc.).

If anything here disagrees with those files, those files win. The highlights that
apply to every contributor, human or agent:

1. **The repo is spec-driven.** Code follows specs; specs do not follow code. If your
  change disagrees with a spec, update the spec first (and say why), or pick a
  different task.
2. **This is an MCP server, not a browser extension.** If you find yourself writing
  `chrome.runtime`, `MutationObserver`, content scripts, or site adapters, stop and
  re-read `specs/mcp-server-spec.md`. The project pivoted from an extension to
  MCP-only on 2026-06-03.
3. **No backend in the MVP.** Milestones 1 to 5 are MCP-only. A backend appears in
  Milestone 6+ and only if `specs/backend-spec.md` justifies it.
4. **No fine-tuning.** The MVP uses prompt engineering plus structured style profiles.
  If you think a model needs tuning, write the case in `docs/open-questions.md`
  instead of building it.
5. **No silent monitoring.** The server acts only when an agent calls one of its
  tools. No file watching, no clipboard listening, no observing agent output outside
  opted-in hooks.

---

## 2. The privacy non-negotiables

HumanifyMe's whole reason to exist is that a person's raw writing stays theirs. These
rules are not style preferences; a PR that breaks one will not merge.

- **Raw user content never leaves the machine un-redacted.** Before any draft text
  crosses the network, the rewrite pipeline calls `redact()` (`src/privacy/redact.ts`),
  which masks emails, phone numbers, US street addresses, Luhn-checked card numbers,
  API keys, AWS access-key IDs, and JWTs as numbered placeholders like `[EMAIL_1]`.
  `restore()` swaps the originals back after the model responds, so the user never
  sees placeholders.
- **Never log raw content.** The audit log and the feedback/metrics tables store
  **counts and dimensions only**, provider, route, payload byte size, draft length,
  context label, latency, success/error code. No draft, no rewrite, no edited text,
  ever. If you are tempted to log a draft "just for debugging," don't.
- **All persistent state lives under `~/.humanifyme/`** (`config.json` + `data.db`),
  resolved by `src/paths.ts` and overridable only via the `HUMANIFYME_HOME` env var.
  Do not persist samples or rewrites anywhere else.
- **Outbound calls are allowlisted.** Only `src/providers` and `src/network` may call
  `fetch()`, and every hardcoded host must be on the allowlist enforced by
  `src/network/outbound-scan.test.ts`. If you add a network call elsewhere, that test
  fails by design, that is the point.
- **Retrieved voice-memory exemplars are re-redacted at send time.** We never trust
  store-time redaction. Embeddings are computed on-device and are treated as
  PII-equivalent: local-only, never sent.
- **Anonymous telemetry is opt-in and OFF by default.** Aggregate, counts-only
  sharing lives in exactly one MIT-licensed module, `src/network/feedbackShip.ts`,
  refuses to run unless opted in, and is capped at once per 24h. If your change could
  affect what bytes leave the machine, it belongs in that module and nowhere else.

When a privacy tradeoff is unclear, do not guess. Add the question to
`docs/open-questions.md` and surface it in your PR. See
`specs/privacy-security-spec.md` for the full model.

---

## 3. Development setup

You need **Node.js >= 22.5** (the server uses the built-in `node:sqlite` module,
older Node will not work). No native build tools or external database required.

```bash
git clone https://github.com/joshmcqueary/humanifyme.git
cd humanifyme
npm install
```

Common scripts:

| Command | What it does |
| -------------------- | ----------------------------------------------------- |
| `npm test` | Run the full unit suite once (vitest). |
| `npm run test:watch` | Vitest in watch mode while you work. |
| `npm run typecheck` | `tsc --noEmit`; must pass with zero errors. |
| `npm run lint` | ESLint over `src`. |
| `npm run build` | Bundle the MCP server and CLI with tsup into `dist/`. |
| `npm run dev` | Run the MCP server from source via tsx. |

Before you open a PR, these four must be green:

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

The package builds two binaries: `humanifyme-mcp` (the MCP server) and `humanifyme`
(the CLI). Both drive the same `rewrite()` pipeline, so a change to the engine affects
both.

---

## 4. How the task system works

Work is organized into milestones and tasks. Do not freelance.

- **`tasks/milestones.md`**, the milestone roadmap and its gate. Milestone 0 (specs)
  must show complete before any application code is written.
- **`tasks/task-breakdown.md`**, the list of concrete tasks, each with explicit
  acceptance criteria. Pick the **lowest-numbered unblocked task** unless told
  otherwise.
- **`tasks/acceptance-criteria.md`**, the criteria, spelled out.
- **`tasks/test-plan.md`**, which tests a given task must add or update.

**One task at a time.** Complete it end-to-end (code + tests + every acceptance
criterion verified), then stop and report. Do not chain tasks without checking in.

### The spec-gate workflow for every change

1. **Read the linked spec section** for the task. The "What lives where" table in
  `CLAUDE.md` maps questions to the file that answers them.
2. **Restate the objective and acceptance criteria** in your commit/PR message, in
  your own words.
3. **Implement** the smallest change that satisfies the task.
4. **Write or update tests** per `tasks/test-plan.md`.
5. **Verify every acceptance criterion.** Do not mark the task done if any AC fails.
6. **If the spec is wrong or incomplete, fix the spec first** and call it out. Do not
  silently work around it.
7. **New question?** Add it to `docs/open-questions.md`.

---

## 5. Tests: TDD and the deterministic verify gate

We expect a test-first habit. Write the failing test that describes the behavior, then
make it pass. Most of the engine is pure functions precisely so that it can be tested
deterministically without hitting a model.

Two areas deserve special care:

- **`src/engine/verify.ts` is a pure, deterministic gate.** After the model produces a
  candidate, `verifyRewrite()` mechanically checks five things against the **redacted**
  draft: banned words the model *introduced* (not ones the user already wrote), every
  digit-bearing token surviving verbatim, every URL surviving byte-for-byte, every
  redaction placeholder surviving so `restore()` can reinsert real values, and
  sentence-initial casing matching the writer's learned register. It runs with no
  network. New checks here need table-driven unit tests covering the false-positive
  guards (for example, the casing check needs at least two offenders and a majority
  before it fires). The engine retries **at most once**; unresolved issues become
  advisory notes, not hard failures, so test both the retry path and the
  notes-fallback path.
- **The outbound-destination test** (`src/network/outbound-scan.test.ts`) is a static
  guard. If you legitimately need a new outbound host, update the allowlist *and*
  explain it in the PR. Never weaken the test to make a call pass.

If your change touches the rewrite pipeline (`src/engine/rewrite.ts`), remember the
ordering subtleties that tests pin down: the cache check runs **before** redaction and
the provider call, the cache key folds in a RAG signature so adding/removing voice
samples invalidates it, and a fresh feedback token is minted on every call,
including cache hits, without mutating the cached object. Read the file header before
you reorder anything.

---

## 6. Commit and PR conventions

- **Conventional Commits.** Format: `type(scope): summary`, e.g.
  `feat(engine): add semicolon habit to verify gate` or
  `fix(privacy): redact AWS keys before phones`. Common types: `feat`, `fix`,
  `docs`, `test`, `refactor`, `chore`, `security`.
- **Reference the acceptance criteria** the change satisfies in the commit body or PR
  description. Restating them is required by the workflow above.
- **One task per PR.** Keep diffs reviewable. If you discovered a second thing to fix,
  open a second PR.
- **Green before review.** Typecheck, lint, unit tests, and build all pass.
- **Call out spec or privacy changes loudly.** If a PR edits anything under
  `specs/`, `src/privacy`, `src/network`, or `src/engine/verify.ts`, say so in the
  title so reviewers know to look closely.
- Commits authored with agent assistance should keep their trailers; do not strip
  co-authorship.

---

## 7. Licensing: source-available with an MIT subset

HumanifyMe is **source-available**, not open-source in the OSI sense. Most of the repo
is proprietary (all rights reserved). A defined subset, the parts that substantiate
the privacy claims, is released under the **MIT License** so anyone can audit exactly
what does and does not leave a machine. See `LICENSE` and `LICENSE-MIT.txt`.

The MIT-licensed directories are:

- `src/privacy/`, redaction, restore, and pattern definitions.
- `src/network/`, the only module permitted to make outbound telemetry calls.
- `src/engine/verify.ts`, the deterministic output/casing quality gate.

What this means for you as a contributor:

- A contribution to those three areas is contributed under the **MIT License**, and
  each MIT file carries an `SPDX-License-Identifier: MIT` header, keep it. If you add
  a new file there, add the header.
- A contribution anywhere else is to the **proprietary** parts of the project. By
  opening a PR you agree your contribution may be used under the repository's
  source-available terms.
- No trademark rights are granted. "HumanifyMe" is a mark of Joshua McQueary.

If you are unsure which bucket your change falls in, ask in the PR before you write it.

---

## 8. Code style

- **Match the surrounding code.** This repo favors small pure functions, explicit
  types, `zod` for input validation at boundaries, and `node:` built-ins over
  dependencies (we ship `node:sqlite`, not a SQLite npm package). Mirror the file you
  are editing rather than introducing a new pattern.
- **Keep new dependencies rare and justified.** The default embedder is intentionally
  dependency-free and offline; heavier options (MiniLM, Ollama) are opt-in and lazily
  imported so they are never hard dependencies. Hold that line.
- **TypeScript strict.** `npm run typecheck` must pass; no `any` escape hatches without
  a comment explaining why.
- **Product copy must pass the banned-words gate.** Any user-facing string, tool
  descriptions, CLI prompts, README, error messages, must not sound like generic AI
  marketing. The forbidden list includes: *seamless, supercharge, unlock, leverage,
  empower, delight, world-class, powerful, smart*. The product literally rewrites text
  to remove this register; our own copy must clear the same bar. When in doubt, run it
  through the rewrite engine (see `prompts/critique-prompt.md`).

---

## 9. Where to start

Good first contributions, roughly in order of approachability:

1. **Redaction patterns** (`src/privacy/patterns.ts`). Adding a well-tested pattern (a
  new secret format, an international phone shape) is self-contained, MIT-licensed,
  and easy to verify. Note that pattern order is load-bearing, read the existing
  comments before reordering.
2. **Verification checks** (`src/engine/verify.ts`). Small, pure, deterministic, and
  covered by table-driven tests. A great place to learn the codebase's testing style.
3. **Importers and CLI ergonomics** (`src/cli-main.ts`, plus the chat-export and
  text-file importers under `src/importers/`). User-facing polish with clear
  acceptance criteria.
4. **Docs and specs.** Tightening a spec, fixing a drifted prompt duplicate (the `.md`
  prompt files are the human-readable source of truth and can drift from their `.ts`
  twins), or improving `docs/open-questions.md` is genuinely useful.

Before picking anything up, open `tasks/task-breakdown.md` and take the
lowest-numbered unblocked task with acceptance criteria that match what you want to do.
Look for issues labeled **good first issue** on GitHub; if none fit, ask and we will
point you at one.

---

## When in doubt

Ask. Do not guess at product decisions, and never guess at privacy tradeoffs. Add the
question to `docs/open-questions.md`, raise it in your PR or issue, and we will sort it
out together. Thank you for helping keep HumanifyMe honest about what stays on a
person's machine.
