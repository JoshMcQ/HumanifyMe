import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'humanifyme-mcp': 'src/mcp-main.ts',
    humanifyme: 'src/cli-main.ts',
  },
  format: ['esm'],
  outExtension: () => ({ js: '.mjs' }),
  banner: { js: '#!/usr/bin/env node' },
  platform: 'node',
  target: 'node22',
  splitting: false,
  clean: true,
  external: ['mammoth', 'adm-zip', 'node:sqlite'],
  // node:sqlite must keep its protoc