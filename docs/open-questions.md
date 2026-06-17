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

## Retrieval-augmented voice (RAG / persistent voice memory)

These were resolved on 2026-06-16 when Joshua directed the project toward RAG-based per-user voice memory. The decisions reverse the deliberate "no embeddings in MVP" stance in `specs/style-profile-spec.md` (see change note there) and are grounded in the existing `research/architecture-options.md`, which already ranks "structured profile + RAG keyed by style/semantic similarity" as the MVP foundation. These open Milestone M8 (T-61–T-66).

**Why now:** the rewrite engine reads a user's samples exactly once (at profile-build time) and never again. At rewrite time it sees only an abstract fingerprint plus a few static, draft-irrelevant snippets — so for any message type not captured in the fingerprint it falls back to lightly editing the draft. Retrieval supplies the missing evidence: the user's own past messages most similar to the current draft, injected as few-shot voice targets. This same local vector store is the "memory that persists across conversations" feature.

### Q-18. Embedding model — local, cloud, or which?

- **Blocks:** T-61.
- **Resolution (2026-06-16, revised same day):** **Pluggable embedders behind a local-only `EmbeddingProvider` interface.** The **default is a dependency-free lexical embedder** (token + char-n-gram hashing, TF-weighted, L2-normalized) that ships inside `dist` — zero native deps, zero install weight, works on every platform instantly, and computes entirely on-device. **Optional semantic upgrades** (selected via `rag.embedder` config) are local `all-MiniLM-L6-v2` (384-dim) via transformers.js/ONNX and Ollama embeddings (already an allowed local endpoint), both lazy-loaded so they are never required for the default path.
- **Why revised:** the initial decision made MiniLM the default. A spike install (validated cleanly on Node 24/Windows, exit 0 — so the native ONNX path works) confirmed transformers.js drags in a ~100 MB+ native onnxruntime that **every** `npm install humanifyme` would pull. For a privacy CLI people install to *try*, that is a real adoption barrier — the same lightweight instinct that drove the `node:sqlite`-over-`better-sqlite3` choice (Q-11). Lexical retrieval is strong for the short messages this tool targets (coworker pings, PR notes, commit messages), so a dependency-free default fixes the core "engine never sees your real past messages" bug for 100% of users with no friction; neural is the opt-in quality ceiling for users who want paraphrase-level matching.
- **Rationale (privacy):** commandment #1 ("raw samples never leave the device") is honored by **all** options — lexical and MiniLM run on-device; Ollama is local. No cloud embedding API in any default or recommended path.
- **Note (security, separate finding):** `npm audit` during the spike surfaced 6 high-sev advisories that are **pre-existing and unrelated to embeddings** — `diff` (prod dep; DoS in parsePatch/applyPatch, low real risk here since we diff local content) and `esbuild`/`vite`/`vitest` (dev-only build tooling, never shipped to users). Track a `diff` bump separately; not an M8 blocker.
- **Note (path reconciliation):** `tasks/test-plan.md` describes the outbound-destination scan as guarding `src/engine/providers/`, but providers actually live in `src/providers/`. The optional-neural sub-task (T-61) must reconcile this — keep the only HTTP-issuing modules in `src/providers/` and correct the test-plan path, or add the scan if it is doc-only today.
- **Status:** answered.

### Q-19. Retrieval keying — style-embedding, semantic, or hybrid?

- **Blocks:** T-64.
- **Resolution (2026-06-16):** **Semantic similarity (MiniLM cosine) with a recency tiebreaker** for MVP. Style-distance embeddings (Wegmann StyleDistance, per `research/`) are logged as a Phase-2 upgrade (T-67, future). Short coworker/PR messages of the same genre cluster semantically well enough to surface the right exemplars now; StyleDistance models are heavier and belong in the research roadmap's Phase 2.
- **Status:** answered.

### Q-20. Cold-start — when does retrieval turn on?

- **Blocks:** T-64, T-65.
- **Resolution (2026-06-16):** Enable retrieval at **≥ 5 samples** (config key `rag.minSamples`, default 5). Below the threshold, retrieval returns `[]` and the engine falls back to today's profile-only behavior plus a `notes` hint nudging the user to import their chat history (the T-10A/T-10B importers — the path from 3 samples to hundreds). Research notes retrieval "really shines" above ~50 samples; the importer makes that trivial to reach, so the low default threshold is safe and helps new users immediately.
- **Status:** answered.

### Q-21. Near-duplicate suppression / diversity?

- **Blocks:** T-64.
- **Resolution (2026-06-16):** **Maximal Marginal Relevance** (λ ≈ 0.7) over the top candidate pool, exact/near-dup drop at cosine > 0.97, final **K = 5** exemplars (config `rag.topK`). Prevents a cluster of near-identical past messages from crowding the prompt and starving diversity.
- **Status:** answered.

### Q-22. Relationship to the existing `profile.exemplars` field?

- **Blocks:** T-65.
- **Resolution (2026-06-16):** Retrieved, **draft-relevant** exemplars become the **primary** voice signal at rewrite time, rendered in a new prompt section ("Examples of how this person actually writes — most similar to your draft") presented as targets to emulate. The structured fingerprint remains the structural style spec; the old static `profile.exemplars` remain only as the cold-start fallback. Assembly = fingerprint (structure) + retrieved exemplars (phrasing/voice, draft-relevant) + draft.
- **Privacy condition:** embeddings are computed locally from **raw** sample text (better retrieval, nothing leaves the device), but every retrieved exemplar is passed through `redact()` **at send time** before prompt assembly — never trust store-time redaction.
- **Status:** answered.
