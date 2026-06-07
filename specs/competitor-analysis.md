# Competitor Analysis

The competitive landscape is different now that HumanifyMe ships as an MCP, not a Chrome extension. Some old competitors (Grammarly, Wordtune) become irrelevant because they don't live where our users live. New competitors emerge in the MCP and developer-tool space. Update at least quarterly.

## Categories (revised for MCP positioning)

1. **Other voice / writing MCPs** — closest competitors.
2. **Native AI personalization features** in our host agents — ChatGPT custom instructions, Claude Projects, Cursor rules, Cowork skills/profiles.
3. **General writing assistants** — Grammarly, Wordtune, HyperWrite. Adjacent but increasingly irrelevant to the MCP audience.
4. **Email-focused AI** — Superhuman AI, Shortwave, Lavender. Adjacent.
5. **Personal AI / memory MCPs** — emerging category.

## Detailed reads

### Other voice / writing MCPs

This is the category to watch. At spec time (June 2026), the MCP marketplace is young; comprehensive search for "voice rewrite" / "humanify" / "personal style" turned up adjacent tools but no direct competitors aimed at sample-derived voice fingerprints. Treat this as a *moving target* — re-survey monthly.

- **What direct competitors would do well:** distribution speed, marketplace placement, possibly first-mover branding.
- **What our advantage is:** depth of the structured profile, the brand specifically built around "stop sounding like AI," local-first privacy commitments codified in the privacy spec.
- **Action item:** monitor the Cowork and Claude Code marketplaces weekly during launch; if a direct competitor lists, decide within 48h whether to differentiate on price, scope, or marketing.

### Native AI personalization (the biggest substitutional threat)

#### ChatGPT custom instructions

- **What it does well:** built-in, free, zero install.
- **What it does poorly:** a few sentences of self-description, not derived from samples. Per-tool only. Doesn't apply to Claude or Gemini.
- **Implication:** substitute for the most diligent users; we win on rigor + cross-tool consistency.

#### Claude Projects

- **What it does well:** persistent context, custom instructions.
- **What it does poorly:** same as ChatGPT — manual config, no sample-derived profile, scoped to one tool.
- **Implication:** same as above.

#### Cursor `.cursorrules`

- **What it does well:** per-repo prompt customization. Developers know how to author them.
- **What it does poorly:** code-style focused. Not voice-rewrite for prose. Doesn't apply to Claude Code or ChatGPT.
- **Implication:** complementary, not competitive. A user can have `.cursorrules` for code style and HumanifyMe for prose voice.

#### Cowork skills + memory

- **What it does well:** native to the agent, learns user preferences over time.
- **What it does poorly:** memory is unstructured; doesn't expose a portable voice fingerprint other agents can use.
- **Implication:** Cowork could ship a voice-profile feature natively. Mitigation: we *are* a Cowork plugin; we benefit from Cowork's growth. If the host ships the feature natively, our value is cross-tool consistency.

### General writing assistants (mostly irrelevant in the new framing)

#### Grammarly

- **What they do well:** reach, brand recognition, polished UI.
- **What they do poorly for our wedge:** pushes writing toward a generic standard register. No MCP. Doesn't live where developers and agent users live.
- **Implication:** Grammarly is no longer a real competitor for our audience. We are anti-Grammarly in framing because the framing is still useful for marketing.

#### Wordtune

- **What they do well:** sentence-level rephrasing in-browser. Tone variants.
- **What they do poorly:** generic presets, no sample-derived profile, no MCP integration.
- **Implication:** adjacent, not competitive in the new framing.

#### HyperWrite

- **What they do well:** "personalized AI" branding, custom personas, browser-agent integrations.
- **What they do poorly:** persona setup is loose, not derived from samples. UX is unfocused. No MCP.
- **Implication:** validates the personal-voice framing exists; we differentiate on rigor.

### Email-focused AI (Superhuman AI, Shortwave, Lavender, Flowrite)

- **Net read:** All locked to specific email products. None offer cross-tool voice. None expose an MCP. Lavender remains a potential post-MVP integration partner for the sales segment.
- **Implication:** not directly competitive in the developer-agent wedge.

### Personal AI / memory MCPs

- **Examples:** emerging category — personal.ai-style services experimenting with MCP, locally hosted vector memory MCPs, "second-brain" MCPs.
- **What they do well:** persistent context.
- **What they do poorly for our wedge:** memory ≠ voice. They store *what* the user knows or has discussed, not *how* they write.
- **Implication:** adjacent. Future v2 integration: "humanify using my voice and my recent context." Today, distinct.

## Where the opportunity is

1. **Cross-agent voice consistency.** No one carries voice across Claude Code, Cursor, Cowork, and ChatGPT. Native tools are siloed. MCPs are mostly tools-not-style. We are the only one specifically targeting cross-agent voice.
2. **"Stop sounding like AI" framing.** Everyone else is "write better." We are "stop sounding like AI." Fresher, more emotional, more defensible.
3. **Local-first privacy.** Most personalization features rely on hosted state. We do not. This is a small but loud audience.
4. **Profile rigor.** A structured, editable profile with 25+ fields is more inspectable than any "custom instructions" textarea.
5. **Distribution timing.** MCP plugin marketplaces are early. First-mover advantage in the "voice" category is open.

## What kills us

- **A native voice profile feature inside Claude / ChatGPT / Cowork / Cursor that learns from samples with one click.** Most likely from Anthropic or OpenAI within 12–18 months. Our durable answer: brand specificity, cross-tool consistency, and a privacy posture native vendors can't match without disrupting their data businesses.
- **A copycat MCP from a better-funded team** that ships faster and undercuts on price. Mitigation: ship the alpha + Show HN + Cowork marketplace placement quickly; build a recognizable brand before the category fills up.
- **Marketplace policy shifts** that disadvantage third-party MCPs in favor of native features.

## Defensibility moves we can make early

- Lean on privacy/local-first as a brand position the native tools cannot copy.
- Invest in the profile schema and editor UX.
- Build a brand around "stop sounding like AI" — a name and tagline that don't generalize.
- Stay narrow on launch surfaces; depth across MCP beats breadth into webmail clients.
- Open-source the privacy-critical paths (redactor, request shape) so trust is verifiable, not asserted.

## Pricing benchmark snapshot

| Product             | Lowest paid tier    | Audience overlap with HumanifyMe |
| ------------------- | ------------------- | -------------------------------- |
| Grammarly Premium   | $12/mo              | low (different segment)          |
| Wordtune Pro        | $9.99/mo            | low                              |
| HyperWrite Premium  | $19.99/mo           | medium                           |
| Cursor Pro          | $20/mo              | high (same user)                 |
| Claude Pro          | $20/mo              | high (same user)                 |
| ChatGPT Plus        | $20/mo              | high (same user)                 |

Developer-agent users are already paying $20/mo to one of Cursor / Claude / ChatGPT. A $12/mo HumanifyMe Pro that complements rather than replaces is a defensible add-on. See `specs/pricing-spec.md`.
