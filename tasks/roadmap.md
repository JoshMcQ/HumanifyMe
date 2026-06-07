# Roadmap

A high-level view of the order we ship things. Day estimates are rough; they exist to force prioritization, not to commit to dates.

## Phase 0 — Specs (current)

Spec gate must be passed before any code lands.

| Item                         | Status      |
| ---------------------------- | ----------- |
| Product spec                 | done        |
| MVP spec                     | done        |
| Privacy/security spec        | done        |
| Style profile spec           | done        |
| Rewrite engine spec          | done        |
| MCP server spec              | done        |
| Plugin spec (Cowork + Claude Code packaging) | done |
| Backend spec (decision: no)  | done        |
| Onboarding spec              | done        |
| Pricing spec                 | done        |
| Competitor analysis          | done        |
| Launch plan                  | done        |
| Task breakdown               | done        |
| Acceptance criteria          | done        |
| Test plan                    | done        |
| Prompt templates             | done        |
| Architecture                 | done        |

## Phase 1 — MVP (MCP server + plugin)

| Milestone | Subject                                                              | Rough effort |
| --------- | -------------------------------------------------------------------- | ------------ |
| M1        | MCP server scaffold + local storage (SQLite) + sample tools + MVP importers (ChatGPT/Claude export, text files) | ~1.5 weeks |
| M2        | Style profile generator + viewer/editor (tools + CLI)                | ~1 week      |
| M3        | Rewrite engine (provider abstraction, redaction, pipeline) + `humanify_text` | ~1.5 weeks |
| M4        | Plugin packaging: Cowork plugin + Claude Code plugin + skills        | ~1 week      |
| M5        | Onboarding, CLI polish, audit/privacy tools, multi-provider QA       | ~1 week      |
| M6        | Landing page at humanifyme.com + "Try it now" paste tool (single Cloudflare Worker) + install snippets | ~5 days |
| M7        | Beta release: marketplace submissions, alpha → beta transition       | ~3 days      |

Total: ~7 weeks of solo focused work. Add 50% for real life.

## Phase 2 — Post-MVP, pre-monetization

Two parallel tracks. Track A is the consumer surface expansion (the "anyone who uses AI" reach); track B is the developer/MCP depth play.

### Track A — Consumer surfaces (each uses the same engine layer)

- **Bulk importers (the unlock for "actually sounds like me"):** Gmail sent folder via OAuth, Slack workspace export, macOS Messages.app local SQLite, X archive, Substack export. See `specs/sample-ingestion-spec.md`.
- **Web paste tool, expanded:** beyond the MVP quota — add profile persistence (sign-in optional, profile stored hashed-key-side), more directives, before/after sharing.
- **Browser extension (reconsidered):** a thin Chrome/Firefox/Safari extension that humanifies AI output on ChatGPT, Claude.ai, Gmail compose, LinkedIn compose. It calls the same engine (via the local MCP if installed; via the web paste API otherwise). The original Chrome-ext spec we shelved on 2026-06-03 comes back here as a *consumer wedge*, not as the product itself. Reuses 70% of what we'd write for the web tool.
- **macOS menu-bar app:** a small native app that exposes humanify on a global hotkey (rewrite selected text in any app). Native macOS first; Windows next. Uses the same engine.
- **iOS/Android share-sheet extension:** highlight → share → humanify. Native, calls the hosted engine.

### Track B — Developer/MCP depth

- **Auto-humanify hooks** (per host agent, opt-in) — rewrite agent output before the user sees it.
- **Ollama and other local-model providers** beyond the MVP integration.
- **Sample-importer skills** that wrap the new importers conversationally inside agents.
- **Streaming rewrite output** where the host agent supports MCP progress streaming for tools.
- **Additional context labels** (`commit`, `pr`, `slack`, `release-notes`, `comment`).
- **More bundled skills** (commit-message, slack-summary, release-notes).
- **Marketplace expansion** for Cursor / Continue / Cline / Windsurf / Zed as their plugin systems mature.

### Track C — Research credibility (timed against `specs/research-credibility-spec.md`)

- HMB-v1 corpus recruitment (T+6 to T+9 months).
- White-paper drafting in parallel.
- First university partnership outreach.

## Phase 3 — Monetization

- Backend (Node + Fastify + Postgres) per `specs/backend-spec.md`.
- Accounts, magic-link auth.
- Managed LLM key (no BYO needed) — the headline Pro feature.
- Stripe + Pro plan.
- Cross-device sync of profiles (samples stay local by default).
- Optional hosted MCP variant for users on browser-only agents.

## Phase 4 — Growth and depth

- Multiple profiles per user (work / personal).
- Team plans.
- Per-repo voice profiles (developers who want a "this project's voice" override).
- ChatGPT plugin store (if/when it supports MCP-shaped plugins natively).
- Mobile agent support (when mobile MCP hosts emerge).

## Not on the roadmap (deliberately)

- Fine-tuning per user.
- AI-detection bypass marketing.
- Content generation from scratch.
- Audio / voice cloning (different product).
- An LLM of our own.

(Browser extensions came off the "never" list and onto Phase 2 Track A. They are a consumer wedge that sits on top of the engine, not a replacement for the MCP. The MCP remains the canonical engine surface; the extension is one of several user-facing skins on top of it.)
