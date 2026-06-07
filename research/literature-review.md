# Literature Review: 50 Load-Bearing Papers for HumanifyMe

**Compiled:** June 2026
**Coverage:** 50 papers across the 15 research areas. Per-paper template: title, venue/year, lead authors, citation count (Semantic Scholar / Google Scholar approximate), problem, methodology, datasets, metrics, strengths, weaknesses, relevance to HumanifyMe.

Papers are grouped by primary contribution area. Many papers belong to multiple categories; the primary tag reflects their strongest contribution.

---

## A. Authorship Attribution, Verification, and Stylometry

### A1. Stamatatos — A Survey of Modern Authorship Attribution Methods
- **Venue:** JASIST (Wiley), 60(3), 2009.
- **Authors:** Efstathios Stamatatos.
- **Citations:** ~1,400+.
- **Problem:** Establish a taxonomy of computational authorship attribution.
- **Methodology:** Survey of lexical, character, syntactic, semantic features × similarity / profile / instance classifiers.
- **Datasets:** Federalist Papers, RCV1, PAN corpora, blog corpora.
- **Metrics:** Closed-set classification accuracy, macro/micro F1.
- **Strengths:** The canonical feature taxonomy still cited in 2026. Character n-grams and function-word frequencies surfaced as the most consistently strong cheap features.
- **Weaknesses:** Pre-transformer; closed-set, long-document assumptions.
- **Relevance:** Defines the cheap interpretable feature set HumanifyMe's local profile should serialize.

### A2. Koppel, Schler & Argamon — Computational Methods in Authorship Attribution
- **Venue:** JASIST, 60(1), 2009.
- **Citations:** ~780.
- **Problem:** Open-set, profiling, needle-in-haystack attribution.
- **Methodology:** Function-word + POS-bigram SVMs; introduced unmasking technique.
- **Datasets:** Blog Authorship Corpus, Federalist, IMDb.
- **Strengths:** First formal treatment of practical attribution settings — matches HumanifyMe's regime.
- **Relevance:** Unmasking is reusable as a robustness probe — if the user's voice signal degrades under masking, the profile is overfit.

### A3. Abbasi & Chen — Writeprints
- **Venue:** ACM TOIS, 26(2), 2008. **Citations:** ~900.
- **Problem:** Stylometric "fingerprint" identification online.
- **Methodology:** PCA over a 250-feature stylometric vector (lexical, syntactic, structural, content-specific, idiosyncratic).
- **Strengths:** Defines the Writeprints feature set still used as a baseline.
- **Relevance:** Writeprints features are the **minimum viable style profile** HumanifyMe should serialize per user.

### A4. LIWC — Pennebaker et al.
- **Citations:** >18,000 across versions.
- **Methodology:** Closed-vocabulary dictionary scoring across ~80 categories.
- **Strengths:** Cheap, interpretable, well-validated. Function-word and pronoun categories are among the most stable per-author signals.
- **Relevance:** Excellent local fingerprint — runs entirely on-device, gives a 60–80-dim voice vector, interpretable enough to explain edits.

### A5. Rivera-Soto et al. — Learning Universal Authorship Representations (LUAR)
- **Venue:** EMNLP 2021. **Citations:** ~250.
- **Problem:** Cross-domain author embeddings.
- **Methodology:** Contrastive (SimCLR-style) training over multi-episode author bundles. SBERT backbone pools across posts.
- **Datasets:** Reddit (1M+ authors), Amazon Reviews, fanfiction.
- **Metrics:** R@8, MRR, AUC for cross-domain AV.
- **Strengths:** First widely usable universal author embedding; pretrained ships on HuggingFace.
- **Weaknesses:** Conflates topic with style (probed by Wang et al. TACL 2023).
- **Relevance:** **The most important single paper for HumanifyMe's evaluation harness.** LUAR cosine between user samples and rewritten draft is the natural automated voice-match metric.
- **Link:** https://aclanthology.org/2021.emnlp-main.70/

### A6. Wegmann, Schraagen & Nguyen — Same Author or Just Same Topic?
- **Venue:** RepL4NLP @ ACL 2022. **Citations:** ~150.
- **Problem:** Decouple style from topic in author embeddings.
- **Methodology:** Conversation-controlled contrastive AV.
- **Strengths:** Cleanest demonstration that conversation-level control yields purer style. Released `AnnaWegmann/Style-Embedding`.
- **Relevance:** Wegmann embeddings are purer style than LUAR. Use Wegmann jointly with LUAR; divergence flags content leakage.

