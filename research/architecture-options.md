# Architecture Options: A through G, Ranked by Evidence

The user's central question: **if we wanted to build the best personalized writing system in the world in 2026, what architecture would current research suggest?** This document compares the seven candidate architectures with confidence levels per claim and citations to load-bearing evidence. It does not assume the answer; the recommendation falls out at the end.

The candidates:

- **A. Prompt + Structured Style Profile** — distilled natural-language profile in the system prompt.
- **B. Retrieval-Augmented Personalization** — RAG over the user's sample history at inference time.
- **C. Style Embeddings** — neural representations of voice used for retrieval keying and evaluation, optionally for conditioning.
- **D. Activation Steering / Style Vectors** — inference-time intervention on the LLM's residual stream.
- **E. LoRA / PEFT Personalization** — per-user lightweight adapter weights.
- **F. Preference Learning** — DPO / IPO / KTO / FSPO over user accept/reject signal.
- **G. Hybrid Systems** — combinations of the above.

---

## A. Prompt + Structured Style Profile

**What it is.** A distilled natural-language profile (HumanifyMe's `StyleProfile` JSON, plus a plain-English summary) is injected as part of the system prompt for every rewrite. No retrieval at inference time; no model surgery; no adapter weights.

**Empirical evidence for it.**
- **Guided Profile Generation** (Zhang, Findings EMNLP 2024) reports +37% over raw context injection on preference prediction.
- **Step-Back Profiling** (Tang et al., ICLR 2025) reports +3.6 LaMP points using a distilled profile alone.
- **GhostWriter** (Yeh et al., CHI 2024) demonstrates users *want* an inspectable, editable profile.
- **ChatGPT's reverse-engineered memory architecture** (Khemani 2025, widely cited) shows OpenAI converged on context injection over retrieval for its own memory feature — the "bitter lesson" bet on structured prompt context.

**Empirical evidence against it.**
- **Catch Me If You Can?** (Wang et al., EMNLP 2025): frontier LLMs with five-shot examples still hit 17–21% AV on blog-style and 50–66% on Reddit-style. More demonstrations give diminishing returns. Prompt-based methods plateau.
- **Salemi & Zamani 2024** (arxiv 2409.09510): prompt-only / non-personalized baseline is the floor that everything else beats by 14–16%.

**Confidence on the architecture's strength.** High that it works at small data; high that it plateaus on informal genres.

**HumanifyMe fit.**
- **Compatible with closed APIs.** Works on Anthropic, OpenAI, Gemini equally.
- **Privacy-friendly.** Only the structured profile (small JSON) goes over the wire — never raw samples.
- **Cheapest to ship.** No retrieval infrastructure, no adapter training.

**Recommendation.** Necessary foundation. Insufficient on its own.

---

## B. Retrieval-Augmented Personalization (RAG)

**What it is.** At inference time, retrieve the top-k most relevant of the user's past samples (keyed by some similarity function) and inject them as exemplars in the prompt alongside the draft to be rewritten.

**Empirical evidence for it.**
- **Salemi & Zamani 2024** (arxiv 2409.09510): RAG alone yields **+14.92%** over non-personalized baseline averaged across seven LaMP tasks. The single largest method contribution in the personalization literature.
- **LaMP-QA** (EMNLP 2025): up to 39% gain from incorporating personalized context.
- **PEARL** (Mysore et al., EMNLP 2024 Workshop): generation-calibrated retrievers further improve quality.
- **Teach LLMs to Personalize** (Li et al., arxiv 2308.07968): multi-stage RAG (retrieve → rank → summarize → synthesize → generate) is the canonical reference architecture, widely cited.
- **Panza** (Nicolicioiu et al., 2024): RAG + PEFT is the empirically validated local-personalization combo.

**Empirical evidence against it.**
- **STYLL** (Patel, Andrews, Callison-Burch 2022): few-shot exemplars in-context move text *away* from source style but **do not reliably move toward target.** Adoption is harder than departure.
- **Retrieval redundancy / context bloat** documented in HYDRA, PEARL, Persona-DB: similarity-only retrieval pulls near-duplicates, degrading generation.
- **Cold-start sparsity** (Persona-DB, RAG-vs-PEFT comparison): under ~50 samples, retrieval helps little.

**Confidence.** High that it's the largest single-method win.

**HumanifyMe fit.**
- **Compatible with closed APIs.** Retrieval happens locally; only top-k samples + draft go over the wire.
- **Privacy:** raw samples are sent at inference time (the redacted versions). This is a slight privacy regression vs. profile-only — note in spec, document for users.
- **Engineering cost.** Moderate. Need a local embedding model (small, runs on CPU) and a SQLite-backed retrieval store.

**Recommendation.** Essential. Pairs with A.

---

## C. Style Embeddings

**What it is.** Neural representations of writing style (LUAR, Wegmann, StyleDistance) used to (a) key retrieval, (b) score voice match in evaluation, (c) potentially condition generation (TinyStyler-style).

**Empirical evidence for it.**
- **LUAR** (Rivera-Soto et al., EMNLP 2021): the public-default authorship embedding. ~250 cites.
- **Wegmann et al.** (RepL4NLP @ ACL 2022): conversation-controlled style embedding. Cleanest content-style separation.
- **StyleDistance** (Patel et al., NAACL 2025): strongest 2026 content-independent style embedding.
- **RAGs to Style** (Personalize @ ACL 2024): style-keyed retrieval marginally but consistently beats topic-keyed.
- **TinyStyler** (Horvitz et al., Findings EMNLP 2024): 800M model conditioned on authorship embedding **beats GPT-4 on short authorship style transfer.**

**Empirical evidence against it.**
- **Wang et al. TACL 2023:** LUAR is substantially-but-not-purely style. Cosine inflates when sample and draft share topic.

**Confidence.** High for retrieval keying and evaluation; medium for generation conditioning (TinyStyler-style requires open weights).

**HumanifyMe fit.**
- **Compatible with closed APIs as retrieval/evaluation only.** Style embeddings run locally; only top-k retrieved samples cross the API boundary.
- **Privacy:** No new exposure. Embeddings stay local.
- **Engineering cost.** Low. Ship a frozen StyleDistance or Wegmann model with the MCP binary.

**Recommendation.** Use for retrieval keying (paired with B) and evaluation. Don't use as primary generation conditioning unless going local-model.

---

## D. Activation Steering / Style Vectors

**What it is.** Compute a "style vector" in the LLM's residual stream from contrastive activations (user samples vs. neutral text); inject at inference time to steer generation toward the user's voice.

**Empirical evidence for it.**
- **StyleVector** (Zhang et al., ACL 2025): +8% over PEFT at **1,700× less per-user storage.** The strongest published result for personalized activation steering.
- **Konen et al.** (EACL 2024 + human-eval 2026): style vectors reliably shift perceived sentiment/emotion at moderate α.
- **Representation Engineering** (Zou et al., ~700 cites): canonical framework.
- **Persona Vectors** (Anthropic, arxiv 2507.21509): demonstrates persona steering at frontier model scale.
- **Refusal Direction** (Arditi et al., NeurIPS 2024): complex behaviors can be rank-1.

**Empirical evidence against it.**
- **AxBench** (Wu et al., ICML 2025): across 500+ concepts on Gemma-2, **prompting wins overall**, then fine-tuning, then supervised steering. SAEs underperform.
- **Non-identifiability** (Venkatesh 2026): many steering vectors are behaviorally equivalent — interpretability claim is weaker than it appears.
- **Coherence collapse at high α** (DLR 2026, Mitra field guide): inverted-U coherence/strength tradeoff.
- **OOD generalization is poor** (Tan et al., NeurIPS 2024).

**Confidence.** Medium for coarse style (sentiment, formality); low-to-medium for fine-grained idiolect.

**HumanifyMe fit.**
- **Incompatible with closed APIs.** Requires access to the residual stream. **Anthropic, OpenAI, Gemini do not expose this.** Period.
- **Compatible only with local-weight models** (Llama, Qwen, Mistral via Ollama).
- **Engineering cost.** Significant if we ever ship a local-model variant. Requires hooks library (`steering-vectors`, `EasyEdit2`).

**Recommendation.** Park as Phase 3+ local-model option. Not viable for the cross-agent MCP-default deployment.

---

## E. LoRA / PEFT Personalization

**What it is.** Train a small per-user LoRA / RoSA / DoRA adapter on the user's samples. Adapter is loaded at inference time, slotted into the base model.

**Empirical evidence for it.**
- **Panza** (Nicolicioiu et al., 2024): <100 samples + RoSA-LoRA + RAG works. The closest published validation for HumanifyMe's regime.
- **OPPU** (Tan et al., EMNLP 2024): per-user LoRA significantly beats prompt-only on all 7 LaMP tasks.
- **LoRA Land** (Predibase, arxiv 2405.00732): production-scale evidence that QLoRA-tuned models beat GPT-4 by 10pp on average across 31 specialist tasks; ~$8 per adapter.

**Empirical evidence against it.**
- **Salemi & Zamani 2024** (arxiv 2409.09510): PEFT alone adds only +1.07% over non-personalized baseline. The combined RAG+PEFT improvement is +15.98%, meaning PEFT's marginal contribution over RAG is **~1pp**.
- **PERFIT** (ICLR 2026): structural critique. Personalization signal lives in low-rank hidden-representation subspace, decomposable into collective + per-user shifts. LoRA over-parameterizes both. **92.3% parameter reduction** vs OPPU at matched performance.
- **TAP-PER** (arxiv 2606.04547): same critique from a different angle. 130× smaller per-user state via prefix embeddings.
- **AxBench** (Wu et al., ICML 2025): prompting beats supervised steering. By implication, prompting may beat per-user LoRA on style tasks too — though this hasn't been tested head-to-head.
- **GitHub Copilot Enterprise per-customer fine-tuning was discontinued in mid-2025.** At enterprise scale with infinite resources, Microsoft chose RAG-style over per-customer fine-tuning. **This is the strongest negative market signal.**

**Confidence.** Medium-high that LoRA helps with enough data; medium that vanilla per-user LoRA is the wrong granularity (structural critiques); low that it's the right MVP foundation for a small team.

**HumanifyMe fit.**
- **Requires open weights or a managed multi-LoRA serving provider** (Together AI, Fireworks). Closed-API providers do not host per-user adapters for us.
- **Privacy:** training data goes to the hosting provider. Conflict with local-first MVP positioning. Mitigatable if local training is feasible (Panza demonstrates).
- **Engineering cost.** High. 2–4 engineer-months of infra for a 1–3 person team.

**Recommendation.** **Not for MVP.** Park as opt-in Phase 3+ feature for power users with hundreds of samples who explicitly want to fine-tune locally on consumer hardware (Panza-style). Don't bet the company on per-user adapters as the foundation.

---

## F. Preference Learning (DPO / IPO / KTO / FSPO)

**What it is.** Use user feedback signal (accept / reject / edit a rewrite) to either (a) train a per-user reward model + DPO over that, (b) train a shared style-adherence adapter across users via DPO/IPO, (c) consume binary signal directly via KTO, or (d) meta-train via FSPO for cold-start personalization.

**Empirical evidence for it.**
- **DPO** (Rafailov et al., NeurIPS 2023, ~7,000 cites): the default and battle-tested.
- **KTO** (Ethayarajh et al., ICML 2024, ~800 cites): consumes binary desirable/undesirable signal — exactly the accept/reject signal HumanifyMe naturally collects.
- **FSPO** (Singh et al., arxiv 2502.19312): adapts to a new user with **dozens of preferences**, 72% win-rate against non-personalized. Resolves the "need 1000+ preferences" objection.
- **ASTRAPOP** (Liu, Agarwal & May 2024): DPO works for authorship transfer specifically.
- **P-ShareLoRA** (AISTATS 2025) + **LoRe** (Meta FAIR): shared style adapter trained on aggregated preferences is theoretically and empirically reasonable.

**Empirical evidence against it.**
- **DPO over-optimization** (Azar et al., AISTATS 2024): vanilla DPO can degenerate; IPO is the safer variant.
- **Cold-start is hard without FSPO-style meta-training.**
- **Preference pair collection** in production is non-trivial — users edit rewrites rather than producing clean preferences.

**Confidence.** High that KTO is the right signal model for product telemetry. Medium-high that shared style adapter via DPO/KTO/IPO is feasible and beneficial. High that vanilla per-user DPO is impractical (FSPO solves this).

**HumanifyMe fit.**
- **For shared adapter:** requires us to host a base model + adapter. Possible via Together / Fireworks. Not MVP.
- **For per-user preference modeling:** KTO consumes accept/reject directly. FSPO makes it tractable at small N.
- **Privacy:** aggregated signal (no content) is privacy-friendly. Per-user reward model requires per-user data — same tradeoffs as E.

**Recommendation.** **Year-2 architecture.** Start collecting accept/reject/edit signals from day one of MVP (metadata only, not content). At Year 2, train a shared style-adherence adapter via KTO on aggregate signal. Per-user reward modeling stays opt-in even later.

---

## G. Hybrid Systems

**What it is.** Combinations of A through F. The Salemi & Zamani RAG+PEFT recipe; the Panza RAG+RoSA+reverse-instructions recipe; the Teach LLMs to Personalize multi-stage pipeline; the Persona-DB hierarchical architecture.

**Empirical evidence for it.**
- **Salemi & Zamani 2024:** combined RAG+PEFT achieves **+15.98%** vs +14.92% for RAG-only. Strong evidence the combination > either alone.
- **Panza:** combined RAG+LoRA convincingly beats either alone.
- **Persona-DB:** hierarchical (raw + clusters + traits) beats flat representations.
- **GhostWriter:** layered architecture aligns with what users actually want.
- **Teach LLMs to Personalize:** multi-stage pipeline is the canonical reference.

**Empirical evidence against it.**
- **AxBench:** in their methods battery, a well-engineered prompt is competitive. Hybridization may add marginal cost for marginal benefit.
- **Latency:** every additional stage (retrieval + reranking + style scoring + ...) adds tokens and inference time.

**Confidence.** Very high that hybrid is the strongest architectural family.

**HumanifyMe fit.** Native.

**Recommendation.** **Yes.** Specifically: A (structured profile) + B (RAG keyed by C style embeddings) is the MVP. F (preference learning on aggregate signal) joins at Year 2. E (per-user LoRA) is an opt-in Phase 3+ option. D (activation steering) only if/when we ship local-model.

---

## Ranking by evidence

This ranking weights (i) empirical strength on personalized writing tasks, (ii) compatibility with HumanifyMe's MCP / closed-API architecture, (iii) engineering cost for a small team, (iv) privacy alignment with our spec.

| Rank | Architecture | Evidence strength | API compatible | Eng cost | Privacy fit | Verdict |
|---|---|---|---|---|---|---|
| 1 | **G. Hybrid (A+B+C)** | Very High | Yes | Moderate | High | **MVP foundation** |
| 2 | **B. RAG** | High | Yes | Moderate | High (with redaction) | Essential, in G |
| 3 | **A. Prompt + Profile** | High at small N, plateaus | Yes | Low | High | Essential, in G |
| 4 | **C. Style Embeddings** | High for retrieval/eval | Yes (locally) | Low | High | Supporting role |
| 5 | **F. Preference Learning** | High (KTO/FSPO) | Yes (eventually) | High | Medium | Year-2 addition |
| 6 | **E. LoRA/PEFT** | Mixed; major negative signals | Requires open weights | High | Conflicts | Phase 3+ opt-in |
| 7 | **D. Activation Steering** | Promising but bracketed | **NO** for closed APIs | Very High | High (local) | Local-model only |

The MVP architecture is the top three combined.

---

## HumanifyMe Recommended Research Architecture v1

**Confidence convention:** Each claim tagged with (H) High / (MH) Medium-High / (M) Medium / (ML) Medium-Low / (L) Low. High = supported by ≥2 peer-reviewed empirical results at credible venues. Medium = supported by 1 such result or strong theoretical case. Low = informed speculation.

### Layer 1 — Sample ingestion and storage (MVP)

- **Sample sources:** Manual paste + ChatGPT/Claude/Slack/Discord/X/Substack exports (MVP); Gmail OAuth, macOS Messages, generic folder importers (Phase 2). **Confidence: H** that file-upload importers work; **Confidence: MH** that OAuth importers ship within 6 months.
- **Storage:** Local SQLite at `~/.humanifyme/data.db`. Authorship-filtered (`is_from_me = 1` equivalents). Redacted via `src/privacy/redact.ts`. **Confidence: H.**
- **Source attribution:** Every sample tagged with `source ∈ {paste, chatgpt, claude, gmail, slack, messages, text-file, active-learning}`. **Confidence: H.**

### Layer 2 — Style profile generation (MVP)

- **Method:** LLM-distilled structured `StyleProfile` JSON, schema per `specs/style-profile-spec.md`. Includes positive fingerprint (sentence length, formality, signature phrases) plus **negative profile** (`wordsToAvoid`) extracted both by LLM distillation and by stylometric absence (LIWC + corpus comparison). **Confidence: MH** that this beats raw-exemplars-only at matched token budget (Guided Profile Generation, Step-Back Profiling); **Confidence: M** that the negative profile field gives a meaningful additional lift — this is partly an open research question (Gap 4).
- **Refresh:** Manual rebuild via `humanify_build_profile`; active-learning incremental update at Year-2.

### Layer 3 — Rewrite engine (MVP)

- **Pipeline:** redact draft → load profile → retrieve top-k user samples keyed by **style-embedding similarity** (StyleDistance) **and** semantic similarity, with recency tiebreaker → assemble prompt (profile + retrieved exemplars + draft) → call LLM (user's chosen provider) → restore redactions → diff. **Confidence: H** that this layered approach beats either A or B alone (Salemi & Zamani; Panza; Teach LLMs to Personalize).
- **Retrieval:** ~5 exemplars per call, ~500 tokens of structured profile, ~500 tokens of draft. Total system prompt budget < 4000 tokens. **Confidence: M** that this is optimal — this is exactly the matched-budget ablation HumanifyMe should publish (Gap 1).
- **Style embedding:** StyleDistance (`StyleDistance/styledistance`) loaded locally. Fallback: Wegmann's Style-Embedding. **Confidence: H.**
- **Provider:** Anthropic, OpenAI, Gemini wired at MVP; Ollama as fast-follow. **Confidence: H.**

### Layer 4 — Evaluation (MVP + research)

- **CI tier (every PR):** stylometric distance (Burrows' Delta, function-word χ², character-3-gram JS, MATTR) + LUAR cosine + StyleDistance cosine + frozen AA classifier accuracy + AI-detection probability (fast-detect-gpt). All local, milliseconds per sample. **Confidence: H** that this ensemble correlates better than any single metric (Jangra et al., 2025).
- **Release-candidate tier:** ExPerT-style aspect-decomposed LLM-judge + small blind human pairwise panel (5 raters, Krippendorff α ≥ 0.6). **Confidence: H.**
- **Mismatched-profile control:** every eval includes a mismatched-writer baseline (per LaMP-QA recipe). **Confidence: H** that this is a credible control.

### Layer 5 — Active learning (Year-2)

- **Signal collection from day one:** accept / reject / edit events recorded as metadata (no content) per `specs/sample-ingestion-spec.md` Phase 3. **Confidence: H** that this is feasible privacy-wise.
- **Year-2 mechanism:** KTO on a **shared style-adherence adapter** across all Pro users, trained on aggregated accept/reject. Per-user signal contributes a tiny user-mixing vector. **Confidence: MH** for the technical viability (P-RLHF, P-ShareLoRA, FSPO, LoRe all support this direction).
- **Per-user adapters:** opt-in for power users with ≥500 samples; Panza-style local training on consumer hardware. **Confidence: M** — Panza demonstrates feasibility but operational complexity is real.

### Layer 6 — Activation steering (Phase 3+, local-model variant only)

- **Method:** StyleVector recipe per user — mean residual-stream difference (user samples vs. neutral corpus) at chosen layer, applied at inference with coefficient α. **Confidence: ML** that this is the right move; the AxBench result is a strong caution. Worth pilot study on Llama 3 8B + Qwen 2.5 7B, with HumanifyMe Bench measurement.

### What HumanifyMe does NOT do

- **No per-user LoRA in MVP.** Salemi & Zamani's +1.07pp, PERFIT's structural critique, and GitHub Copilot Enterprise's discontinuation all caution against this. **Confidence: H** that this is the right exclusion.
- **No vector-DB-backed memory for raw samples** at MVP. SQLite + a small in-memory index is sufficient at 50–500 samples. **Confidence: MH.**
- **No closed-API hacking** to inject activation steering. Anthropic / OpenAI / Gemini APIs do not expose residual streams; respect the boundary. **Confidence: H.**

---

## Open architecture questions worth running experiments on (within 12 months)

These are the things that, if we answer them well, would make HumanifyMe's architecture decisively better than the published baselines. They map to `research-gaps.md`.

1. **Matched-token-budget ablation: profile vs. exemplars vs. hybrid.** (Gap 1.) Likely +1 ACL paper.
2. **Negative profile contribution:** A/B test of `wordsToAvoid` field at production scale. (Gap 4.) Likely +1 Findings paper.
3. **Cross-context generalization:** does a single profile work across email / Slack / LinkedIn / PR? (Gap 2.) +1 EMNLP benchmark paper.
4. **Optimal retrieval keying:** StyleDistance vs. dense semantic vs. hybrid scoring. Smaller study, possibly workshop paper.
5. **Active-learning effectiveness:** does the Year-2 shared style adapter give the +1pp PEFT-contribution that Salemi & Zamani see, or more?

---

## What this section gets wrong by design

- **No quantitative win predictions over LaMP / LongLaMP / Catch Me If You Can.** We need to run the experiments to know. The literature gives upper-bound-style numbers (Panza-style "under 100 samples works") but not architecture-specific guarantees.
- **Architectural confidence intervals are coarse** (H/MH/M/ML/L) rather than numerical. Numerical confidence would require running the bench.
- **Assumes provider abstractions remain stable.** If Anthropic ships a per-user-fine-tune API, or OpenAI exposes residual-stream hooks, the analysis shifts.

These caveats are why this is Recommended Architecture **v1.** v2 follows the first internal HumanifyMe Bench run, T+9 months from MVP launch.
