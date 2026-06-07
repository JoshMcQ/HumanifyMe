# Instructions for Claude Code working in this repo

You are working on **HumanifyMe**, an MCP server (Node.js, TypeScript) that learns a user's writing voice and rewrites AI-generated drafts in that voice. It installs as a plugin in Cowork, Claude Code, Cursor, and every other MCP-compatible agent. This file is the source of truth for how to behave inside this repository.

## Hard rules

1. **Do not start coding without checking the spec gate.** Before writing or modifying any application code, confirm that `tasks/milestones.md` shows Milestone 0 (specs) as complete and that the task you are about to work on exists in `tasks/task-breakdown.md` with explicit acceptance criteria. If it does not, stop and update the spec or task file first.
2. **One task at a time.** Pick a single task from `tasks/task-breakdown.md`, complete it end-to-end (code + tests + AC verification), then stop and report. Do not chain multiple tasks without checking in.
3. **Respect the privacy model in `specs/privacy-security-spec.md`.** Raw user writing samples are local-first. The MCP server only reads/writes `~/.humanifyme/` and only sends data to the configured LLM provider. Never add code that sends raw samples elsewhere, logs raw samples, or persists samples outside `~/.humanifyme/data.db`.
4. **Do not introduce a backend in MVP.** Milestones 1–5 are MCP-only. A backend appears in Milestone 6+ only and only if `specs/backend-spec.md` justifies it.
5. **Do not fine-tune models.** MVP uses prompt engineering + structured style profiles only. If you think fine-tuning is needed, write the case in `docs/open-questions.md` rather than implementing it.
6. **Do not silently monitor.** The MCP server only acts when an agent calls one of its tools. No file watching, no clipboard listening, no agent-output observation outside opted-in auto-humanify hooks.
7. **This is NOT a Chrome extension.** Joshua pivoted from the original extension spec to MCP-only on 2026-06-03. If you find yourself writing `chrome.runtime`, `MutationObserver`, content scripts, or site adapters, stop — you're in the wrong project mental model. Re-read `specs/mcp-server-spec.md` and `specs/plugin-spec.md`.

## Workflow for every task

For each task in `tasks/task-breakdown.md`:

1. Re-read the linked spec section.
2. Restate the objective and acceptance criteria in the PR/commit message.
3. Implement.
4. Write or update tests (see `tasks/test-plan.md`).
5. Verify every acceptance criterion. Do not mark the task done if any AC fails.
6. If you discover the spec is wrong or incomplete, **update the spec first** and surface the change. Do not silently work around it.
7. If you discover a new question, add it to `docs/open-questions.md`.

## What "done" means

A task is done when:

- All acceptance criteria pass.
- Tests required by `tasks/test-plan.md` pass.
- No new entries in `docs/risks.md` are unaddressed.
- The change does not violate `specs/privacy-security-spec.md`.

## Style and tone in product copy

HumanifyMe's product copy must not itself sound like generic AI. Avoid: "seamless," "supercharge," "unlock," "leverage," "empower," "delight," "world-class." If you write product copy, run it through the rewrite engine before shipping. See `prompts/critique-prompt.md`.

## When in doubt

Ask the user. Do not guess at product decisions. Do not guess at privacy tradeoffs. Add the question to `docs/open-questions.md` and surface it.

## What lives where

| Question you have                          | File to read                                  |
| ------------------------------------------ | --------------------------------------------- |
| What is this product?                      | `specs/product-spec.md`                       |
| What ships first?                          | `specs/mvp-spec.md`                           |
| What does the MCP server look like?        | `specs/mcp-server-spec.md`                    |
| How is it packaged as a plugin?            | `specs/plugin-spec.md`                        |
| What can I build right now?                | `tasks/task-breakdown.md`                     |
| How is data stored?                        | `docs/data-model.md`                          |
| What's the MCP tool contract?              | `docs/api-contract.md`                        |
| What can the LLM be prompted to do?        | `prompts/`                                    |
| What must I never do?                      | `specs/privacy-security-spec.md`              |
| What are we explicitly not building yet?   | `specs/mvp-spec.md` → "Out of scope for MVP"  |