### A7. Patel et al. — StyleDistance
- **Venue:** NAACL 2025. **Citations:** ~40.
- **Methodology:** Synthetic parallel paraphrases (40 controlled style features), contrastive training.
- **Strengths:** Strongest 2026 content-independent style embedding; passes STEL-Or-Content harder than prior work. Ships on HuggingFace.
- **Relevance:** **Best 2026 choice for HumanifyMe's voice-match score.**

### A8. Wang et al. — Can Authorship Representation Learning Capture Stylistic Features?
- **Venue:** TACL 2023. **Citations:** ~80.
- **Methodology:** Probing tasks; topic-controlled negatives.
- **Strengths:** Honest answer that LUAR is "substantially stylistic but not purely so." Provides probes any voice-rewriter team should run.
- **Relevance:** Tells us the failure mode of LUAR cosine alone — if user samples and draft share topic, cosine inflates.

### A9. Stamatatos, Bevendorff et al. — PAN 2023 Cross-Discourse AV Overview
- **Venue:** CLEF / Springer LNCS 2023.
- **Methodology:** Shared task across discourse types (essays, emails, interviews, speeches).
- **Metrics:** AUC, C@1, F0.5u, F1, Brier (PAN aggregate).
- **Relevance:** Cross-register AV is HumanifyMe's exact deployment scenario. Tells us which AV systems survive register shift.

### A10. Rivera-Soto et al. — Few-Shot Detection of Machine-Generated Text Using Style Representations
- **Venue:** ICLR 2024. **Citations:** ~120.
- **Methodology:** Style embeddings → human vs. LLM as few-shot anomaly classification.
- **Strengths:** Direct evidence that LLM outputs cluster as a *synthetic author* in style space.
- **Relevance:** The "LLM prior dominates" problem named in measurement terms.

---

## B. Authorship Style Transfer

### B1. Krishna, Wieting & Iyyer — STRAP
- **Venue:** EMNLP 2020. **Citations:** ~500.
- **Methodology:** Paraphrase-then-restyle. Diverse paraphraser + per-style inverse paraphrasers.
- **Strengths:** Defines the dominant paraphrase-then-restyle recipe still in use.
- **Relevance:** The architectural skeleton for HumanifyMe's rewrite pipeline.

### B2. Patel, Andrews & Callison-Burch — STYLL
- **Venue:** arxiv 2212.08986 (cited in subsequent peer-reviewed work; ~100 cites).
- **Problem:** Low-resource authorship style transfer.
- **Methodology:** Few-shot prompt LLM with target-style descriptors + pseudo-parallel transfer pairs.
- **Strengths:** Closest precedent to HumanifyMe in problem setup.
- **Weaknesses:** **Key finding** — STYLL moves text *away* from source style but does not convincingly move *toward* target. Style "removal" is easier than "adoption."
- **Relevance:** Critical warning for exemplar-only approaches; we must measure adoption, not just departure.

### B3. Horvitz et al. — TinyStyler
- **Venue:** Findings EMNLP 2024. **Citations:** ~30.
- **Methodology:** 800M seq2seq + authorship embedding conditioning. Self-train + filter.
- **Strengths:** **Beats GPT-4 on authorship style transfer** at tiny compute.
- **Relevance:** Strongest 2026 architectural template for a local rewriter, if we ever ship one.

### B4. Horvitz et al. — ParaGuide
- **Venue:** AAAI 2024. **Citations:** ~80.
- **Methodology:** Paraphrase-conditioned diffusion + gradient-based guidance from style classifiers / embedders.
- **Relevance:** Inference-time control architecturally interesting; overkill for MVP.

### B5. Liu, Agarwal & May — ASTRAPOP
- **Venue:** arxiv 2403.08043. **Citations:** ~30.
- **Methodology:** SFT + PPO/DPO/CPO with rewards = style classifier + semantic similarity.
- **Strengths:** First systematic look at RLHF-style rewards for authorship transfer; DPO comes out cleanest.
- **Relevance:** Roadmap for "DPO on user's accept/reject signal" loop.

### B6. Patel et al. — LISA / Learning Interpretable Style Embeddings
- **Venue:** Findings EMNLP 2023. **Citations:** ~70.
- **Methodology:** LLM-prompted stylometry → synthetic dataset → train interpretable 768-dim style embedding.
- **Strengths:** First interpretable style embedding — each axis is a labeled linguistic attribute.
- **Relevance:** Strongly relevant for HumanifyMe UX. Can show users *which* attributes their draft is missing.

