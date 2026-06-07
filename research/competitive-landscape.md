# Competitive Landscape: What Existing Products Actually Do

This document reports what existing personal-voice / writing-style / personalized-AI products actually do under the hood, based on engineering blog posts, technical disclosures, and credible reverse-engineering. Marketing copy is noted as such and treated skeptically.

Last updated: June 2026.

---

## Category 1 — Direct technical analogs (voice / style matching)

### HyperWrite Personas

- **Claimed architecture:** Custom fine-tuned Llama 3 70B with user-supplied (Instructions + Examples + Background).
- **Source:** HyperWrite's own blog post "Introducing Personas: Teach Your AI to Write Just Like You" — confirms the Llama 3 70B fine-tune.
- **Engineering reading:** The base model fine-tune is a global "human-sounding" tune; the personalization itself is prompt-conditioned few-shot with user-supplied exemplars. Not per-user fine-tuning.
- **Privacy posture:** Cloud-only. Inputs sent to HyperWrite's hosted model.
- **Pricing:** $19.99–$59.99/mo.
- **What HumanifyMe does differently:** MCP/plugin distribution (multi-host), structured profile schema rather than free-form persona, local-first storage, multi-provider rather than locked to HyperWrite's stack.

### Wordtune (AI21)

- **Claimed architecture:** Built on AI21's Jurassic models; tone sliders (formal/casual/short/long) + paraphrase candidates.
- **Engineering reading:** No credible evidence of sample-derived voice learning. "Your style" in marketing refers to tone sliders. Enterprise has RAG over company wikis.
- **Privacy:** Cloud-only.
- **Pricing:** $9.99/mo entry tier.
- **What HumanifyMe does differently:** Sample-derived profile vs. tone-slider presets.

### Lavender (sales email coach)

- **Claimed architecture:** Heuristic scoring + prompt engineering. They analyze recipient signals (LinkedIn, news) and score outgoing email on length, subject, reading level, personalization, questions.
- **Engineering reading:** Personalization is about *the recipient*, not the sender's voice.
- **Pricing:** $29–$79/mo.
- **What HumanifyMe does differently:** Different problem entirely. Possible v2 integration partner.

### Grammarly + GrammarlyGO

