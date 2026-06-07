# State of the Art 2026: Personalized Language Generation and Authorship Modeling

**Compiled:** June 2026
**Source policy:** ACL / EMNLP / NAACL / COLING / ICLR / NeurIPS / ICML / ACM (CHI, CSCW, TOIS) / IEEE / Springer / TACL / ACL Anthology / HF Papers / arXiv (citation-floored or recent + influential).

This document is the executive map of the field as of June 2026, intended to ground every other deliverable in `/research/` and to anchor HumanifyMe's architectural choices in published evidence. It is deliberately short on opinion and long on grounded claims.

---

## The headline finding

The empirical literature in 2026 supports three claims with high confidence:

1. **Few-shot prompting alone, even on frontier LLMs, hits a measurable ceiling on imitating ordinary writers' voices** — especially in informal genres. (Wang et al., EMNLP 2025 Findings, arxiv 2509.14543.) Authorship-verification accuracy of LLM rewrites against the target author drops to **17–21% on blogs and 50–66% on Reddit-style** even with five-shot exemplars. Structured genres (news, email) hit ~95–97%. More exemplars give diminishing returns.
2. **RAG-over-user-history dominates cold start; per-user PEFT only meaningfully helps with more data.** (Salemi & Zamani, arxiv 2409.09510.) Across seven LaMP tasks: RAG-only **+14.92%** over non-personalized baseline; PEFT-only **+1.07%**; combined **+15.98%**.
3. **The strongest published architectures are hybrid.** Panza (Nicolicioiu et al., IST Austria, arxiv 2407.10994, ~70 citations) demonstrates that **<100 user samples + RoSA-LoRA + RAG** produces convincing local-only style imitation. OPPU (Tan et al., EMNLP 2024 Main, ~190 citations) confirms RAG + per-user PEFT > either alone on LaMP. GhostWriter (Yeh et al., CHI 2024, ~120 citations) shows users *want* the layered design: an inspectable profile plus exemplar-level control.

The implication for HumanifyMe's MVP architecture is direct: **prompt + structured profile + retrieval-keyed exemplars** is the empirically supported baseline; per-user adapters are a Phase-2 enhancement, not the foundation.

---

## Where each subfield sits as of June 2026

### Authorship Attribution and Verification

Mature subfield with stable methodological foundations. **LUAR** (Rivera-Soto et al., EMNLP 2021, ~250 citations) remains the public-default authorship embedding; **Wegmann's Style-Embedding** (Wegmann et al., RepL4NLP @ ACL 2022, ~150 citations) is the cleanest *conversation-controlled* alternative; **StyleDistance** (Patel et al., NAACL 2025, ~40 citations) is the strongest content-independent style embedding publicly available. The 2026 best practice is **LUAR + Wegmann (or StyleDistance) jointly** — divergence between them signals content leakage.

PAN shared tasks remain the canonical evaluation harness; the 2026 PAN aggregate (AUC + C@1 + F0.5u + F1 + Brier, mean) is the credible single-number AV metric.

### Personalized Text Generation and Personalized LLMs

The Salemi/Zamani **LaMP** family of benchmarks (LaMP, ACL 2024, ~300 citations; LongLaMP, arxiv 2407.11016, ~70 citations; LaMP-QA, EMNLP 2025, ~25 citations) is the dominant evaluation framework. The same group's controlled study (arxiv 2409.09510) provides the empirical answer to RAG vs. PEFT.

**Panza** (Nicolicioiu et al., IST Austria, arxiv 2407.10994) is the closest existing system to HumanifyMe's product thesis. Local-first, <100 samples sufficient, LoRA/RoSA + RAG combination.

**OPPU** (Tan et al., EMNLP 2024) established per-user LoRA as the canonical "go deeper" approach but has been critiqued by **PERFIT** (ICLR 2026, OpenReview Lwn67fk9e1) and **TAP-PER** (arxiv 2606.04547) for structural inefficiency — both argue the personalization signal lives in a low-rank *hidden-representation* subspace, not in weight space. PERFIT reports **92.3% parameter reduction** vs OPPU at matched LaMP performance.

