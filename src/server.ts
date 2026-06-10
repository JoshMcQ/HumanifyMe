// MCP server assembly: tools, resources, prompts. Spawned over stdio by the
// host agent. See specs/mcp-server-spec.md.

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { registerTool } from './mcp/registerTool.js';
import { ALL_TOOLS } from './mcp/tools/index.js';
import { profiles, audit } from './storage/index.js';
import { VERSION } from './version.js';
import { renderProfileMarkdown } from './engine/profileMarkdown.js';

export function createServer(): McpServer {
  const server = new McpServer({ name: 'humanifyme', version: VERSION });

  for (const tool of ALL_TOOLS) {
    registerTool(server, tool as never);
  }

  // --- Resources ---
  server.resource('profile-json', 'humanify://profile', { mimeType: 'application/json' }, async () => ({
    contents: [
      {
        uri: 'humanify://profile',
        mimeType: 'application/json',
        text: JSON.stringify(profiles.get(), null, 2),
      },
    ],
  }));

  server.resource('profile-md', 'humanify://profile.md', { mimeType: 'text/markdown' }, async () => ({
    contents: [
      {
        uri: 'humanify://profile.md',
        mimeType: 'text/markdown',
        text: renderProfileMarkdown(profiles.get()),
      },
    ],
  }));

  server.resource('audit-json', 'humanify://audit.json', { mimeType: 'application/json' }, async () => ({
    contents: [
      {
        uri: 'humanify://audit.json',
        mimeType: 'application/json',
        text: JSON.stringify(audit.list(20), null, 2),
      },
    ],
  }));

  // --- Prompts (slash commands in supporting hosts) ---
  const draftArg = { draft: z.string().describe('The draft to rewrite') };
  const presets: Array<{ name: string; description: string; directives: string[] }> = [
    { name: 'humanify', description: 'Rewrite the draft in my voice.', directives: ['more_like_me'] },
    { name: 'humanify-warmer', description: 'Rewrite warmer, in my voice.', directives: ['warmer', 'more_like_me'] },
    { name: 'humanify-shorter', description: 'Rewrite shorter, in my voice.', directives: ['shorter', 'more_like_me'] },
    { name: 'humanify-direct', description: 'Rewrite more direct, in my voice.', directives: ['more_direct', 'more_like_me'] },
  ];
  for (const preset of presets) {
    server.prompt(preset.name, preset.description, draftArg, ({ draft }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Call the humanify_text tool with directives ${JSON.stringify(preset.directives)} on this draft, then show me the rewrite and a short note on what changed:\n\n${draft}`,
          },
        },
      ],
    }));
  }

  server.prompt(
    'build-voice-profile',
    'Walk me through building my HumanifyMe voice profile.',
    {},
    () => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: 'Help me build my HumanifyMe voice profile. Ask me for at least 3 writing samples I actually wrote (emails, messages, posts), call humanify_add_sample for each with sensible context labels, then call humanify_build_profile and summarize the resulting profile for me in plain English.',
          },
        },
      ],
    }),
  );

  return server;
}
