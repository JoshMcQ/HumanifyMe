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

Before first use, run `npx -y humanifyme@0.2.0 setup` in a terminal. The wizard
accepts cloud credentials through hidden input; never paste an API key into an AI
chat or MCP tool argument. The plugin reuses the profile created by that wizard.

Requires Node ≥ 22.5 on PATH. The bundled `.mcp.json` runs the MCP server straight
from npm, pinned to the released version (`npx -y --package humanifyme@0.2.0
humanifyme-mcp`), so installing the plugin needs no local build or clone. The pin
moves with each plugin release, so an install never auto-pulls an unreviewed version.