### B7. Wang et al. — Catch Me If You Can? Not Yet
- **Venue:** Findings EMNLP 2025. **Citations:** ~25 (recent).
- **Problem:** Can frontier LLMs imitate everyday-author voices from few-shot?
- **Methodology:** 40,000+ generations × 5 models × 400+ real authors × 4 domains. Ensemble eval (AA + AV + style match + AI-detection).
- **Key finding:** **17–21% AV accuracy on blogs, 50–66% on Reddit-style. ~95–97% on structured news and email.** More demonstrations give diminishing returns.
- **Strengths:** **The definitive empirical justification for HumanifyMe's existence.**
- **Relevance:** Validates the product thesis: out-of-the-box LLMs cannot imitate the user's voice from few-shot. A learned, persistent profile plus paraphrase-then-restyle is required.

### B8. Mahmood et al. — Mutant-X (authorship obfuscation)
- **Venue:** PoPETS 2019. **Citations:** ~140.
- **Methodology:** GA word-substitution under attribution-classifier reward.
- **Relevance:** Inverse problem. Methodology — iteratively rewrite until target classifier is satisfied — is reusable as HumanifyMe's quality gate.

### B9. Khan et al. — STYLEMC
- **Venue:** arxiv 2312.17242. **Citations:** ~70.
- **Methodology:** Contrastive style representations guide Monte Carlo decoding.
- **Relevance:** Useful as a measurement tool (style cosine as quality gate).

---

## C. Personalized Text Generation Benchmarks

### C1. Salemi et al. — LaMP
- **Venue:** ACL 2024 Long. **Citations:** ~300.
- **Problem:** First broad-coverage personalization benchmark.
- **Methodology:** Seven tasks (3 classification, 4 generation) with user-based and time-based splits.
- **Strengths:** First reproducible RAP benchmark.
- **Weaknesses:** Reference-based ROUGE rewards content match, not style. Headlines too short for stylistic signal.
- **Relevance:** The de-facto baseline. HumanifyMe should report on LaMP-7 (tweet paraphrasing) and LaMP-6 (email subjects).

### C2. Kumar et al. — LongLaMP
- **Venue:** arxiv 2407.11016. **Citations:** ~70.
- **Problem:** LaMP is too short-form.
- **Methodology:** Four long-form tasks (Email, Abstract, Review, Topic) with 90–300 token outputs.
- **Strengths:** RAG yields +30–170% over zero-shot.
- **Weaknesses:** ROUGE/METEOR are weak voice proxies.
- **Relevance:** LongLaMP-Email and LongLaMP-Review are the most defensible HumanifyMe benchmark surfaces.

### C3. Salemi & Zamani — LaMP-QA
- **Venue:** EMNLP 2025 Main. **Citations:** ~25.
- **Methodology:** 2,830 questions across 45+ subcategories; rubric-based aspect coverage; human + automatic eval.
- **Strengths:** Up to 39% gain from correct profile; mismatched-profile control validates personalization signal.
- **Relevance:** Borrow the **mismatched-profile control** and the **rubric-based judge** wholesale.

### C4. Salemi & Zamani — RAG vs PEFT for Privacy-Preserving Personalization
- **Venue:** arxiv 2409.09510 / ACM TOIS 2025. **Citations:** ~110.
- **Methodology:** Head-to-head RAG / PEFT / combined across 7 LaMP tasks.
- **Key result:** **RAG +14.92%, PEFT +1.07%, combined +15.98%** over non-personalized.
- **Relevance:** **The most important single methodological paper for HumanifyMe's architecture choice.** Strongly justifies RAG-first MVP.

### C5. Zollo et al. — PersonalLLM
- **Venue:** ICLR 2025. **Citations:** ~60.
- **Methodology:** Open-ended prompts × 10 reward models simulate heterogeneous latent preferences.
- **Relevance:** Useful preference-modeling backbone. Tangential to style imitation per se.

### C6. Jin et al. — PersonaMem
- **Venue:** COLM 2025. **Citations:** ~20.
- **Problem:** Can LLMs track *evolving* user profiles across many sessions?
- **Key finding:** Frontier models (GPT-4.1, o4-mini, Gemini 2.0) achieve only ~50% overall accuracy.
- **Relevance:** Critical reference for the **profile staleness** problem.

