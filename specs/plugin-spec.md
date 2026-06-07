# Plugin Spec

The HumanifyMe MCP server is the engine. The plugin is the packaged install path that drops the MCP into a host agent (Cowork, Claude Code, etc.) with one click and bundles complementary skills.

## Target hosts (launch)

Every agent that speaks MCP. The two we ship first-class plugin bundles for at launch:

1. **Cowork plugin** (`humanifyme.plugin`). Joshua is already in the Cowork ecosystem; this is the lowest-friction install path for the launch audience.
2. **Claude Code plugin**. The single largest developer-facing audience for MCP plugins today.

The remaining agents — Cursor, Continue, Cline, Windsurf, Zed, ChatGPT desktop — install via their native MCP config (`mcp.json` / `claude_desktop_config.json` / etc.) using a one-line config snippet we publish at humanifyme.com.

## What the plugin bundle contains

A plugin is a directory packaged as a `.plugin` (zip) with:

```
humanifyme.plugin/
├── plugin.json              <- plugin manifest
├── mcp/
│   └── server.json          <- MCP server registration (points at the humanifyme-mcp binary)
├── skills/
│   ├── humanify/
│   │   ├── SKILL.md
│   │   └── examples/
│   ├── build-voice-profile/
│   │   └── SKILL.md
│   └── humanify-pr/
│       └── SKILL.md
└── README.md
```

### `plugin.json`

```jsonc
{
  "name": "humanifyme",
  "displayName": "HumanifyMe",
  "version": "1.0.0",
  "description": "Make AI sound like you. Rewrites AI-generated drafts in your authentic voice.",
  "author": "humanifyme.com",
  "homepage": "https://humanifyme.com",
  "license": "MIT",
  "mcps": ["./mcp/server.json"],
  "skills": ["./skills/humanify", "./skills/build-voice-profile", "./skills/humanify-pr"],
  "tags": ["writing", "voice", "rewrite", "privacy", "anti-ai-tone"]
}
```

### `mcp/server.json`

```jsonc
{
  "name": "humanifyme",
  "command": "npx",
  "args": ["-y", "humanifyme-mcp@latest"],
  "transport": "stdio",
  "env": {
    "HUMANIFYME_HOME": "${HOME}/.humanifyme"
  }
}
```

The agent reads this on plugin install and spawns the MCP whenever it starts.

## Skills bundled with the plugin

Skills are short markdown files that teach the agent when to use the MCP tools. The agent loads them and reaches for the matching tool automatically when the user's prompt matches.

### `skills/humanify/SKILL.md`

Triggers: "humanify," "rewrite this in my voice," "make this sound like me," "less AI," "this sounds like AI." Calls `humanify_text` on the current draft.

### `skills/build-voice-profile/SKILL.md`

Triggers: "build my voice profile," "learn how I write," "set up HumanifyMe." Walks the user through `humanify_add_sample` calls (asks for 3 samples in chat), then runs `humanify_build_profile`, then shows the result.

### `skills/humanify-pr/SKILL.md`

Triggers: writing a pull request description, commit message, or release note. The most natural "agent drafted something for me" entry point in a developer workflow. Calls `humanify_text` with `contextLabel: "professional"` and `directives: ["more_like_me", "shorter"]`.

These skills are the secret sauce of the plugin — without them, the user has to remember to ask the agent to use HumanifyMe. With them, the agent reaches for HumanifyMe at the right moment automatically.

## Per-agent install instructions

### Cowork

- Distributed via the Cowork plugin marketplace.
- One-click install from the marketplace UI.
- Plugin appears under "Installed plugins" with a "Configure" button that walks the user through API key setup via the `humanify_set_provider` and `humanify_test_key` tools.

### Claude Code

- Distributed via the Claude Code plugin marketplace.
- `/plugin install humanifyme` installs from the marketplace.
- First run prompts for provider + API key via a slash command (`/humanify-setup`).

### Cursor, Continue, Cline, Windsurf, Zed, ChatGPT desktop

- Documented one-line `mcp.json` snippet at `humanifyme.com/install/<agent>`.
- Snippet for Cursor's `~/.cursor/mcp.json`:

  ```jsonc
  {
    "mcpServers": {
      "humanifyme": {
        "command": "npx",
        "args": ["-y", "humanifyme-mcp@latest"]
      }
    }
  }
  ```

- After restart, user runs `humanify_test_key` (or asks the agent to do so) to confirm install.

## Versioning and updates

- The plugin and the underlying MCP version independently. The plugin manifest pins a minimum MCP version (`humanifyme-mcp >= 1.0.0`).
- Plugin marketplaces handle plugin updates. The MCP itself updates via `npx -y humanifyme-mcp@latest` (always-latest by default) or a pinned version if the user prefers reproducibility.

## What is intentionally not in the plugin

- A bundled LLM or model weights. We don't ship models.
- A bundled OS-level keychain helper. Use the OS keychain via Node's `keytar` when available.
- A telemetry SDK. Telemetry, if it exists, is opt-in inside the MCP server and explained in the privacy spec.
- Auto-update mechanics for the plugin itself — the marketplace handles that.

## Marketplace listing requirements

Each marketplace has its own listing form. Inputs we prepare once and reuse:

- 1-line description: "Make AI sound like you."
- 5-line description (for cards).
- 30-line description (for the listing page).
- 4 screenshots: profile build, a before/after humanify, the privacy audit view, the install flow.
- 30-second screencast of "agent drafts a PR description → humanify_text → before/after."
- Privacy attestations (none of these change across marketplaces): no telemetry, samples never leave device, opt-in everything.
- Support contact: support@humanifyme.com.

These live under `marketing/listings/` once we get to Milestone 6.
