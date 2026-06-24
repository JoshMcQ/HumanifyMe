# HumanifyMe

**Make AI sound like you.**

HumanifyMe is an MCP server that learns how you actually write and rewrites your AI agent's output in your real voice. It installs as a plugin in Cowork, Claude Code, Cursor, Continue, Cline, Windsurf, Zed, ChatGPT desktop, and every other MCP-compatible agent. It is not "write better." It is "stop sounding like AI."

Domain: humanifyme.com

---

## Why this exists

People increasingly hand their writing to AI agents — commit messages, PR descriptions, Slack posts, email drafts, LinkedIn posts. Every agent produces the same recognizable tone: polished, balanced, faintly corporate. Recipients have learned to spot it, and spotting it costs trust in sales, recruiting, and personal communication. The usual fixes (Grammarly, Wordtune, "AI humanizers") push text toward a generic professional register — the exact opposite of what you want. HumanifyMe builds a private, structured profile of how *one specific person* writes, then uses that profile inside the agent to rewrite drafts before a human ever reads them.

## How it works (one paragraph)

You install HumanifyMe as a plugin in your agent. You give it 3–10 of your real writing samples via the bundled `build-voice-profile` skill. HumanifyMe generates a structured voice fingerprint and stores it locally in `~/.humanifyme/`. From then on your agent can call the `humanify_text` tool — automatically through bundled skills like `humanify-pr`, or explicitly when you ask. The rewrite runs on your machine, calls your configured LLM provider with your key, redacts secrets before anything crosses the wire, and never sends raw samples anywhere.

---

## How it works — the methodology

This is the part worth reading. HumanifyMe is not a wrapper around "rewrite this in a friendly tone." The whole rewrite pipeline lives in one function, `rewrite(args)` in `src/engine/rewrite.ts`, shared by both the MCP tool layer and the CLI. It runs the following stages in this exact order.

### The pipeline diagram

```
              draft text
                  │
                  ▼
        ┌───────────────────┐
        │ 1. validate       │  empty -> BAD_INPUT, >8000 chars -> OVER_LENGTH_CAP
        └───────────────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ 2. normalize      │  default directive [more_like_me];
        │    directives     │  less_aggressive beats more_direct
        └───────────────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ 3. CACHE CHECK    │  key = sha256(profileHash + context +
        │    (before any    │  directives + draftHash + ragSignature)
        │     redaction!)   │──── HIT ──► attach fresh feedback token ──► return
        └───────────────────┘
                  │ miss
                  ▼
        ┌───────────────────┐
        │ 4. redact()       │  emails/phones/addresses/cards/keys/JWTs
        │                   │  -> [EMAIL_1], [CARD_2] ... (restore map kept)
        └───────────────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ 5. merge          │  base voice + per-context overrides
        │    fingerprint    │  -> effective VoiceFingerprint
        └───────────────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ 6. retrieve (RAG) │  embed redacted draft on-device, cosine + MMR
        │    [optional,     │  over your own past messages; each exemplar
        │     fail-open]    │  RE-REDACTED at send time; budgeted to 2000 chars
        └───────────────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ 7. build prompts  │  user prompt once; system prompt = fingerprint
        │                   │  JSON + notes + exemplars + directives
        └───────────────────┘
                  │
                  ▼
   ╔══════════════════════════════════════════╗
   ║ 8. RETRY LOOP (max 2 attempts)            ║
   ║    ┌────────────────────────────────────┐ ║
   ║    │ call provider (temp 0.6, 2500 tok) │ ║
   ║    │ append audit row (metadata only)   │ ║
   ║    │ sanitize whitespace                │ ║
   ║    │ length-band check                  │ ║
   ║    │ verifyRewrite() deterministic gate │ ║
   ║    └────────────────────────────────────┘ ║
   ║   attempt 0 + issues -> feedback -> retry  ║
   ║   attempt 1 + issues -> issues become notes║
   ╚══════════════════════════════════════════╝
                  │
                  ▼
   9 guard empty -> 10 restore() placeholders -> 11 diff ->
   12 cache.put(response) -> 13 mint feedback token (on a clone)
                  │
                  ▼
              rewrite + diff + notes + feedbackToken
```

