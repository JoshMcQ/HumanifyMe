# Plugin Spec

The HumanifyMe MCP server is the engine. The plugin is the packaged install path that drops the MCP into a host agent (Cowork, Claude Code, etc.) with one click and bundles complementary skills.

## Target hosts (launch)

Every agent that speaks MCP. The two we ship first-class plugin bundles for at launch:

1. **Cowork plugin** (`humanifyme.plugin`). Joshua is already in the Cowork ecosystem; this is the lowest-friction install path for the launch audience.
2. **Claude Code plugin**. The single largest developer-facing audience for MCP plugins today.

The remaining agents, Cursor, Continue, Cline, Windsurf, Zed, ChatGPT desktop, install via their native MCP config (`mcp.json` / `claude_desktop_config.json` / etc.) using a one-line config snippet we publish at humanifyme.com.

## What the plugin bundle contains

A plugin is a directory packaged as a `.plugin` (zip) with:

```
humanifyme.plugin/
├── .claude-plugin/
│   └── plugin.json          <- plugin manifest (only this file lives here)
├── .mcp.json                <- MCP server registration (points at the humanifyme-mcp binary)
├── skills/
│   ├── humanify/
│   │   └── SKILL.md
│   ├── build-voice-profile/
│   │   └── SKILL.md
│   └── humanify-pr/
│       └── SKILL.md
└── README.md
```

### `.claude-plugin/plugin.json`

Only `plugin.json` lives inside `.claude-plugin/`; every other directory (`skills/`, `.mcp.json`) sits at the plugin root. Skills are auto-discovered from `skills/`, so the manifest does not enumerate them.

```jsonc
{
  "name": "humanifyme",
  "displayName": "HumanifyMe",
  "version": "0.2.0",
  "description": "Make AI sound like you. Rewrites AI-generated drafts in your authentic voice.",
  "author": { "name": "Joshua McQueary", "url": "https://humanifyme.com" },
  "homepage": "https://humanifyme.com",
  "repository": "https://github.com/JoshMcQ/HumanifyMe",
  "license": "Apache-2.0",
  "keywords": ["writing", "voice", "rewrite", "privacy", "anti-ai-tone"]
}
```

### `.mcp.json`

The version is pinned (not `@latest`) so a plugin install always resolves to a known, audited build.

```jsonc
{
  "mcpServers": {
    "humanifyme": {
      "command": "npx",
      "args": ["-y", "--package", "humanifyme@0.2.0", "humanifyme-mcp"]
    }
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

These skills are the secret sauce of the plugin, without them, the user has to remember to ask the agent to use HumanifyMe. With them, the agent reaches for HumanifyMe at the right moment automatically.

## Per-agent install instructions

### Cowork

- Distributed via the Cowork plugin marketplace.
- One-click install from the marketplace UI.
- The user first runs `npx -y humanifyme@0.2.0 setup` so cloud credentials enter through a hidden terminal prompt, never through model-visible chat or tool arguments.
- Plugin appears under "Installed plugins" and reuses the local profile created by the CLI.

### Claude Code

- Distributed via the Claude Code plugin marketplace.
- `/plugin install humanifyme` installs from the marketplace.
- First use runs against the profile created by the secure CLI setup.

### Cursor, Continue, Cline, Windsurf, Zed, ChatGPT desktop

- Documented one-line `mcp.json` snippet at `humanifyme.com/install/<agent>`.
- Snippet for Cursor's `~/.cursor/mcp.json`:

  ```jsonc
  {
    "mcpServers": {
      "humanifyme": {
        "command": "npx",
        "args": ["-y", "--package", "humanifyme@latest", "humanifyme-mcp"]
      }
    }
  }
  ```

- After restart, user runs `humanify_test_key` (or asks the agent to do so) to confirm install.

## Versioning and updates

- The plugin manifest and npm package move together for now. The checked-in `.mcp.json` pins the exact reviewed `humanifyme` package version.
- Plugin marketplaces handle plugin updates. Manual MCP registrations may use `humanifyme@latest`; the bundled plugin remains pinned for reproducibility.

## What is intentionally not in the plugin

- A bundled LLM or model weights. We don't ship models.
- A second credential store. The npm engine owns OS-keychain access so the CLI and every plugin host share one credential.
- A telemetry SDK. Telemetry, if it exists, is opt-in inside the MCP server and explained in the privacy spec.
- Auto-update mechanics for the plugin itself, the marketplace handles that.

## Marketplace listing requirements

Each marketplace has its own listing form. Inputs we prepare once and reuse:

- 1-line description: "Make AI sound like you."
- 5-line description (for cards).
- 30-line description (for the listing page).
- 4 screenshots: profile build, a before/after humanify, the privacy audit view, the install flow.
- 30-second screencast of "agent drafts a PR description → humanify_text → before/after."
- Privacy attestations (none of these change across marketplaces): no telemetry, samples never leave device, opt-in everything.
- Support contact: support@humanifyme.com.

The marketplace listing copy is maintained separately by the maintainers and finalized at Milestone 6.
