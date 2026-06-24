# State of the Art: Voice and Style Adaptation

This is a research note for contributors and skeptics. It maps the published landscape of
personalized text generation, authorship modeling, and "humanization" as of mid 2026, and it
states plainly where HumanifyMe sits in that landscape and why.

Two ground rules for reading it:

1. Every citation below is a real paper or system named in our internal literature review. Where a
   claim has a citation, it is grounded in published work. Where a claim is a HumanifyMe design
   choice rather than a published result, it is labeled as design rationale. We do not dress up
   product decisions as established science.
2. Citation counts and venues are snapshots taken in mid 2026 and will drift. Treat them as a rough
   signal of influence, not a fixed fact.

A full citation list, with the identifiers you need to verify each one, is at the end.

---

## What the evidence supports

Three findings recur across the recent literature with enough independent support that we treat them
as load-bearing.

**Few-shot prompting alone hits a ceiling on ordinary writers' voices.** Even on frontier models,
even with several exemplars in the prompt, imitation of everyday informal writing degrades sharply.
In the "Catch Me If You Can?" study (Wang et al., EMNLP 2025 Findings, arXiv 2509.14543),
authorship-verification accuracy of model rewrites against the target author falls to roughly 17 to
21 percent on blog-style text and 50 to 66 percent on Reddit-style text, even with five-shot
exemplars. Structured genres like news and email do far better, near 95 to 97 percent. Adding more
exemplars gives diminishing returns. The hard cases are exactly the informal, personal registers
that HumanifyMe cares about most.

**Retrieval over a user's own history is the strongest cold-start signal; per-user fine-tuning helps
mainly once there is more data.** In a controlled comparison across seven LaMP tasks (Salemi &
Zamani, arXiv 2409.09510), retrieval over user history alone improved a non-personalized baseline by
about 14.92 percent, parameter-efficient fine-tuning alone by about 1.07 percent, and the
combination by about 15.98 percent. Most of the lift comes from retrieval, not from adapting weights.

**The strongest published systems are hybrid.** Panza (Nicolicioiu et al., IST Austria, arXiv
2407.10994) shows that fewer than 100 user samples, combined with a small local adapter (RoSA-LoRA)
plus retrieval, can produce convincing local-only style imitation. OPPU (Tan et al., EMNLP 2024
Main) confirms that retrieval plus per-user fine-tuning beats either alone on LaMP. GhostWriter (Yeh
et al., CHI 2024) shows that users actually want a layered design: an inspectable profile they can
read and edit, plus control at the level of individual examples.

The practical reading for a small system is direct. Prompt plus a structured profile plus
retrieval-keyed exemplars from the user's own writing is the empirically supported baseline. Per-user
adapters are a later enhancement, not the foundation.

---

## The subfields, briefly

### Authorship attribution and verification

A mature area with stable methods. LUAR (Rivera-Soto et al., EMNLP 2021) remains the common-default
authorship embedding. Wegmann's Style-Embedding (Wegmann et al., RepL4NLP at ACL 2022) is the
cleanest conversation-controlled alternative, and StyleDistance (Patel et al., NAACL 2025) is the
strongest content-independent style embedding that is publicly available. Current best practice uses
two of these jointly, because divergence between them is a signal that an embedding is keying on topic
rather than style. The PAN shared tasks remain the canonical public evaluation for verification.

### Personalized text generation

The LaMP family of benchmarks (Salemi et al., LaMP, ACL 2024; LongLaMP, arXiv 2407.11016; LaMP-QA,
EMNLP 2025) is the dominant evaluation framework, and the same group's controlled study (arXiv
2409.09510) is the cleanest answer to the retrieval-versus-fine-tuning question. On the fine-tuning
side, OPPU (Tan et al., EMNLP 2024) established per-user adapters as the standard "go deeper"
approach. Two later papers, PERFIT (ICLR 2026, OpenReview Lwn67fk9e1) and TAP-PER (arXiv 2606.04547),
argue that the personalization signal lives in a low-rank hidden-representation subspace rather than in
weight space; PERFIT reports about 92.3 percent fewer parameters than OPPU at matched LaMP
performance.

### Retrieval-augmented personalization

This is the empirically dominant approach for cold start. "Teach LLMs to Personalize" (Li et al.,
arXiv 2308.07968) established the multi-stage retrieve, rank, summarize, synthesize, generate pipeline
that is now standard. PEARL (Mysore et al., EMNLP 2024 Workshop) trains the retriever to predict
downstream generation quality. "RAGs to Style" (Neelakanteswara et al., Personalize at ACL 2024)
shows that retrieving by style rather than by topic gives a small but consistent gain on
personalization. Persona-DB (Sun et al., COLING 2025) and PRIME (arXiv 2507.04607) argue for
hierarchical memory: raw samples, distilled clusters, and abstracted traits as separate tiers.

