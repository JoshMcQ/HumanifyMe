# Privacy & Security Spec

This is a load-bearing document. HumanifyMe's wedge is built on user trust. A single breach of these rules is a brand-ending event.

## The 10 commandments

1. **Local-first by default.** Raw samples never leave the device unless the user explicitly opts into cloud sync (post-MVP, off by default).
2. **No silent monitoring.** The MCP only acts when an agent calls one of its tools. No file watching, no clipboard listening, no agent-output observation outside of explicitly opted-in auto-humanify hooks (per `specs/mcp-server-spec.md`).
3. **Explicit opt-in for anything new.** Adding a new permission, a new host, or a new data path requires updating this spec and the onboarding consent flow.
4. **Send the minimum.** A rewrite request sends the draft and the style profile. Nothing else. Not page metadata, not headers from the email, not the recipient.
5. **Right to delete.** "Delete everything" is a single, prominent button. It wipes IndexedDB, `chrome.storage.local`, the in-memory cache, and the cache file. It is irrevocable.
6. **No selling data.** Hardcoded into the marketing site and the privacy policy.
7. **No training on user data.** We do not, and we instruct providers not to. See provider configuration below.
8. **Redact before sending.** Emails, phone numbers, postal addresses, API keys, and common secrets are masked before the text crosses the network.
9. **Logs do not contain content.** Metadata only.
10. **Be loud about what we send.** The privacy dashboard shows in plain text: what was sent in the last 10 rewrites (counts, sizes, providers), the current provider, the API key location.

## Threat model

| Adversary                          | What they want                                  | Mitigation                                                                 |
| ---------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------- |
| Curious MCP author (us)            | Read user data                                  | Code review, the rules above, open-source the privacy-critical paths.      |
| Malicious agent in the host        | Trick the MCP into exfiltrating samples         | Every outbound destination is a provider endpoint; no `humanify_*` tool exposes raw samples to non-LLM destinations. |
| LLM provider                       | Train on user inputs                            | Use providers' "do not train" flags; document which is set.                |
| Network attacker                   | Sniff requests                                  | HTTPS only; no plaintext requests anywhere.                                |
| Another local app                  | Read `~/.humanifyme/`                           | File perms (0600 on POSIX, ACLs on Windows); document the limit.           |
| User's own device compromise       | Read raw samples                                | Out of scope; we document that the SQLite DB is not encrypted at rest.     |
| Stolen API key                     | Run up the user's LLM bill                      | BYO key model means the user owns the bill; we surface usage warnings.     |
| Insider at us (future backend)     | Read synced samples                             | When we build sync, samples are E2E-encrypted with a user-derived key.     |

## Data classification

| Data                                | Class       | Where it lives                                                | Sent to LLM?       |
| ----------------------------------- | ----------- | ------------------------------------------------------------- | ------------------ |
| Raw writing sample                  | Sensitive   | `~/.humanifyme/data.db` (SQLite)                              | Only during profile build, redacted. |
| Imported chat / mail / message source archive | Sensitive | Not stored. Parsed in memory; only extracted samples persist. | No |
| Style profile (JSON)                | Sensitive\* | `~/.humanifyme/data.db`                                       | Yes, on every rewrite. |
| API key                             | Secret      | `~/.humanifyme/config.json` (0600), OS keychain when available | No (used to auth requests). |
| OAuth tokens (Phase 2 importers)    | Secret      | `~/.humanifyme/config.json` (0600), OS keychain when available | No (used to auth import fetches). |
| Draft to rewrite                    | Sensitive   | Memory only, not persisted                                    | Yes, redacted.     |
| Rewrite output                      | Sensitive   | Memory only, optional 24h cache in SQLite                     | N/A                |
| Telemetry events                    | Aggregate   | Local only by default; remote only if opted-in                | No                 |
| Error reports (opt-in)              | Aggregate   | Sent to error tracker if opted-in                             | No                 |

\*The style profile is derived from raw samples and could leak voice markers; treat as sensitive.

