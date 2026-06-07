# Citation Map: Schools of Thought in Personalized Language Generation

This document maps the relationships between the load-bearing papers in `literature-review.md`. Identifying the schools of thought matters for HumanifyMe because (a) the research community we'll cite and collaborate with is concentrated in a handful of labs, and (b) understanding lineages prevents us from re-inventing what already exists.

---

## 1. The UMass / Google "LaMP Lineage"

**Center of gravity:** Hamed Zamani's CIIR group at UMass Amherst, with frequent co-authors at Google Research (Michael Bendersky, Sheshera Mysore who moved between MSR and UMass).

**Foundational paper:** Salemi, Mysore, Bendersky & Zamani — LaMP (ACL 2024).

**Direct extensions, by the same group:**
- LongLaMP (Kumar, Viswanathan, Yerra, Salemi et al., 2024) — long-form variant.
- LaMP-QA (Salemi & Zamani, EMNLP 2025) — QA variant with rubric eval.
- RAG vs PEFT comparison (Salemi & Zamani, arxiv 2409.09510 / ACM TOIS 2025) — the empirical head-to-head.
- ExPerT (Salemi, Killingback, Zamani, Findings ACL 2025) — aspect-decomposed evaluator.
- REST-PG (Salemi et al., arxiv 2501.04167) — LongLaMP SOTA via EM reinforced self-training.
- PEARL (Mysore et al., EMNLP 2024 Workshop) — generation-calibrated retriever.
- RAGs to Style (Neelakanteswara, Chaudhari, Zamani, Personalize @ ACL 2024) — style-keyed retrieval.

**Citation pattern:** Almost every recent personalization paper either (a) cites LaMP and reports on it, or (b) extends it. LaMP is the most-cited Salemi paper (~300 cites); the RAG-vs-PEFT comparison is the most-cited within personalization architecture choice debates (~110 cites).

**Lineage thesis:** Personalization works best as a retrieval problem with optional PEFT layering. The benchmark defines the field; the architecture choices derive from it.

