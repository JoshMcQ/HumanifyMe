# Sample Ingestion Spec

## Why this document exists

Five manually pasted samples is not enough to build a profile that survives the "does it sound like me?" test for the average user. Robust context variants (how you write annoyed vs. polite, in email vs. on LinkedIn, to a friend vs. to your boss) need 20–50 samples *per context*. Nobody manually pastes 250 things. So bulk ingestion of the user's actual writing history is the unlock that takes voice fidelity from "kind of close" to "yes that's me."

The design challenge: bulk ingest without violating the local-first privacy commitment.

## Principles

1. **The user authorizes every importer explicitly.** No auto-discovery, no background watching.
2. **Only the user's own text is ingested.** Other people's messages are filtered out before they reach the redactor.
3. **Parse locally, discard the source.** We open the archive, extract user-authored samples, redact, ingest, and delete the parsed-but-unstored content from memory. The raw archive on disk is the user's; we don't keep our own copy.
4. **OAuth tokens (when used) live in `~/.humanifyme/` with the same perms as the API key.** Read-only scopes only. Never write scopes.
5. **Every importer surfaces a count and preview before commit.** "Found 1,247 messages you authored. Add the first 100 as samples? Show me first."
6. **Audit log records every import event** (counts, source type, timestamp; no content).

## Importers, by phase

### MVP — local file uploads only (no OAuth, no permissions, no servers)

#### `humanify_import_chat_export`

Accepts an export archive from OpenAI's ChatGPT data export or Anthropic's Claude data export.

- **Input:** path to a `.zip` or extracted directory.
- **Format detection:** by file name pattern (`conversations.json` for ChatGPT, similar for Claude).
- **Extraction:** parse JSON, iterate conversations, for each turn check `role`. Keep `user` role turns only. Drop `assistant`, `system`, `tool`, etc.
- **Filtering:** drop turns shorter than 60 chars (probably a quick question, not voice-worthy). Drop turns that are clearly code or commands (heuristic: > 50% non-prose characters).
- **Labeling:** infer context per turn. Heuristics: turn that includes "subject:" or "dear" → `email`. Turn that starts with "lol" / "haha" / lowercase → `casual`. Turn with sales-like phrases ("following up," "circling back") → `sales`. Default `professional`. The label is a hint; the user can re-label in batch.
- **Preview:** return the first 5 extracted samples with inferred labels for user confirmation.
- **Commit:** on confirm, all samples go through the redactor and into the `samples` table.
- **Discard:** the parsed archive is not stored anywhere by us; user's original `.zip` stays where it was.

Why this is in MVP: ChatGPT and Claude both expose data exports through user settings. No OAuth, no permissions, no servers. The user already has the file; we just parse it. Largest single source of "free" samples for the MVP audience.

#### `humanify_import_text_files`

Generic importer for a list of text files.

- **Input:** glob pattern or directory path, plus a default label.
- **Accepted formats:** `.txt`, `.md`, `.docx` (via mammoth).
- **Behavior:** each file becomes one sample with the supplied label. Files < 100 chars are skipped. Files > 8000 chars are split at paragraph boundaries.
- **Use case:** writers with an Obsidian vault, a `/writings/` folder, a Substack export.

#### `humanify_import_paste`

Already supported via `humanify_add_sample`; called out here for completeness.

### Phase 2 — OAuth-based importers (post-MVP, pre-monetization)

#### `humanify_import_gmail_sent`

- **Input:** none beyond OAuth.
- **OAuth scope:** `https://www.googleapis.com/auth/gmail.readonly`. Read-only.
- **Behavior:** authenticate once. Fetch messages from `Sent` label. For each, extract the body text the user typed (strip quoted replies, signatures, HTML chrome). Filter out messages < 100 chars, automated replies, and out-of-office templates. Drop the `[EMAIL]`/`[PHONE]`/etc. content via the redactor.
- **Quota:** import the most recent N (default 500) so we don't hammer Gmail's API or overwhelm the profile.
- **Preview before commit:** same pattern as the chat-export importer.

Privacy notes: the OAuth token is stored in `~/.humanifyme/` (0600). The fetch happens from the MCP process on the user's machine, not from a server we control. The raw messages are processed in memory and the only thing persisted is the extracted, redacted samples.

#### `humanify_import_slack_export`

- **Input:** path to a Slack workspace export `.zip`.
- **Behavior:** parse the export, filter to messages where the user is the author (`user_id` matches their Slack ID), filter out emojis-only / link-only messages, redact, ingest.
- **Note:** workspace admins control the export. We surface a help link explaining how to request a self-export.

