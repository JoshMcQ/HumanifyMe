# Installing HumanifyMe in your agent

HumanifyMe is an MCP server. Any agent that speaks MCP can use it. All
snippets assume Node ≥ 22.5 is installed.

> **Status: `humanifyme` is not on npm yet.** The `npx ... humanifyme@latest`
> snippets below are the intended form once the package is published; today they
> will fail with a 404. Until publish, build the server from a clone
> (`npm install && npm run build`) and register it by absolute path, for example:
> `claude mcp add humanifyme -- node /absolute/path/to/repo/dist/humanifyme-mcp.mjs`.
> The same `node /abs/.../dist/humanifyme-mcp.mjs` command substitutes for the
> `npx` command in every config block below.

After installing in any agent, ask the agent to "set up HumanifyMe" (it will
walk you through provider, samples, and profile), or run the `setup` command on
the built CLI (`node /abs/.../dist/humanifyme.mjs setup`).

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