### Activation steering and style vectors

Promising but constrained. StyleVector (Zhang et al., ACL 2025, arXiv 2503.05213) is the closest prior
art to a per-user activation-steering approach for style, reporting about 8 percent over fine-tuning
at roughly 1700x less per-user storage, but it needs white-box access to model activations.
Anthropic's Persona Vectors work (Chen et al., arXiv 2507.21509) extends contrastive activation
addition to persona traits but is not exposed through a public API. AxBench (Wu et al., ICML 2025,
arXiv 2501.17148) is the honest reality check across 500-plus concepts: prompting wins overall, sparse
autoencoders underperform, and supervised steering is competitive but not dominant. The takeaway for a
closed-API product is that activation steering only becomes relevant if and when a local-model variant
ships.

### Adapters and preference learning

LoRA (Hu et al., ICLR 2022) and QLoRA (Dettmers et al., NeurIPS 2023) are the foundation. RoSA
(Nikdan et al., ICML 2024) is the variant the Panza ablation found strongest for style specifically.
DoRA (NVIDIA, ICML 2024) beats vanilla LoRA at low rank, and VeRA (ICLR 2024) cuts per-user storage by
about 10x. For learning from preferences at small sample counts, DPO (Rafailov et al., NeurIPS 2023)
is the default, IPO (DeepMind, AISTATS 2024) is more resistant to over-optimization, and KTO
(Ethayarajh et al., ICML 2024) consumes plain accept-or-reject signal, which makes it a natural fit for
product feedback. FSPO (Singh et al., arXiv 2502.19312) is the notable recent result: meta-trained on
synthetic personas, it reports a 72 percent win-rate from a few dozen real-user preferences, which is
what makes per-user preference learning look feasible at all.

If a system ever does serve thousands of per-user adapters, the infrastructure is a solved problem.
S-LoRA (MLSys 2024) and Punica (MLSys 2024) serve many adapters from one base model at 4 to 12x the
throughput of naive serving, and Compress-then-Serve (ICML 2025) extends this to 1,000-plus adapters.
LoRA Land (Predibase, arXiv 2405.00732) reports real per-adapter training costs in the single-digit
dollar range at production scale.

One industry signal cuts against a per-user fine-tuning path and is worth stating plainly: per-customer
fine-tuning offerings have been launched and then withdrawn in favor of retrieval-style customization
in at least one widely used coding assistant. There is no published postmortem, so this is an
observation about operational viability rather than a citable result. It reinforces the same conclusion
the LaMP study reaches on the merits: retrieval first.

### Memory architectures

MemGPT (ICLR 2024) introduced hierarchical-memory-as-an-operating-system. Mem0 (arXiv 2504.19413)
reports large latency and token savings over stuffing raw history into the prompt. The file-based
memory pattern (a small always-loaded profile document) is the cheap baseline. For a single-user
rewriting task, a tiered design is enough: a small distilled profile that is always in the system
prompt, plus retrieval over raw samples. The full agent-memory abstraction is more than this task
needs.

### Evaluation

The field has converged on ensemble evaluation, because no single metric tracks human judgment well.
The "Catch Me If You Can?" study and the Microsoft Research SPTG paper (Jangra et al., arXiv
2508.06374) both make this case empirically. A credible package combines attribution accuracy,
verification cosine, style-embedding match, stylometric distance, blind pairwise human judgments, an
LLM-as-judge pass with uncertainty filtering, and an AI-detection sanity check. ExPerT (Salemi et al.,
Findings ACL 2025) is the strongest aspect-decomposed LLM judge. LLM-as-judge for personalization is a
moderate signal at best: Dong et al. (Findings EMNLP 2024) report roughly 60 to 70 percent agreement
with human raters, rising above 80 percent on retained samples after uncertainty filtering, and
position bias (Shi et al., arXiv 2406.07791) requires randomizing presentation order.

---

## What is genuinely unsolved

These are open problems in the published literature, not solved tricks waiting to be applied. They
are the reason a focused system still has room to contribute.

1. **Cross-context voice consistency.** The same writer sounds different in email, in chat, on
   LinkedIn, and in a pull-request description. No published benchmark measures one writer across many
   contexts at once. LaMP uses one task per user, and the "Catch Me If You Can?" study evaluates four
   genres but not the same author across all four. That study explicitly names cross-domain
   generalization as future work.
2. **Profile staleness over time.** PersonaMem (Jin et al., COLM 2025, arXiv 2504.14225) shows that
   frontier models stall near 50 percent accuracy on tracking an evolving user profile across multiple
   sessions. How a person's own writing voice drifts over months, and how a system should adapt to it,
   is unstudied.
