# Product Spec: HumanifyMe

## One-line description

HumanifyMe is an MCP server that learns how you actually write and rewrites your AI agent's output in your authentic voice, installed as a plugin in Cowork, Claude Code, Cursor, and every other MCP-compatible agent.

## The problem

People increasingly delegate writing to AI agents. A developer asks Claude Code for a commit message. A founder asks Cowork for a follow-up email. A PM asks Cursor for a PR description. A salesperson asks ChatGPT for outreach. The agent produces competent prose with a recognizable signature: balanced sentence length, hedging adverbs ("certainly," "essentially"), a default warmth dial, parallel triplets ("clear, concise, and impactful"). Recipients are now attuned to this pattern. The cost shows up as:

- Cold emails that read as AI and get ignored.
- PR descriptions that say nothing in 200 words.
- LinkedIn posts that feel performative and lose trust.
- Personal replies sounding like someone else.
- Internal Slack messages that read as press releases.

The existing "fix", Grammarly, Wordtune, "AI humanizer" SaaS, browser sidebars, normalizes text toward a generic professional register. That makes the problem worse: it strips out the personal markers that would make the writing sound human in the first place.

## The insight

People do not want their writing to be better in the abstract. They want it to be *theirs*. And the writing they need humanified is increasingly being produced by an agent inside their own development or workflow tools, not pasted into Gmail after the fact. That means the right place to humanify is *inside the agent*, before the output ever reaches the human.

## What HumanifyMe is

A voice engine, packaged primarily as an MCP server, that:

1. Builds a structured, private profile of how one specific user writes, across explicit contexts (casual, professional, annoyed, polite, direct, sales, email, text/message, LinkedIn, commit, pr, slack).
2. Ingests writing samples flexibly, manual paste at minimum, plus local-only bulk importers (ChatGPT / Claude data export at MVP; Gmail Sent / Slack export / macOS Messages / X archive / Substack post-MVP). See `specs/sample-ingestion-spec.md`.
3. Installs as a plugin in any MCP-compatible agent, Cowork, Claude Code, Cursor, Continue, Cline, Windsurf, Zed, ChatGPT desktop, with one click. The MCP server exposes `humanify_text` so the agent can rewrite its own draft output mid-workflow.
4. Bundles skills that teach the agent when to reach for `humanify_text` automatically (PR descriptions, commit messages, drafted emails, Slack messages).
5. Has a consumer surface at humanifyme.com: a "paste and humanify" page that lets anyone try the engine in 30 seconds without installing anything. Post-MVP this grows into a browser extension, a macOS menu-bar app, and mobile share-sheet extensions, all sitting on top of the same engine (Phase 2).
6. Stores everything locally in `~/.humanifyme/` (for the MCP) or in a single Cloudflare Worker behind a strict per-IP rate limit (for the web paste tool, which holds no persistent state). Samples never leave the device in the MCP path.

## What HumanifyMe is not

- Not Grammarly. We do not correct grammar.
- Not a tone normalizer. We do not push toward "professional."
- Not an AI-detection bypass tool, marketed as such.
- Not *primarily* a Chrome extension. (The MCP is the canonical product; a browser extension is one of several consumer surfaces that sit on top of the engine in Phase 2.)
- Not a writing assistant that suggests continuations.
- Not a memory tool. We do not retain conversation history across sessions in MVP.
- Not a team collaboration tool in MVP. Profiles are personal and local.
- Not, in MVP, primarily a hosted service. The MCP runs on your machine. The web paste tool is a tiny edge function with no persistence.

## Target users (rewedged for MCP distribution)

Ranked by wedge strength for the MVP launch:

1. **Developers using Claude Code / Cursor / Cowork.** The agent drafts commits, PRs, slack updates, release notes, and email drafts. They are MCP-native, trust the distribution channel, and have an immediate, daily use case. Highest wedge strength.
2. **Founders, indie hackers, and solo operators** using agents (Cowork especially) for outbound and replies. High pain, high willingness to pay, reachable via Twitter/X and Indie Hackers.
3. **Power AI users** with multiple agent installs (Cursor + Claude Code + ChatGPT desktop). Distinguishing feature: their voice should be consistent across agents, which only an MCP can deliver.
4. **Salespeople and recruiters** using AI agents for outreach. Pain is acute and measurable (reply rate). Deprioritized until v1.1 because they are less likely to be MCP-native today.
5. **Students** writing essays. High volume but trust/ethics flags; deprioritized.

Launch wedge: developers in the Cowork and Claude Code plugin marketplaces, plus a secondary push to Cursor users via the install-snippet path.

## Brand and positioning

- Name: **HumanifyMe**. Locked. Domain humanifyme.com purchased.
- Tagline: **Make AI sound like you.** Locked.
- Secondary hook: **Stop sounding like AI.**
- Voice: dry, specific, slightly contrarian. Anti-corporate. The product copy itself must not read as AI-written.

## Success criteria

- A user can go from plugin install → first humanified rewrite in under three minutes.
- After importing five labeled samples per context, the rewrite is recognizable as the user's voice to the user (self-reported "sounds like me" ≥ 70%).
- 30-day retention ≥ 30% for plugin installs (developer audience is stickier than browser-extension audience).
- ≥ 30% of free users hit the BYO-key bring-your-own-LLM-bill ceiling within their first 30 days and convert to managed-key Pro when that ships.

## Tradeoffs and rejected alternatives

| Decision                                                          | Rejected alternative                                          | Why                                                                                                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| MCP server distributed as a plugin                                | Chrome extension on Gmail/LinkedIn (original spec)            | Users increasingly draft inside agents, not webmail. MCP gives one build, every agent integration. Privacy story is stronger (no host perms).  |
| Local stdio MCP                                                   | Hosted/remote MCP from day one                                | Local matches the privacy wedge. Hosted requires accounts, billing, and a backend we don't yet need.                                           |
| Multi-provider at launch                                          | One provider first (originally Anthropic-first)               | Users have different LLM accounts. Locking to one provider would block half the launch audience day one.                                       |
| Prompt engineering + structured profile                           | Fine-tune per user                                            | Cost, latency, vendor lock-in, and slow iteration. Prompt engineering hits 80% for 5% of the work. Revisit in v2.                              |
| Local-first storage                                               | Server-side accounts with sync from day one                   | Privacy is the moat. A leak of raw samples is a brand-ending event. Optional sync ships later behind a clear opt-in.                           |
| Explicit context labels chosen by the user                        | Auto-cluster samples by inferred tone                         | Auto-clustering is unreliable on small sample sizes and makes the profile feel opaque. Explicit labels are inspectable and editable.           |
| BYO API key for MVP, paid managed key in v1                       | Free forever, ads-supported                                   | Ads on a privacy-marketed tool is a contradiction. BYO + Pro is the right alignment.                                                            |
| Bundled skills in the plugin (auto-trigger humanify_text)         | Tool exposure only, user must invoke explicitly               | Skills make the plugin feel native to the agent. Without them, users forget HumanifyMe exists between sessions.                                 |

## Out of scope (forever, not just MVP)

- Generating writing from scratch without a user-supplied draft. We are a rewriter, not a generator.
- Acting as an AI-detection bypass tool, marketed as such.
- Reading the user's filesystem, mailbox, or messages without an explicit tool call.
- Selling user data. Training third-party models on user data.

## Out of scope for MVP (revisit later)

See `specs/mvp-spec.md`.
