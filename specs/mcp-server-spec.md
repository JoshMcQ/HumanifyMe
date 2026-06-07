# MCP Server Spec

HumanifyMe is delivered primarily as an MCP server. This document defines the server, its tools, its config, and its runtime.

## What it is

A local Model Context Protocol server (Node.js, TypeScript) that an MCP-compatible agent — Cowork, Claude Code, Cursor, Continue, Cline, Windsurf, Zed, ChatGPT desktop, and anything else that speaks MCP — spawns as a subprocess and talks to over stdio. The server exposes a small set of tools the agent can call when it wants its own output rewritten in the user's voice.

## Why an MCP server (and not a Chrome extension)

The user's drafts increasingly originate from agents, not from human typing into a webmail composer. A developer using Claude Code asks the agent to write a commit message, a PR description, a Slack post-mortem, or an email; the agent produces it; the user pastes it. Every one of those steps is an opportunity to humanify *before the human ever sees the text*, which is a strictly better UX than rewriting after the fact.

MCP also gives us:

- **One distribution surface, many agent integrations.** Build the tools once; every MCP-compatible agent gets the feature.
- **A privacy story that's better than the extension.** No host permissions, no DOM access on any third-party page, no content scripts running on pages the user didn't ask for.
- **Programmatic composability.** The agent can call `humanify_text` mid-workflow ("draft a PR, humanify it, then post it via the GitHub MCP").
- **Local-first by construction.** stdio MCP servers run on the user's machine. There is no server we control.

## Distribution

- `npm i -g humanifyme` installs the binary `humanifyme-mcp`.
- `npx -y humanifyme` is the zero-install path some agents prefer.
- Cowork plugin marketplace and Claude Code plugin marketplace as the curated install paths (see `specs/plugin-spec.md`).
- Self-host via `git clone` and `npm link` for power users.

## Runtime

- Node ≥ 20.
- Single binary entrypoint that speaks MCP over stdio.
- No daemons, no background processes.
- One JSON config file at `~/.humanifyme/config.json` (overridable via `HUMANIFYME_HOME`).
- One SQLite database at `~/.humanifyme/data.db` for samples, profile, cache, audit log.
- LLM provider API keys stored either inline in `config.json` (default) or pulled from the OS keychain on macOS/Windows when available.

We use SQLite instead of IndexedDB because we are no longer in a browser. SQLite gives us schema migrations, queryable indices, and a single-file backup story.

## Tools the MCP exposes

All tools accept and return JSON. Schemas are zod-validated. Names follow the convention `humanify_*` to namespace cleanly when multiple MCPs are installed.

### `humanify_text`

```ts
input: {
  draft: string;                    // required, 1..8000 chars
  contextLabel?: ContextLabel;      // defaults to the agent's running context if set, else "email"
  directives?: Directive[];         // defaults to ["more_like_me"]
  provider?: 'anthropic' | 'openai' | 'gemini' | 'ollama'; // overrides the configured default
}
returns: {
  rewrite: string;
  diff: DiffSegment[];
  notes?: string;
  providerLatencyMs: number;
  tokens: { input: number; output: number };
  redactionApplied: boolean;
}
```

This is the only tool 95% of users will care about. The agent gives us its draft; we hand back a humanified version.

### `humanify_add_sample`

```ts
input: { text: string; labels: ContextLabel[] }   // text >= 100 chars, labels >= 1
returns: { id: string }
```

### `humanify_list_samples`

```ts
input: { label?: ContextLabel }
returns: { samples: SampleRecord[] }  // preview-truncated text to 200 chars
```

### `humanify_delete_sample`

```ts
input: { id: string }
returns: { id: string }
```

### `humanify_get_profile`

```ts
input: {}
returns: { profile: StyleProfile | null }
```

### `humanify_build_profile`

Long-running. Streams progress via MCP progress notifications.

```ts
input: { force?: boolean }   // force=true even if profile is recent
returns: { profile: StyleProfile }
```

### `humanify_update_profile`

```ts
input: { profile: StyleProfile }
returns: { profile: StyleProfile }
```

### `humanify_delete_profile`

```ts
input: {}
returns: { deleted: true }
```

### `humanify_set_provider`

```ts
input: { provider: 'anthropic' | 'openai' | 'gemini' | 'ollama'; apiKey?: string; baseUrl?: string }
returns: { provider: string; valid: boolean }
```

`baseUrl` lets the user point Ollama or a self-hosted OpenAI-compatible endpoint at a custom address.

### `humanify_test_key`

