# User Stories

User stories for MVP, grouped by persona. Format: `As a <persona>, I want <capability>, so that <outcome>. AC: …`

## Persona A — Developer using Claude Code or Cursor

### A1. Humanify a PR description automatically
As a developer using Claude Code to draft a PR description, I want the agent to automatically rewrite its draft in my voice via the `humanify-pr` skill, so that my PR doesn't read as AI before I even see it.
- **AC:** When I ask the agent to write a PR description, it generates a draft, calls `humanify_text` with `contextLabel: "professional"`, and shows me the humanified result. I can copy or ask for a different directive.

### A2. Build my voice profile from real writing
As a developer setting up HumanifyMe for the first time, I want to give the agent 3–10 of my real writing samples and have it build a voice profile in under a minute, so that future rewrites recognize my voice.
- **AC:** The `build-voice-profile` skill walks me through adding samples conversationally. Profile generation completes in under 20 seconds. I can read the profile back in plain English via the `humanify://profile.md` resource.

### A3. Humanify a Slack post-mortem draft
As a developer writing a post-mortem in Slack, I want to ask my agent to humanify a draft so it sounds like me rather than corporate boilerplate.
- **AC:** Saying "humanify this" in chat triggers the bundled `humanify` skill, which calls `humanify_text` with the current draft and returns the rewrite.

## Persona B — Founder/operator on Cowork

### B1. One voice across every agent
As a founder using Cowork for ops and Claude Code for hacking, I want my voice to be consistent across both, so that emails I send from Cowork and PRs I open from Claude Code sound like the same person.
- **AC:** The same profile in `~/.humanifyme/` is read by every host agent's MCP install. No per-agent profile.

### B2. Tune the rewrite without re-pasting
As a founder iterating on tone, I want to ask the agent for "shorter" or "warmer" without restarting, so that I can find the right balance fast.
- **AC:** Asking for a different directive triggers a fresh `humanify_text` call. Cached identical inputs do not re-bill.

## Persona C — Power AI user (multiple agents installed)

### C1. Use my own API key across providers
As a privacy-conscious user, I want to bring my own keys for Anthropic, OpenAI, Gemini, and Ollama, so that I control where my data goes and which model writes my voice.
- **AC:** `humanify_set_provider` and the CLI accept any of the four providers. I can switch providers per call via the `provider` argument to `humanify_text`.

### C2. Delete everything
As a user trying HumanifyMe out, I want a single command to delete every byte of my data, so that I can uninstall cleanly.
- **AC:** `humanifyme wipe --confirm` (or the `humanify_wipe_all` tool with the confirm string) removes `~/.humanifyme/data.db` and resets config. After, the next start initializes a fresh empty state.

### C3. Audit what gets sent
As a user, I want to see the last N outbound requests as size/route/provider — without content — so that I can verify the privacy claims for myself.
- **AC:** `humanifyme audit` (and `humanify_audit_list`) shows the last 20 entries.

## Persona D — Salesperson using AI for outreach (post-MVP target)

### D1. Voice across sales tool and personal email
As a salesperson, I want one profile that works across the AI tools I use for outreach and for personal email, so that my voice doesn't fragment.
- **AC:** Same profile in every host agent. `sales` and `email` context variants tunable independently.

## Persona E — Privacy-maxi developer

### E1. Local-model rewrite via Ollama
As a privacy-maxi user, I want HumanifyMe to use a local model via Ollama, so that not even my draft leaves my machine.
- **AC:** Configuring Ollama via `humanify_set_provider` works. Rewrites route to the local model. The audit log shows `provider: ollama` and the LLM endpoint is `http://localhost:...`.

## Anti-stories (things we explicitly do not support)

- "I want to write better English." → not us. Try Grammarly.
- "I want my AI text to bypass GPTZero." → marketed-against. Not the framing.
- "I want HumanifyMe to summarize my inbox." → out of scope.
- "I want HumanifyMe to draft from a prompt." → we rewrite drafts, not generate from scratch.
- "I want a Chrome extension that injects into Gmail." → we pivoted away from that. The MCP runs inside your agent.
