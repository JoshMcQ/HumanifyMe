# Evaluation Methods for HumanifyMe

The 2026 literature consensus is unambiguous: **no single metric is sufficient for personalized writing-style evaluation; an ensemble is required.** This document specifies the ensemble HumanifyMe should run, with citations.

The Microsoft Research SPTG paper (Jangra et al., arxiv 2508.06374) provides the direct empirical case for ensembles. Catch Me If You Can? (Wang et al., EMNLP 2025 Findings) instantiates the ensemble in practice. ExPerT (Salemi et al., Findings ACL 2025) is the aspect-decomposed LLM-judge baseline.

---

## The six-component ensemble

| # | Component | Method | Cost | Use in CI? | Use in release-candidate? |
|---|---|---|---|---|---|
| 1 | Authorship Attribution accuracy | Frozen classifier, top-1/top-5 hits | Cheap | ✅ | ✅ |
| 2 | Authorship Verification cosine | LUAR + Wegmann (or StyleDistance) | Cheap | ✅ | ✅ |
| 3 | Stylometric distance | Burrows' Delta + function-word χ² + character n-gram JS + MATTR | Trivial | ✅ | ✅ |
| 4 | Blind human pairwise | Prolific panel, mismatched control | Expensive | ❌ | ✅ |
| 5 | LLM-as-judge (ExPerT-style) | Aspect decomposition + uncertainty filter | Moderate | Spot-check | ✅ |
| 6 | AI-detection probability | fast-detect-gpt / binoculars | Cheap | ✅ as sanity | ✅ as sanity |

---

## Component 1 — Authorship Attribution accuracy

**Purpose.** Did the rewrite move toward this writer's style (and away from the LLM-default)?

**Method.** Train a frozen attribution classifier per release (sklearn logistic regression on top of LUAR embeddings is sufficient) on the held-out portion of the HumanifyMe Bench corpus. Score: **% of rewrites where the classifier predicts the target author as top-1 (or top-5)**.

**Calibration.** Without personalization, the classifier should get the original AI-generated draft "right" approximately 1/N times where N is the writer pool. With our system, target ≥ 50% top-1 for structured genres (email, news), ≥ 25% for informal (blog, Reddit-style). These targets reflect the empirical ceiling Wang et al. (2025) report for in-context-only methods, which our system should beat.

**Citations.** Wang et al. EMNLP 2025; PEARL EMNLP 2024 Workshop; Stamatatos JASIST 2009 for the basics.

**Cost.** Single forward pass per generation. Fully local.

---

## Component 2 — Authorship Verification cosine

**Purpose.** How close, in style-embedding space, is the rewrite to the writer's centroid?

