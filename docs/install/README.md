# Installing HumanifyMe in your agent

HumanifyMe is an MCP server. Any agent that speaks MCP can use it. All
snippets assume Node ≥ 22.5 is installed. The `humanifyme` package is published
on npm, so the `npx` snippets below work as-is with nothing checked out.

Before installing in an agent, run `npx -y humanifyme@0.2.0 setup` in a terminal.
It uses hidden input for the provider key, validates the provider, collects writing
samples, and builds the profile every agent will share. Never paste a provider API
key into an AI chat or MCP tool argument.

## Cowork / Claude Code (plugin)

Install the `humanifyme` plugin from the marketplace, or point "Install from
file" at `humanifyme.plugin/`.

## Claude Code (manual MCP)

```bash
claude mcp add humanifyme -- npx -y --package humanifyme@latest humanifyme-mcp
```

## Cursor, `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "humanifyme": {
      "command": "npx",
      "args": ["-y", "--package", "humanifyme@latest", "humanifyme-mcp"]
    }
  }
}
```

## Claude Desktop, `claude_desktop_config.json`

```json
{
  "mcpServers": {
    "humanifyme": {
      "command": "npx",
      "args": ["-y", "--package", "humanifyme@latest", "humanifyme-mcp"]
    }
  }
}
```

## Continue, `~/.continue/config.yaml`

```yaml
mcpServers:
  - name: humanifyme
    command: npx
    args: ["-y", "--package", "humanifyme@latest", "humanifyme-mcp"]
```

## Cline / Windsurf, MCP settings JSON

Same shape as Cursor: command `npx`, args `["-y", "--package", "humanifyme@latest", "humanifyme-mcp"]`.

## Zed, `settings.json`

```json
{
  "context_servers": {
    "humanifyme": {
      "command": {
        "path": "npx",
        "args": ["-y", "--package", "humanifyme@latest", "humanifyme-mcp"]
      }
    }
  }
}
```

## ChatGPT desktop

ChatGPT desktop supports MCP via developer mode connectors; stdio support
varies by version. Until first-class stdio config lands, run HumanifyMe via a
local MCP bridge, or check humanifyme.com/install/chatgpt for the current
snippet.
