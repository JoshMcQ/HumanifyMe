// Smoke test: boots the MCP server in-memory and exchanges the handshake,
// lists tools, calls one. (T-01 acceptance criterion.)

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { freshHome, cleanupHome } from './testUtils.js';
import { createServer } from './server.js';

beforeEach(freshHome);
afterEach(cleanupHome);

describe('MCP server', () => {
  it('completes the handshake, lists tools, and answers a tool call', async () => {
    const server = createServer();
    const client = new Client({ name: 'test-client', version: '0.0.1' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const tools = await client.listTools();
    const names = tools.tools.map((t) => t.name);
    expect(names).toContain('humanify_text');
    expect(names).toContain('humanify_add_sample');
    expect(names).toContain('humanify_wipe_all');
    expect(names).toContain('humanify_import_chat_export');

    const result = await client.callTool({
      name: 'humanify_add_sample',
      arguments: { text: 'a'.repeat(120), labels: ['email'] },
    });
    const payload = JSON.parse((result.content as Array<{ text: string }>)[0]!.text);
    expect(payload.id).toBeTruthy();

    // error shape: clean code, no stack
    const bad = await client.callTool({
      name: 'humanify_delete_sample',
      arguments: { id: 'missing' },
    });
    expect(bad.isError).toBe(true);
    const err = JSON.parse((bad.content as Array<{ text: string }>)[0]!.text);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).not.toContain('at ');

    const resources = await client.listResources();
    expect(resources.resources.map((r) => r.uri)).toContain('humanify://profile.md');

    const prompts = await client.listPrompts();
    expect(prompts.prompts.map((p) => p.name)).toContain('humanify');

    await client.close();
    await server.close();
  });
});