3. **Model-prior bleed-through.** The phenomenon where the base model's default voice asserts itself
   over the target style is named (in the "Catch Me If You Can?" study and in StyleVector) but only
   partly mitigated. The best current treatments are paraphrase-then-restyle pipelines (STRAP, STYLL,
   TinyStyler). What is missing is a clean decomposition of how much failure comes from the prior
   versus weak style signal versus content-style entanglement.
4. **Negative profile.** Modeling what a user does not write is largely absent from published
   personalization work. Author-obfuscation research (Mutant-X, PoPETS 2019; StyleRemix; AuthorMist)
   names anti-style features, the words and structures an author should avoid, but develops them for
   hiding identity rather than as a positive personalization signal.
5. **Profile versus exemplars at a matched token budget.** Several papers beat raw retrieval with a
   distilled profile (Step-Back Profiling, Tang et al., ICLR 2025; Guided Profile Generation, Zhang,
   Findings EMNLP 2024; "Teach LLMs to Personalize," Li et al.), but none runs the clean ablation that
   compares a distilled profile against raw retrieved exemplars against a hybrid at the same token
   cost. The literature gives a qualitative answer ("both help") without the quantitative tradeoff
   curve.
6. **Privacy-preserving, on-device author representations.** Almost no published work trains author
   representations under differential privacy or fully on-device. The Salemi & Zamani study is
   privacy-adjacent, in that it studies what to do when raw user data cannot be sent to the provider,
   but it does not address formal privacy guarantees for the representation itself.

---

## Where HumanifyMe sits

HumanifyMe is not trying to beat the benchmark leaderboard on a new model. It targets the seam between
what the literature supports and what the open problems above leave on the table. Concretely, it
combines three pieces: a per-user structured voice profile, local retrieval over the user's own
writing, and deterministic verification of each rewrite. Two of these rest on published evidence; the
third is a design choice we own as design rationale.

### Per-user structured voice (grounded plus design rationale)

HumanifyMe represents a user's voice as a structured, human-readable profile: sentence-length habits,
formality and directness on plain scales, punctuation and capitalization habits, signature phrases,
greetings and sign-offs, short descriptions of how the person asks questions, disagrees, apologizes,
and gives instructions, and a set of short exemplars drawn verbatim from their own samples. The profile
is editable in plain English and schema-validated.

The layered, inspectable design is supported by GhostWriter (Yeh et al., CHI 2024), which found that
users want both an editable profile and example-level control. The choice of a structured profile over
an opaque per-user embedding as the user-facing artifact is a design rationale: an embedding cannot be
read or edited by the person it describes, so it is not a good control surface, even though the
literature shows embeddings are good measurement tools. HumanifyMe keeps a local embedding as a
retrieval key only, never as an editable field.

One field in this profile is deliberately ahead of the literature: a negative profile, the words and
structures the user does not write. As noted above, this is largely absent from published
personalization work. We treat it as design rationale informed by an open gap, not as an established
technique. The rationale is direct: many "this still reads as AI" failures are not a missed voice match
but the presence of tells the writer would never use. A first-class "words to avoid" field, enforced at
generation time, addresses that failure mode head-on.

### Local retrieval (grounded)

On each rewrite, HumanifyMe embeds the draft locally with a small on-device model, retrieves the most
similar past writing from the user's own samples, applies diversity selection to avoid near-duplicates,
and hands those exemplars to the model as the primary voice target. The static profile remains the
structural specification and is never displaced by retrieval. Below a small sample threshold, retrieval
returns nothing and the engine falls back to the profile alone.

This is the approach the evidence most strongly supports. Retrieval over user history was the dominant
cold-start signal in the Salemi & Zamani comparison, retrieving by style rather than topic gave a
consistent gain in "RAGs to Style," and the multi-stage retrieval pipeline of "Teach LLMs to
Personalize" is the field standard. Keeping the embedding step on-device, and redacting each retrieved
exemplar before it is sent, is a privacy design choice rather than a published result; it is consistent
with the privacy-adjacent framing in the Salemi & Zamani work but goes further than any cited paper
claims to.

### Deterministic verification (design rationale)

After the model returns a rewrite, HumanifyMe runs a set of mechanical checks before the text is
trusted: words from the user's avoid-list that the model introduced are flagged, every number and URL
in the draft must survive unchanged, redaction placeholders must survive so real values can be restored,
and the rewrite must match the writer's learned capitalization rather than any house default. If a check
fires, the engine retries once with targeted feedback; if it still fires, the rewrite is returned with a
warning rather than shipped silently.

