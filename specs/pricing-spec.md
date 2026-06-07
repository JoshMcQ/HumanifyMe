# Pricing Spec

## Goals

- Validate willingness to pay before building a backend.
- Align our incentives with users (no ads, no data sale).
- Avoid the "free tier is too generous, no one upgrades" trap.

## MVP pricing — "BYO key beta"

For the duration of MVP and early beta (Milestones 1–6), pricing is:

- **Free, BYO key, unlimited rewrites.**
- No account.
- All cost is the user's LLM API spend.
- The plugin is free on every marketplace.

This is deliberate: it removes our cost ceiling, eliminates the auth surface, and lets us learn what users actually do without paywalls obscuring behavior. It also fits MCP norms — most MCPs in the marketplaces today are free; charging for the MCP itself would limit install velocity.

## v1.0 pricing (when we add accounts + managed LLM, Milestone 6+)

Two-tier consumer pricing:

| Plan         | Price            | Includes                                                                                   |
| ------------ | ---------------- | ------------------------------------------------------------------------------------------ |
| **Free**     | $0               | BYO key, all features, no rewrite quota (user pays the provider).                          |
| **Pro**      | $12/mo or $108/yr | We manage the LLM key. 500 rewrites/month. Cross-device sync. Priority provider routing.   |

### Why $12/mo

- Cursor, Claude, and ChatGPT Plus are all $20/mo. We price below them so HumanifyMe Pro looks like a clear add-on, not a competing subscription.
- Grammarly Premium is $12/mo. Wordtune Pro is $9.99/mo. We sit between, signaling "professional tool" without impulse-buy pricing.
- $108/yr = 9 months equivalent, the typical 25% annual discount.
- 500 rewrites/month covers ~20 work days × ~25 rewrites/day — generous for most users, constraining for power users (who upgrade to Team or accept overage pricing).

### Why no $5 entry tier

Tested rationale (to revisit with data): a $5 tier underprices the LLM unit economics if a user is even mildly active. The "we manage the LLM key" promise breaks if 30% of paying users are net-negative margin.

## v1.1 pricing (post-launch, with data)

| Plan        | Price             | Includes                                                                                |
| ----------- | ----------------- | --------------------------------------------------------------------------------------- |
| Free        | $0                | Unchanged.                                                                              |
| Pro         | $12/mo            | Unchanged.                                                                              |
| **Power**   | $29/mo            | 2,500 rewrites/month, longer drafts, model choice (Claude Opus / GPT-4o), API access.   |
| **Team**    | $20/seat/mo, 3+   | Pro + shared style profiles per team channel + admin controls (sample-sharing settings).|

Team gets prioritized only if we see a strong signal of multi-seat install during MVP (≥ 10% of installs come from the same email domain).

## Free vs. paid feature split

| Feature                                            | Free | Pro |
| -------------------------------------------------- | :--: | :-: |
| Sample import + edit + delete                      |  ✅  | ✅  |
| Style profile generation                           |  ✅  | ✅  |
| Rewrites with BYO key                              |  ✅  | ✅  |
| MCP install in every host agent                    |  ✅  | ✅  |
| Bundled skills (humanify, build-voice-profile, humanify-pr) | ✅ | ✅ |
| Privacy audit (`humanify_audit_list`)              |  ✅  | ✅  |
| Managed LLM key (no BYO needed)                    |   ❌ | ✅  |
| Cross-device sync of profiles                      |   ❌ | ✅  |
| Provider failover (Anthropic ↔ OpenAI ↔ Gemini)   |   ❌ | ✅  |
| Tone presets ("annoyed but professional", etc.)    |  ❌  | ✅  |
| Multiple profiles (work / personal)                |  ❌  | ✅  |
| Auto-humanify hooks (on agent output)              |   ❌ | ✅  |

The free tier is genuinely usable. Paid is for users who do not want to manage their own API key — a real, monetizable convenience.

## What will not be paywalled

- Privacy and deletion.
- Number of samples.
- Number of context labels.
- Support for any of the four launch sites.

Locking privacy features behind a paywall is hostile and undermines the brand.

## v2 features that come back later

- API access (Power tier).
- Team profiles (Team tier).
- A "fine-tune" tier with per-user model adaptation if the data justifies it.

## Refund policy

- Pro plan: 14-day no-questions refund on first subscription.
- Annual plan: prorated refund within 30 days.

## Acquisition pricing

- Lifetime AppSumo-style deal: no, do not run this. It attracts a customer base that pulls the roadmap in the wrong direction (compliance complexity, support load, low NPS).
- Annual prepay discount: yes, see above.
- Student discount: 50% off Pro with .edu verification. Defer to v1.1.
- Free for journalists, educators: case-by-case via email. Documented in `docs/open-questions.md`.
