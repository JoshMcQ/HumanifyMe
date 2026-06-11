# Marketplace listing copy

Reused across Cowork, Claude Code, and future marketplaces. Keep in sync.

## One-line

Make AI sound like you.

## Five-line (cards)

Your agent drafts emails, PR descriptions, and replies — and they all sound like AI.
HumanifyMe learns your actual voice from your real writing and gives every MCP agent
a `humanify_text` tool that rewrites drafts as *you*: your phrases, your punctuation,
your way of disagreeing. Local-first: samples never leave your machine. Bring your
own API key. Free.

## Thirty-line (listing page)

**The problem.** Everything your agent writes has the same tell: balanced paragraphs,
"delighted," em-dashes, corporate warmth. Recipients notice. The text is fine — it's
just not *you*, and that costs trust in exactly the messages that matter.

**What HumanifyMe does.** It builds a *voice fingerprint* from 3+ samples of your real
writing — sentence rhythm, formality, your signature phrases, the words you'd never
use, how you apologize, how you push back. Your agent then calls `humanify_text` to
rewrite any draft against that fingerprint. The edits are small and that's the point:
an em-dash becomes your comma, "whenever you have time" becomes "whenever you get a
chance," and suddenly it reads like you typed it.

**Three bundled skills** make it automatic:
- `humanify` — triggers on "make this sound like me" / "less AI".
- `build-voice-profile` — guided setup; can bulk-import your ChatGPT/Claude export.
- `humanify-pr` — PR descriptions and commit messages in your voice, every time.

**Privacy, structurally.** No account. No telemetry. No backend. Samples and profile
live in `~/.humanifyme/` on your machine. Outbound traffic goes only to the LLM
provider you configure with your own key (Anthropic, OpenAI, Gemini, or local
Ollama — which means zero egress). Emails, phones, addresses, and API keys are
redacted before any text leaves, and a content-free audit log shows every request.
One command deletes everything.

**The profile is yours to read and edit.** It's structured JSON with a plain-English
summary — not an opaque embedding. If it gets your voice wrong, fix the field and
the fix sticks.

Free during beta, BYO key. Requires Node ≥ 22.5.

## Privacy attestations (same answers on every marketplace form)

- Telemetry: none.
- Data collected by developer: none. No backend exists.
- Writing samples: stored locally only; sent (redacted) solely to the user-configured LLM provider.
- Account required: no.
- Network destinations: user-configured LLM provider endpoints only.
- Deletion: `humanifyme wipe --confirm`, irrevocable, complete.

## Support

support@humanifyme.com

## Screenshot / screencast shot list (4 + 1)

1. Before/after card: the "Hey John" flash-script message (real demo from the landing page).
2. `humanifyme profile show` output — the plain-English fingerprint.
3. `humanifyme audit` output — the content-free outbound log.
4. Agent conversation: "draft a PR description, then humanify it" → tool call → result.
5. (Screencast, 30s) Same flow as #4, ending on the before/after toggle.
