# Instructions for coding agents

This file applies to any autonomous coding agent (Claude Code, Copilot Workspace, Cursor agents, Aider, etc.) operating in this repo. Claude Code should also read `CLAUDE.md`. GitHub Copilot should also read `.github/copilot-instructions.md`.

## The repo is spec-driven

Code follows specs. Specs do not follow code. If you are about to write code that disagrees with a spec, you must either:

1. Update the spec and explain why, **before** writing the code, or
2. Pick a different task.

## What this project is (read carefully)

HumanifyMe is an **MCP server** (Node.js / TypeScript) that exposes tools like `humanify_text`, `humanify_build_profile`, etc., consumed by host agents (Cowork, Claude Code, Cursor, Continue, Cline, Windsurf, Zed, ChatGPT desktop). It is distributed as a plugin in Cowork's and Claude Code's plugin marketplaces and via one-line install snippets for other agents.

It is **NOT** a Chrome extension. If you write `chrome.runtime`, `manifest.json`, content scripts, popup HTML, or site adapters, you are in the wrong mental model. Re-read `specs/mcp-server-spec.md`.

## Pick-up rules

1. Read `tasks/task-breakdown.md`. Pick the **lowest-numbered unblocked task** unless instructed otherwise.
2. Confirm its `blockedBy` dependencies are complete.
3. Open the linked spec section and acceptance criteria.
4. Implement, test, verify, report.
5. Do not pick up a second task until the first is fully done and reported.

## Boundaries (non-negotiable)

- **Local-first.** Raw writing samples live in `~/.humanifyme/data.db` and never leave the user's machine in MVP. Only the *generated style profile* (structured JSON, no raw text) and the draft being rewritten may be sent to the LLM provider.
- **Explicit invocation.** The MCP server only acts when an agent calls one of its tools. No file watching, no clipboard listening, no agent-output observation outside opted-in auto-humanify hooks defined in `specs/mcp-server-spec.md`.
- **No silent telemetry.** Any analytics must be off by default and described in `specs/privacy-security-spec.md`.
- **Provider abstraction.** All LLM calls go through the `LLMProvider` interface. Do not call provider SDKs directly from tool handlers.
- **No fine-tuning in MVP.**
- **Redaction.** Before any sample or draft is sent to an LLM, run the redactor described in `specs/privacy-security-spec.md`. Implementation gap is acceptable in early milestones only if the task lists it as a known limitation.
- **Only filesystem paths under `~/.humanifyme/`** (and `$EDITOR` temp files for `profile edit`). Any other path is a bug.
- **Only outbound network destinations:** configured LLM providers. Anything else is a bug.

## Coding standards

- TypeScript strict mode.
- ESLint + Prettier. No `any` unless justified in a comment.
- Vitest for unit tests.
- Functions over classes unless state truly belongs together.
- Pure functions for anything in the rewrite/style-profile pipeline so it can be tested without filesystem or MCP transport.
- zod for runtime validation of every external surface (MCP tool inputs, LLM responses, config file).

## Commit and PR conventions

- One task per PR.
- PR title: `[T-NN] <task subject>` matching the ID in `tasks/task-breakdown.md`.
- PR body must include: objective, acceptance criteria checklist (every box checked), tests run, and a "privacy impact" note (even if "none").

## What to do when you are stuck

Do not invent a product decision. Add the question to `docs/open-questions.md` and stop. The user will resolve it.
