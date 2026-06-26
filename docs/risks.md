# Risks Register

Live document. Add new risks as they surface. Each entry has: ID, description, likelihood, impact, mitigation, trigger to re-evaluate.

## Product risks

### R-01. First rewrite doesn't sound like the user

- **Likelihood:** medium.
- **Impact:** high, kills the first-impression conversion.
- **Mitigation:** the `build-voice-profile` skill nudges users toward varied samples; profile generation prompt prioritizes verbatim exemplars; survey loop drives prompt iteration in M2/M3.
- **Trigger:** "sounds like me" survey result falls below 60% in any 7-day window.

### R-02. The `humanify-pr` skill misfires

- **Likelihood:** medium.
- **Impact:** medium, either annoys users (fires too often) or is forgotten (fires too rarely).
- **Mitigation:** explicit trigger language tuned during alpha; per-skill enable/disable in `~/.humanifyme/config.json`.
- **Trigger:** alpha feedback flags the skill specifically.

### R-03. "AI humanizer" segment carries a sleazy connotation

- **Likelihood:** medium.
- **Impact:** medium.
- **Mitigation:** refuse the "GPTZero bypass" framing in all marketing; lead with privacy and voice fidelity; do not list HumanifyMe under "AI detection bypass" categories on marketplaces.
- **Trigger:** majority of inbound press requests use academic-integrity angles.

## Privacy and security risks

### R-04. Raw samples leak via a misconfigured request

- **Likelihood:** low (designed against it).
- **Impact:** existential.
- **Mitigation:** privacy-spec rules; CI checks for HTTP calls outside `src/engine/providers/`; audit log surfaces last 20 requests; redactor pre-stage.
- **Trigger:** any PR introduces a network call outside the engine layer.

### R-05. API key in `config.json` is readable by other local apps

- **Likelihood:** medium (file is `0600` but a compromised user-shell can read it).
- **Impact:** medium, user pays an LLM bill they didn't intend.
- **Mitigation:** prefer OS keychain (`keytar`) on macOS/Windows; document the risk; surface BYO-key usage caps.
- **Trigger:** an alpha user reports unexpected spend.

### R-06. Redactor misses a PII pattern

- **Likelihood:** medium.
- **Impact:** low to medium.
- **Mitigation:** user-extensible patterns in `config.json`; log redaction counts (not content); document as best-effort.
- **Trigger:** an alpha user reports a leaked identifier.

### R-07. Provider changes its data-use policy

- **Likelihood:** medium over a year.
- **Impact:** high if silent and unfavorable.
- **Mitigation:** quarterly review documented in the privacy spec; provider abstraction makes switching cheap; the audit tool shows current provider.
- **Trigger:** provider announcement.

## Engineering risks

### R-08. MCP SDK or host agent changes a protocol detail

- **Likelihood:** medium (the MCP ecosystem is young).
- **Impact:** medium, install or tool calls break on a subset of agents.
- **Mitigation:** pin SDK versions; test against each target host before release; release-note the SDK bump.
- **Trigger:** users report "install fails on [agent]."

### R-09. SQLite file lock contention with the CLI running while the MCP server is up

- **Likelihood:** low.
- **Impact:** low, operations retry cleanly.
- **Mitigation:** keep transactions short; never hold a write lock across a network call.
- **Trigger:** users report intermittent "database is locked."

### R-10. LLM cost runaway from abuse or bug

- **Likelihood:** low (BYO key transfers cost to the user).
- **Impact:** medium once we manage the key in Phase 3.
- **Mitigation:** per-day local rate limit (default 200); 8,000-char per-draft cap; rewrite cache.
- **Trigger:** any user reporting > $50/day spend during MVP.

### R-11. Schema-validation failures on LLM output

- **Likelihood:** medium.
- **Impact:** low, single retry + clear error.
- **Mitigation:** strict-output reminders in prompts; one retry; surface raw output to the user on second failure for debugging.
- **Trigger:** schema-fail rate > 5% in audit metrics.

### R-12. Multi-provider abstraction is bug-prone if rushed

- **Likelihood:** medium.
- **Impact:** medium.
- **Mitigation:** one provider (Anthropic) is the green path in CI; others gated on a recorded integration test fixture per provider.
- **Trigger:** any provider-specific PR adds a hack outside `providers/`.

## Market and strategic risks

### R-13. A host agent ships sample-derived voice natively (Cowork / Claude Code / Cursor / ChatGPT)

- **Likelihood:** medium over 12 to 18 months.
- **Impact:** high.
- **Mitigation:** privacy and brand moat; deeper profile schema than any native tool offers; cross-tool consistency story they can't match without disrupting their data businesses.
- **Trigger:** any of the host agents previews sample-derived voice.

### R-14. A copycat MCP launches first or undercuts on price

- **Likelihood:** medium (category is wide open; barrier is low).
- **Impact:** high.
- **Mitigation:** ship alpha + Cowork marketplace placement quickly; brand specificity; open-source privacy paths to make trust verifiable.
- **Trigger:** any voice-rewrite MCP listed in a target marketplace.

### R-15. "Sounds like me" is not a strong enough wedge to pay for

- **Likelihood:** medium.
- **Impact:** existential.
- **Mitigation:** free tier validates usage before paywall; if usage is high but paying is low, pivot toward sales segment with reply-rate analytics or team plans.
- **Trigger:** > 80% retention but < 5% conversion at 60 days post-paid-launch.

### R-16. Plugin marketplace rejects HumanifyMe over "AI rewriting" policy concerns

- **Likelihood:** low (we are not generating from scratch).
- **Impact:** high if it blocks a launch surface.
- **Mitigation:** clean privacy + non-evasion framing in the listing; engage reviewers proactively.
- **Trigger:** marketplace pre-submission feedback flags content.

## Process risks

### R-17. Premature backend build

- **Likelihood:** medium.
- **Impact:** delays MVP by weeks for negative product value.
- **Mitigation:** this register; explicit trigger conditions in `specs/backend-spec.md`.
- **Trigger:** any PR introduces a server or hosted endpoint before Milestone 6.

### R-18. Feature creep in MVP

- **Likelihood:** high.
- **Impact:** delays launch.
- **Mitigation:** `specs/mvp-spec.md` "out of scope" section is binding; task breakdown enforces a fixed task list per milestone.
- **Trigger:** any in-progress PR adds a feature not listed in `mvp-spec.md`.

### R-19. Drift back toward Chrome extension thinking

- **Likelihood:** low, medium (the original spec lived in this repo).
- **Impact:** medium, confuses contributors, slows them down.
- **Mitigation:** loud reminders in CONTRIBUTING.md and copilot-instructions; CI guard against `chrome.runtime` and `manifest.json` outside `plugin/`.
- **Trigger:** any new PR adds extension-shaped scaffolding.
