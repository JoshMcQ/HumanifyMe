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
  -> build system prompt from prompts/rewrite-prompt.md
  -> build user prompt from redactedDraft + directives
  -> call LLMProvider.complete(...)
  -> validate output: non-empty, length within bounds (50–250% of draft)
  -> reinsert redaction placeholders (restore the original emails / phones, etc.)
  -> compute diff vs. original draft
  -> return RewriteResponse
```

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
| User (directives + draft) | 100–2,000   |
| Output             | up to 2,500    |
| **Total**          | < 7,000        |

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

## Testability

Provide a `FakeLLMProvider` for tests that returns deterministic strings based on input. All pipeline stages are pure functions and unit-tested without filesystem or MCP transport.

## Where the engine lives

The engine module is shared between (a) the MCP tool handlers and (b) the CLI. There is exactly one rewrite pipeline implementation. The MCP tool layer is a thin adapter that validates input via zod and calls into the engine.
