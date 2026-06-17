# HumanifyMe

**Make AI sound like you.**

HumanifyMe is an MCP server that learns how you actually write and rewrites your AI agent's output in your authentic voice. It installs as a plugin in Cowork, Claude Code, Cursor, Continue, Cline, Windsurf, Zed, ChatGPT desktop, and every other MCP-compatible agent. It is not "write better." It is "stop sounding like AI."

Domain: humanifyme.com

---

## Why this exists

People increasingly delegate writing to AI agents — commit messages, PR descriptions, Slack posts, email drafts, LinkedIn posts. Every agent produces a recognizable AI tone: polished, balanced, slightly corporate. Recipients are increasingly able to detect it, which costs trust in sales, recruiting, and personal communication. Existing fixes (Grammarly, Wordtune, "AI humanizers") normalize toward a generic professional register, which is the opposite of what's needed. HumanifyMe builds a private, structured profile of how *one specific user* writes and uses that profile inside the agent to rewrite drafts before the human ever sees them.

## How it works (one paragraph)

You install HumanifyMe as a plugin in your agent. You give it 3–10 of your real writing samples via the bundled `build-voice-profile` skill. HumanifyMe generates a structured voice fingerprint and stores it locally in `~/.humanifyme/`. From then on, your agent can call the `humanify_text` tool — automatically, via bundled skills like `humanify-pr` for PR descriptions, or explicitly when you ask. The rewrite runs on your machine, calls your configured LLM provider with your key, and never sends raw samples anywhere.

## Developer setup

```bash
npm install        # Node >= 22.5 required (uses the built-in node:sqlite)
npm test           # vitest suite
npm run typecheck  # tsc --noEmit
npm run build      # tsup -> dist/humanifyme-mcp.mjs (MCP server) + dist/humanifyme.mjs (CLI)
```

Try it locally:

```bash
npm run build
node dist/humanifyme.mjs setup                                  # consent
node dist/humanifyme.mjs provider set anthropic --api-key sk-…  # your key
node dist/humanifyme.mjs sample add my-email.txt --label email  # 3+ samples
node dist/humanifyme.mjs profile rebuild
echo "We are delighted to leverage synergies." | node dist/humanifyme.mjs rewrite
```

Register the MCP in an agent (see `docs/install/` for every agent):

```bash
claude mcp add humanifyme -- node /path/to/repo/dist/humanifyme-mcp.mjs
```

## Repository layout

```
/README.md                       <- you are here
/CLAUDE.md                       <- instructions for Claude Code
/AGENTS.md                       <- instructions for any coding agent
/.github/copilot-instructions.md <- instructions for GitHub Copilot
/src/                            <- the MCP server + CLI (TypeScript)
/humanifyme.plugin/              <- plugin bundle: manifest, MCP registration, skills
/specs/                          <- product, MVP, component, and policy specs
/tasks/                          <- roadmap, milestones, task breakdown, AC, test plan
/prompts/                        <- LLM prompt templates for the rewrite engine
/docs/                           <- user stories, data model, MCP tool contract, architecture, risks, open questions
/docs/install/                   <- per-agent install snippets
```

## Reading order

If you are new to the project, read in this order:

1. `specs/product-spec.md` — what HumanifyMe is and what it is not.
2. `specs/mvp-spec.md` — the wedge we are building first.
3. `specs/mcp-server-spec.md` — the MCP server: tools, resources, runtime.
4. `specs/plugin-spec.md` — how the MCP is packaged and distributed.
5. `specs/privacy-security-spec.md` — non-negotiable rules.
6. `docs/architecture.md` — how the pieces fit.
7. `tasks/milestones.md` — what ships when.
8. `tasks/task-breakdown.md` — what to pick up next.

## Status

- Milestone 0 (research & specs): complete.
- Milestones 1–3 (MCP server, storage, redactor, profile engine, rewrite engine, CLI, importers): built and tested (2026-06-10).
- Milestone 4 (plugin packaging): bundle in `humanifyme.plugin/`, snippets in `docs/install/`.
- Milestones 5–7 (onboarding polish, landing page, marketplace + npm launch): in progress — see `tasks/milestones.md`.

## Locked product decisions

- Surface: MCP server, distributed as a plugin. **Not** a Chrome extension.
- Name: **HumanifyMe**. Domain humanifyme.com.
- Tagline: **Make AI sound like you.**
- LLM providers: Anthropic, OpenAI, Gemini wired at launch; Ollama as an early follow-on.
- Storage: local-first in `~/.humanifyme/` (config + SQLite). No backend in MVP.
- Target distribution: every MCP-compatible agent. Cowork and Claude Code plugin marketplaces are first-class at launch.

## Positioning, in one line

HumanifyMe is the voice layer that sits inside your agent and rewrites everything in your voice before you see it.

## License

TBD. See `docs/open-questions.md`.
