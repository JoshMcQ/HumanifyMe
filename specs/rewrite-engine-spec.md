# Rewrite Engine Spec

## Purpose

The rewrite engine takes a draft, a `StyleProfile`, a context label, and a set of directives, and returns text rewritten in the user's voice.

## Inputs

```ts
interface RewriteRequest {
  draft: string;                   // raw user text or AI-generated text, max 8,000 chars
  profile: StyleProfile;           // see style-profile-spec.md
  contextLabel: ContextLabel;      // one of the 9 labels
  directives: Directive[];         // 0..N
  providerHint?: 'openai' | 'anthropic'; // optional override
}

type Directive =
  | 'more_like_me'         // default if no others; sharpens voice match
  | 'more_professional'    // raises formality by 1
  | 'less_aggressive'      // lowers directness, removes strong words
  | 'shorter'              // target ~70% of draft length
  | 'warmer'               // adds personal markers, more relational
  | 'more_direct';         // raises directness, removes hedging
```

## Outputs

```ts
interface RewriteResponse {
  rewrite: string;
  diff: DiffSegment[];             // for the before/after view
  notes?: string;                  // optional engine note ("kept your closing line as-is")
  providerLatencyMs: number;
  tokens: { input: number; output: number };
  redactionApplied: boolean;       // true if redactor masked anything in the draft
}

interface DiffSegment {
  type: 'unchanged' | 'added' | 'removed';
  text: string;
}
```

## Pipeline

```
draft
  -> validate length, reject if >8000 chars
  -> redact(draft) -> { redactedDraft, redactionMap }
  -> mergeFingerprint(profile.base, profile.contexts[contextLabel]?.overrides)
  -> retrieve(redactedDraft) -> exemplars[]   // RAG voice stage (M8); see RetrievalConfig
       // embed(redactedDraft) with the local MiniLM model
       // cosine search over sample_embeddings -> candidates
       // MMR (lambda) + drop near-dups (cosine > dedupCosine) -> top-K
       // redact() each retrieved exemplar at send time
       // any retrieval error or cold-start -> exemplars = [], fall back to profile-only
  -> build system prompt from prompts/rewrite-prompt.md (+ retrieved exemplars section)
  -> build user prompt from redactedDraft + directives
  -> call LLMProvider.complete(...)
  -> validate output: non-empty, length within bounds (50–250% of draft)
  -> reinsert redaction placeholders (restore the original emails / phones, etc.)
  -> compute diff vs. original draft
  -> return RewriteResponse
```

## Retrieval (RAG voice) — M8

The retrieval stage makes the engine pull the user's *actual* most-similar past writing and hand it to the model as the primary voice signal, instead of relying only on the static profile. It runs entirely on-device for the embedding step.

Retrieved exemplars are rendered into a new prompt section titled **"Examples of how this person actually writes — most similar to your draft"**, presented to the model as targets to emulate. They become the **primary** voice signal. The static `profile.exemplars` are demoted to a **cold-start fallback only** (used when retrieval returns `[]`). The structured fingerprint (`mergeFingerprint` output) remains the structural style spec and is never displaced by retrieval.

### RetrievalConfig

Configuration lives under a `rag.*` namespace.

```ts
interface RetrievalConfig {
  enabled: boolean;        // rag.enabled — master switch (default true)
  minSamples: number;      // rag.minSamples — cold-start gate (default 5)
  topK: number;            // rag.topK — final exemplars injected (default 5)
  mmrLambda: number;       // rag.mmrLambda — MMR relevance/diversity tradeoff (default 0.7)
  dedupCosine: number;     // rag.dedupCosine — drop near-dups above this cosine (default 0.97)
}
```

- **Embedding model:** `all-MiniLM-L6-v2` (384-dim), run locally and offline via transformers.js/ONNX. Weights are cached in `~/.humanifyme/models/`. No user content leaves the device for the embedding step.
- **Keying strategy:** semantic cosine similarity over the MiniLM embeddings, with **recency as the tiebreaker** when scores are close. (Style-distance embeddings are a future Phase-2 upgrade, not MVP.)
- **Diversity:** Maximal Marginal Relevance with `mmrLambda` (~0.7), dropping near-duplicates above `dedupCosine` (0.97), then taking the top `topK` (5).
- **Cold-start fallback:** retrieval is active only when the user has `>= minSamples` (default 5) embedded samples. Below the threshold, retrieval returns `[]`, the engine falls back to profile-only behavior, and a `notes` hint suggests importing chat history to enrich the voice corpus.
- **Graceful degradation:** any retrieval error (model load failure, embedding error, search failure) is non-fatal — retrieval returns `[]` and the rewrite proceeds profile-only. Retrieval must never block or fail a rewrite.

Embeddings are computed from **raw** sample text locally (so similarity reflects the true writing), but every retrieved exemplar passes through `redact()` at **send time**, before prompt assembly. Meaning-preservation constraints (numbers like `258`, URLs, placeholders) are left intact so the existing output verification still passes.

See `docs/open-questions.md` Q-18–Q-22 (open retrieval decisions) and `docs/data-model.md` (migration 002, table `sample_embeddings`).

## Output verification (deterministic quality gate)

After the model returns, the engine runs a set of **deterministic** checks against the (redacted) draft and the fingerprint. These are mechanical guarantees, not prompt hopes: if any fire on the first attempt, the engine retries once with targeted feedback; if they still fire after the retry, the rewrite is returned with a `notes` warning rather than silently shipped. Implemented in `src/engine/verify.ts`.

Checks:

