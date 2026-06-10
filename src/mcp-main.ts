// Entrypoint for the `humanifyme-mcp` binary: MCP over stdio.

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio servers must not write to stdout outside the protocol.
  process.stderr.write('humanifyme-mcp ready\n');
}

main().catch((err) => {
  process.stderr.write(`humanifyme-mcp failed to start: ${err?.message ?? err}\n`);
  process.exit(1);
});