- **Claimed architecture:** Classifier-based tone detection (separate models per dimension). GrammarlyGO adds generative rewriting. Recent "voice profile" feature auto-generates a style description.
- **Engineering reading:** No detailed engineering post on per-user adaptation mechanics. Tone detection is per-feature classification. The "voice profile" suggests a structured-profile-in-prompt approach.
- **Privacy:** Cloud-only; logs everything (per their published policies).
- **Pricing:** $12/mo Premium.
- **What HumanifyMe does differently:** Local-first; anti-grammar-correction (we don't push toward standard register); structured profile is explicit and editable.

### HyperWrite Personas vs Wordtune vs Lavender vs Grammarly

These four cover most of the "personal voice" / "style matching" consumer-facing tool space. **None of them implements credible per-user fine-tuning at consumer scale.** All four are essentially "good prompt engineering + per-vendor base model." This convergence matters: it suggests per-user fine-tuning hasn't proven its economics or quality at the consumer level even with abundant resources.

---

## Category 2 — Native AI personalization (the biggest substitution risk)

### ChatGPT Custom Instructions + Memory

- **Architecture (reverse-engineered):** Per Shlok Khemani's widely-cited September 2025 writeup (unrebutted as of June 2026), ChatGPT memory consists of four buckets stuffed into the system prompt every turn:
  1. Interaction Metadata (device, usage stats, topic mix)
  2. Recent Conversation Content (last ~40 conversations, user messages only, with topics + timestamps)
  3. Model Set Context (user-editable saved memories)
  4. User Knowledge Memories (AI-generated dense paragraph summaries, NOT user-visible)
- **Critical observation:** **No RAG, no vector DB, no retrieval.** OpenAI stuffs everything into context every turn. "Bitter lesson" bet — models will get smart enough to ignore irrelevant context.
- **Privacy:** Cloud-only; OpenAI controls all memory.
- **What HumanifyMe does differently:** Cross-tool consistency (works in Claude, Cursor, Cowork as well as ChatGPT); inspectable + editable structured profile; local-first; explicit context labels.

### Claude Projects + CLAUDE.md memory

- **Architecture:** File-based memory (CLAUDE.md). ~8k char custom instructions + up to 200k token attached files. Official Anthropic guidance: "include 200–400 words of your own writing directly in the system prompt."
- **Engineering reading:** Same structured-profile-in-prompt approach as everyone else. No RAG, no vector DB. File-visible to user.
- **Privacy:** Cloud-only.
- **What HumanifyMe does differently:** Cross-tool; structured schema vs. free-form markdown; sample-derived rather than user-authored persona description.

### Cursor `.cursorrules` / `.cursor/rules/*.mdc`

- **Architecture:** Per-repo prompt customization files. "Memory Bank" is a community pattern (markdown files), not built-in.
- **Engineering reading:** Code-style-focused, not prose-voice. No personalization beyond what the user types.
- **What HumanifyMe does differently:** Complementary. A user could have `.cursorrules` for code and HumanifyMe for prose. Cursor explicitly recommends MCP as the extension path for richer behaviors.

### Notion AI

- **Claimed architecture (per Notion's own marketing):** Three layers — (a) Agent Instructions Pages (markdown style/terminology pages pulled into context), (b) conversation-history adaptation, (c) "match the tone of *this reference document*" — few-shot from a specific doc.
- **Engineering reading:** RAG + system prompt with the user's own Notion docs as the corpus.
- **Privacy:** Cloud-only.
- **What HumanifyMe does differently:** Cross-tool; not limited to Notion-stored content.

### GitHub Copilot

- **Architecture:** Per-org fine-tuned models launched in limited public beta August 2024. **Discontinued mid-2025**, redirected to Copilot Extensions (RAG-style) and context-based customization.
- **Engineering signal:** **This is the most important market signal in this entire document.** GitHub had infinite resources and clear enterprise demand. They chose RAG/context over per-customer fine-tuning. A small team building per-user fine-tuning is betting against Microsoft's allocation decisions.
- **What HumanifyMe does differently:** We don't bet on per-user fine-tuning as the foundation.

---

## Category 3 — Personal AI / memory tools

### Personal.ai

- **Claimed architecture:** "Personal Language Model" (PLM) — marketed as small per-user model with memory-stack grounding, mixture-of-experts, "Generative Grounded Transformer."
- **Engineering reading:** Heavy marketing, light technical disclosure. Plausibly per-user fine-tune + retrieval hybrid; possibly closer to RAG with branding.
- **Posture:** Skepticism warranted until they publish.
- **What HumanifyMe does differently:** We are specific about style, not "general personal AI." We publish our architecture.

### Rewind

- **Architecture:** Records screen/audio locally, compressed and encrypted on-device. For generation, sends *only relevant retrieved text* to a hosted LLM (OpenAI).
- **Engineering reading:** Personalization is *content retrieval over activity history*, not style modeling.
- **What HumanifyMe does differently:** We don't watch your screen. We learn from samples you explicitly provide.

### MyMind

- **Architecture:** Personal memory / second brain. Not focused on generation.
- **What HumanifyMe does differently:** Different problem.

---

## Category 4 — Fiction / writing-specific tools

### Sudowrite

- **Architecture:** "Style Examples" — paste 2–3 pages of prose into Story Bible. Fed as few-shot context into their "Muse" model (custom fiction-tuned).
- **Engineering reading:** Few-shot prompting against a custom-tuned base model.
- **What HumanifyMe does differently:** General-purpose voice (not fiction-specific); structured profile beyond raw exemplars; cross-tool.

### Type.ai / Typeface

- **Architecture (Typeface):** Brand-voice training on 15,000+ words of long-form content (or 15 examples for short-form). Multi-hour training jobs — credible per-customer fine-tuning.
- **Engineering reading:** Real per-tenant fine-tuning, but tuned for enterprise brand voice (B2B), not individual users (B2C).
- **What HumanifyMe does differently:** Individual user voice; lower training data threshold; multi-host MCP distribution.

### Lex.page

- **Architecture:** Thin GPT-4 wrapper with clean editor. No style learning.
- **What HumanifyMe does differently:** Different problem; we're not a writing app.

---

## Category 5 — "AI humanizer" tools (the category we're elevating)

These are the dominant Google search results for "AI humanizer," and the brand-adjacent space we need to differentiate against.

### Undetectable.ai, StealthWriter, GPTinf, Quillbot Humanizer

- **Architecture:** Adversarial paraphrasing keyed to AI-detector evasion. Some use the published "Adversarial Paraphrasing" (arxiv 2506.07001) recipe explicitly.
- **What they sell:** "Bypass GPTZero." Usually pitched at academic-integrity-shaped customers.
- **What HumanifyMe does differently:** **Explicit anti-positioning.** We refuse the detector-bypass framing. Voice fidelity to the user, not adversarial evasion. This is the strongest brand wedge.

---

## Category 6 — Other MCP servers (the closest neighbors)

As of June 2026 the MCP ecosystem is young. Comprehensive search across the Cowork plugin marketplace, Claude Code plugin marketplace, and Cursor MCP listings finds **no direct competitor** specifically for sample-derived voice rewriting. Adjacent MCPs exist:

- **Memory MCPs** (various) — store and retrieve user-supplied facts. Personal memory, not voice.
- **Writing assistant MCPs** — generic LLM wrappers. No personalization.
- **Style guide MCPs** — enforce a publication's style. Not personal voice.

**Implication:** HumanifyMe is positioned to define the category in the MCP marketplace. First-mover advantage exists.

This must be re-surveyed monthly during launch; the marketplace is small and a competitor could appear in any given week.

---

## Open-source / hobbyist landscape

Two recurring patterns in hobbyist projects scraped from GitHub:

1. **Email fine-tune projects** (LLMMe, LLM_personal_email): fine-tune Llama on user Gmail to draft replies. Quality reported as "okay for short emails" but well below production.
2. **Style preset libraries** (AI-Text-Rewriting-Toolbox, write-assist-ai): system-prompt presets for named styles ("more concise," "academic"). No personalization.

Pattern: every credible hobbyist project that actually tries "imitate *me*" reaches for fine-tuning, validating the literature's directional conclusion that prompting alone has a ceiling — but achieves only hobby-grade quality.

---

## What the field has converged on

Reading across all of the above:

1. **Few-shot examples in the system prompt is the default.** Sudowrite, Notion, Claude Projects, HyperWrite, ChatGPT custom instructions, Cursor, Lex.
2. **Memory = injection, not retrieval.** ChatGPT and Claude — the two best-resourced organizations in the space — explicitly avoid RAG/vector DBs for personalization. They stuff structured context every turn.
3. **Per-user fine-tuning has *not* won.** GitHub built it and killed it. No consumer writing tool has a credible per-user fine-tune story. Typeface (enterprise brand voice) is the only credible outlier.
4. **Structured profile + raw samples beats either alone.** Convergent design across HyperWrite (Instructions + Examples + Background), Notion (Instructions Pages + reference docs), Claude (custom instructions + 200–400 words sample). The layered architecture is the de-facto industry standard.

## Where the white space is

1. **Cross-tool consistency.** No one carries voice across ChatGPT, Claude, Cursor, Cowork. Native tools are siloed; sidebar extensions are dumb wrappers. **HumanifyMe via MCP is uniquely positioned here.**
2. **Local-first privacy.** Only Rewind has serious local-first credibility, and they don't really do generation. Genuinely local-data MCP talking to any LLM (user's choice) is unoccupied.
3. **Anti-AI-tone brand framing.** Everyone else is "write better." We are "stop sounding like AI." Fresher, more emotional, more defensible. AI-humanizer grifters dominate the search results but the brand-trustworthy version of the category is open.
4. **Negative style profiling.** Almost no product captures "things I *never* do." HumanifyMe's `wordsToAvoid` field is novel.
5. **Profile rigor.** A structured editable JSON profile with 25+ fields is more inspectable than any "custom instructions" textarea. Audit + edit UX is a real differentiator.

## Where HumanifyMe is likely to be wrong

1. **"Structured profile in system prompt" alone plateaus on informal style.** Per Catch Me If You Can?, prompt-only methods bottom out at 17–21% AV on blog-style. Our beta users will hit this ceiling. We need active learning + possibly retrieval-augmented exemplars to push past it.
2. **A static profile won't capture per-context style.** ChatGPT solves this by also injecting recent-conversation context. We address this with context labels in the schema — but evaluating cross-context generalization is unsolved (Gap 2 in research-gaps.md).
3. **The profile rots.** PersonaMem shows ~50% accuracy on tracking evolving users. We need a refresh story.
4. **Style transfer ≠ rewrite.** STRAP/STYLL/TinyStyler all use paraphrase-then-restyle as a two-stage pass. Simple "rewrite under profile" prompting is a degenerate case and probably under-performs the two-stage version.
5. **Under-investment in negative profile.** The literature gap (Gap 4) is also a product implementation gap. We should treat it as a first-class feature.
6. **Privacy moat is asserted, not proven.** Until we open-source the privacy-critical paths and run a formal privacy analysis (Gap 6), the moat is rhetorical.

---

## Pricing benchmark snapshot

| Product | Lowest paid tier | Audience overlap |
|---|---|---|
| HyperWrite Premium | $19.99/mo | medium |
| Wordtune Pro | $9.99/mo | low |
| Grammarly Premium | $12/mo | low (different segment) |
| Sudowrite Hobby | $19/mo | low (fiction) |
| Notion AI add-on | $10/mo | medium |
| Lavender Starter | $29/mo | low (sales-specific) |
| Cursor Pro | $20/mo | high (same user) |
| Claude Pro | $20/mo | high (same user) |
| ChatGPT Plus | $20/mo | high (same user) |
| Copilot Pro | $10/mo | medium |

Developer-agent users in our target audience are already paying $20/mo to at least one of Cursor / Claude / ChatGPT. A complementary $12/mo HumanifyMe Pro is a defensible add-on, not a competing subscription.

---

## Acquisition lens

Possible acquirers, mapped to their existing strategy:

- **Anthropic / OpenAI:** Build internally. Will not acquire single-function MCPs. (See ChatGPT memory architecture — they prefer in-house context injection.)
- **Cursor:** Possible, if HumanifyMe gets large in their plugin marketplace. Adjacent to their developer-personalization story.
- **Grammarly:** Most-likely strategic acquirer for HumanifyMe as a category-defining brand. Defensive logic: HumanifyMe is the anti-Grammarly framing they can't easily build internally.
- **Notion / Atlassian / HubSpot:** Plausible at scale; consumer SaaS roll-ups happen here.
- **Adobe:** Less likely; their writing footprint is small.
- **Apple:** Privacy-aligned brand. Plausible if HumanifyMe ships native macOS/Windows menubar app and proves consumer scale.
- **Private equity (Vista, Thoma Bravo, etc.):** Standard consumer SaaS rollup at $20M+ ARR.

This list is informational, not directional. Per the strategy discussion, building for acquisition produces worse products than building for users.
