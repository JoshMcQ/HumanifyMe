# Research Gaps and Publication Opportunities for HumanifyMe

The six gaps below are the most defensible publication surfaces for HumanifyMe — each addresses a problem the 2026 literature has named but not solved, and each maps cleanly to a real product feature that we'd build anyway. They're listed in approximate order of publishability and product alignment.

For each gap: the evidence that it's open, the proposed experiment HumanifyMe could run, the venue we'd target, and confidence level.

---

## Gap 1: Structured natural-language profile vs. raw retrieved exemplars at matched token budget

**Confidence the gap is open:** High.

**The literature.** Three papers come close — Step-Back Profiling (Tang et al., ICLR 2025) beats raw retrieval on LaMP by +3.6 points using a distilled profile; Guided Profile Generation (Zhang, Findings EMNLP 2024) reports +37% over raw context injection on preference prediction; "Teach LLMs to Personalize" (Li et al., arxiv 2308.07968) wins with a multi-stage pipeline. None of them runs the **clean ablation at matched token budgets**: 500 tokens of distilled profile vs. 500 tokens of raw retrieved exemplars vs. 250+250 hybrid, on the same task with the same user data. Catch Me If You Can? (Wang et al., EMNLP 2025) varies the *number* of demonstrations but does not insert a distilled-profile arm.

**Why it matters for HumanifyMe.** This is the most important architecture decision in our system prompt. Every rewrite call has a finite token budget; we have to decide how to spend it. The literature today gives a *qualitative* answer ("both help") without the *quantitative* tradeoff curve.

**Proposed experiment.** Run a 3×3 design: (profile-only / exemplars-only / hybrid 50:50) × (50 / 200 / 500 token budgets) on (LaMP-7, LongLaMP-Email, the Catch Me If You Can? everyday-authors corpus). Evaluate with the ensemble: AA accuracy + LUAR cosine + StyleDistance cosine + blind human pairwise on 200 generations per cell.

**Target venue.** ACL 2027 Main, with secondary submission to PALS 2026 workshop for early feedback.

**Why HumanifyMe is well-positioned.** Our MCP architecture forces us to make this decision in production. The structured `StyleProfile` JSON is already designed; the SQLite sample DB is already populated. The data infrastructure costs us nothing extra; the eval infrastructure is the bench.

---

## Gap 2: Cross-context voice generalization

**Confidence:** High.

**The literature.** No published benchmark currently measures the same writer across multiple contexts (email vs. Slack vs. LinkedIn post vs. PR description vs. text message). LaMP uses one task per user; LongLaMP has separate per-task user sets; PersonaMem (Jin et al., COLM 2025) tests temporal evolution within one channel. The "Catch Me If You Can?" study evaluates four genres but doesn't have the same writer in all four.

Catch Me If You Can? explicitly identifies cross-domain generalization as a gap: "future work should evaluate whether style transfer learned on one genre transfers to another for the same author."

**Why it matters for HumanifyMe.** Our product premise is that a HumanifyMe profile works across contexts. If it doesn't — if a profile built from emails over-fits to email register and produces stilted Slack — then the entire MCP value proposition is weaker. Conversely, demonstrating cross-context generalization is a strong marketing and research claim.

