# API Contract

There is no remote API in MVP. This document defines the **MCP tool contract** the server exposes and the host agent consumes. When a backend eventually exists, its REST API will mirror these shapes.

## Transport

MCP over stdio (`@modelcontextprotocol/sdk`). The host agent spawns `humanifyme-mcp` and exchanges JSON-RPC over stdin/stdout per the MCP spec.

## Tools

Every tool has a zod-validated input schema and output schema. Tool names use the `humanify_*` prefix. Inputs are required unless `?`. Outputs always include `ok: true` on success; errors come back as standard MCP tool errors with our error codes.

### `humanify_text`

The headline tool. Rewrites a draft in the user's voice.

Input:
```ts
{
  draft: string;                       // 1..8000 chars
  contextLabel?: ContextLabel;         // default 'email'
  directives?: Directive[];            // default ['more_like_me']
  provider?: 'anthropic' | 'openai' | 'gemini' | 'ollama'; // overrides default
}
```

Output:
```ts
{
  rewrite: string;
  diff: DiffSegment[];
  notes?: string;
  providerLatencyMs: number;
  tokens: { input: number; output: number };
  redactionApplied: boolean;
}
```

### `humanify_add_sample`
- In: `{ text: string; labels: ContextLabel[] }` — `text.length >= 100`, `labels.length >= 1`.
- Out: `{ id: string }`.

### `humanify_list_samples`
- In: `{ label?: ContextLabel }`.
- Out: `{ samples: SampleRecord[] }` — `text` truncated to 200 chars in previews.

### `humanify_delete_sample`
- In: `{ id: string }`.
- Out: `{ id: string }`.

### `humanify_get_profile`
- In: `{}`.
- Out: `{ profile: StyleProfile | null }`.

### `humanify_build_profile`
Long-running. Streams progress notifications via the MCP SDK's progress channel.
- In: `{ force?: boolean }`.
- Out: `{ profile: StyleProfile }`.
- Progress events:
  ```ts
  { stage: 'redacting'; processed: number; total: number }
  | { stage: 'calling_llm' }
  | { stage: 'validating' }
  | { stage: 'persisting' }
  ```

### `humanify_update_profile`
- In: `{ profile: StyleProfile }` — schema-validated.
- Out: `{ profile: StyleProfile }`.

### `humanify_delete_profile`
- In: `{}`.
- Out: `{ deleted: true }`.

### `humanify_set_provider`
- In: `{ provider: 'anthropic'|'openai'|'gemini'|'ollama'; apiKey?: string; baseUrl?: string; model?: string }`.
- Out: `{ provider: string; valid: boolean }`.

### `humanify_test_key`
A ≤ 1-token ping to confirm the configured key works.
- In: `{ provider?: 'anthropic'|'openai'|'gemini'|'ollama' }`.
- Out: `{ valid: boolean; provider: string }`.

### `humanify_audit_list`
- In: `{ limit?: number }` — default 20, max 100.
- Out: `{ entries: AuditEntry[] }`.

### `humanify_wipe_all`
Destructive.
- In: `{ confirm: 'DELETE EVERYTHING' }` — literal string required.
- Out: `{ wiped: true }`.

## Resources

The MCP exposes these resources, consumable via the standard `resources/read` request.

| URI                       | MIME            | What                                                      |
| ------------------------- | --------------- | --------------------------------------------------------- |
| `humanify://profile`      | `application/json` | Current `StyleProfile` JSON.                            |
| `humanify://profile.md`   | `text/markdown` | Plain-English summary of the profile (for users + agents). |
| `humanify://audit.json`   | `application/json` | Last 20 audit entries (no content).                     |

Resource subscriptions notify the host when the underlying data changes (e.g., a `humanify_update_profile` call invalidates `humanify://profile`).

## Prompts

The MCP registers these prompts (surfaced as slash commands or quick actions in supported hosts):

| Name                  | Description                              | Inputs                  |
| --------------------- | ---------------------------------------- | ----------------------- |
| `humanify`            | Quick rewrite of the supplied draft.     | `draft: string`         |
| `humanify-warmer`     | Preset: warmer + more_like_me.           | `draft: string`         |
| `humanify-shorter`    | Preset: shorter + more_like_me.          | `draft: string`         |
| `humanify-direct`     | Preset: more_direct + more_like_me.      | `draft: string`         |
| `build-voice-profile` | Walks the user through profile creation. | (none)                  |

## Error codes

Closed set, returned in MCP tool error responses' `data.code` field:

- `BAD_INPUT` — input failed schema validation. Not retryable.
- `MISSING_CONSENT` — `consentAcceptedAt` is unset; user must run `humanifyme setup` or accept via the host. Not retryable until consent is given.
- `MISSING_API_KEY` — no API key configured for the requested provider. Not retryable.
- `INVALID_API_KEY` — provider returned 401. Not retryable.
- `RATE_LIMITED` — provider returned 429. Retryable.
- `PROVIDER_ERROR` — provider returned 5xx. Retryable.
- `NETWORK` — fetch failed. Retryable.
- `OUTPUT_INVALID` — JSON schema validation failed on LLM output. Retryable (once).
- `EMPTY_AFTER_REDACTION` — redactor produced empty input. Not retryable.
- `OVER_LENGTH_CAP` — input exceeds 8,000 chars. Not retryable.
- `RATE_LIMITED_LOCAL` — exceeded local daily rate limit. Not retryable today.

Every error response also includes a human-readable `message` field. We do not leak stack traces.

## Versioning

Tool names + input/output schemas listed above are the v1 public surface. Breaking changes are major bumps with a migration note. We do not silently rename tools.

## When the backend appears (future)

The future `humanifyme.com/api/v1` mirrors the MCP tool contract as HTTP endpoints. `POST /v1/humanify_text` has the same input/output as the MCP tool. This keeps the engine and validation reusable across local stdio MCP, HTTP MCP, and the REST API.
