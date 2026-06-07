# Launch Plan

## Phases

1. **Closed alpha** (Milestone 5 complete). 10–30 invited users from Joshua's network, installing the unlisted plugin.
2. **Open beta** (Milestone 6 complete + landing page + marketplace listings live). Public Cowork and Claude Code plugin marketplace listings, "free, BYO key" beta, plus the install snippets for Cursor/Continue/Cline/Windsurf/Zed/ChatGPT desktop.
3. **Paid launch** (Milestone 7 + backend). Accounts, Pro plan, managed LLM key.

This document covers phases 1 and 2. Phase 3 gets its own plan after we have beta data.

## Closed alpha

### Who we recruit

- Joshua's direct network of developers, founders, and operators who already use Cowork, Claude Code, or Cursor daily.
- Target: 20 active alpha users across roles.
- Bias toward people who will give blunt feedback.

### How

- DM/email invite. A short Loom (≤ 2 min) showing plugin install → `/humanify-setup` → humanify a real PR description.
- Onboarding survey at end of week 1: "does it sound like you?" Y/Kinda/N + 1 free-text.
- Weekly office hours for 30 minutes.

### Exit criteria (must hit before open beta)

- ≥ 70% of alpha users report "sounds like me" after first rewrite.
- ≥ 50% of alpha users still rewriting in week 2.
- Zero privacy bugs in the alpha period.
- Plugin install succeeds on Cowork, Claude Code, and Cursor without manual intervention.

## Open beta

### Channels (ranked by expected fit)

1. **Cowork plugin marketplace** — front-page listing on launch day. Joshua's existing audience.
2. **Claude Code plugin marketplace** — submit early to allow review time.
3. **Twitter/X** — build-in-public thread. Demo videos of "Claude Code drafts a PR, HumanifyMe rewrites it in Joshua's voice." This is the most concrete and shareable demo we have.
4. **Indie Hackers** — launch post framed as "I got tired of every agent sounding the same, so I built this." Indie Hackers is more receptive to opinionated, narrow tools than HN is.
5. **Hacker News Show HN.** Time carefully. Lean into the MCP + privacy + structured profile angle.
6. **Cursor / Continue / Cline / Windsurf / Zed communities** — short posts in each agent's official Discord with the install snippet.
7. **r/ClaudeAI, r/cursor, r/MachineLearning** — value-first posts.
8. **Developer newsletter mentions** — Ben's Bites, TLDR, Pragmatic Engineer if we can land it.
9. **Product Hunt** — useful for SEO and a one-day burst, less useful for our target audience.

### What we explicitly do not do

- No SEO content farm.
- No paid ads at this stage.
- No "AI detection bypass" framing.
- No partnerships with AI-detector-evader sites.

### Messaging hierarchy

- Headline: **Make AI sound like you.**
- Sub: **An MCP plugin that learns your voice and rewrites your AI agent's output so it doesn't read as AI.**
- Three proof points (in this order):
  1. Voice profile derived from your own writing — not a generic preset.
  2. Local-first. Samples never leave your machine.
  3. Works in every MCP-compatible agent: Cowork, Claude Code, Cursor, Continue, Cline, Windsurf, Zed.

### Landing page (humanifyme.com)

- Hero: tagline + a single before/after example from a real developer PR description.
- Section: "How it works" — install plugin → build profile → agent humanifies output.
- Section: "Works in" — logos for Cowork, Claude Code, Cursor, Continue, Cline, Windsurf, Zed, ChatGPT desktop.
- Section: "What we don't do" — explicit anti-Grammarly framing.
- Section: Privacy. Plain English. Link to the privacy audit tool (`humanify_audit_list`).
- Section: Install — buttons for each agent linking to marketplaces or to `humanifyme.com/install/<agent>` snippets.
- No newsletter popup. No chat widget. No pricing on launch day — free BYO key.

### KPIs (first 60 days)

| Metric                            | Target              |
| --------------------------------- | ------------------- |
| Plugin installs (all agents)      | 2,000               |
| D1 retention                      | 55%                 |
| D7 retention                      | 35%                 |
| First-rewrite within 24h          | 65% of installs     |
| "Sounds like me" yes (survey)     | 70%                 |
| Marketplace ratings (avg)         | ≥ 4.5/5             |

D-retention targets are higher than the original extension plan because the developer audience is more deliberate about install/uninstall.

## Risks specific to launch

- **A native plugin from a marketplace's first-party tooling that does voice rewriting.** Mitigation: differentiate on profile rigor + privacy + brand. Build community around HumanifyMe specifically.
- **Plugin marketplace policy issue** (e.g., a reviewer flags "AI rewriting" generally as problematic). Mitigation: clean privacy story documented up front; engage reviewers actively.
- **A second voice-MCP launches the same week.** Mitigation: ship-by-being-specific — every demo is in Joshua's actual voice and shareable as-is.
- **The "humanifying agent output" framing confuses non-developers** who think we need their email. Mitigation: lead the landing page with concrete examples; downplay the abstract "MCP" framing on the marketing page (technical audience only).

## Post-launch first 4 weeks

- Weekly write-up on humanifyme.com/blog (or X thread) of what we shipped and what we learned.
- Read every review and Reddit comment. Reply to constructive ones.
- Ship one user-visible improvement per week minimum (new directive, better skill trigger, additional provider).

## When we kill the project (or pivot)

Set the kill criteria here, on purpose, before we get emotionally attached:

- < 200 installs at week 4 with active outreach.
- D7 retention < 15%.
- "Sounds like me" survey < 40%.

If we hit any of these, we pivot or stop, not double down on marketing.