### Retrieval-Augmented Personalization

Empirically dominant for cold-start (Salemi & Zamani). Key advances since 2023:

- **Teach LLMs to Personalize** (Li et al., arxiv 2308.07968, ~200 citations) established the multi-stage retrieve → rank → summarize → synthesize → generate pipeline now standard in the field.
- **PEARL** (Mysore et al., EMNLP 2024 Workshop, ~80 citations) introduced generation-calibrated retrieval — retrievers trained to predict downstream LLM generation quality.
- **RAGs to Style** (Neelakanteswara et al., Personalize @ ACL 2024) showed that **style-keyed retrieval** marginally but consistently beats topic-keyed retrieval on personalization.
- **Persona-DB** (Sun et al., COLING 2025, ~50 citations) and **PRIME** (arxiv 2507.04607) argue for **hierarchical** memory (raw samples → distilled clusters → trait abstractions).

### Activation Steering and Style Vectors

Promising but limited by closed-API constraint. **StyleVector** (Zhang et al., ACL 2025, ~25 citations, arxiv 2503.05213) is the closest prior art to a per-user activation-steering approach for style — reports **+8% over PEFT at 1700× less per-user storage**, but requires white-box access to model activations. **AxBench** (Wu et al., ICML 2025, arxiv 2501.17148) is the field's hard reality check: **prompting wins overall** across 500+ concepts; SAEs underperform; supervised steering is competitive but not dominant.

Anthropic's **Persona Vectors** work (Chen et al., arxiv 2507.21509) extends contrastive activation addition to persona traits, but is not exposed via API.

The practical takeaway: activation steering matters for HumanifyMe **only** if/when we ship a local-model variant (Llama, Qwen, Mistral via Ollama). It is not a path for closed-API deployment.

### LoRA / PEFT and Preference Learning

LoRA (Hu et al., ICLR 2022, ~16,000 citations) and QLoRA (Dettmers et al., NeurIPS 2023, ~5,500 citations) are foundational. **RoSA** (Nikdan et al., ICML 2024) is the strongest variant for style imitation specifically (Panza ablation). **DoRA** (NVIDIA, ICML 2024 Oral) beats vanilla LoRA at low rank. **VeRA** (ICLR 2024) cuts per-user storage 10× vs LoRA.

For preference learning at small N: **DPO** (Rafailov et al., NeurIPS 2023, ~7,000 citations) is the default; **IPO** (DeepMind, AISTATS 2024) is more robust to over-optimization; **KTO** (Ethayarajh et al., ICML 2024, ~800 citations) consumes natural binary (accept/reject) signal, making it the right primitive for product telemetry. **FSPO** (Singh et al., arxiv 2502.19312) is the breakthrough that makes per-user preference learning feasible — meta-trained on synthetic personas, achieves **72% win-rate from a few dozen real-user preferences**.

A major real-world signal cuts against the per-user LoRA trajectory: **GitHub Copilot Enterprise per-customer fine-tuning was launched in limited beta in August 2024 and discontinued in mid-2025**, redirected to RAG-style customization. No published postmortem, but the operational decision speaks loudly for a small team.

### Multi-LoRA Serving (if we ever go per-user)

Solved infrastructurally. **S-LoRA** (MLSys 2024, ~700 citations) and **Punica** (MLSys 2024, ~350 citations) serve thousands of LoRAs from a single base GPU with 4–12× throughput vs naïve serving. **Compress then Serve** (ICML 2025) extends to 1,000+ adapters. **LoRA Land** (Predibase, arxiv 2405.00732) shows real per-adapter training cost averaging ~$8 at production scale.

### Memory Architectures