```ts
input: { provider?: 'anthropic' | 'openai' | 'gemini' | 'ollama' }
returns: { valid: boolean; provider: string }
```

A cheap ping (≤ 1 token) to confirm the configured key works.

### `humanify_audit_list`

```ts
input: { limit?: number }   // default 20, max 100
returns: { entries: AuditEntry[] }
```

### `humanify_wipe_all`

Destructive. Confirmation pattern: the tool requires `confirm: 'DELETE EVERYTHING'` as a literal string.

```ts
input: { confirm: 'DELETE EVERYTHING' }
returns: { wiped: true }
```

## Resources

MCP supports "resources" the agent can read. We expose:

- `humanify://profile` — current profile as JSON.
- `humanify://profile.md` — plain-English profile summary.
- `humanify://audit.json` — recent audit entries.

These let the agent reason about the profile without calling a tool ("the user prefers em-dashes, so I'll keep this one").

## Prompts

MCP supports "prompts" surfaced to the user. We register:

- `humanify` — quick rewrite. Input: draft.
- `humanify-warmer` — preset with `warmer` + `more_like_me`.
- `humanify-shorter` — preset with `shorter` + `more_like_me`.
- `humanify-direct` — preset with `more_direct` + `more_like_me`.
- `build-voice-profile` — kicks off `humanify_build_profile`.

Users in Cowork / Claude Code can invoke these as slash commands.

## Auto-rewrite hooks (opt-in)

Some agents support output hooks. Where they do, HumanifyMe can register an `on_agent_text_output` hook that automatically calls `humanify_text` on the agent's final assistant message before it's shown. This is **off by default**. It is the most powerful and the most dangerous feature, so it requires:

- An explicit `autoHumanify: true` in `~/.humanifyme/config.json`.
- A per-agent allowlist (`autoHumanifyAgents: ['cowork', 'claude-code']`).
- A per-tool denylist for outputs that must remain untouched (code blocks, JSON tool calls, etc.).
- A visible status indicator in the agent UI ("HumanifyMe is auto-rewriting your agent's output").

Implementation depends on the host agent's hook API and is rolled out per-agent.

## Configuration file

```jsonc
{
  "version": 1,
  "defaultProvider": "anthropic",
  "providers": {
    "anthropic": { "apiKey": "sk-ant-...", "model": "claude-sonnet-4-6" },
    "openai":    { "apiKey": "sk-...",     "model": "gpt-4o" },
    "gemini":    { "apiKey": "...",        "model": "gemini-1.5-pro" },
    "ollama":    { "baseUrl": "http://localhost:11434", "model": "llama3.2:3b" }
  },
  "redactionPatterns": ["default"],
  "rateLimitPerDay": 200,
  "autoHumanify": false,
  "autoHumanifyAgents": [],
  "errorReporting": false,
  "telemetry": false
}
```

Sensitive values (`apiKey`) are written to disk with `0600` perms on POSIX. On Windows we set ACLs to the current user only. On macOS we try the keychain first; fall back to file with a logged warning.

## Error model

Tool errors return MCP-standard error responses with our error codes (from `docs/api-contract.md`): `BAD_INPUT`, `MISSING_API_KEY`, `INVALID_API_KEY`, `RATE_LIMITED`, `PROVIDER_ERROR`, `NETWORK`, `OUTPUT_INVALID`, `EMPTY_AFTER_REDACTION`, `OVER_LENGTH_CAP`, `RATE_LIMITED_LOCAL`.

## Performance budgets

- Cold start (`npx -y humanifyme`): ≤ 1.5s on a midrange laptop.
- Warm tool call overhead (after start, excluding LLM): ≤ 50ms.
- Memory: ≤ 80MB resident.
- Single-binary size: ≤ 30MB unpacked.

## Versioning

Semantic versioning. Tool schemas are part of the public surface; breaking changes go in a major bump and ship with a migration note in the release. We freeze the tool names listed above as v1.0.

## Out of scope for MVP

- Multi-tenant: a single MCP server instance per OS user. No "switch user" concept.
- Multiple profiles per user (work / personal). Resolves to a single `~/.humanifyme/` directory; multi-profile is a v1.1 feature.
- Cloud sync. Local-only in MVP. Future hosted variant in `specs/backend-spec.md`.
- Streaming token-by-token rewrite output. Useful but adds complexity; defer.
- A web dashboard at humanifyme.com. The landing page exists, but the management UI is CLI-first in MVP. See `specs/onboarding-spec.md` for what we do instead.
