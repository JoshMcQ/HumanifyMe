# Open Questions

These need answers from Joshua (the user) before specific milestones can complete. Coding agents that hit one of these stop and surface, rather than guessing.

Format: `Q-NN. Question. Blocks: <what>. Notes: <considerations>. Status: open | answered`.

---

## Resolved (kept here so future readers see the history)

### Q-01. Is "HumanifyMe" the final name?

- **Status:** answered (2026-06-03).
- **Resolution:** Locked. **HumanifyMe**. Joshua has purchased humanifyme.com.

### Q-02. Tagline lock?

- **Status:** answered (2026-06-03).
- **Resolution:** **Make AI sound like you.** Secondary on-page hook: "Stop sounding like AI."

### Q-03. Provider choice for MVP?

- **Status:** answered (2026-06-03).
- **Resolution:** Multi-provider from launch. Anthropic, OpenAI, Gemini all wired in MVP. Ollama follows in the first weeks. No "default-first" provider — the user picks during onboarding.

### Q-04. Should we support local models in MVP?

- **Status:** answered (2026-06-03).
- **Resolution:** Yes, via Ollama. Estimated effort: 3–5 days now that the provider abstraction is in place (revised down from the original 2-week estimate, which assumed a custom integration path).

### Q-MVP. Chrome extension vs MCP?

- **Status:** answered (2026-06-03).
- **Resolution:** **MCP only.** Drop the Chrome extension entirely. Distribute as a plugin in every MCP-compatible agent. See `specs/mcp-server-spec.md` and `specs/plugin-spec.md`.

---

## Open

## Privacy and policy

### Q-05. Do we open-source the privacy-critical modules?

- **Blocks:** nothing immediately; affects positioning.
- **Notes:** Open-sourcing `src/privacy/`, `src/engine/`, and the rewrite request shape gives users (and reviewers) a way to verify our claims. Risk: copycats can build on top. Recommendation: MIT-license the privacy and request layers; keep skills, plugin packaging, and any future paid features proprietary.
- **Status:** open.

### Q-06. Where does the privacy policy live and who drafts it?

- **Blocks:** Milestone 6.
- **Notes:** Plain-English draft in this repo; legal review by a startup-friendly lawyer before public launch. Budget ~$1.5k.
- **Status:** open.

### Q-07. OS keychain integration scope?

- **Blocks:** Milestone 1 / Milestone 5.
- **Notes:** `keytar` works on macOS and Windows; Linux has many keychain implementations and is more fragile. Recommendation: macOS + Windows in MVP; Linux falls back to file with a logged warning.
- **Status:** open (recommend the fallback approach).

## Recruiting and launch

### Q-08. Alpha cohort — names, when, how recruited?

- **Blocks:** Milestone 7 entry.
- **Notes:** Target 20 active users. Recommendation: draft a list of 50 candidates from Joshua's network, target a 40% acceptance rate. List lives in a private doc, not this repo.
- **Status:** open.

### Q-09. Marketplace submission timing?

- **Blocks:** open beta launch.
- **Notes:** Submit Cowork and Claude Code marketplace listings during late M5 so review time runs in parallel with M6 (landing page). Avoid timing the public launch against rumored Anthropic / OpenAI / Cursor announcements.
- **Status:** open.

### Q-10. Hacker News timing?

- **Blocks:** open beta marketing plan.
- **Notes:** Tuesday or Wednesday morning Eastern. Avoid the week of major host-agent launches.
- **Status:** open.

## Engineering

### Q-11. SQLite client: `better-sqlite3` or `node:sqlite` (Node ≥ 22 builtin)?

- **Blocks:** T-02.
- **Notes:** `better-sqlite3` requires a native build (npm install pain on Windows). `node:sqlite` (builtin in Node 22+) avoids native deps but means we drop Node 20 support. Recommendation: `better-sqlite3` for now (we want Node 20 compat for older host agents); revisit in 6 months.
- **Status:** open.

### Q-12. CLI framework: `commander`, `citty`, or `clipanion`?

- **Blocks:** T-09.
- **Notes:** `commander` is the boring default. `citty` is smaller and ESM-native. Recommendation: `citty` for bundle size.
- **Status:** open.

### Q-13. Where do we host humanifyme.com?

- **Blocks:** Milestone 6.
- **Notes:** Cloudflare Pages (confirmed by Joshua) + Astro static site.
- **Status:** confirmed Cloudflare; Astro is recommended.

## Data model and product

### Q-14. Should the user be able to have multiple profiles in MVP?

- **Blocks:** profile schema (`id: 'current'`) — currently singleton.
- **Notes:** Some users have a distinct "work me" and "personal me" voice. Doing it now means doubling the editor UX. Recommendation: singleton for MVP; first paid feature in v1.0.
- **Status:** open (recommend defer).

### Q-15. Should the MCP have an auto-humanify hook for Cowork at launch?

- **Blocks:** Milestone 4.
- **Notes:** Auto-humanify (rewrite the agent's output before the user sees it) is the most magical demo we have, but it's also the most invasive. Cowork's hook API may or may not support what we need by launch. Recommendation: ship the manual `humanify_text` path in M4; the auto-humanify hook is a fast-follow if the API supports it.
- **Status:** open.

### Q-16. Should we ship a `commit` context label and skill in MVP?

- **Blocks:** Milestone 4 (skills).
- **Notes:** Commit messages are a high-value developer surface. Adding `commit` to the label set is cheap. A skill is more work. Recommendation: add the label; defer the skill to post-MVP unless alpha demands it.
- **Status:** open.

### Q-17. Pricing model when we ship Pro — flat $12 or usage-tiered?

- **Blocks:** Phase 3.
- **Notes:** Current spec says flat $12/mo with 500 rewrites cap and overage on the Power tier. An alternative: usage-tiered ($5 / 100 rewrites, $12 / 500, $29 / 2500). Recommendation: stick with flat tiers; usage-tiered is harder to communicate.
- **Status:** open.
