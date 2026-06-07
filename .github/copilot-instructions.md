# GitHub Copilot instructions for HumanifyMe

Copilot, when suggesting code in this repository, follow these rules. They are stricter than typical defaults because HumanifyMe handles personal writing samples and runs inside the user's AI agents.

## Product context

HumanifyMe is an **MCP server** (Node.js, TypeScript) that an MCP-compatible agent (Cowork, Claude Code, Cursor, Continue, Cline, Windsurf, Zed, ChatGPT desktop) spawns as a local subprocess and talks to over stdio. It exposes tools like `humanify_text`, `humanify_build_profile`, and `humanify_get_profile`. Storage is local in `~/.humanifyme/` (config + SQLite). Only the structured style profile and the draft being rewritten are sent to an LLM provider.

It is **NOT** a Chrome extension. Do not suggest `chrome.runtime`, MV3 manifest, content scripts, popup HTML, or DOM injection.

## Hard constraints — do not suggest code that violates these

1. **No network calls that send raw user samples.** The only outbound payloads allowed are: (a) the structured style profile JSON, (b) the current draft to rewrite, (c) the rewrite directive. Anything else is a bug.
2. **No outbound destinations other than the configured LLM providers.** No analytics endpoints, no usage reporters, no auto-update pings.
3. **No file watchers, no clipboard listeners, no global hotkey hooks.** The MCP is passive until an agent calls a tool.
4. **No filesystem reads/writes outside `~/.humanifyme/`** (plus `$EDITOR` temp files for `profile edit`).
5. **No analytics SDKs by default.** If telemetry is needed, gate it behind an opt-in config flag and document in `specs/privacy-security-spec.md`.
6. **No direct provider SDK imports outside `src/engine/providers/`.** Use the `LLMProvider` interface.
7. **Always run the redactor** (`src/privacy/redact.ts`) before sending any text to an LLM.
8. **No subprocess spawning** other than the user's `$EDITOR` (and only when `humanifyme profile edit` is invoked).

## Stylistic preferences

- TypeScript strict mode. Prefer `unknown` over `any`.
- `zod` for runtime validation of MCP tool inputs and LLM responses.
- Functions over classes for stateless logic.
- Tests live next to source files as `*.test.ts`.
- `better-sqlite3` or `bun:sqlite` for the local database. No ORM unless complexity demands it.
- `@modelcontextprotocol/sdk` for the MCP transport — do not roll our own protocol.

## Files Copilot should be especially careful in

- Anything under `src/engine/` — this is the prompt and provider boundary. Suggestions here have the biggest blast radius.
- Anything under `src/mcp/` — tool handlers cross the agent boundary. Validation is non-negotiable.
- `src/privacy/redact.ts` — regression here leaks PII.
- `src/config/` — handles API keys. No logs that include key values.

## When to push back

If the developer asks for a feature that would violate the constraints above, surface the conflict instead of generating the code. Point them at `specs/privacy-security-spec.md`.
