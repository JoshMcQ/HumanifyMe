# HumanifyMe

**Make AI sound like you.**

Install HumanifyMe as a plugin in Claude Code, Cowork, Cursor, and other AI coding agents. It learns how you actually write and rewrites your agent's output in your real voice before a human ever reads it. It is not "write better." It is "stop sounding like AI."

[![CI](https://github.com/JoshMcQ/HumanifyMe/actions/workflows/ci.yml/badge.svg)](https://github.com/JoshMcQ/HumanifyMe/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-source--available%20%2B%20MIT%20core-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.5-green.svg)](https://nodejs.org)
[![Built with Claude Code](https://img.shields.io/badge/built%20with-Claude%20Code-D77655.svg)](https://claude.com/claude-code)

Domain: humanifyme.com

## Why it exists

People hand more of their writing to AI agents every day: commit messages, PR descriptions, Slack posts, email drafts, LinkedIn posts. Every agent produces the same recognizable tone. Polished, balanced, faintly corporate. Recipients have learned to spot it, and spotting it costs trust in sales, recruiting, and personal communication. The usual fixes (Grammarly, Wordtune, "AI humanizers") push text toward a generic professional register, which is the exact opposite of what you want. HumanifyMe builds a private, structured profile of how one specific person writes, then uses that profile inside the agent to rewrite drafts in that person's voice.

The transport underneath is MCP (Model Context Protocol). That is the wire it speaks so any MCP-compatible agent can call it. You install it as a plugin and never think about the protocol again.

## Install

### As a plugin (start here)

HumanifyMe ships as a plugin bundle in `humanifyme.plugin/`: manifest, MCP registration, and the skills that drive it (`build-voice-profile`, `humanify-pr`, and more). Add it from your agent's plugin or marketplace flow. Per-agent snippets live in [`docs/install/`](docs/install/) for Claude Code, Cowork, Cursor, Continue, Cline, Windsurf, Zed, and others.

Once installed:

1. Give it 3 to 10 of your real writing samples through the `build-voice-profile` skill.
2. HumanifyMe builds a structured voice fingerprint and stores it locally.
3. Your agent calls `humanify_text` automatically through bundled skills, or explicitly when you ask.

### Command line

```bash
npm install        # Node >= 22.5 (uses the built-in node:sqlite)
npm run build      # tsup -> dist/humanifyme-mcp.mjs (MCP) + dist/humanifyme.mjs (CLI)

node dist/humanifyme.mjs setup                                   # consent
node dist/humanifyme.mjs provider set anthropic --api-key sk-... # your key
node dist/humanifyme.mjs sample add my-email.txt --label email   # 3+ samples
node dist/humanifyme.mjs profile rebuild
echo "We are delighted to leverage synergies." | node dist/humanifyme.mjs rewrite
```

### Raw MCP registration

If your agent does not use the plugin format, register the server directly:

```bash
claude mcp add humanifyme -- node /path/to/repo/dist/humanifyme-mcp.mjs
```

The server exposes 16 `humanify_*` tools in one registry: the headline `humanify_text`, plus feedback and metrics, sample add/list/delete, profile get/build/update/delete, provider set, key test, audit list, wipe-all, and two importers (chat export and text files). The same engine runs without MCP via the `humanifyme` CLI (`rewrite`, `metrics`, `share on|off`, `setup`).

## How it works

HumanifyMe is not a wrapper around "rewrite this in a friendly tone." The whole rewrite pipeline lives in one function, `rewrite(args)` in `src/engine/rewrite.ts`, shared by the MCP tool layer and the CLI. It runs these stages in order:

```
   draft text
      |
      v
  1. validate          empty -> BAD_INPUT, >8000 chars -> OVER_LENGTH_CAP
      |
  2. normalize         default [more_like_me]; less_aggressive beats more_direct
      |
  3. CACHE CHECK       key = sha256(profile + context + directives + draft + ragSig)
      |   (HIT -> attach fresh feedback token -> return)
      v miss
  4. redact            emails/phones/addresses/cards/keys/JWTs -> [EMAIL_1] ...
      |
  5. merge fingerprint base voice + per-context overrides
      |
  6. retrieve (RAG)    optional, fail-open; embed redacted draft, cosine + MMR
      |
  7. build prompts     system prompt = fingerprint JSON + notes + exemplars
      |
  8. RETRY LOOP        call provider -> sanitize -> length band -> verify gate
      |   (max 2 attempts; issues become feedback, then become notes)
      v
  9-13 restore placeholders -> diff -> cache -> mint feedback token
      |
      v
  rewrite + diff + notes + feedbackToken
```

A few stages carry the weight:

**Cache before redaction.** The cache key is a sha256 over the profile hash, context label, sorted directives, draft hash, and a rag signature. A hit returns immediately, so redaction is not always the first thing that happens to a draft. The rag signature folds in the embedder model, sample count, newest-sample timestamp, and every `rag.*` tunable, so adding or removing a voice sample invalidates the cache without running retrieval on the hit path.

**Redact, then restore.** `redact(draft)` masks PII into numbered placeholders before anything crosses the network. After the model responds, `restore()` puts the originals back, so you never see a `[EMAIL_1]` token. A draft that is nothing but redactable content throws `EMPTY_AFTER_REDACTION` instead of being sent.

### The quality moat: deterministic verification

Most "rewrite in my voice" tools stop at the prompt and hope the model behaved. HumanifyMe does not trust the model. After every generation, `verifyRewrite()` in `src/engine/verify.ts` runs a pure, deterministic gate over the candidate, all against the redacted draft so raw PII never reaches this layer. It runs exactly five mechanical checks:

1. **Banned words.** Flags a word only if the model introduced it (present in the rewrite, absent from your draft). A banned word you wrote yourself is left alone.
2. **Numbers.** Every digit-bearing token in the draft (dates, prices, versions, percentages) must survive verbatim, or `missing_number` fires.
3. **URLs.** Every `http(s)` URL must survive byte for byte.
4. **Redaction placeholders.** Every `[THING_N]` must survive so `restore()` can put the real value back. A dropped numeric suffix still passes; only a fully vanished placeholder fails.
5. **Casing register.** Learned per user, not a house style. The fingerprint records whether you write all-lowercase or sentence-case, and the gate enforces that. The threshold is forgiving on purpose: a single proper noun for a lowercase writer is tolerated, not punished.

On attempt 0, any issues (or an out-of-band length ratio) become natural-language instructions threaded into the next system prompt, and the loop retries exactly once. On the final attempt, surviving issues become user-facing "review before sending" notes. Verification never blocks output. The only thing that always forces another attempt is empty model output.

### The voice fingerprint

HumanifyMe learns your voice as a single structured JSON object, a `VoiceFingerprint` plus per-context overrides, not as computed text statistics. `buildProfile.ts` redacts every sample, concatenates them with labels, calls the provider once (`temperature 0.2`, JSON mode), validates against `StyleProfileSchema` with zod, and persists it. No code measures sentence length or contraction rate. The dimensions are LLM judgments mapped to coarse enums. We do not compute Flesch-Kincaid.

The dimensions, in short:

| Dimension | Shape | Enforcement |
| --- | --- | --- |
| `sentenceLength` | average (short/medium/long) + variance | prompt target |
| `formality` | 1 to 5 | prompt target |
| `directness` | 1 to 5 | prompt target |
| `humor`, `profanity`, `contractions` | coarse enums | prompt target |
| `punctuationHabits` | emDash, semicolon, ellipsis, exclamation, parentheses | prompt target |
| `capitalization` | sentenceCase, titleCase, allLowercase | prompt target plus deterministic verify |
| `commonPhrases` | real recurring phrases | used where they fit, never forced |
| `wordsToAvoid` | words you do not use | forbidden plus deterministic verify |
| `greetings` / `signoffs` | your real openers and closers | carried in fingerprint |
| `howTheyAskQuestions` / `howTheyDisagree` / `howTheyApologize` / `howTheyGiveInstructions` | short freeform descriptions | carried as authoritative |
| `exemplars` | 3 to 10 verbatim post-redaction snippets | ground the voice |

Every base dimension can be context-specialized across nine labels (`casual`, `professional`, `annoyed`, `polite`, `direct`, `sales`, `email`, `text`, `linkedin`). At rewrite time the engine deep-merges base with the requested context. Note that em-dash is a fingerprint dimension steered through the prompt, not a verified rule. Only `wordsToAvoid` and casing are deterministically enforced.

## Your voice memory (the brain)

When retrieval is on, HumanifyMe stores embeddings of your own past writing and pulls your most-similar past messages as few-shot exemplars. Here is the part people get wrong: it does not create a database inside your project folder.

The embeddings and your profile live in `~/.humanifyme/data.db`, in your HOME directory, resolved by `src/paths.ts` and overridable only via `HUMANIFYME_HOME`. That means one persistent personal voice memory, shared across every agent and every project on your machine. Open a new repo, switch from Claude Code to Cursor, start a fresh chat: same voice. The memory grows as you add samples, and it never lands in version control by accident because it was never in the project to begin with.

How retrieval works:

- It embeds the already-redacted draft on-device and runs cosine similarity against locally-stored per-sample vectors in the SQLite `sample_embeddings` table.
- Selection is greedy Maximal Marginal Relevance with a recency tiebreaker and a dedup gate (drops candidates whose cosine to an already-chosen exemplar exceeds 0.97). Returning fewer exemplars, or none, is a normal outcome.
- Below `minSamples` (default 5) embedded samples, retrieval returns nothing and the engine stays profile-only.
- The default embedder is dependency-free and offline: `lexical-v1`, a deterministic 512-dim lexical embedder. MiniLM (transformers.js / ONNX) and Ollama are opt-in, local-only upgrades behind the same interface.
- Sample text is embedded from raw text at ingest, but every selected exemplar is passed through `redact()` again at send time. Store-time redaction is never trusted.
- The whole stage is fail-open: any error degrades to profile-only. Retrieval never blocks a rewrite.

## Does it actually work?

We ran a four-register evaluation: a casual lowercase writer (A), a formal sentence-case writer (B), a terse technical writer (C), and a warm enthusiastic writer (D), five drafts each, retrieval on versus off, plus a blind judge. That is 20 rewrite pairs. The numbers, with method and figures, are in [`docs/proof/README.md`](docs/proof/README.md):

- **Blind-judge preference.** Asked which output sounds more like the real person, with position bias cancelled, the judge preferred the retrieval-grounded rewrite for all four writers this run (100 percent), and 100 percent on two earlier runs.
- **Rewrites land on the right author.** Classify each rewrite by which writer's real voice it is stylometrically closest to: 17 of 20 (85 percent) land on the correct author. The misses are the two casual lowercase writers (A and C) blurring into each other, which is the honest result, not a perfect diagonal.
- **Register adapts to the writer.** The two lowercase writers score 0.00, the two sentence-case writers 1.00. This is enforced by the deterministic verify gate plus the learned register, not by RAG. RAG does not improve casing; the gate does.
- **RAG shows up in stylometric distance** for three of the four writers (A, C, D move closer with retrieval on; B was worse this run, and we report it). The RAG win is in distance and blind-judge preference, not in casing.
- **Redaction recall is 100 percent** on 7 secret classes, with 0 false positives across 20 plain paragraphs.

We are not claiming RAG fixes casing, and we are not claiming more than the runs show.

## The research it is based on

HumanifyMe started from a literature pass, not a hunch. The prior-art survey, the state-of-the-art review, and the evaluation design all live in the repo: [`docs/research/prior-work.md`](docs/research/prior-work.md), [`docs/research/state-of-the-art.md`](docs/research/state-of-the-art.md), and [`docs/research/evaluation.md`](docs/research/evaluation.md). Read those if you want the reasoning behind the fingerprint dimensions, the verify gate, and the retrieval design.

## Built with Claude Code

HumanifyMe was designed and built mostly with Claude Code, Anthropic's agentic coding tool, with a human directing product and architecture decisions: the pivot to plugin-first, the privacy model, the verify gate, the evaluation. The agent did the bulk of the implementation against specs and acceptance criteria that the human wrote and reviewed.

We mention this on purpose. A tool that makes AI-generated writing sound like a specific person was, fittingly, built by an agent working under a person's direction. That is the same loop the product runs: the agent does the work, the human stays in the voice and the calls.

## Privacy methodology

HumanifyMe is local-first and redacts before it sends. The modules that substantiate the privacy claims (`src/privacy/`, `src/network/`, `src/engine/verify.ts`) are MIT-licensed so you can audit them.

- **Local-first.** All state lives under `~/.humanifyme/` (`config.json` plus `data.db`), overridable only via `HUMANIFYME_HOME`. Raw samples never leave that directory.
- **Redact before send.** `redact()` masks emails, phones, US street addresses, Luhn-checked cards, API keys, AWS access-key IDs, and JWTs into numbered placeholders. Pattern order is load-bearing. Identical values collapse to one placeholder. `restore()` swaps the originals back after the model responds.
- **Re-redact exemplars at send time.** Retrieved voice-memory exemplars are redacted again before sending, never trusting how they were stored.
- **Outbound allowlist plus static scan test.** `src/network/outbound-scan.test.ts` scans the whole `src/` tree to assert that only `src/providers` and `src/network` may call `fetch()`, and that every hardcoded outbound host is on a 4-entry allowlist: `api.anthropic.com`, `api.openai.com`, `generativelanguage.googleapis.com`, `humanifyme.com`.
- **Metadata-only audit log.** Every outbound provider call writes a row with provider, route, payload byte size, draft length, and success, never content. A 20-entry ring buffer surfaced via `humanify_audit_list`.
- **Opt-in, counts-only feedback.** Every rewrite mints a per-rewrite feedback token and writes a pending counts-only row (context, provider, latency, never the text). You answer "did this sound like you?" and `humanify_metrics` aggregates the answers locally. Anonymous sharing of those aggregate counts is OFF by default, gated to once per 24h, and lives in one MIT-licensed module, `src/network/feedbackShip.ts`, which ships only a salted install id plus counts.

## Repository layout

```
/README.md                       <- you are here
/CLAUDE.md /AGENTS.md            <- instructions for coding agents
/src/                            <- the MCP server + CLI (TypeScript)
/humanifyme.plugin/              <- plugin bundle: manifest, MCP registration, skills
/specs/                          <- product, MVP, component, and policy specs
/tasks/                          <- milestones, task breakdown, acceptance criteria, test plan
/prompts/                        <- LLM prompt templates for the rewrite engine
/docs/research/                  <- prior work, state of the art, evaluation design
/docs/proof/                     <- proof figures and method for the eval numbers
/docs/install/                   <- per-agent install snippets
/docs/                           <- data model, MCP tool contract, architecture, risks
/site/                           <- landing page, public proof page, Try-It widget, alpha survey
/cf-worker/                      <- Cloudflare Worker for opt-in aggregate feedback + /api/stats
```

## Contributing

We want maintainers. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) for branch, test, and PR conventions, then read `src/engine/rewrite.ts`, `src/engine/verify.ts`, and `src/privacy/`. That trio is the heart of the methodology above, and it is MIT-licensed. The one set of rules you cannot break is `specs/privacy-security-spec.md`. When you change behavior, `src/network/outbound-scan.test.ts` and `src/engine/verify.test.ts` must stay green. Good first issues are labeled `good first issue` on the tracker.

## License

Source-available. Most of the repo is proprietary. The parts that substantiate the privacy claims (`src/privacy/`, `src/network/`, and `src/engine/verify.ts`) are MIT, see `LICENSE`, `LICENSE-MIT.txt`, and the `SPDX-License-Identifier: MIT` headers.