### C7. Zhang et al. — PersonaChat
- **Venue:** ACL 2018. **Citations:** ~2,200+.
- **Relevance:** Historical context only. Saturated.

### C8. Salemi et al. — REST-PG
- **Venue:** arxiv 2501.04167. **Citations:** ~30.
- **Methodology:** Reasoning paths over user data + EM Reinforced Self-Training.
- **Key result:** +14.5% average over SOTA on LongLaMP.
- **Relevance:** Current LongLaMP SOTA — HumanifyMe's quantitative target.

---

## D. Personalized LLMs and User Modeling

### D1. Li et al. — Teach LLMs to Personalize
- **Venue:** arxiv 2308.07968. **Citations:** ~200.
- **Methodology:** Multi-stage retrieve → rank → summarize → synthesize → generate.
- **Strengths:** Canonical reference architecture HumanifyMe should match or beat.
- **Relevance:** Pipeline shape directly informs HumanifyMe's layered prompt design.

### D2. Mysore et al. — PEARL
- **Venue:** EMNLP 2024 Workshop CustomNLP4U. **Citations:** ~85.
- **Methodology:** Generation-calibrated retriever via KL-divergence to LLM-perceived utility.
- **Strengths:** Strongest single-paper win on retriever design.
- **Relevance:** Adopt retriever calibration once we have a few thousand cross-user generations.

### D3. Neelakanteswara et al. — RAGs to Style
- **Venue:** Personalize @ ACL 2024. **Citations:** ~30.
- **Methodology:** Replace retrieval scoring with style-embedding similarity.
- **Strengths:** Style-keyed retrieval marginally but consistently beats term/context-keyed.
- **Relevance:** Vindicates authorship embedding as retrieval key.

### D4. Tan et al. — OPPU
- **Venue:** EMNLP 2024 Main. **Citations:** ~190.
- **Methodology:** Per-user LoRA + retrieval + profile prompts.
- **Strengths:** Significantly beats prompt-based methods on all 7 LaMP tasks.
- **Weaknesses:** Storage scales O(users); cold-start still bad.
- **Relevance:** Canonical instance of per-user PEFT. Sets the empirical ceiling for the naïve approach.

### D5. Tan et al. — Per-Pcs
- **Venue:** EMNLP 2024 Main. **Citations:** ~50.
- **Methodology:** OPPU + collaborative refinement across users.
- **Relevance:** Probably out of scope for HumanifyMe MVP given local-first privacy stance.

### D6. PERFIT — "Exploring Personalization Shifts in Representation Space"
- **Venue:** ICLR 2026 (OpenReview Lwn67fk9e1).
- **Methodology:** Decompose personalization into collective shift + per-user shift in hidden-representation low-rank subspace.
- **Key result:** **92.3% parameter reduction vs OPPU** at comparable LaMP performance.
- **Relevance:** **Structural argument that per-user LoRA is wrong granularity.** Suggests user-state should be embedding, not adapter weights.

### D7. TAP-PER — Compact User Representations
- **Venue:** arxiv 2606.04547.
- **Methodology:** Temporal prefix embeddings (not LoRA).
- **Key result:** **130× smaller per-user state than OPPU**, beats baselines.
- **Relevance:** Reinforces PERFIT's argument.

### D8. Liu et al. — Persona-Plug (PPlug)
- **Venue:** ACL 2025 Long. **Citations:** ~85.
- **Methodology:** Lightweight user-behavior encoder → dense user embedding → input-aware aggregator → prepended to LLM input.
- **Strengths:** Up to 35.8% LaMP improvement.
- **Weaknesses:** Soft-prompt prepending requires open weights or accepting model.

### D9. Ning et al. — USER-LLM
- **Venue:** ACM WebConf 2025 Companion. **Citations:** ~120.
- **Methodology:** Self-supervised user encoder → soft prompts / cross-attention.
- **Relevance:** Requires LLM modification (cross-attention) — not API-compatible.

### D10. PRIME — Cognitive Memory for Personalization
- **Venue:** arxiv 2507.04607.
- **Methodology:** Episodic + semantic memory; slow-thinking inference.
- **Relevance:** HumanifyMe's `~/.humanifyme/data.db` could mirror episodic vs. semantic split.

### D11. Sun et al. — Persona-DB
- **Venue:** COLING 2025. **Citations:** ~50.
- **Methodology:** Hierarchical persona: raw → distilled clusters → abstracted traits + collaborative refinement.
- **Strengths:** >15% improvement over RAG under cold-start.
- **Relevance:** Hierarchical profile design directly relevant.

