# Architecture

## One-paragraph summary

HumanifyMe MVP is a local MCP server (Node.js, TypeScript) that an MCP-compatible agent spawns as a subprocess and talks to over stdio. The server exposes tools (`humanify_text`, `humanify_build_profile`, etc.), resources (`humanify://profile.md`), and prompts (`/humanify`, `/build-voice-profile`) that the host agent uses to humanify drafts in the user's voice. Data lives in `~/.humanifyme/` as JSON config + a SQLite database. Outbound traffic goes only to the LLM provider the user configured. There is no backend. The same engine code powers a CLI (`humanifyme`) so power users can manage their profile without an agent.

## Block diagram (text)

```
+------------------------------------------------------------------------------+
|                              User's Machine                                  |
|                                                                              |
|   +-----------------------+    spawn stdio    +-----------------------+      |
|   |  Host agent           |<----------------> |  humanifyme-mcp       |      |
|   |  (Cowork / Claude     |   MCP protocol    |  (Node.js process)    |      |
|   |   Code / Cursor / etc)|                   |                       |      |
|   +-----------+-----------+                   |  - Tool handlers      |      |
|               |                               |  - Resources          |      |
|       calls   v                               |  - Prompts            |      |
|       humanify_text                           |                       |      |
|                                               +----+--------------+---+      |
|                                                    |              |          |
|                                                    | reads/writes |          |
|                                                    v              v          |
|                                          +---------+---+   +------+------+   |
|                                          | ~/.humanify |   |  RewriteEng |   |
|                                          | me/         |   |  (pure)     |   |
|                                          |  config.json|   +------+------+   |
|                                          |  data.db    |          |          |
|                                          +-------------+          |          |
|                                                                   |          |
|   +---------------------+                                         |          |
|   |  humanifyme CLI     |   shares engine + storage code          |          |
|   |  (Node.js process)  |---------------------------> ------------+          |
|   +---------------------+                                         |          |
+------------------------------------------------------------------|-----------+
                                                                   |
                                                                   v
                                              HTTPS to user-configured provider
                                              (Anthropic / OpenAI / Gemini / Ollama)
```

## Module layout (source tree)

```
src/
  mcp/
    server.ts           // MCP server bootstrap (stdio transport)
    registerTool.ts     // typed tool registration helper
    errors.ts           // MCP error code mapping
    tools/
      samples.ts        // humanify_add_sample, _list, _delete
      profile.ts        // humanify_get/build/update/delete_profile
      rewrite.ts        // humanify_text
      provider.ts       // humanify_set_provider, _test_key
      audit.ts          // humanify_audit_list
      wipe.ts           // humanify_wipe_all
    resources/
      profile.ts        // humanify://profile and humanify://profile.md
      audit.ts          // humanify://audit.json
    prompts/
      humanify.ts       // /humanify and presets
      buildVoiceProfile.ts
  cli/
    index.ts            // commander/citty entrypoint
    commands/
      setup.ts          // humanifyme setup
      sample.ts         // humanifyme sample add|list|rm
      profile.ts        // humanifyme profile show|edit|rm|rebuild
      provider.ts       // humanifyme provider set|test
      rewrite.ts        // humanifyme rewrite
      audit.ts          // humanifyme audit
      wipe.ts           // humanifyme wipe
  engine/
    analyze.ts          // style-analysis pipeline
    rewrite.ts          // rewrite pipeline (shared by MCP tool and CLI)
    prompts/
      styleAnalysis.ts
      rewrite.ts
      critique.ts
    providers/
      types.ts
      anthropic.ts
      openai.ts
      gemini.ts
      ollama.ts
      fake.ts
    diff.ts
    cache.ts
  privacy/
    redact.ts
    patterns.ts
    restore.ts
  storage/
    db.ts               // better-sqlite3 wrapper
    migrations/
      001_init.sql
    repositories/
      samples.ts
      profiles.ts
      cache.ts
      audit.ts
  config/
    index.ts
    schema.ts
  audit/
    index.ts
  types/
    profile.ts
    sample.ts
    rewrite.ts
bin/
  humanifyme-mcp        // shebang -> dist/humanifyme-mcp.mjs
  humanifyme            // shebang -> dist/humanifyme.mjs
plugin/                 // built by `npm run build:plugin`
  plugin.json
  mcp/server.json
  skills/
    humanify/
    build-voice-profile/
    humanify-pr/
```

## How data flows through a rewrite

1. The user is in Claude Code / Cowork / Cursor and asks the agent to write a PR description.
2. The host agent's `humanify-pr` skill recognizes the context and decides to call `humanify_text` after generating the draft.
3. The agent sends an MCP `tools/call` for `humanify_text` with `{ draft, contextLabel: 'professional', directives: ['more_like_me', 'shorter'] }`.
4. The MCP server's `humanify_text` handler validates input (zod), looks up the current profile from SQLite, merges base + context-variant fingerprint, redacts the draft, builds the prompt, calls the configured `LLMProvider`, validates output length, restores redaction placeholders, computes the diff, appends an audit entry, returns the response.
5. The host agent renders the rewrite to the user, with the before/after diff if it supports rich tool output.
6. The user reviews and posts, edits, or asks for another directive.

## Threading and lifecycle

- The MCP server runs as a single Node process per host-agent session. The host spawns it on startup and kills it on shutdown.
- `better-sqlite3` is synchronous, fine for a single-process server with at most a handful of concurrent tool calls.
- The CLI process is short-lived. It opens the DB, does its work, closes.
- Multiple CLI invocations + a running MCP server coexist; SQLite handles the locking. Don't issue long write transactions.

## What we did not pick

- **A Chrome extension** (pivoted away on 2026-06-03; see open-questions Q-01 history).
- **A backend** (rejected for MVP, see `specs/backend-spec.md`).
- **A local model bundled inside the MCP** (rejected, Ollama covers the use case via the provider abstraction).
- **An HTTP-mode MCP from day one** (deferred, stdio first, hosted variant later for browser-only agents).

## Performance budgets

- Cold start (`npx -y humanifyme-mcp`): ≤ 1.5s on a midrange laptop.
- Warm tool call overhead (after start, excluding LLM): ≤ 50ms.
- Memory: ≤ 80MB resident.
- Single-binary size: ≤ 30MB unpacked.

## Observability

- Audit log (local, content-free).
- Debug logging behind `HUMANIFYME_DEBUG=1` env var (default off; never includes content).
- Opt-in error reporting (default off) via a configurable sink.