**Proposed experiment.** Recruit 60 writers; each contributes ≥50 samples across at least 4 of {email, Slack, LinkedIn, blog, text, PR description}. Train profiles on a held-out *subset of contexts* per writer and test rewrite quality on the remaining contexts. Measure: (a) within-context performance, (b) cross-context drop, (c) whether explicit context labels in the profile (HumanifyMe's design) improve cross-context vs. a flat profile.

**Target venue.** EMNLP 2027 Main as a benchmark + analysis paper.

**Why HumanifyMe is well-positioned.** Our context-label system is already in the spec. The HumanifyMe Bench corpus (planned T+9 months) is the corpus this paper needs.

---

## Gap 3: The "LLM prior bleed-through" — quantification and mitigation

**Confidence:** Medium-High.

**The literature.** The phenomenon is named (Catch Me If You Can?, EMNLP 2025; StyleVector ACL 2025; "content/style entanglement" framing in StyleVector). It's quantified at the level of failure modes (17–21% AV accuracy on blogs even with 5-shot) but **not** decomposed: how much of the failure is the LLM's prior asserting itself vs. insufficient style signal in the prompt vs. content/style entanglement?

No paper systematically varies (a) prompt strength, (b) base model size, (c) RLHF posture, (d) decoding temperature to isolate the prior's contribution to style failure.

**Why it matters for HumanifyMe.** Quantifying the bleed-through tells us how much engineering effort to spend on prompt design vs. structural interventions (retrieval, post-processing, decoding). It also gives us a defensible measurement when claiming "we beat the prior" in marketing.

**Proposed experiment.** Hold the prompt fixed (best HumanifyMe profile + exemplars). Vary base model across small/medium/large variants of the same model family (e.g., Llama-3 8B / 70B / 405B; Qwen 7B / 32B / 72B). Measure style match degradation as a function of model scale. Separately: hold model fixed, vary RLHF posture (base vs. instruct vs. heavily RLHF'd) — does the prior get *worse* with more RLHF?

**Target venue.** ACL or EMNLP 2027, possibly as a Findings paper given the analytical nature.

**Why HumanifyMe is well-positioned.** Our multi-provider architecture (Anthropic + OpenAI + Gemini + Ollama) lets us sweep base models naturally as a side-effect of regular product operation.

---

## Gap 4: Negative profile — modeling what the user does NOT write

**Confidence:** Medium-High.

**The literature.** Surprisingly absent. Author-obfuscation literature (Mutant-X PoPETS 2019, StyleRemix, AuthorMist) names anti-style features — words/structures the author should not produce — but does not develop them as positive personalization signal. Contrastive preference optimization (CoPe 2025, MIPO 2025) contrasts positive against synthesized negatives, but for general alignment, not voice.

The HumanifyMe-specific premise — that "words I never use" is a first-class field in a style profile — is essentially novel in published work.

**Why it matters for HumanifyMe.** A huge fraction of "this still sounds like AI" failures are not because the rewrite *missed* the user's voice positively, but because it included AI-tells the user would never use ("delighted to," "tapestry," parallel triplets, balanced em-dashes). A negative profile field directly addresses this.

**Proposed experiment.** Build the negative profile via two methods: (a) **explicit user curation** ("HumanifyMe noticed you never write 'unleash' or 'leverage' — confirm?"), (b) **stylometric inference** from absence in samples (LIWC + corpus-comparison; words the user uses 10× less than baseline). Measure rewrite quality with/without the negative profile component. Hypothesis: large gains on AI-detection probability without quality regression.

**Target venue.** ACL 2027 Findings or EMNLP 2027 Main, depending on result strength.

**Why HumanifyMe is well-positioned.** The negative profile is already in our `StyleProfile.wordsToAvoid` schema. We can ship the feature, A/B test it, and write the paper from production data.

---

## Gap 5: Profile staleness and longitudinal voice drift

**Confidence:** Medium.

**The literature.** PersonaMem (Jin et al., COLM 2025) shows frontier models stall at **~50% accuracy** on tracking evolving user profiles across multi-session interaction. ChatGPT memory implementations are reported to suffer from stale facts (Khemani's reverse-engineering of ChatGPT memory, widely cited in industry literature). Continual / online LoRA (Online-LoRA WACV 2025, O-LoRA EMNLP 2023) addresses adapter updating but not in personalization context.

No published work studies how a user's writing voice itself drifts over months/years, or how a personalization system should adapt.

**Why it matters for HumanifyMe.** Our profiles live in `~/.humanifyme/data.db` for as long as the user keeps them. If a writer's voice evolved meaningfully — they got promoted, moved countries, changed roles — the profile silently degrades. Active learning helps but doesn't address active drift.

**Proposed experiment.** Longitudinal study with 30+ writers over 6 months. Each writer contributes 10 new samples per month. Compare three update strategies: (a) frozen initial profile, (b) full re-build from all samples, (c) incremental update prioritizing recent samples. Track human-judged voice match over time.

**Target venue.** PALS workshop 2027 or CHI 2028 (if HCI-leaning). EMNLP 2027 Main if quantitative result is strong.

**Why HumanifyMe is well-positioned.** Our 12-month MVP user base will provide the natural data. We'd publish T+18 months.

---

## Gap 6: Privacy-preserving on-device author representation learning

**Confidence:** Medium.

**The literature.** Almost no published work trains author representations under differential privacy or fully on-device. Salemi & Zamani's "privacy-preserving personalization" comparison (arxiv 2409.09510) is privacy-*adjacent* — it studies what to do when raw user data can't be sent to the LLM provider — but doesn't address differential privacy for the embedding itself. Panza is local but doesn't claim DP. Federated learning on author embeddings is a green-field.

**Why it matters for HumanifyMe.** Our entire brand is local-first privacy. A paper formalizing the privacy guarantees of HumanifyMe's pipeline — what an adversary could infer from the structured profile JSON alone, what differential-privacy guarantees the local training provides if any, where the formal gaps are — would be both publishable and load-bearing for marketing trust.

**Proposed experiment.** Build a privacy threat model for HumanifyMe's pipeline. Define formal privacy quantities (what does the profile leak? what does a redacted sample leak?). Implement and evaluate a DP variant of the style-vector extraction (local-model variant only). Compare quality / privacy frontier.

**Target venue.** PoPETS 2027 or USENIX Security 2027 (privacy-focused). Alternatively, FAccT 2027 for HCI-leaning angle.

**Why HumanifyMe is well-positioned.** The MCP architecture already enforces this in spec; we'd be writing up the formal analysis of a real production system.

---

## Lower-confidence gaps worth tracking

These exist in the literature but are either less well-suited to HumanifyMe specifically or face more crowded competition.

### Adversarial robustness of authorship attribution under personalization

Mutant-X and StyleRemix study this for obfuscation. The dual — "how robust is our claimed voice match to adversarial paraphrasing?" — could be a paper but the use case is narrower.

### Multilingual style transfer

LUMA (arxiv 2509.16531) extends LUAR cross-lingually. HumanifyMe could deploy multilingual at v2 and publish a deployment paper, but multilingual is out of scope for MVP per our specs.

### Style transfer for code

GitHub Copilot Enterprise's discontinuation suggests this is harder than it looks. Possible adjacent paper but not core to HumanifyMe.

### Distinguishing voice from persona from preference

Three different things often conflated. A conceptual paper articulating the distinction could be publishable but less directly load-bearing for the product.

---

## Summary table of gaps

| Gap | Confidence | Best venue | Publishability timeline | Direct product feature |
|---|---|---|---|---|
| 1. Profile vs exemplars at matched budget | High | ACL 2027 Main | T+12 months | System prompt structure |
| 2. Cross-context generalization | High | EMNLP 2027 Main | T+18 months | Context labels |
| 3. Quantifying LLM prior bleed-through | Med-High | ACL/EMNLP 2027 Findings | T+18 months | Multi-provider selection |
| 4. Negative profile | Med-High | ACL 2027 Findings | T+12 months | `wordsToAvoid` |
| 5. Profile staleness | Medium | PALS 2027 / CHI 2028 | T+24 months | Active learning, refresh |
| 6. Privacy formalization | Medium | PoPETS 2027 | T+18 months | Privacy spec |

The two highest-leverage gaps for HumanifyMe specifically are **Gap 1 (matched-budget ablation)** and **Gap 4 (negative profile)**. Both require nothing more than the product we're already building plus an evaluation pass. Both are publishable within 12 months of MVP launch given the right data. Both directly support the "we are the legitimate answer in a category of grifters" brand positioning.