### D12. Zhang — Guided Profile Generation
- **Venue:** Findings EMNLP 2024. **Citations:** ~25.
- **Methodology:** LLM-generated structured profile from history before generation.
- **Strengths:** +37% over raw context injection.
- **Relevance:** Validates structured profile path.

### D13. Tang et al. — Step-Back Profiling
- **Venue:** ICLR 2025 (arxiv 2406.14275). **Citations:** ~50.
- **Methodology:** LLM-distilled concise profile.
- **Strengths:** +3.6 LaMP points using a distilled profile alone.
- **Relevance:** Supports profile-first architecture.

### D14. Yeh et al. — GhostWriter (CHI 2024)
- **Venue:** CHI 2024. **Citations:** ~120.
- **Methodology:** Design probe with 18 participants. Combines implicit style learning with explicit teaching moments.
- **Strengths:** Strongest HCI evidence that users want both inspectable profile and per-sample exemplar control.
- **Relevance:** Defines the MCP-tool UX bar.

### D15. Draxler et al. — The AI Ghostwriter Effect
- **Venue:** ACM TOCHI 2024. **Citations:** ~200.
- **Key finding:** Personalization alone does **not** increase ownership perception; only direct user edits do.
- **Relevance:** Cautionary for marketing.

### D16. Nicolicioiu et al. — Panza
- **Venue:** arxiv 2407.10994 (v4 Feb 2025). **Citations:** ~70.
- **Problem:** Fully-local personalized email writer.
- **Methodology:** Reverse-instruction data playback + LoRA/RoSA + RAG on Llama-3-8B.
- **Datasets:** Three released email datasets; <100 emails per user.
- **Metrics:** BLEU + MAUVE jointly correlate strongly with human preference.
- **Strengths:** **Highest-relevance paper in the literature for HumanifyMe.** Direct empirical demonstration that <100 samples suffice; RAG+LoRA > either alone; RoSA > LoRA > base.
- **Relevance:** **The closest existing system to HumanifyMe's product thesis.** Borrow the data-playback synthesis, the QLoRA + RAG architecture, the human-eval design.

### D17. Nicolicioiu et al. — Position paper on phishing risk
- **Venue:** ICML 2025 Position Track (arxiv 2502.06560).
- **Problem:** Personal-writing-style models as phishing vector.
- **Relevance:** Must be addressed in HumanifyMe privacy spec.

---

## E. Memory Architectures

### E1. Packer et al. — MemGPT
- **Venue:** ICLR 2024. **Citations:** ~300+.
- **Methodology:** Hierarchical memory (main / recall / archival) with LLM-managed paging.
- **Relevance:** Inspires tiered design; full agent-memory abstraction is overkill for HumanifyMe.

### E2. Mem0 — Production-Ready AI Agents with Long-Term Memory
- **Venue:** arxiv 2504.19413. **Citations:** ~30–60.
- **Methodology:** LLM-extracted facts → embedded → Qdrant. Conflict resolution + lifecycle.
- **Result:** 91% lower p95 latency, >90% token savings vs naive history stuffing.
- **Relevance:** Architecturally close to HumanifyMe's SQLite + embedding-index design.

### E3. CLAUDE.md / file-based memory
- **Source:** Anthropic industry pattern, 2024–2026.
- **Methodology:** Plain Markdown injected at conversation start.
- **Best practice:** <200 lines for adherence.
- **Relevance:** Inspires HumanifyMe's profile-as-file design.

---

## F. Activation Steering and Style Vectors

### F1. Subramani, Suresh & Peters — Extracting Latent Steering Vectors
- **Venue:** Findings ACL 2022. **Citations:** ~250.
- **Relevance:** Foundational theoretical justification — LMs are steerable in residual stream.

### F2. Turner et al. — ActAdd
- **Venue:** arxiv 2308.10248. **Citations:** ~150.
- **Methodology:** Contrast pair → activation difference → add to forward pass.
- **Relevance:** Established no-train inference-time steering recipe.

### F3. Zou et al. — Representation Engineering (RepE)
- **Venue:** arxiv 2310.01405. **Citations:** ~700.
- **Methodology:** Linear artificial tomography (LAT) — contrastive stimuli → top-PCA direction → read/control.
- **Relevance:** Standard RepE pipeline HumanifyMe would adapt for style if going local-model.