### Stage by stage

1. **Validate.** Empty drafts throw `BAD_INPUT`; drafts over `MAX_DRAFT_CHARS` (8000) throw `OVER_LENGTH_CAP`. Nothing else runs first.
2. **Normalize directives.** An empty directive list defaults to `['more_like_me']`. If both `more_direct` and `less_aggressive` are present, `more_direct` is dropped (`less_aggressive` wins) and a note is recorded.
3. **Cache check — before redaction, before the provider.** The cache key is a sha256 over the profile hash, context label, sorted directives, draft hash, and a *rag signature*. A hit returns immediately. Two consequences worth understanding: a cache hit skips the entire rest of the pipeline (so redaction is *not* the first thing that happens to a draft), and the rag signature folds in the embedder model, sample count, newest-sample timestamp, and every `rag.*` tunable — so adding or removing a voice sample invalidates the cache without running retrieval on the hit path.
4. **Redact.** `redact(draft)` returns the redacted text, a restore map, and an applied flag. A draft that is nothing but redactable content (empty after stripping `[PLACEHOLDER]` tokens) throws `EMPTY_AFTER_REDACTION` instead of being sent.
5. **Merge fingerprint.** The per-context variant is looked up from `profile.contexts[contextLabel]`; a missing variant adds a note and falls back to the base voice. `mergeFingerprint(base, variant.overrides)` produces the effective fingerprint.
6. **Retrieve (RAG, optional and fail-open).** Covered in its own section below. Any error here degrades to profile-only `[]` — retrieval never blocks a rewrite.
7. **Build prompts.** The user prompt is built once from the redacted text. The system prompt is rebuilt each loop iteration from the fingerprint JSON, context notes, context exemplars, retrieved exemplars, directives, and an optional length reminder.
8. **The retry loop (max two attempts).** Each attempt calls the provider (`temperature 0.6`, `maxTokens 2500`), appends a metadata-only audit row, sanitizes whitespace, runs the length-band check, then runs the deterministic verification gate. This loop is the quality moat — see below.
9. **Guard empty.** If both attempts produced empty output, throw `OUTPUT_INVALID` ("the model returned empty output twice"), non-retryable.
10. **Restore.** `restore()` reinserts the original redacted spans, so the user never sees a `[EMAIL_1]` placeholder.
11. **Diff.** `computeDiff(draft, restored)` produces the `DiffSegment[]` (unchanged / added / removed) returned with the response.
12. **Cache write.** The full response is stored *with an empty `feedbackToken` placeholder* — the cached object itself is never stamped with a token.
13. **Feedback token.** `attachFeedback` mints a `randomUUID`, records a pending counts-only feedback row (audit id, context, provider, latency — never content, storage errors swallowed), and returns a *clone* with the token stamped. This runs on both the fresh path and the cache-hit path, so the same cached rewrite yields a different feedback token every call.

---

## The quality moat: deterministic post-generation verification

Most "rewrite in my voice" tools stop at the prompt and hope the model behaved. HumanifyMe does not trust the model. After every generation, `verifyRewrite()` (in `src/engine/verify.ts`) runs a pure, deterministic gate over the candidate. It is the difference between a vibe and a guarantee.

It runs **exactly five mechanical checks**, all against the *redacted* draft so raw PII never reaches this layer:

1. **Banned words (`wordsToAvoid`).** Flags a word only if the model **introduced** it — present in the rewrite *and* absent from your draft. A banned word you wrote yourself is left alone (that is a meaning-preservation question, not a violation). Words shorter than 2 characters are skipped; matching uses a non-letter word-boundary regex.
2. **Numbers.** Every digit-bearing token in the draft (dates, prices, versions, percentages) must survive verbatim, or a `missing_number` issue fires. Redaction placeholders are stripped first so the `1` inside `[EMAIL_1]` is never mistaken for a required number.
3. **URLs.** Every `http(s)` URL in the draft must survive byte-for-byte.
4. **Redaction placeholders.** Every `[THING_N]` must survive so `restore()` can put the real value back. Enforcement is deliberately lenient: a dropped numeric suffix (`[EMAIL]` instead of `[EMAIL_1]`) still passes, because `restore()` can reinsert by bare type. Only a fully vanished placeholder fails.
5. **Casing register — learned per user, not a house style.** This is the subtle one. The fingerprint records whether you write in all-lowercase or sentence-case. The gate counts sentence-initial upper- vs lower-case starts (splitting on sentence punctuation, stripping bracketed placeholders so `[EMAIL_1]` never counts as a capital). For an all-lowercase writer it flags a `casing` issue only when capitalized starts are **>= 2 AND a strict majority**; the mirror rule applies to sentence-case writers. That `2-and-majority` threshold is intentional — a single proper noun or acronym for a lowercase writer is tolerated, not punished. The gate is forgiving by design.

**The retry loop.** On attempt 0, if the rewrite is out of the length band *or* `verifyRewrite` returns any issues, those issues are turned into natural-language instructions by `issuesToFeedback()` ("this person never uses this word, replace it with something they would say"; "every number must appear exactly as in the draft") and threaded back into the next system prompt. The loop then retries **exactly once**. On the final attempt, any surviving issues are downgraded to user-facing "review before sending" notes — verification never blocks output. The one exception that always forces another iteration is empty model output.

**The length band** is computed as `ratio = rewrite.length / draft.length`. With the `shorter` directive, out-of-band means `ratio > 0.95`; otherwise out-of-band is `ratio < 0.7` or `ratio > 1.3`.

A few honest notes, because the gate's exact shape matters to contributors:

- There is **no em-dash / "AI-tell" check** in verification. Em-dash is a *fingerprint dimension* steered through the prompt (`punctuationHabits.emDash`), not a verified rule.
- Numbers and URLs are checked with plain `String.includes`, so verbatim survival is the contract — `1,000` reformatted to `1000` would (correctly, by this design) be flagged as missing.
- Only `wordsToAvoid` and the casing register are deterministically enforced. Every other voice dimension (formality, directness, humor, sentence length, punctuation) relies on the model honoring the prompt. There is no mechanical retry for those.

A companion `sanitizeRewrite()` runs *before* verification. It is a fixer, not a detector: it trims trailing per-line whitespace, collapses runs of 2+ spaces only when the draft itself had none, and collapses 3+ newlines to 2.

---

## The voice fingerprint

HumanifyMe learns your voice as a single structured JSON object — a `VoiceFingerprint`, plus per-context overrides — **not** as computed text statistics. `buildProfile.ts` redacts every sample, concatenates them with their labels into one prompt, calls the provider once (`temperature 0.2`, JSON mode), validates the result against `StyleProfileSchema` with zod, and persists it. No code measures sentence length, punctuation frequency, or contraction rate. The "stats" are LLM judgments mapped to coarse enums. The spec is explicit: we do not compute Flesch-Kincaid.

The fingerprint dimensions:

| Dimension | Shape | How it is used |
| --- | --- | --- |
| `sentenceLength` | `average` (short/medium/long) + `variance` (low/medium/high) | match target in the rewrite |
| `formality` | 1–5 | match target; `more_professional` raises it one step |
| `directness` | 1–5 | match target; `less_aggressive` lowers it (wins conflicts) |
| `humor` | none / dry / warm / sarcastic / absurd | match target |
| `profanity` | none / mild / moderate / frequent | match target |
| `contractions` | rare / sometimes / always | match target |
| `oxfordComma` | boolean | carried in fingerprint JSON |
| `punctuationHabits` | emDash, semicolon, ellipsis, exclamation, parentheses — each rare/sometimes/frequent | match target |
| `capitalization` | sentenceCase (bool) + titleCase (always/sometimes/never) + allLowercase (bool) | match target **and deterministically verified** |
| `commonPhrases` | array of real recurring phrases | used where they fit, never forced |
| `wordsToAvoid` | array of words you don't use | forbidden in rewrite **and deterministically verified** |
| `greetings` / `signoffs` | string arrays of your real openers/closers | carried in fingerprint |
| `howTheyAskQuestions` / `howTheyDisagree` / `howTheyApologize` / `howTheyGiveInstructions` | 1–3 sentence freeform descriptions | carried in fingerprint as authoritative |
| `exemplars` | 3–10 verbatim (post-redaction) snippets from your samples | ground the voice; not copied verbatim unless natural |

Every base dimension can be **context-specialized**. Each `ContextVariant` carries `overrides` (a `Partial<VoiceFingerprint>` of only the fields that differ), freeform notes, and context-specific exemplars, across nine context labels: `casual`, `professional`, `annoyed`, `polite`, `direct`, `sales`, `email`, `text`, `linkedin`. At rewrite time the engine deep-merges base with the requested context's overrides.

At rewrite time the whole merged fingerprint is injected into the system prompt as pretty-printed JSON, labeled "treat it as authoritative," and the model is told to match it. When retrieved real exemplars are present (see RAG below), they are declared the strongest voice signal, with the fingerprint as the structured backbone.

A couple of things the fingerprint is **not**: there is no emoji dimension, and embeddings are not a fingerprint field — they exist only as a retrieval key. The minimum to build a profile at all is 3 samples; `commonPhrases` and `wordsToAvoid` only require 3+ entries once you supply 5+ samples.

---

## Retrieval-augmented voice memory (RAG)

When `rag.enabled`, the engine retrieves your own most-similar past messages as few-shot exemplars:

- It embeds the **already-redacted** draft on-device and runs cosine similarity against locally-stored per-sample vectors in the SQLite `sample_embeddings` table.
- Selection is greedy **Maximal Marginal Relevance** — `mmrLambda * relevance - (1 - mmrLambda) * maxSimilarityToAlreadyChosen` — with a recency tiebreaker on exact MMR ties and a hard dedup gate that drops any candidate whose cosine to an already-chosen exemplar exceeds `dedupCosine` (default 0.97). The dedup gate can return fewer than `topK`; "no exemplars" is a normal outcome, not a failure.
- **Cold start:** below `minSamples` (default 5) embedded samples, retrieval returns `[]` and the engine stays profile-only.
- The default embedder is **dependency-free and offline**: `lexical-v1`, a deterministic 512-dim lexical embedder (lowercased tokens hashed with FNV-1a into unigram + bigram features, count-weighted, L2-normalized). **MiniLM** (transformers.js / ONNX, all-MiniLM-L6-v2, 384-dim, lazily imported so it is never a hard dependency) and **Ollama** (`/api/embeddings`, local endpoint) are opt-in, local-only upgrades behind the same `EmbeddingProvider` interface. Switching embedders triggers a backfill, because the model id is stored per row and only the active model's vectors are scored.
- Sample text is embedded from **raw** text at ingest (so similarity is faithful), but every selected exemplar is passed through `redact()` **again at send time** — store-time redaction is deliberately never trusted. Exemplars are then budgeted: each capped at 500 chars, total capped at 2000, trimming lowest-ranked first so the fingerprint is never crowded out.
- The entire stage is wrapped so any error degrades to profile-only `[]`. RAG must never block or fail a rewrite.

---

## Privacy methodology

HumanifyMe is local-first and redacts before it sends. The substantiating modules (`src/privacy/`, `src/network/`, `src/engine/verify.ts`) are MIT-licensed precisely so you can audit them.

