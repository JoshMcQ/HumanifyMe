# Changelog

## Unreleased

- M8 retrieval-augmented voice / persistent local voice memory. At rewrite
  time the engine retrieves the user's most-similar past samples and injects
  them (redacted) as few-shot voice examples.
  - Local embeddings via transformers.js (`all-MiniLM-L6-v2`, ONNX); vectors
    stored in a new `sample_embeddings` table inside `~/.humanifyme/data.db`
    (cleared by `humanify_wipe_all`).
  - Retrieved exemplars are passed through `redact()` at send time before any
    network call, only redacted prose crosses the wire.
  - New local model-weights cache at `~/.humanifyme/models/`: a content-free,
    revision-pinned, offline-overridable one-time download. No embedding API
    call to a cloud provider in the default path.
  - Privacy spec (`specs/privacy-security-spec.md`) and data model updated to
    cover the new local data path.

## 0.1.0 to 2026-06-11 (beta)

First public release.

- MCP server (`humanifyme-mcp`) over stdio: `humanify_text`, sample tools,
  profile tools, provider tools, importers, audit, wipe. Resources
  (`humanify://profile`, `profile.md`, `audit.json`) and slash-command prompts.
- Voice fingerprint profiles: structured, schema-validated, user-editable.
  Context variants merged over a base voice.
- Rewrite engine: redact → prompt → provider → validate → restore → diff,
  with length policy, directive rules, 24h LRU cache, content-free audit log.
- Providers: Anthropic (default), OpenAI, Gemini, Ollama (BYO key / local).
- Importers: ChatGPT and Claude chat exports (user turns only, code-heavy
  turns dropped), and .txt/.md/.docx folders.
- CLI (`humanifyme`): setup, sample, profile, provider, rewrite, import,
  audit, wipe.
- Privacy: local-first (`~/.humanifyme/`), redaction before any network call,
  no telemetry, no backend. Storage on Node's built-in `node:sqlite`
  (requires Node ≥ 22.5; no native compilation in the install path).
- Plugin bundle for Cowork / Claude Code with skills: `humanify`,
  `build-voice-profile`, `humanify-pr`.