### F4. Rimsky et al. — Contrastive Activation Addition (CAA)
- **Venue:** ACL 2024 Long. **Citations:** ~200.
- **Methodology:** ~100 MCQ contrastive pairs → mean activation difference → add post-prompt.
- **Strengths:** Canonical CAA recipe.
- **Relevance:** Direct ancestor of StyleVector.

### F5. Konen et al. — Style Vectors for Steering Generative LLMs
- **Venue:** Findings EACL 2024.
- **Methodology:** Activation-based or training-based style vectors for emotion/sentiment.
- **Relevance:** Direct proof of compute-style-vector-from-samples recipe (single dimension).

### F6. Konen et al. — Effectiveness of Style Vectors (Human Eval)
- **Venue:** arxiv 2601.21505 (2026).
- **Methodology:** 7,000+ Prolific ratings, 190 raters.
- **Findings:** Moderate α reliably shifts perceived emotion; high α destroys fluency.
- **Relevance:** Human-eval ground truth — inverted-U coherence/strength tradeoff confirmed.

### F7. Zhang et al. — StyleVector (personalized activation steering)
- **Venue:** ACL 2025 Long. **Citations:** ~25.
- **Methodology:** Per-user mean residual-stream difference (user − neutral) at chosen layer.
- **Headline result:** **+8% over PEFT at 1,700× less per-user storage.**
- **Strengths:** Closest prior art to a per-user style vector for HumanifyMe.
- **Weaknesses:** Requires white-box access — incompatible with closed APIs.
- **Relevance:** Only viable in HumanifyMe's local-model variant.

### F8. Han et al. — LM-Steer (ACL 2024 Outstanding Paper)
- **Venue:** ACL 2024.
- **Methodology:** Linear transform of output-token embedding matrix.
- **Relevance:** Closed-form steering alternative; still requires output-layer access.

### F9. Li et al. — Inference-Time Intervention (ITI)
- **Venue:** NeurIPS 2023. **Citations:** ~600.
- **Methodology:** Per-attention-head probed direction shift.
- **Relevance:** Per-head localization may be reusable for voice features.

### F10. Liu et al. — In-Context Vectors (ICV)
- **Venue:** ICML 2024.
- **Methodology:** Demonstrations → activation shift → vector → apply on queries.
- **Relevance:** Conceptual basis for "compute user voice vector from their samples."

### F11. Todd et al. — Function Vectors
- **Venue:** ICLR 2024.
- **Methodology:** Causal mediation analysis → sparse heads carrying task vectors.
- **Relevance:** Theoretical backing if HumanifyMe goes open-weights.

### F12. Templeton et al. — Scaling Monosemanticity (Golden Gate Claude)
- **Venue:** Transformer Circuits, Anthropic.
- **Methodology:** SAE on Claude 3 Sonnet → 34M features → clamping.
- **Relevance:** Confirms frontier closed-weights models contain steerable style features. **But not API-exposed.**

### F13. Arditi et al. — Refusal Mediated by a Single Direction
- **Venue:** NeurIPS 2024.
- **Methodology:** Difference-in-means; causal ablation.
- **Strengths:** Strong evidence complex behaviors are often rank-1 in activation space.
- **Relevance:** Suggests user voice may be similarly low-rank — encouraging a small bundle of style directions.

### F14. Chen et al. — Persona Vectors (Anthropic)
- **Venue:** arxiv 2507.21509.
- **Methodology:** Automated contrastive-prompt pipeline → persona vector → α-scaled addition.
- **Findings:** r=0.76–0.97 correlation with personality changes.
- **Relevance:** Anthropic-validated CAA extension. But not API-exposed.

### F15. Wu et al. — AxBench
- **Venue:** ICML 2025. **Citations:** ~80.
- **Methodology:** Head-to-head benchmark of every major steering method on Gemma-2.
- **Key finding:** **Prompting wins overall**, then fine-tuning, then supervised steering. SAEs underperform.
- **Relevance:** **Reality check for the entire steering field.** Suggests well-engineered structured prompt may match steering — major point in favor of API-compatible path.

---

## G. PEFT, LoRA, Preference Learning

### G1. Hu et al. — LoRA
- **Venue:** ICLR 2022. **Citations:** ~16,000+.
- **Methodology:** Rank-r decomposition ΔW = BA injected into attention projections.
- **Relevance:** Foundational substrate.