- **Local-first.** All state lives under `~/.humanifyme/` (`config.json` + `data.db`), resolved by `src/paths.ts` and overridable only via `HUMANIFYME_HOME`.
- **Redact before send.** Before any draft text crosses the network, `redact()` masks emails, phones, US street addresses, Luhn-checked card numbers, API keys, AWS access-key IDs, and JWTs with numbered placeholders like `[EMAIL_1]`. Pattern order is load-bearing (secrets and cards run before generic patterns). Identical values collapse to one placeholder.
- **Restore after.** `restore()` swaps the originals back from the per-request map after the model responds, plus a bare-suffix fallback for when the model drops the number.
- **Re-redact exemplars at send time.** Retrieved voice-memory exemplars are redacted again at send time, never trusting how they were stored.
- **Outbound allowlist + static scan test.** `src/network/outbound-scan.test.ts` greps the whole `src/` tree to assert that only `src/providers` and `src/network` may call `fetch()`, and that every hardcoded outbound host is on a 4-entry allowlist: `api.anthropic.com`, `api.openai.com`, `generativelanguage.googleapis.com`, `humanifyme.com`. (The scan is static text matching — it does not catch runtime-constructed URLs, by design and stated plainly.)
- **Metadata-only audit log.** Every outbound provider call (per attempt, success or failure) writes a row capturing provider, route, payload byte size, draft length, and success — never content. It is a 20-entry ring buffer (`AUDIT_CAP = 20`), surfaced via the `humanify_audit_list` MCP tool. It is a transparency window, not a forensic log.
- **Opt-in, counts-only feedback.** Every rewrite mints a per-rewrite `feedbackToken` and writes a *pending* counts-only row (context, provider, latency — never the draft, rewrite, or edited text). You answer "did this sound like you?" — yes / kinda / no, mapped onto an accept / edit / reject signal. `humanify_metrics` aggregates that table locally (accept/edit/reject rates over *answered* rewrites, a sounds-like-me breakdown, per-context and per-provider counts, p50/p95 latency). Anonymous sharing of those aggregate counts is OFF by default, gated to once per 24h, and lives in exactly one MIT-licensed module, `src/network/feedbackShip.ts`, which ships only an opaque salted install id plus counts — no drafts, rewrites, edited text, or reason strings.

> Note: `humanify_record_feedback` accepts an `editedText` field for forward-compat, but it is **never persisted**. Only the signal and an optional short reason are stored.

---

## The MCP tools

The server exposes 16 `humanify_*` tools in one `ALL_TOOLS` registry: the headline `humanify_text`, plus `humanify_record_feedback`, `humanify_metrics`, sample add/list/delete, profile get/build/update/delete, provider set, key test, `humanify_audit_list`, `humanify_wipe_all`, and two importers (chat export, text files). The same loop runs without MCP via the `humanifyme` CLI (`rewrite`, `metrics`, `share on|off`, `setup`).

---

## Developer setup

```bash
npm install        # Node >= 22.5 required (uses the built-in node:sqlite)
npm test           # vitest suite
npm run typecheck  # tsc --noEmit
npm run build      # tsup -> dist/humanifyme-mcp.mjs (MCP server) + dist/humanifyme.mjs (CLI)
```

Try it locally:

```bash
npm run build
node dist/humanifyme.mjs setup                                  # consent
node dist/humanifyme.mjs provider set anthropic --api-key sk-…  # your key
node dist/humanifyme.mjs sample add my-email.txt --label email  # 3+ samples
node dist/humanifyme.mjs profile rebuild
echo "We are delighted to leverage synergies." | node dist/humanifyme.mjs rewrite
```

Register the MCP in an agent (see `docs/install/` for every agent):

```bash
claude mcp add humanifyme -- node /path/to/repo/dist/humanifyme-mcp.mjs
```

## Repository layout