**Method.** Compute LUAR embedding cosine **and** Wegmann (or StyleDistance) cosine between (rewrite) and (mean of writer's held-out samples). Report both numbers.

**Why both.** LUAR is the strongest authorship embedding but leaks topic (Wang et al. TACL 2023). Wegmann's conversation-controlled embedding is purer style. **Divergence between the two scores flags content leakage**: if LUAR cosine is high but Wegmann cosine is low, the apparent match is driven by topic, not voice.

**StyleDistance.** The 2026 publicly-available SOTA (Patel et al., NAACL 2025). Recommended as the primary cosine when StyleDistance is available; Wegmann as backup.

**Cost.** Two forward passes per generation. Fully local. Recommended embeddings: `LLNL/LUAR-MUD` and `AnnaWegmann/Style-Embedding` or `StyleDistance/styledistance`.

---

## Component 3 — Stylometric distance

**Purpose.** Model-free, cheap, interpretable distance — defensible against any "but the embedding model is biased" critique.

**Method.** Compute four classical stylometric distances between the writer's profile and the rewrite:
- **Burrows' Delta** over the 150 most-frequent words.
- **Function-word χ²** distance.
- **Character-3-gram Jensen-Shannon divergence.**
- **MATTR** (Moving-Average Type-Token Ratio) — vocabulary richness comparison.

Report all four. Aggregate into a single "stylometric distance" via z-score normalization across the held-out corpus.

**Why this matters.** Forty years of stylometry has consistently shown function-word distributions and character n-grams as the strongest cheap signal (Stamatatos 2009; Koppel et al. 2009; Burrows 2002). These features are content-independent by construction.

**Citations.** Stamatatos JASIST 2009; Koppel, Schler, Argamon JASIST 2009; Burrows LLC 2002; Abbasi & Chen TOIS 2008; LIWC (Pennebaker).

**Cost.** Pure Python, milliseconds per sample. Implementable in ~100 lines.

---

## Component 4 — Blind human pairwise preference

**Purpose.** The gold standard. Without humans, the bench is just stylometry homework.

**Method.** Recruit raters via Prolific. Each item: (a) blind pairwise — candidate rewrite vs. one of (original AI draft / mismatched-writer rewrite / writer's actual sample) — with brief justification required; (b) Likert 1–5 on "could this writer have produced this?" (c) optional free-text comment.

**Calibration.** Each rater runs a 10–20 item calibration set against gold-standard answers; only proceed if rater accuracy > 80%. Inter-rater agreement: **target Krippendorff α ≥ 0.6 across 5+ raters per item**, with bootstrap CIs. (Note: stylistic judgments are noisier than factual; α of 0.6 is acceptable per CHI/CSCW literature.)

**Mismatched-writer control.** This is the most important methodological design choice. For every (writer, draft) pair, also generate a rewrite using a *different* writer's profile. Confirm raters prefer the matched rewrite. Adopted from LaMP-QA (Salemi & Zamani, EMNLP 2025) — "using a mismatched profile hurts by up to 62%" is the sanity check.

**Cost.** Per quarterly bench run: $5–10k. Per release-candidate: $1–2k for a ~50-item smoke test.

**Citations.** GhostWriter CHI 2024 (qualitative protocol); van der Lee et al. CSL 2020 (best practices); LaMP-QA EMNLP 2025 (mismatched control).

---

## Component 5 — LLM-as-judge with uncertainty filtering

**Purpose.** Mid-tier signal. Cheaper than humans, more decomposable than a stylometric distance.

**Method.** Use **ExPerT-style aspect-decomposed judging** (Salemi et al., Findings ACL 2025): the judge LLM extracts atomic content claims + atomic style descriptors from reference and candidate; aligns aspects; scores per-aspect; explains decisions.

**Mandatory caveats.**
- **Uncertainty filter (Dong et al., Findings EMNLP 2024):** the judge expresses verbal uncertainty; only count high-certainty judgments. Improves agreement from ~70% to >80% on retained samples.
- **Position bias mitigation (Shi et al., AACL 2025):** randomize presentation order; double-present with both orderings and average.
- **Self-preference bias:** if our generator is from the same model family as the judge, results are unreliable. Use a different model family for judging.

**Citations.** ExPerT Findings ACL 2025; Dong et al. Findings EMNLP 2024; Shi et al. arxiv 2406.07791; G-Eval EMNLP 2023 as the baseline LLM-judge.

**Cost.** Tens of cents per generation. Acceptable for release-candidate evaluation, marginal for CI.

---

## Component 6 — AI-detection probability (sanity floor only)

**Purpose.** A one-way sanity check: does our rewrite still trip AI detectors?

**Method.** Run rewrites through an open-source AI detector (fast-detect-gpt, binoculars) and report the detection probability. **Track direction of travel, not absolute number.**

**Mandatory caveat.** **Never market on this number.** AI-detection is fundamentally unreliable as a primary metric (Sadasivan et al., ICML 2024). False-positive rates vary 0.24%–22% by genre. We use it as a sanity check ("did our rewrite reduce detection probability vs. the original AI draft?") not as a quality claim.

**Citations.** Sadasivan et al. ICML 2024; GPTZero/Originality reliability studies (PMC, Scribbr).

**Cost.** Local, free.

---

## Aggregate scoring

The headline **HumanifyMe Bench (HMB) score** is a weighted combination of the six components, normalized to 0–100. Initial weights (revise after first bench run):

```
HMB = 0.30 * Component4_human  +
      0.20 * Component1_AA     +
      0.20 * Component2_AV     +
      0.15 * Component5_LLMjudge +
      0.10 * Component3_stylometric +
      0.05 * Component6_AIdetection
```

The headline aggregate is for press. The sub-scores are for engineering and competitor comparison. We publish all of them.

---

## Test corpus design

Per Catch Me If You Can?, ExPerT, and van der Lee et al., a credible bench requires:

- **≥ 200 writers**, recruited via Prolific or similar, with consent for benchmark use and right-to-withdrawal.
- **≥ 30 samples per writer**, averaging ≥ 200 tokens each, spanning ≥ 3 contexts.
- **20% held-out** per writer, time-locked and never released publicly. Used by HumanifyMe-the-org only.
- **Diversity targets:** ≥ 30% non-native English; ≥ 30% non-US; gender balanced; range of professional and informal voices.
- **Compensation:** $250–$500 per writer for ~3 hours of work. Total corpus cost: $50–100k.

---

## CI tier vs. release-candidate tier vs. quarterly bench

| Tier | Components run | Frequency | Cost |
|---|---|---|---|
| **CI** (every PR / merge) | 1, 2, 3, 6 (local + cheap) | Per commit | Negligible |
| **Release candidate** (every weekly cut) | 1, 2, 3, 5, 6 + small human panel | Weekly | $1–2k / week |
| **Quarterly HumanifyMe Bench** | All 6, full corpus, full human eval | Quarterly | $5–10k / quarter |
| **Annual public release** | All 6 + competitor submissions + write-up | Yearly | $15–30k / year |

---

## What we publish in quarterly transparency reports

Per `specs/research-credibility-spec.md`:

- Aggregate HMB score for the current HumanifyMe build.
- Per-component sub-scores.
- Cross-context breakdown (email vs Slack vs LinkedIn vs blog).
- Comparison against competitor systems (when we can run them through our submission interface).
- Inter-rater agreement statistics with bootstrap CIs.
- Provider-by-provider breakdown (Anthropic vs OpenAI vs Gemini vs Ollama).
- Versioned eval harness on GitHub.

---

## What we do NOT publish

- Raw writer samples (privacy).
- Held-out portion (integrity).
- Per-writer scores (would let competitors target specific writers).
- AI-detection scores as headline numbers (irresponsible).

---

## Connection to research-gaps.md

This evaluation methodology directly enables the publication gaps identified:

- **Gap 1 (matched-budget ablation)** uses Components 1+2+3+4 to compare architectures at fixed token budget.
- **Gap 2 (cross-context generalization)** is a direct application of Component 4 across the multi-context corpus.
- **Gap 3 (LLM prior bleed-through)** uses Components 1+2 across base-model scale and RLHF posture.
- **Gap 4 (negative profile)** uses A/B test on Components 1+5+6 with and without `wordsToAvoid`.

The bench is not a research artifact for show; it is the instrument every other research contribution depends on.

---

## Tools and infrastructure

- **Embedding models:** `LLNL/LUAR-MUD`, `AnnaWegmann/Style-Embedding`, `StyleDistance/styledistance` (all HuggingFace).
- **AI detector:** `fast-detect-gpt` (MIT-licensed) and/or `binoculars` (open-source).
- **LLM judge:** swap across Claude, GPT-4o, Gemini — use a different family from the generator to avoid self-preference.
- **Stylometric library:** custom Python implementation; ~100 lines.
- **Rater platform:** Prolific (cheaper, better quality than MTurk for stylistic judgments per van der Lee et al.).

All evaluator code released as MIT in the `evals/` directory of the public HumanifyMe repo.

---

## Citations summary

- Wang et al., **Catch Me If You Can? Not Yet**, EMNLP 2025 Findings — the ensemble methodology in practice.
- Jangra et al., **Evaluating Style-Personalized Text Generation: Challenges and Directions**, arxiv 2508.06374 — the empirical case for ensembles.
- Salemi, Killingback & Zamani, **ExPerT**, Findings ACL 2025 — aspect-decomposed LLM judge.
- Dong et al., **Can LLM be a Personalized Judge?**, Findings EMNLP 2024 — uncertainty filtering.
- Shi et al., **Judging the Judges**, AACL 2025 — position bias.
- van der Lee et al., **Human Evaluation of Automatically Generated Text**, CSL 2020 — best-practice checklist.
- Salemi & Zamani, **LaMP-QA**, EMNLP 2025 — mismatched-profile control.
- Sadasivan et al., **Can AI-Generated Text be Reliably Detected?**, ICML 2024 — why AI-detection is sanity-only.
- Rivera-Soto et al., **LUAR**, EMNLP 2021 — the AV cosine backbone.
- Wegmann et al., **Same Author or Just Same Topic?**, RepL4NLP @ ACL 2022 — the conversation-controlled embedding.
- Patel et al., **StyleDistance**, NAACL 2025 — 2026 SOTA content-independent style embedding.
- Stamatatos, **Survey of Modern Authorship Attribution Methods**, JASIST 2009 — stylometric basics.
- GhostWriter CHI 2024 — the human-eval qualitative protocol.