This is the piece with no direct citation, and we say so plainly. The published field converges on
ensemble evaluation, which is an offline, aggregate measurement of a system across many outputs.
Deterministic verification of a single output at generation time is a different thing: a per-rewrite
quality gate, closer to a contract test than to a benchmark. We treat it as design rationale. The
reasoning is that voice fidelity and meaning preservation are not the same property. An ensemble metric
can report strong average voice match while individual rewrites quietly drop a price, alter a version
number, or reintroduce a banned phrase. Mechanical checks catch the failures that an aggregate score
hides, and they are cheap because they are deterministic.

---

## What we are not claiming

To keep this honest:

- We are not claiming a new modeling result. The modeling pieces (structured profile, local retrieval)
  recombine established methods rather than introducing a new one.
- We are not claiming the negative profile or the deterministic verification gate are validated by
  published evidence. They are design choices aimed at named open gaps, and they need their own
  evaluation before any stronger claim is warranted.
- We are not claiming cross-context generalization works. It is an open problem in the literature and an
  open question for us; the profile's context labels are a hypothesis, not a proven mechanism.
- We are not claiming activation steering, per-user adapters, or differential-privacy guarantees. Those
  remain out of scope until a local-model variant and the evidence to support them exist.

The defensible position is narrower and more honest than a marketing claim: prompt plus structured
profile plus local retrieval is the baseline the evidence supports, and a deterministic per-rewrite
verification gate plus a negative-profile field are reasonable, testable bets against two failure modes
the field has named but not closed.

---

## Citations

These are the works named above, listed as they appear in our source material so each can be checked.
Identifiers (arXiv numbers, venues, OpenReview ids) are included where we have them. Citation counts
are mid-2026 snapshots.

Authorship and style representation
- LUAR. Rivera-Soto et al., EMNLP 2021.
- Style-Embedding (conversation-controlled). Wegmann et al., RepL4NLP at ACL 2022.
- StyleDistance. Patel et al., NAACL 2025.

Personalized generation and benchmarks
- LaMP. Salemi et al., ACL 2024.
- LongLaMP. arXiv 2407.11016.
- LaMP-QA. EMNLP 2025.
- Retrieval-versus-fine-tuning controlled study. Salemi & Zamani, arXiv 2409.09510.
- OPPU. Tan et al., EMNLP 2024 Main.
- PERFIT. ICLR 2026, OpenReview Lwn67fk9e1.
- TAP-PER. arXiv 2606.04547.

Retrieval-augmented personalization
- Teach LLMs to Personalize. Li et al., arXiv 2308.07968.
- PEARL. Mysore et al., EMNLP 2024 Workshop.
- RAGs to Style. Neelakanteswara et al., Personalize at ACL 2024.
- Persona-DB. Sun et al., COLING 2025.
- PRIME. arXiv 2507.04607.
- Step-Back Profiling. Tang et al., ICLR 2025.
- Guided Profile Generation. Zhang, Findings EMNLP 2024.

Local-first style imitation and HCI
- Panza. Nicolicioiu et al., IST Austria, arXiv 2407.10994.
- GhostWriter. Yeh et al., CHI 2024.

Activation steering and style vectors
- StyleVector. Zhang et al., ACL 2025, arXiv 2503.05213.
- Persona Vectors. Chen et al., arXiv 2507.21509.
- AxBench. Wu et al., ICML 2025, arXiv 2501.17148.

Adapters and preference learning
- LoRA. Hu et al., ICLR 2022.
- QLoRA. Dettmers et al., NeurIPS 2023.
- RoSA. Nikdan et al., ICML 2024.
- DoRA. NVIDIA, ICML 2024.
- VeRA. ICLR 2024.
- DPO. Rafailov et al., NeurIPS 2023.
- IPO. DeepMind, AISTATS 2024.
- KTO. Ethayarajh et al., ICML 2024.
- FSPO. Singh et al., arXiv 2502.19312.

Multi-adapter serving
- S-LoRA. MLSys 2024.
- Punica. MLSys 2024.
- Compress-then-Serve. ICML 2025.
- LoRA Land. Predibase, arXiv 2405.00732.

Memory architectures
- MemGPT. ICLR 2024.
- Mem0. arXiv 2504.19413.

Evaluation
- Catch Me If You Can? Wang et al., EMNLP 2025 Findings, arXiv 2509.14543.
- SPTG paper. Jangra et al., Microsoft Research, arXiv 2508.06374.
- ExPerT. Salemi et al., Findings ACL 2025.
- LLM-as-judge agreement. Dong et al., Findings EMNLP 2024.
- Position bias. Shi et al., arXiv 2406.07791.

Longitudinal and memory drift
- PersonaMem. Jin et al., COLM 2025, arXiv 2504.14225.

Paraphrase-then-restyle pipelines
- STRAP.
- STYLL.
- TinyStyler.

Author obfuscation (anti-style prior art)
- Mutant-X. PoPETS 2019.
- StyleRemix.
- AuthorMist.