### G2. Dettmers et al. — QLoRA
- **Venue:** NeurIPS 2023 Oral. **Citations:** ~5,500.
- **Methodology:** 4-bit NF4 quantized base + LoRA.
- **Relevance:** Enabler if HumanifyMe supports local fine-tuning.

### G3. Liu et al. — DoRA
- **Venue:** ICML 2024 Oral. **Citations:** ~900.
- **Methodology:** Magnitude + direction decomposition.
- **Strengths:** 61.89% vs LoRA's 39.49% at rank 4.
- **Relevance:** Better LoRA default at small ranks.

### G4. Kopiczko et al. — VeRA
- **Venue:** ICLR 2024. **Citations:** ~400.
- **Methodology:** Shared random low-rank matrices + per-user scaling vectors.
- **Relevance:** ~10× smaller than LoRA; worth piloting if storage matters.

### G5. Nikdan et al. — RoSA
- **Venue:** ICML 2024. **Citations:** ~250.
- **Methodology:** Joint low-rank + sparse decomposition.
- **Strengths:** Matches full FT on Panza style imitation.
- **Relevance:** **The single most relevant PEFT method for style.** Recommended in Panza.

### G6. Lester et al. — Prompt Tuning at Scale
- **Venue:** EMNLP 2021. **Citations:** ~4,500.
- **Relevance:** Cheapest per-user knob if hosted LLM exposes soft prompts.

### G7. Liu et al. — IA³
- **Venue:** NeurIPS 2022. **Citations:** ~1,400.
- **Methodology:** Three element-wise scaling vectors per layer.
- **Relevance:** Smallest PEFT — fallback if per-user storage must be sub-megabyte.

### G8. Rafailov et al. — DPO
- **Venue:** NeurIPS 2023. **Citations:** ~7,000.
- **Relevance:** Default preference-optimization method.

### G9. Azar et al. — IPO
- **Venue:** AISTATS 2024. **Citations:** ~700.
- **Relevance:** Safer than DPO when sample size is small.

### G10. Ethayarajh et al. — KTO
- **Venue:** ICML 2024. **Citations:** ~800.
- **Methodology:** Binary desirable/undesirable signal; prospect-theoretic.
- **Strengths:** Matches DPO without paired preferences. **Realistic for product telemetry.**
- **Relevance:** **Right signal model for HumanifyMe's accept/reject UX.**

### G11. Singh et al. — FSPO
- **Venue:** arxiv 2502.19312. **Citations:** ~60.
- **Methodology:** Meta-train on synthetic personas; adapt with few real-user preferences.
- **Key result:** **72% win-rate against non-personalized from dozens of preferences.**
- **Relevance:** Resolves the "DPO needs 1000s per user" objection. Enables Year-2 active learning.

### G12. Jang et al. — Personalized Soups
- **Venue:** arxiv 2310.11564 / NeurIPS 2024 workshop. **Citations:** ~250.
- **Methodology:** Post-hoc parameter merging of pref-axis policies.
- **Relevance:** Tractable middle path — small library of style axes merged per user.

### G13. Li et al. — P-RLHF
- **Venue:** NeurIPS 2024 workshop. **Citations:** ~120.
- **Methodology:** Joint per-user embedding + shared LLM via P-DPO.
- **Relevance:** Leanest credible personalization stack from peer-reviewed literature.

### G14. Bose et al. — LoRe
- **Venue:** arxiv 2504.14439 (Meta FAIR). **Citations:** ~25.
- **Methodology:** Reward functions in low-dim subspace; users as mixing vectors.
- **Relevance:** Preference modeling as cheap shared component.

### G15. P-ShareLoRA
- **Venue:** AISTATS 2025.
- **Methodology:** Shared LoRA + per-user heads.
- **Relevance:** Concrete proposal for shared style-adherence adapter.

### G16. Biderman et al. — LoRA Learns Less and Forgets Less
- **Venue:** TMLR Aug 2024. **Citations:** ~400.
- **Findings:** LoRA underperforms full FT on hard targets but **forgets less** and generates more diversely.
- **Relevance:** Tells us LoRA is *better* than FT for our use case — minimal forgetting, no need for huge target-domain learning.

### G17. S-LoRA
- **Venue:** MLSys 2024. **Citations:** ~700.
- **Methodology:** Adapter memory pool + unified paging.
- **Result:** 4× throughput; thousands of adapters per base.
- **Relevance:** Multi-LoRA serving feasibility upper bound.

