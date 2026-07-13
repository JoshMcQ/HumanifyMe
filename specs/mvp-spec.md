# MVP Spec

## Goal of the MVP

Ship an MCP server, installable as a Cowork plugin and a Claude Code plugin, that lets one user, in under three minutes, add 3 to 10 writing samples via tool calls or CLI, build a voice profile, and have any MCP-compatible agent humanify a draft via `humanify_text`. Validate that "this sounds like me" is achievable without a backend, without an account, and without sending raw samples off-device.

## In scope for MVP

1. **MCP server (`humanifyme-mcp`).**
   - Node.js, TypeScript, single binary, distributed via npm.
   - Speaks MCP over stdio.
   - Exposes the tools, resources, and prompts in `specs/mcp-server-spec.md`.
   - Stores data in `~/.humanifyme/` (config + SQLite DB).

2. **Sample management via tools and CLI.**
   - `humanify_add_sample`, `humanify_list_samples`, `humanify_delete_sample` exposed as MCP tools.
   - CLI: `humanifyme sample add --label email,professional <path>`, `humanifyme sample list`, `humanifyme sample rm <id>`.
   - Minimum to generate a profile: 3 samples total, with at least 2 distinct labels covered.

2a. **Bulk sample ingestion (MVP-tier importers).**
   - `humanify_import_chat_export`, accepts a path to a ChatGPT or Claude data-export archive, parses locally, extracts only user-authored turns, infers context labels, redacts, ingests. No OAuth, no server. See `specs/sample-ingestion-spec.md`.
   - `humanify_import_text_files`, accepts a glob/directory plus a default label; ingests `.txt`, `.md`, `.docx` as samples.
   - These two unlock the "actually sounds like me" outcome for anyone with a year of ChatGPT/Claude usage or a folder of writing.
   - All other importers (Gmail sent, Slack export, macOS Messages, X archive, Substack export) are Phase 2 per `specs/sample-ingestion-spec.md`.

3. **Voice profile generation.**
   - `humanify_build_profile` tool calls the configured provider with `prompts/style-analysis-prompt.md`.
   - Returns structured JSON conforming to the `StyleProfile` schema in `specs/style-profile-spec.md`.
   - Persisted to SQLite. Raw samples are not re-sent on subsequent rewrites, only the profile is.
   - Resource `humanify://profile.md` exposes a plain-English summary the agent (and user) can read.

4. **Profile view and edit.**
   - `humanify_get_profile` returns the JSON.
   - `humanify_update_profile` accepts an edited JSON profile (schema-validated).
   - `humanify_delete_profile` clears it.
   - CLI: `humanifyme profile show`, `humanifyme profile edit` (opens `$EDITOR`), `humanifyme profile rm`, `humanifyme profile rebuild`.

5. **Rewrite tool: `humanify_text`.**
   - Accepts draft + context + directives.
   - Pipeline per `specs/rewrite-engine-spec.md`.
   - Returns rewrite + diff + metadata.

6. **Multi-provider abstraction.**
   - At launch: Anthropic, OpenAI, Gemini wired up. Ollama follows in the first few weeks.
   - Configured via `humanify_set_provider` and/or `~/.humanifyme/config.json`.
   - The user can switch providers per call via the `provider` argument to `humanify_text`.
   - BYO API key stored in Windows Credential Manager, macOS Keychain, or Linux Secret Service with no plaintext fallback.

7. **Redaction.**
   - Before any sample or draft is sent to the LLM, run `redact()` over it.
   - Emails, phone numbers, postal addresses, API keys, and common secrets are masked.
   - Redaction is logged locally (counts only) so the user can audit it.

8. **Privacy audit.**
   - `humanify_audit_list` returns the last N outbound requests as metadata only (timestamp, provider, route, payload size, draft length, profile included, success).
   - `humanify_wipe_all` destroys everything (requires explicit confirm string).
   - CLI: `humanifyme audit`, `humanifyme wipe --confirm`.

