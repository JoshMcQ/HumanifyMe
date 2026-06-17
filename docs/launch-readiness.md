# HumanifyMe — launch readiness (2026-06-17)

Written by the autonomous build loop. **Nothing outward-facing has been done** —
no push, no publish, no outreach. This is the handoff for Joshua to make the few
decisions only he can make, then green-light the launch sequence.

## TL;DR

The thing that was broken when you dogfooded the "David" message is **fixed and
measured.** The rewrite engine now retrieves *your own most-similar past
messages* per draft and writes from them (Milestone 8, RAG voice-memory). A
real-model A/B eval shows it's measurably more *you*. The product is build-ready;
what remains is your call on how open to make the source, then a short publish
sequence.

## What was built this run (Milestone 8 — RAG voice-memory)

All on branch **`m8-rag`**, one TDD task per commit, full suite green throughout
(now **143 unit tests + 8 eval-scorer tests**, typecheck + build clean).

- **T-61** local-only `EmbeddingProvider` abstraction; dependency-free **lexical**
  default embedder (no native deps, no install weight); optional MiniLM/Ollama.
- **T-62** `sample_embeddings` table (schema v2, inside `data.db`, wiped with it).
- **T-63** embed-on-ingest across every path + idempotent backfill.
- **T-64** retriever: cosine + recency + MMR diversity + dedup + cold-start.
- **T-65** retrieval wired into the rewrite — exemplars **redacted at send time**,
  token-budgeted, injected as the primary voice signal; profile-only fallback.
- **T-66** `rag.*` config block (opt-out + tunables); wipe-clears-embeddings test.
- **Eval** (`evals/`): T4 (AI-smell) + T5 (stylometry) scorers + a real-Anthropic
  RAG-on-vs-off runner with a blind LLM judge.

Privacy held the whole way: embeddings are local, retrieved examples are redacted
before they ever leave the machine, and `humanify_wipe_all` clears everything.

## The proof (evals/results/)

Same 5 generic-AI drafts, same writer, retrieval ON vs OFF:

| Metric | RAG-on | RAG-off | Read |
|---|---|---|---|
| Stylometric distance to the writer (lower=closer) | **2.67** | 4.25 | ~37% closer to the voice |
| Blind Anthropic judge prefers | **100%** | — | voice-match, every draft |
| AI-smell tells per rewrite | 0 | 0 | engine already strips tells |

Qualitatively: RAG-on nails the writer's lowercase-casual register ("hey — did you
ever get anywhere with the flash script?... let me know!"); RAG-off stays in
polished sentence case ("Hey — just wanted to check in..."). This is exactly the
gap that made the David message feel not-you.

Caveat to keep honest: this is **one synthetic writer**. It validates the engine
direction strongly; the public **HumanifyMe Bench** (real consented writers, human
raters) per `specs/evals-spec.md` is still gated behind 1,000 WAU and not built.

## Decisions only you can make (in priority order)

1. **Open-source scope — THE blocker for everything outward.** Pick one:
   - **Full open (MIT)** — maximal trust, best for the HN launch; MIT is permanent.
   - **Privacy-paths-only open** — open the redactor + network layer + request
     shape (what proves the privacy claims), keep the engine/prompts closed. Your
     own privacy spec already contemplates this middle path.
   - **Closed.**
   My read: privacy-paths-only is the strongest trust/positioning tradeoff, but
   this is genuinely your call and it's irreversible for whatever you MIT.
2. **Review + merge `m8-rag` → `main`.** It's 14 clean commits; `git log m8-rag`.
   I did not push or open a PR — say the word and I'll open one.
3. **Rotate the API keys** you pasted (Anthropic + OpenAI). They worked and are
   stored out-of-repo in `~/.humanifyme/config.json`, but plaintext-in-chat = treat
   as exposed. Set them up in your real `.env`/keychain flow and revoke the old ones.

## Launch sequence (once #1–#3 are done) — all awaiting your go

1. Swap LICENSE to match decision #1; final pass on README/site copy.
2. `npm run build` → `npm publish` (package is publish-ready; consider adding a
   `prepublishOnly: npm run build` hook first so dist is never stale).
3. Deploy the site (Cloudflare Pages; humanifyme.com is yours) + og.png + Lighthouse.
4. Cowork + Claude Code marketplace listings.
5. Show HN (Tue/Wed morning ET). Draft below.

## Drafted collateral (DRAFTS — not posted)

**Show HN title:** `Show HN: HumanifyMe – an MCP server that rewrites AI drafts in your own voice`

**Show HN body (draft):**
> HumanifyMe is an MCP server that learns how *you* write and rewrites AI-generated
> drafts to sound like you — not like "generic human." It installs as a plugin in
> Claude Code, Cursor, Cowork, and any MCP-compatible agent.
>
> The difference from the humanizer tools: it doesn't rewrite toward a bland
> "undetectable" average. It builds a structured profile of your voice and, on each
> rewrite, retrieves your *own* most-similar past messages and writes from them.
> Everything is local-first — your writing samples and their embeddings never leave
> your machine; only the redacted draft + a few redacted examples go to the LLM
> provider you configure (your key). No backend, no telemetry.
>
> It's also honest about quality: there's an open eval harness (RAG-on vs RAG-off,
> stylometric distance + a blind LLM judge) in the repo. On my test writer, the
> retrieval version is ~37% closer to the writer's style and a blind judge prefers
> it 100% of the time. The roadmap is a public voice-fidelity benchmark anyone can
> submit to.
>
> Built it because every "humanizer" optimizes for fooling detectors; I wanted one
> that optimizes for sounding like the actual person. Feedback welcome.

**One-liner:** Make AI sound like you. Local-first, your keys, open eval.

## Open follow-ups / debt (non-blocking)

- `tasks/test-plan.md` says the outbound-HTTP scan guards `src/engine/providers/`
  but providers live in `src/providers/` — reconcile the path or add the scan.
- Bump `diff` (pre-existing prod advisory) + dev-tooling (esbuild/vite/vitest).
- MiniLM embedder is wired + lazy but only smoke-validated (installs clean on
  Node 24/Windows); full local-neural eval is a future nice-to-have.
- The public HMB bench (real writers/raters) is unbuilt by design (1,000-WAU gate).
