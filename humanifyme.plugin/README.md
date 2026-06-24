# HumanifyMe plugin

Make AI sound like you.

This plugin drops the HumanifyMe MCP server into your agent (Cowork, Claude
Code, and anything else that loads plugins) and bundles three skills so the
agent reaches for it at the right moments:

- **humanify**, "make this sound like me" / "less AI" on any draft.
- **build-voice-profile**, one-time setup: collect samples, build the profile.
- **humanify-pr**, PR descriptions and commit messages in your voice, automatically.

Your writing samples stay on your machine (`~/.humanifyme/`). Rewrites send
redacted text to the LLM provider you configure, and nowhere else. Audit every
outbound request with `humanifyme audit`.

Requires Node ≥ 22.5 on PATH (the MCP runs via `npx -y humanifyme`).