```
/README.md                       <- you are here
/CLAUDE.md                       <- instructions for Claude Code
/AGENTS.md                       <- instructions for any coding agent
/.github/copilot-instructions.md <- instructions for GitHub Copilot
/src/                            <- the MCP server + CLI (TypeScript)
/humanifyme.plugin/              <- plugin bundle: manifest, MCP registration, skills
/specs/                          <- product, MVP, component, and policy specs
/tasks/                          <- milestones, task breakdown, acceptance criteria, test plan
/prompts/                        <- LLM prompt templates for the rewrite engine
/docs/                           <- user stories, data model, MCP tool contract, architecture, risks, open questions
/docs/install/                   <- per-agent install snippets
/site/                           <- landing + public proof page
/cf-worker/                      <- Cloudflare Worker for opt-in aggregate feedback intake + /api/stats
```

## Reading order

If you are new to the project, read in this order:

1. `specs/product-spec.md` — what HumanifyMe is and what it is not.
2. `specs/mvp-spec.md` — the wedge we are building first.
3. `specs/mcp-server-spec.md` — the MCP server: tools, resources, runtime.
4. `specs/plugin-spec.md` — how the MCP is packaged and distributed.
5. `specs/privacy-security-spec.md` — non-negotiable rules.
6. `docs/architecture.md` — how the pieces fit.
7. `tasks/milestones.md` — what ships when.
8. `tasks/task-breakdown.md` — what to pick up next.

## For contributors

We want maintainers. Start here:

1. Read `CONTRIBUTING.md` for branch, test, and PR conventions.
2. Read the reading order above — `specs/privacy-security-spec.md` is the one set of rules you cannot break.
3. Read `src/engine/rewrite.ts`, `src/engine/verify.ts`, and `src/privacy/` — that trio is the heart of the methodology described above, and it is MIT-licensed.
4. Good first issues are labeled [`good first issue`](../../issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) on the issue tracker. Open questions worth a contributor's attention live in `docs/open-questions.md`.

When you change behavior, the privacy model and the verification gate both have tests that must stay green — `src/network/outbound-scan.test.ts` and `src/engine/verify.test.ts` are the ones reviewers watch most closely.

## Status

- Milestone 0 (research & specs): complete.
- Milestones 1–3 (MCP server, storage, redactor, profile engine, rewrite engine, CLI, importers): built and tested (2026-06-10).
- Milestone 4 (plugin packaging): bundle in `humanifyme.plugin/`, snippets in `docs/install/`.
- Milestones 5–7 (onboarding polish, landing page, marketplace + npm launch): in progress — see `tasks/milestones.md`.
- Milestone 8 (retrieval-augmented voice / RAG): complete (2026-06-16); a two-register eval proves voice + casing adapt to the user.
- Milestone 9 (validation + public feedback infra): complete (2026-06-24). Per-rewrite "did this sound like you?" feedback → local `humanify_metrics`; opt-in (default OFF) anonymous counts-only sharing via `src/network/`; a Cloudflare Worker (`cf-worker/`) intake + public `/api/stats`; the live proof page (`site/proof.html`), Try-It widget, and alpha survey.

## Locked product decisions

- Surface: MCP server, distributed as a plugin. **Not** a Chrome extension.
- Name: **HumanifyMe**. Domain humanifyme.com.
- Tagline: **Make AI sound like you.**
- LLM providers: Anthropic, OpenAI, Gemini wired at launch; Ollama as an early follow-on.
- Storage: local-first in `~/.humanifyme/` (config + SQLite). No backend in MVP.
- Target distribution: every MCP-compatible agent. Cowork and Claude Code plugin marketplaces are first-class at launch.

## Positioning, in one line

HumanifyMe is the voice layer that sits inside your agent and rewrites everything in your voice before you see it.

## License

Source-available. Most of the repo is proprietary; the parts that substantiate the
privacy claims — `src/privacy/`, `src/network/`, and `src/engine/verify.ts` — are MIT
(see `LICENSE`, `LICENSE-MIT.txt`, and the `SPDX-License-Identifier: MIT` headers).