#### `humanify_import_messages_macos`

- **Input:** none beyond confirming macOS + a permission grant.
- **Behavior:** open `~/Library/Messages/chat.db` (SQLite). Query `SELECT text FROM message WHERE is_from_me = 1 AND text IS NOT NULL`. Filter for length > 60 chars, redact, ingest, label `casual` or `text` by default.
- **macOS only.** Requires the MCP process to have Full Disk Access (a system prompt the user must approve in System Settings). The tool detects the missing permission and surfaces clear instructions.
- **Strictly local.** The DB never leaves the device. Even our internal logs do not include message content.

#### `humanify_import_x_archive` / `humanify_import_substack_export`

Same shape as the chat-export importer. Cheap once the archive parser exists.

### Phase 3 — Active learning (the second engine)

#### Accept/reject signal collection

When the host agent supports it, the MCP records whether the user accepted (took the rewrite verbatim), edited (took the rewrite then changed it), or rejected (asked for another directive or dismissed). The signal is content-free; we record what the directive was and a hash of the rewrite, not the rewrite itself.

After ~30 accept signals, the MCP offers: "Update your profile with what I've learned from your edits?" If yes, we re-run a profile refresh that incorporates the patterns from accepted/edited rewrites alongside the existing samples.

This is how quality keeps improving without re-importing. Most users will get the bulk of their voice fidelity gains from active learning over time, not from one-shot import.

#### Explicit "this isn't me" feedback

Even without an accept/reject hook, the user can call `humanify_flag_rewrite { rewriteHash, reason }` to mark a specific rewrite as off-voice. We collect these into a feedback table; profile refreshes weight them as negative samples.

## What we never do

- **Watch chats in real time.** Importers are batch only, user-initiated.
- **Ingest other people's text.** Authorship filtering is the very first step after parsing.
- **Keep our own copy of the source archive.** Parsed and discarded.
- **Write to any third-party service.** Scopes are read-only.
- **Phone home.** Importers run on the user's machine and talk only to the source service.

## Tools added by this spec

| Tool                                  | Phase | New OAuth? | Source                             |
| ------------------------------------- | ----- | ---------- | ---------------------------------- |
| `humanify_import_chat_export`         | MVP   | no         | ChatGPT / Claude export `.zip`     |
| `humanify_import_text_files`          | MVP   | no         | Local text/markdown/docx files     |
| `humanify_import_gmail_sent`          | P2    | yes (read) | Gmail Sent folder                  |
| `humanify_import_slack_export`        | P2    | no         | Slack workspace export             |
| `humanify_import_messages_macos`      | P2    | no (Full Disk Access) | macOS `chat.db`         |
| `humanify_import_x_archive`           | P2    | no         | X/Twitter archive                  |
| `humanify_import_substack_export`     | P2    | no         | Substack export                    |
| `humanify_flag_rewrite`               | P3    | no         | User feedback                      |

Each tool is a separate task with its own AC; T-IDs slot into `tasks/task-breakdown.md` at the right milestones.

## Sample volume estimates (informs profile quality)

| User type                            | MVP path                                   | Realistic sample count |
| ------------------------------------ | ------------------------------------------ | ---------------------- |
| Manual paste, no import              | 5 samples                                  | 5                      |
| ChatGPT exporter                     | ChatGPT export (1 yr of use)               | 300–2000               |
| Heavy emailer + Gmail importer       | Gmail Sent last 500                        | 300–500                |
| macOS power user                     | Messages DB + email                        | 1000–10,000            |
| Writer with Obsidian / Substack      | text-files importer                        | 100–1000               |

The profile generator caps at 200 samples per build pass; more than that yields diminishing returns and inflates LLM cost. The full sample store remains in SQLite for future re-builds and active-learning passes.

## Spec impact on other documents

- `specs/mvp-spec.md` — adds `humanify_import_chat_export` and `humanify_import_text_files` to the MVP tool list. These were missing from the prior version.
- `specs/privacy-security-spec.md` — `Permissions audit` section now lists `keytar` (already there) and OS-level Full Disk Access on macOS (Phase 2). OAuth tokens added to the data classification table.
- `docs/data-model.md` — `samples` table gains an optional `source` column (`paste|chatgpt|claude|gmail|slack|messages|text-file|active-learning`) so we can show breakdowns in the audit view.
- `tasks/task-breakdown.md` — two new tasks at the end of M1 for the MVP-tier importers.