## Redaction rules

`redact(text)` masks:

- Email addresses → `[EMAIL]`
- Phone numbers (E.164 + common US formats) → `[PHONE]`
- US street addresses (best-effort regex + city/state patterns) → `[ADDRESS]`
- Credit card numbers (Luhn-checked) → `[CARD]`
- API key patterns: `sk-[A-Za-z0-9]{20,}`, `ghp_[A-Za-z0-9]{30,}`, `AIza[A-Za-z0-9_-]{30,}`, generic `Bearer\s+[A-Za-z0-9._-]{20,}` → `[API_KEY]`
- AWS access key IDs `AKIA[0-9A-Z]{16}` → `[AWS_KEY]`
- Common JWT pattern → `[TOKEN]`

After the LLM response, a `restore(text, redactionMap)` pass swaps the original tokens back in. The user sees their real email/phone, never the placeholders.

Redaction is best-effort and documented as such. If a user has a unique identifier the redactor misses, we add a pattern.

## Permissions audit (MCP model)

The MCP server has no permission system in the browser sense. Instead the constraints are:

- The server runs as the user's OS process and has access to the user's filesystem.
- The only paths it reads/writes are `~/.humanifyme/` (config + SQLite) and `$EDITOR` temp files when the user runs `humanifyme profile edit`. Plus user-supplied paths passed explicitly to an importer tool (e.g., the path to a ChatGPT export `.zip`) — those are read-only and the file is not copied to our directory; only extracted samples are persisted.
- For Phase 2 importers that use OAuth (Gmail) the MCP fetches from the third-party API directly. For the macOS Messages importer the MCP reads `~/Library/Messages/chat.db` *only after* the user has granted Full Disk Access in System Settings, and the file is opened read-only.
- The only outbound network destinations are the configured LLM providers (Anthropic, OpenAI, Gemini, Ollama) and, for Phase 2 importers, the third-party source's official API (Gmail, Slack, X, Substack). No other destinations.
- The MCP does not read environment variables other than `HUMANIFYME_HOME`, `HOME`, `EDITOR`, and provider-specific keys it's been explicitly told to read.
- The MCP does not spawn other subprocesses beyond `$EDITOR` for profile editing.

Adding a new outbound destination, filesystem path, or subprocess capability requires:

1. Updating this spec.
2. Updating the privacy policy on humanifyme.com.
3. A release note in CHANGELOG.md describing the new capability.

## Provider configuration

- **Anthropic:** set the `anthropic-no-train` request header (per Anthropic's documented controls) if available, or rely on Anthropic's default policy for API traffic.
- **OpenAI:** confirm the API is in the "data not used for training" tier by default (per OpenAI's API policy at time of integration). Re-verify on every provider integration PR.
- Re-verify provider data-use policies quarterly. Documented in `docs/risks.md`.

## Privacy policy and ToS

`humanifyme.com/privacy` and `humanifyme.com/terms` must say, in plain English:

1. What we collect (essentially nothing without opt-in).
2. What we send to LLM providers and which providers.
3. That we do not sell data or train on user data.
4. That a user can delete everything by clicking one button.

Draft lives in `docs/` under `legal/` once we get there.

## Audit log

The MCP exposes `humanify_audit_list` and the CLI exposes `humanifyme audit`, returning the last 20 outbound requests as: timestamp, provider, route (`/messages`, `/chat/completions`), payload size in bytes, draft length, profile included (yes/no). No content. The audit log exists so the user does not have to trust us — they can see the traffic.

## Incident response

If a sample exfiltration bug ships:

1. Yank the affected version from npm and the plugin marketplaces within the day.
2. Publish a fixed version (`humanifyme-mcp@<next>`); marketplaces auto-update.
3. Notify installed users via the plugin marketplace changelogs and a humanifyme.com banner.
4. Public post-mortem on humanifyme.com.

We pre-commit to this here so we don't argue about it under pressure later.