**HumanifyMe relationship:** We sit downstream of LaMP. Our system must report LaMP and LongLaMP numbers to be comparable. Our "structured profile vs raw exemplars at matched token budget" ablation (the gap we'll fill) directly extends this lineage.

---

## 2. The IST Austria / Alistarh "Local Personalization Lineage"

**Center of gravity:** Dan Alistarh's DASLab at IST Austria + Nir Shavit (MIT) collaboration.

**Foundational paper:** Panza (Nicolicioiu, Iofinova, Kurtic, Nikdan, Panferov, Markov, Shavit, Alistarh, arxiv 2407.10994).

**Direct extensions:**
- Position paper on personalization-as-phishing risk (ICML 2025 Position Track, arxiv 2502.06560).
- RoSA (Nikdan, Tabesh, Alistarh, ICML 2024) — the PEFT method Panza recommends.

**Citation pattern:** Panza is rapidly accumulating citations (~70 in <12 months) and is now the canonical "local personalization with QLoRA + RAG" reference. It's cited in the RAG-vs-PEFT comparison and in PERFIT as the credible point of contrast.

**Lineage thesis:** Privacy-preserving, fully-local personalization is feasible at <100 samples per user when combining reverse-instruction data synthesis with PEFT and RAG.

**HumanifyMe relationship:** **Panza is our single closest prior art.** Our MVP is essentially the RAG-only slice of Panza; Phase 2 LoRA adds the rest. We should engage with this group directly (see roadmap).

---

## 3. The UPenn / Callison-Burch "Style Embedding Lineage"

**Center of gravity:** Chris Callison-Burch and Kathleen McKeown's groups at UPenn, with Ajay Patel as lead author across multiple key works, and Zachary Horvitz as a recent collaborator.

**Foundational paper:** STYLL (Patel, Andrews, Callison-Burch, arxiv 2212.08986).

**Direct extensions, by Patel/Horvitz/Callison-Burch et al.:**
- LISA / Learning Interpretable Style Embeddings (Patel, Rao, Kothary, McKeown, Callison-Burch, Findings EMNLP 2023).
- StyleDistance (Patel, Zhu, Qiu, Horvitz, Apidianaki, McKeown, Callison-Burch, NAACL 2025).
- ParaGuide (Horvitz, Patel, Callison-Burch, Yu, McKeown, AAAI 2024).
- TinyStyler (Horvitz, Patel, Singh, Callison-Burch, McKeown, Yu, Findings EMNLP 2024).

**Citation pattern:** Highly self-referential cluster but well-cited externally. StyleDistance (~40 cites at <12 months) is becoming the public-default content-independent style embedding. TinyStyler (~30 cites) is the strongest local-rewriter architectural template.

**Lineage thesis:** Style is best represented as a structured vector — either an interpretable per-axis representation or a learned authorship embedding — and rewriting is best framed as paraphrase-then-restyle conditioned on that representation.

**HumanifyMe relationship:** This lineage gives us our style-embedding-based evaluation metrics (StyleDistance cosine) and our long-term local-model architecture template (TinyStyler). Engage Patel's group on the matched-token-budget ablation.

---

## 4. The "Catch Me If You Can?" Skeptical Lineage

**Center of gravity:** Younger researchers at Stony Brook, Penn State, and JHU, with Jiawei Zhou and Nicholas Andrews as anchors.

**Foundational paper:** Catch Me If You Can? Not Yet (Wang, Tripto, Park, Li, Zhou, Findings EMNLP 2025).

**Adjacent / supporting:**
- Few-Shot Detection of Machine-Generated Text Using Style Representations (Rivera-Soto et al., ICLR 2024).
- Wang, Aggazzotti, Kotula, Rivera-Soto, Bishop, Andrews — Can Authorship Representation Learning Capture Stylistic Features? (TACL 2023).

**Citation pattern:** Catch Me If You Can? is rapidly accumulating (~25 cites in <6 months) and is being cited as the empirical justification for any new "style imitation" project. Cited in StyleVector, several 2026 follow-ons, and likely to anchor the next round of style-imitation benchmarks.

**Lineage thesis:** Few-shot prompting of frontier LLMs **cannot** convincingly imitate ordinary writers in informal genres. The LLM's own register asserts itself. New methods (beyond prompting) are required.

**HumanifyMe relationship:** **The lineage that validates HumanifyMe's existence.** This is the paper to cite at the top of every product page and white paper. Their ensemble eval is the methodological template for HumanifyMe Bench.

---

## 5. The Notre Dame / Tan "OPPU Lineage" (Per-User PEFT)

**Center of gravity:** Meng Jiang's group at Notre Dame, with Zhaoxuan Tan as recurring lead author.

**Foundational paper:** OPPU — Democratizing LLMs via Personalized PEFT (Tan, Zeng, Tian, Liu, Yin, Jiang, EMNLP 2024 Main).

**Direct extensions, same group:**
- Per-Pcs / Personalized Pieces (Tan, Liu, Jiang, EMNLP 2024 Main) — collaborative LoRA assembly.
- P2P / Profile-to-PEFT (Tan et al., arxiv 2510.16282) — hypernetwork-generated LoRA at install time.

**Citation pattern:** OPPU is the canonical reference for per-user PEFT (~190 cites). Both Per-Pcs and P2P cite OPPU as the natural baseline; PERFIT cites OPPU as the structural target to critique.

**Lineage thesis:** Per-user PEFT outperforms prompting on LaMP and should be the default for higher-data users. Cold-start can be bridged via collaboration or hypernetworks.

**HumanifyMe relationship:** This lineage represents the "deeper" PEFT path. We should treat OPPU as the ceiling for our Phase-2 per-user adapter feature, while remaining sensitive to PERFIT's structural critique.

---

## 6. The Activation Steering Cluster

**Center of gravity:** Multiple labs without a single anchor — Center for AI Safety (Zou et al.), Anthropic Fellows (Rimsky, Arditi, Chen et al.), Northeastern Bau lab (Todd et al.), Heng Ji's group at UIUC (Han et al.).

**Foundational paper:** Representation Engineering (Zou, Phan, Chen et al., arxiv 2310.01405, ~700 cites). Plus Subramani, Suresh & Peters (Findings ACL 2022) as the theoretical precursor.

**Style-specific extensions:**
- Konen et al. — Style Vectors (Findings EACL 2024) + Effectiveness paper (arxiv 2601.21505).
- Zhang et al. — StyleVector (ACL 2025).
- SteerX follow-up (arxiv 2510.22256).
- AxBench (Wu et al., ICML 2025) — the critical reality check.

**Citation pattern:** Steering work cites RepE, ActAdd, and CAA almost uniformly as the canonical methods. StyleVector cites CAA as the direct ancestor. AxBench is rapidly becoming the must-cite skeptical reference (anyone proposing a steering method now must beat AxBench-prompting baselines).

**Lineage thesis:** Behaviors and styles are low-rank directions in LLM activation space, recoverable from contrastive pairs and steerable at inference. But — per AxBench — well-engineered prompts often match or beat steering.

**HumanifyMe relationship:** This lineage is **interesting but bracketed** — only viable if we ship a local-model variant. Our primary architecture is API-compatible (prompting + RAG); we monitor steering as a Phase-3+ option.

---

## 7. The Preference Learning / Alignment Cluster

**Center of gravity:** Stanford (Rafailov, Finn, Mitchell), DeepMind (Azar, Munos, Rowland), CMU + multiple co-authors (Ethayarajh, Bose), with frequent industry collaboration.

**Foundational paper:** DPO (Rafailov, Sharma, Mitchell, Finn, NeurIPS 2023).

**Direct extensions:**
- IPO (Azar et al., DeepMind, AISTATS 2024) — generalization, robustness.
- KTO (Ethayarajh et al., ICML 2024) — binary-signal variant.
- FSPO (Singh, Hsu, Mitchell, Finn et al., arxiv 2502.19312) — few-shot personalization.

**Personalization-specific:**
- P-RLHF (Li, Zhou, Lipton, Leqi, CMU, NeurIPS 2024 workshop).
- LoRe (Bose et al., Meta FAIR, arxiv 2504.14439).
- P-ShareLoRA (UVA group, AISTATS 2025).
- Personalized Soups (Jang et al., NeurIPS 2024 workshop).

**Citation pattern:** DPO is the foundation (~7,000 cites). All subsequent variants cite it; FSPO is the breakthrough that makes per-user preference learning operationally feasible.

**Lineage thesis:** Preference optimization is the right way to update LLMs from human feedback. The right *signal model* for product telemetry is binary (KTO) or few-shot (FSPO), not paired-thousands-of-preferences (vanilla DPO).

**HumanifyMe relationship:** This is our Year-2 active-learning architecture. KTO consumes accept/reject directly; FSPO makes it tractable with limited data.

---

## 8. The HCI / Writing-Assistant Cluster

**Center of gravity:** Microsoft Research (Ramos, Yeh et al.), Diyi Yang's SALT Lab at Stanford, various HCI scholars.

**Foundational papers:**
- GhostWriter (Yeh, Ramos, Ng, Huntington, Banks, CHI 2024).
- The AI Ghostwriter Effect (Draxler, Werner, Lehmann et al., ACM TOCHI 2024).
- Wordcraft (Coenen, Ippolito et al., IUI 2022).
- ABScribe (CHI 2024).

**Citation pattern:** GhostWriter (~120 cites) is becoming a must-cite for any HCI-aware personalized writing tool. The AI Ghostwriter Effect (~200 cites) is the warning about ownership perception.

**Lineage thesis:** Users want both implicit style learning *and* explicit, editable control over the inferred profile. Personalization alone does not produce ownership; user edits do.

**HumanifyMe relationship:** Defines our UX bar. `humanify_get_profile` + `humanify_update_profile` must expose the structured profile for inspection and editing.

---

## How the lineages cite each other

**LaMP ⇄ OPPU ⇄ PERFIT.** The LaMP lineage builds the benchmark; OPPU optimizes for it; PERFIT critiques OPPU's parameter-space framing. All three cite each other.

**Catch Me If You Can? → everyone.** This paper is becoming a citation hub. Cited in style-embedding work (Patel, Wegmann), in steering work (StyleVector), and in any paper claiming few-shot style imitation works.

**Panza ↔ Salemi/Zamani.** The Panza paper cites the RAG-vs-PEFT study as the architectural justification for combining LoRA + RAG. Salemi & Zamani cite Panza as the credible privacy-preserving deployment.

**Style Embedding lineage ⇄ AA/AV lineage.** Patel/Horvitz/McKeown work cites Wegmann and LUAR as the embedding backbones. Wegmann's lineage cites LUAR as the authorship-trained baseline.

**Activation steering ⇄ AxBench.** Every steering paper after early 2025 must engage with AxBench's "prompting wins" critique. SAE-based rebuttal (arxiv 2605.31183) is the response paper.

**KTO ⇄ FSPO ⇄ DPO.** KTO and FSPO both cite DPO as the foundation; FSPO cites KTO for the realistic signal model.

---

## Named lineages, summarized

| Lineage | Center | Foundational paper | Lineage thesis |
|---|---|---|---|
| LaMP | UMass / Google | Salemi et al. ACL 2024 | Personalization = retrieval problem; benchmark first |
| Local Personalization | IST Austria + MIT | Panza arxiv 2407.10994 | Local-first feasible at <100 samples |
| Style Embedding | UPenn (Patel/McKeown/Callison-Burch) | STYLL arxiv 2212.08986 | Style as structured vector; paraphrase-then-restyle |
| Catch Me If You Can | Stony Brook + JHU | Wang et al. EMNLP 2025 | Prompting alone hits a ceiling on informal voice |
| OPPU | Notre Dame (Tan/Jiang) | OPPU EMNLP 2024 | Per-user PEFT for higher-data users |
| Activation Steering | Multiple (Zou, Anthropic, Bau) | RepE arxiv 2310.01405 | Style is low-rank direction; recoverable, steerable |
| Preference Learning | Stanford + DeepMind | DPO NeurIPS 2023 | Preference optimization from feedback |
| HCI Writing | MSR + Stanford SALT | GhostWriter CHI 2024 | Users want inspectable + editable profile |

---

## Who HumanifyMe should engage with

For our publication roadmap (see `humanifyme-research-roadmap.md`), the realistic engagement targets, in order:

1. **Diyi Yang's SALT Lab (Stanford)** — HCI for writing tools + personalization. Active in PALS workshop. Strong cross-disciplinary lab.
2. **Dan Alistarh / DASLab (IST Austria)** — Panza is our closest prior art. Open collaboration likely.
3. **Hamed Zamani / CIIR (UMass)** — LaMP author. Benchmark-leading group. Possible co-author on the matched-token-budget ablation.
4. **Chris Callison-Burch / Kathleen McKeown groups (UPenn / Columbia)** — Style embedding leaders. Possible collaboration on StyleDistance evaluation in deployed product.
5. **Microsoft Research Yeh/Ramos** — GhostWriter authors. Cross-disciplinary on writing UX.

Avoid premature outreach; engage after MVP ships and we have an actual product to talk about.