### G18. Punica
- **Venue:** MLSys 2024. **Citations:** ~350.
- **Result:** 12× throughput, +2ms/token latency penalty.
- **Relevance:** System-level lower bound for per-user adapter inference cost.

### G19. LoRA Land
- **Venue:** arxiv 2405.00732 (Predibase). **Citations:** ~150.
- **Result:** QLoRA-tuned models beat GPT-4 by 10pp on 31 specialist tasks; avg ~$8 per adapter.
- **Relevance:** Real-world per-adapter training cost data point.

---

## H. Evaluation Methodology

### H1. Jangra et al. — Evaluating Style-Personalized Text Generation
- **Venue:** arxiv 2508.06374. **Citations:** ~15.
- **Methodology:** Empirically compares BLEU, ROUGE, sentence/style embeddings, AA-classifier, LLM-as-judge.
- **Key finding:** **No single metric is sufficient; ensembles dominate any single judge.**
- **Relevance:** **The single most important paper for HumanifyMe's eval harness design.**

### H2. Salemi, Killingback & Zamani — ExPerT
- **Venue:** Findings ACL 2025. **Citations:** ~30.
- **Methodology:** Atomic-aspect decomposition + alignment scoring.
- **Strengths:** +7.2% over SoTA human alignment; 4.7/5 usability.
- **Relevance:** Strong candidate for HumanifyMe's deep-eval tier.

### H3. Liu et al. — G-Eval
- **Venue:** EMNLP 2023. **Citations:** ~1,500.
- **Relevance:** Defines LLM-judge baseline to improve on.

### H4. Dong et al. — Can LLM be a Personalized Judge?
- **Venue:** Findings EMNLP 2024. **Citations:** ~80.
- **Findings:** 60–70% baseline agreement; >80% on uncertainty-filtered subset.
- **Relevance:** **Mandatory caveat** for HumanifyMe's LLM-judge tier.

### H5. Shi et al. — Judging the Judges (Position Bias)
- **Venue:** IJCNLP-AACL 2025. **Citations:** ~100.
- **Findings:** >10% accuracy swings from ordering alone.
- **Relevance:** HumanifyMe pairwise judging must use randomized order + double-presentation averaging.

### H6. van der Lee et al. — Human Evaluation Best Practices
- **Venue:** Computer Speech & Language 2020. **Citations:** ~600.
- **Relevance:** Baseline checklist HumanifyMe Bench must publish.

### H7. Sadasivan et al. — Can AI-Generated Text Be Reliably Detected?
- **Venue:** ICML 2024. **Citations:** ~800.
- **Findings:** Theoretical AUROC bound; recursive paraphrasing defeats most detectors.
- **Relevance:** AI-detection is sanity floor only, never primary metric.

### H8. Jin et al. — Survey of Deep Learning for Text Style Transfer
- **Venue:** Computational Linguistics (MIT Press), 48(1), 2022. **Citations:** ~700.
- **Relevance:** Defines the canonical three-axis rubric (style accuracy + content preservation + fluency).

---

## I. Surveys

### I1. Tseng et al. — Personalization of Large Language Models: A Survey
- **Venue:** arxiv 2411.00027. **Citations:** ~80.
- **Relevance:** Canonical taxonomy reference.

### I2. Survey of Personalized LLMs: Progress and Future Directions
- **Venue:** arxiv 2502.11528. **Citations:** ~80.
- **Relevance:** Best general overview map of the field.

### I3. Survey of Personalization: From RAG to Agent
- **Venue:** ACM TOIS 2025 (arxiv 2504.10147).
- **Relevance:** Cleanest mapping across RAG stages.

---

## Index by research area

- **Authorship Attribution:** A1–A10
- **Authorship Style Transfer:** B1–B9
- **Personalized Text Generation:** C1–C8, D1–D17
- **Personalized LLMs:** D1–D17
- **Style Embeddings:** A5–A7, B3, B6
- **Retrieval-Augmented Personalization:** C1–C4, D1–D3, D11–D13, E2
- **Preference Learning:** G8–G15
- **LoRA Personalization:** G1–G7, D4–D7
- **Parameter-Efficient Personalization:** G1–G7, D4–D7, D6–D7
- **Activation Steering:** F1–F4, F9–F11, F15
- **Style Vectors:** F5–F8, F12–F14
- **User Modeling:** D1, D8–D13, E1–E3
- **Stylometry:** A1–A4
- **Human Evaluation of Writing Style:** H1–H6, D14–D15
- **Personalization Benchmarks:** C1–C8, H1–H2, H4