9. **Plugin bundles for Cowork and Claude Code.**
   - `humanifyme.plugin` packaged per `specs/plugin-spec.md`.
   - Skills: `humanify`, `build-voice-profile`, `humanify-pr`.
   - Listed in the Cowork and Claude Code plugin marketplaces.

10. **Install snippets for everything else.**
    - One-line `mcp.json` snippet for Cursor.
    - Similar snippets for Continue, Cline, Windsurf, Zed, ChatGPT desktop.
    - Hosted at `humanifyme.com/install/<agent>`.

11. **Consumer "paste and humanify" on humanifyme.com.**
    - Two CTAs on the landing page: *Install the plugin* (technical/agent users) and *Try it now* (everyone else).
    - The Try-It page accepts 3 quick sample snippets + a draft, generates a one-off rewrite, and shows before/after.
    - No account. Profile and samples are not persisted on our side, they live in the user's browser session only.
    - A single Cloudflare Worker fronts our LLM provider key with a strict per-IP daily quota (default 3 rewrites/day) and a draft length cap. This is the only server-side component in MVP and is deliberately the smallest possible (no DB, no auth, no logging of content).
    - After the user runs their free quota, the page nudges to install the plugin for unlimited rewrites.

## Out of scope for MVP (revisit at v1.1+)

- A hosted MCP variant (we run the server). Defers `specs/backend-spec.md` to post-MVP.
- Accounts, login, cross-device sync.
- A full web dashboard at humanifyme.com for managing the profile. CLI + the agent itself (via tools) is the management UI in MVP. The "Try it now" page is a wedge, not a dashboard.
- Auto-import samples from sent mail or any third-party service. High value but adds connector complexity and consent.
- Auto-rewrite hooks (the `on_agent_text_output` hook in `specs/mcp-server-spec.md`). Opt-in feature, defaults off, ships only per-agent once each agent's hook API stabilizes.
- Streaming token-by-token rewrite output.
- Per-team / shared profiles.
- Multiple profiles per user (work / personal).
- Mobile.
- Fine-tuning per user.
- A Chrome extension. We considered it and chose MCP instead. Revisit only if MCP distribution underperforms badly.

## MVP definition of done

- `npm i -g humanifyme` installs and `humanifyme-mcp` starts in < 1.5s.
- Cowork plugin marketplace listing accepted.
- Claude Code plugin marketplace listing accepted.
- Complete the sample import → profile build → rewrite loop end-to-end from inside Cowork **and** Claude Code.
- Install snippet works in Cursor, validated manually.
- All acceptance criteria in `tasks/acceptance-criteria.md` pass.
- All tests in `tasks/test-plan.md` pass.
- Privacy review: no code path sends raw samples to any host other than the configured LLM provider, and only on explicit tool calls.

## What we will measure on MVP

- Time to first rewrite from plugin install (target: < 3 minutes).
- "Sounds like me" survey result after first rewrite (target: ≥ 70%).
- Rewrite latency p50 / p95 (target: p50 < 4s, p95 < 10s for typical drafts).
- Per-provider success rate.
- Most-used directive combinations.
- Drop-off step in onboarding.

## Risks specific to MVP

1. **BYO key remains a funnel killer even with developer audience.** Mitigation: a tight `humanify-setup` slash command + clear provider docs.
2. **The `humanify-pr` skill misfires.** Either fires too often (annoys) or too rarely (forgotten). Mitigation: explicit trigger language tuned during alpha.
3. **Plugin marketplace review delays.** Mitigation: submit early, parallel to development.
4. **Multi-provider abstraction is bug-prone if rushed.** Mitigation: one provider is the green path in CI; others gated on an integration test fixture per provider.
5. **The first rewrite may not "sound like me" with only 3 samples.** Mitigation: the `build-voice-profile` skill nudges users toward more samples and varied labels.