**MemGPT** (ICLR 2024, ~300 citations) introduced the hierarchical-memory-as-OS pattern. **Mem0** (arxiv 2504.19413) reports 91% lower p95 latency and >90% token savings vs naive history-stuffing in production. The CLAUDE.md / file-based memory pattern (Anthropic, industry-standard) is the cheap-and-cheerful baseline.

For HumanifyMe: tiered design — small distilled profile always in system prompt (CLAUDE.md mode) plus retrieval over raw samples (Mem0 mode). MemGPT's full agent-memory abstraction is overkill for our single-user rewriting case.

### Human Evaluation and Benchmarks

The field has converged on **ensemble evaluation**. **Catch Me If You Can?** (Wang et al., EMNLP 2025 Findings) and the Microsoft Research **SPTG paper** (Jangra et al., arxiv 2508.06374) both make the case empirically: no single metric correlates well with human judgment; an ensemble of (AA accuracy + AV cosine + style embedding match + stylometric distance + blind pairwise human + LLM-as-judge with uncertainty filtering + AI-detection sanity) is the credible package. **ExPerT** (Salemi et al., Findings ACL 2025) is the strongest aspect-decomposed LLM-judge.

**LLM-as-judge for personalization is moderate-strength signal at best.** Dong et al. (Findings EMNLP 2024) document ~60–70% agreement with human raters; uncertainty filtering pushes that to >80% on retained samples. Position bias (Shi et al., arxiv 2406.07791) requires randomized presentation order.

---

## What is genuinely unsolved

1. **Cross-context voice consistency.** Same writer in email vs Slack vs LinkedIn vs PR description — no benchmark currently measures this. (Identified in Catch Me If You Can?, PersonaMem, our own roadmap.)
2. **Profile staleness over time.** PersonaMem (COLM 2025, arxiv 2504.14225) shows frontier models (GPT-4.1, o4-mini, Gemini 2.0) stall at **~50% accuracy** on tracking evolving user profiles across multi-session interaction.
3. **The "LLM prior bleed-through"** is named (Catch Me If You Can?, StyleVector) but only partially mitigated. Best current treatment is paraphrase-then-restyle pipelines (STRAP, STYLL, TinyStyler).
4. **Negative profile** (words/structures the user *does not* use) is largely absent from published personalization work. Adjacent — author obfuscation (Mutant-X, StyleRemix, AuthorMist) names the technical primitive but does not develop it for personalization.
5. **Privacy-preserving on-device author representation learning.** Almost no published work trains author representations under DP or fully on-device. Green-field.
6. **Structured natural-language profile vs. raw retrieved exemplars at matched token budget** — Step-Back Profiling, Guided Profile Generation, and Teach LLMs to Personalize all win against either alone, but none cleanly ablates *profile vs. exemplars* at matched cost.

These six gaps are the basis for `/research/research-gaps.md` and form the publishable contribution surface for HumanifyMe.

---

## How to read the rest of this directory

- `literature-review.md` — structured per-paper entries (problem / method / metrics / strengths / weaknesses / relevance) for ~50 load-bearing papers across all 15 areas.
- `citation-map.md` — schools of thought and how they cite each other; named lineages.
- `research-gaps.md` — the six gaps above, expanded with citations and proposed experiments.
- `competitive-landscape.md` — what existing products do under the hood, with engineering-blog evidence where available.
- `architecture-options.md` — the comparison the user asked for: A (Prompt + Profile), B (RAG), C (Style Embeddings), D (Activation Steering), E (LoRA/PEFT), F (Preference Learning), G (Hybrid). Ranked by evidence.
- `evaluation-methods.md` — the ensemble evaluation recipe in detail, including the CI signal tier vs. release-candidate tier.
- `humanifyme-research-roadmap.md` — what to publish, when, with whom, with what budget.

The synthesis "HumanifyMe Recommended Research Architecture v1" with confidence levels lives at the end of `architecture-options.md`.