- **Banned words** — flag any word in `fingerprint.wordsToAvoid` the model *introduced* (a banned word already in the draft is a meaning question, not a violation).
- **Numbers** — every digit-bearing token in the draft must survive verbatim (dates, prices, versions, issue numbers).
- **URLs** — must survive byte-for-byte.
- **Redaction placeholders** — `[EMAIL_1]` etc. must survive so `restore()` can reinsert real values.
- **Casing / register adherence** — the rewrite must match the writer's *learned* capitalization, never a hardcoded default. Casing is a learned fingerprint dimension (`capitalization.{sentenceCase, titleCase, allLowercase}`), so the engine must not normalize toward any house style:
  - If `allLowercase` is true, the rewrite must not re-introduce sentence-case capitalization.
  - If the writer uses normal sentence case (`allLowercase` false and `sentenceCase` true), the rewrite must not be flattened to all-lowercase.
  - Measured by the **sentence-initial capitalization rate**, requiring a clear majority *and* at least two offending sentence-starts before flagging, so a single proper-noun or acronym start is never a false positive. Grammar/formality beyond casing (contractions, punctuation) remains fingerprint-driven in the prompt; only casing is mechanically gated because only casing is unambiguously checkable.

## Length policy

- If `shorter` directive: target 60–80% of draft length. Reject and retry once if >95%.
- If no length directive: rewrite must be 70–130% of draft length. Outside this band, retry once with a length reminder.
- If still out of band on retry, return the rewrite anyway and surface a `notes` warning.

## Directive interaction rules

- `more_professional` and `warmer` can coexist (warm-but-professional).
- `more_direct` and `less_aggressive` contradict; if both present, `less_aggressive` wins and we add a `notes` warning.
- `more_like_me` is implied when no directive is selected.
- `shorter` stacks with anything.

## Provider abstraction

```ts
interface LLMProvider {
  name: 'openai' | 'anthropic' | 'gemini' | 'local';
  complete(args: {
    system: string;
    user: string;
    maxTokens: number;
    temperature: number;
    responseFormat?: 'text' | 'json';
  }): Promise<{ text: string; inputTokens: number; outputTokens: number; latencyMs: number }>;
}
```

MVP implements **one** provider (Anthropic is the recommended default — see below). The interface is the abstraction boundary; do not let provider-specific concepts (function calling, JSON mode flags) leak past it.

### Why Anthropic as the MVP default

- Strong stylistic fidelity for rewrites and tone shifts in our testing assumption space; Claude is the brand most often cited for "less obviously AI" prose.
- Good system-prompt adherence, which matters because the entire profile is in the system prompt.
- Aligned brand positioning (privacy-leaning).

OpenAI remains the next provider to add. The user can pick in settings if both are configured.

## Temperature

- Style analysis: `temperature = 0.2`. We want consistent profiles, not creative ones.
- Rewrite: `temperature = 0.6`. Some creativity, but not enough to wander off the voice.
- Critique (post-MVP): `temperature = 0`.

## Token budget per rewrite

| Piece              | Approx tokens |
| ------------------ | ------------- |
| System (prompt + profile) | 1,200–2,500 |
| Retrieved exemplars (~5, RAG) | 500–800 |
| User (directives + draft) | 100–2,000   |
| Output             | up to 2,500    |
| **Total**          | < 7,000        |

The total system prompt (fingerprint + retrieved exemplars) must stay under ~4,000 tokens. If it goes over budget, trim retrieved exemplars first (drop lowest-ranked, then fewer of them) — never trim the fingerprint.

If profile + draft exceed budget, trim profile exemplars first (lowest-priority field), then fail with a clear error before truncating the draft.

## Caching

- Cache by hash of `(profileHash, contextLabel, directives, draft)`. TTL: 24h. Stored in `~/.humanifyme/data.db` (table `rewrite_cache`). Capped at 50 entries (LRU).
- Cache hit short-circuits the provider call. Useful for "show me again" and for cheap iteration on directives.

## Failure behavior

| Failure                    | Behavior                                                              |
| -------------------------- | --------------------------------------------------------------------- |
| Provider 401 (bad key)     | Surface "API key invalid" in UI, link to options page. Do not retry.  |
| Provider 429 (rate limit)  | Exponential backoff, max 2 retries (1s, 4s). Then surface error.      |
| Provider 5xx               | Single retry with 2s delay. Then surface error.                       |
| Output empty               | Single retry with stricter prompt. Then surface error.                |
| Output trips length bound  | Single retry. Then return with warning.                               |
| Network offline            | Surface "offline" immediately, no retry.                              |

## What the engine must not do

- Do not call the provider with the draft if redaction reduced it to empty.
- Do not store the rewrite anywhere persistent (the user can copy it). The diff view is in-memory only.
- Do not log the draft or rewrite content. Log only metadata (length, latency, directive set, provider, success/failure).
- Do not introduce new directives via the LLM — the directive set is closed and known.
- Do not send raw (un-redacted) retrieved samples to the provider — every retrieved exemplar passes through `redact()` at send time.
- Do not let retrieval block or fail a rewrite — any retrieval error degrades gracefully to profile-only.
- Do not surface embeddings (or the `sample_embeddings` rows) as editable profile fields — they are a derived index, not user-facing voice settings.

## Testability

Provide a `FakeLLMProvider` for tests that returns deterministic strings based on input. All pipeline stages are pure functions and unit-tested without filesystem or MCP transport.

## Where the engine lives

The engine module is shared between (a) the MCP tool handlers and (b) the CLI. There is exactly one rewrite pipeline implementation. The MCP tool layer is a thin adapter that validates input via zod and calls into the engine.
