# Prior Work and Research Grounding

This document explains the academic work HumanifyMe is built on and how each line of research maps to a concrete design choice in this repo. It is written for contributors and skeptics. If a claim here is not backed by a real citation, it is stated as our design rationale, not as a settled result.

Three research areas carry most of the weight:

1. Computational stylometry and authorship representation (including learned style embeddings).
2. Retrieval-augmented generation for personalization.
3. AI-generated-text detection.

A short fourth section covers how we evaluate, because the design choices only make sense alongside how we test them.

A note on scope. We cite published work where it exists. Where the literature is thin or where we made a product judgment that the literature does not directly settle, we say so. The goal is for a reader to be able to check every citation and to see clearly where the science stops and our opinion starts.

---

## 1. Stylometry and authorship representation

### What the research says

Computational stylometry is old and well-studied. Stamatatos (2009) gives the canonical taxonomy of authorship attribution features: lexical, character, syntactic, and semantic, paired with similarity, profile, and instance classifiers. The durable finding across that survey is that cheap, interpretable features carry a lot of signal. Character n-grams and function-word frequencies keep showing up as strong, and they do not require a neural model to compute. Koppel, Schler and Argamon (2009) formalize the harder, more realistic settings (open-set attribution, profiling, small candidate sets) that look more like a real product than a closed classroom corpus. Abbasi and Chen (2008) define the Writeprints feature set, a few hundred stylometric features spanning lexical, syntactic, structural, and idiosyncratic dimensions, still used as a baseline. LIWC (Pennebaker et al.) scores text against a closed vocabulary of categories and is cheap, interpretable, and well-validated; its function-word and pronoun categories are among the most stable per-author signals.

The newer line of work replaces hand-built features with learned author embeddings. Rivera-Soto et al. (2021), LUAR, trains a contrastive model over large multi-author corpora and produces a reusable author embedding. Two follow-ups matter for honesty about what those embeddings actually capture. Wegmann, Schraagen and Nguyen (2022) show that controlling for conversation or topic yields a purer style signal, because naive author embeddings partly encode what a person writes about, not just how. Wang et al. (2023) probe LUAR directly and find it is "substantially stylistic but not purely so," meaning author and topic are entangled. Patel et al. (2025), StyleDistance, attacks that entanglement head-on by training on synthetic parallel paraphrases that vary style while holding content fixed, and reports a content-independent style embedding. Patel et al. (2023), LISA, takes a different angle: it builds an interpretable style embedding where each axis is a labeled linguistic attribute, so you can say which attributes a piece of text has rather than only how far apart two texts sit.

The PAN 2023 cross-discourse authorship verification overview (Stamatatos, Bevendorff et al.) is worth flagging because it tests verification across registers (essays, emails, interviews, speeches). That register shift is exactly the setting HumanifyMe runs in, since one person writes differently in a Slack message than in a LinkedIn post.

### How it maps to HumanifyMe

The editable style profile is a structured, interpretable fingerprint, not an opaque vector. The `VoiceFingerprint` in `specs/style-profile-spec.md` encodes things a person can read and correct: sentence-length distribution, formality, directness, contraction habits, punctuation rates, casing, common phrases, words to avoid. This is a deliberate descendant of the cheap-interpretable-feature tradition (Stamatatos; Abbasi and Chen; LIWC). We chose it for two reasons. First, the stylometry literature says these features carry real per-author signal. Second, and this is product rationale rather than a research result, an interpretable profile is one a user can inspect and edit, and an opaque embedding is not. The spec is explicit that a neural embedding is never surfaced as an editable profile field.

Embeddings are used, but only as a retrieval key. As of the retrieval milestone, HumanifyMe computes a local embedding per sample and uses it to find the user's most-similar past writing at rewrite time (see Section 2). This is the learned-representation line of work (LUAR and its successors) applied to retrieval, not to the user-facing profile. We are honest in the spec that the MVP embedding model is a general-purpose sentence encoder (`all-MiniLM-L6-v2`), not a dedicated style embedding. The Wang et al. (2023) and Wegmann et al. (2022) results are the reason we treat this as a known limitation: a general sentence embedding will partly retrieve on topic, not purely on style. Moving to a content-independent style embedding (StyleDistance) is a planned Phase-2 upgrade, called out as such in `specs/rewrite-engine-spec.md`. We did not claim the MVP already does style-pure retrieval, because the literature says general embeddings do not.

Stylometric distance is a cheap evaluation proxy, never the verdict. The bench (`specs/evals-spec.md`, task T5) computes classic authorship-attribution features (sentence-length distribution, function-word frequencies, punctuation rates) on a writer's held-out samples and on a rewrite, and measures distance from the writer's centroid. This is a direct application of the Stamatatos and Writeprints feature families. We use it as a fast pre-screen and say plainly that it is never the final word. The reason is the same entanglement problem: stylometric distance can be gamed or can move for reasons unrelated to voice, so human judgment stays the gold standard.

The register-shift problem (PAN 2023) is why the profile has context variants. The profile is not a single voice. It carries a base fingerprint plus optional per-context overrides (email, casual, professional, and so on), because the same person verifiably writes differently across registers, and a single-vector model of their voice would average those away.

---

## 2. Retrieval-augmented generation for personalization

### What the research says

A consistent result in the personalization literature is that retrieving a user's own past writing and putting it in front of the model beats trying to bake the user into the model weights, at least as a first move. Salemi et al. (2024) introduce LaMP, the broad personalization benchmark most of this work reports on, and its long-form successor LongLaMP (Kumar et al., 2024) shows large gains from retrieval over zero-shot on longer outputs. The most direct evidence for the architecture choice is Salemi and Zamani (RAG vs PEFT for privacy-preserving personalization, ACM TOIS 2025): in a head-to-head across the LaMP tasks, retrieval contributes most of the personalization gain and parameter-efficient fine-tuning adds little on its own, with the combination best. Their LaMP-QA work (2025) adds a useful control we borrow: feeding a deliberately mismatched profile, to confirm the gains come from the right user's data and not from generic context.

Several papers refine how retrieval should work for this setting. Li et al. (2023), Teach LLMs to Personalize, lays out a multi-stage retrieve-then-rank-then-synthesize pipeline. Mysore et al. (2024), PEARL, calibrates the retriever to what the generator actually finds useful. Neelakanteswara et al. (2024), RAGs to Style, replaces term-based retrieval scoring with style-embedding similarity and finds style-keyed retrieval consistently, if modestly, better than content-keyed. Sun et al. (2025), Persona-DB, organizes the user history hierarchically and shows gains under cold-start. Panza (Nicolicioiu et al., 2024) is the closest existing system to HumanifyMe's thesis: a fully local personalized email writer that combines retrieval with light fine-tuning and demonstrates that fewer than 100 samples per user can be enough.

On the rewriting mechanism itself, Krishna, Wieting and Iyyer (2020), STRAP, defines the paraphrase-then-restyle recipe that most authorship style transfer still uses: paraphrase to strip the source style, then re-render in the target style. Patel, Andrews and Callison-Burch (2022), STYLL, carries an important warning for anyone relying on a handful of examples: their few-shot style transfer moves text away from the source style more reliably than it moves text toward the target. Style removal turned out to be easier than style adoption. That asymmetry is a caution, not a dead end.

### How it maps to HumanifyMe

Retrieval is the primary voice signal at rewrite time; the static profile is the structural spec and the cold-start fallback. The rewrite pipeline in `specs/rewrite-engine-spec.md` embeds the redacted draft locally, runs cosine search over the user's stored sample embeddings, applies diversity selection, and injects the top matches into the prompt as "examples of how this person actually writes." This is the RAG-first conclusion from Salemi and Zamani applied directly. We chose RAG before fine-tuning for the MVP because the strongest head-to-head in the literature says retrieval carries most of the gain, and because retrieval keeps raw samples local and out of model weights, which fits the privacy model.

The structured fingerprint and the retrieved exemplars do different jobs, on purpose. The fingerprint (Section 1) is the structural style spec: it states the rules. The retrieved exemplars are the lived evidence: they show the voice on text close to the current draft. The spec keeps both and demotes the static profile exemplars to a cold-start fallback used only when retrieval returns nothing. This split mirrors the retrieve-then-condition shape in Li et al. (2023), with the structured profile playing the role of a distilled, user-editable summary.

Style-keyed retrieval is the intended direction, and we are honest that MVP is not there yet. RAGs to Style (Neelakanteswara et al.) is the justification for eventually keying retrieval on a style embedding rather than a general sentence embedding. The MVP keys on a general embedding with recency as a tiebreaker, which we document as a known compromise rather than the end state.

The paraphrase-then-restyle recipe (STRAP) is the engine's shape: redact, then rewrite toward the learned voice. We treat the STYLL warning as a real risk. Because moving toward a target voice is harder than moving away from a source voice, we do not rely on exemplars alone to prove success. The output verification stage applies deterministic checks (banned words the model introduced, number and URL preservation, learned casing) and the bench measures adoption of the writer's voice directly, rather than only measuring departure from the AI draft. In other words, we measure the hard direction that STYLL says is hard.

Cold-start is a first-class case, not an afterthought. Retrieval only activates above a minimum sample count and degrades gracefully to profile-only below it. Persona-DB and the broader cold-start literature are why we designed an explicit fallback path instead of assuming every user arrives with a large corpus.

### Why this product needs to exist at all

The honest justification for HumanifyMe is empirical. Wang et al. (2025), Catch Me If You Can? Not Yet, runs tens of thousands of generations across multiple frontier models and hundreds of real authors and finds that few-shot prompting of frontier models does not convincingly imitate ordinary writers in informal genres. Authorship-verification accuracy on blog-style writing was low, much higher on highly structured genres like news and email, and more examples gave diminishing returns. The plain reading: dropping a few samples into a prompt and asking a model to "write like me" hits a ceiling on casual voice. A persistent, retrievable corpus of the user's own writing plus paraphrase-then-restyle is the response to that ceiling. We cite this paper because it is the closest thing to a direct test of the assumption the product rests on, and because it would be dishonest to claim the problem is solved by prompting when a large study says it is not.

---

## 3. AI-generated-text detection

### What the research says

Two results shape how we treat detection. First, detection is fragile. Sadasivan et al. (2024), Can AI-Generated Text Be Reliably Detected?, gives a theoretical bound on detector reliability and shows that recursive paraphrasing defeats most detectors in practice. The takeaway is that the cat-and-mouse game between generators and detectors is not one a detector reliably wins. Second, AI-generated text does leave a stylistic signature. Rivera-Soto et al. (2024), Few-Shot Detection of Machine-Generated Text Using Style Representations, shows that model outputs cluster as a kind of synthetic author in style-embedding space, which is the same phenomenon, viewed from the detection side, that makes generic model prose feel uniform. Wang et al. (2025), cited above, includes AI-detection as one component of its ensemble evaluation, which is how detection signals can be used responsibly: as one noisy input among several, never as the scoreboard.

### How it maps to HumanifyMe

HumanifyMe is not a detection-bypass tool, and the specs say so. The product spec lists "AI-detection bypass tool, marketed as such" as explicitly out of scope, and the bench spec rules out detection-bypass scoring as a measured task. This is a deliberate stance, and the research supports it on the merits, not only on ethics. Because detectors are unreliable (Sadasivan et al.), optimizing to beat them is optimizing against a moving, leaky target. A tool that wins at fooling classifiers signals to the wrong audience and proves nothing about whether the output actually sounds like the user.

We do measure AI-smell reduction, but as a sanity floor, not a target. The bench (task T4) tracks the density of known AI-tell phrases in the draft versus the rewrite. The reason this is a floor and not a goal is the detection literature: lowering AI-tells is necessary but nowhere near sufficient for sounding like a specific person, and it can be satisfied by generic edits that move text toward no one's voice in particular. The synthetic-author finding (Rivera-Soto et al., 2024) is the underlying explanation for why AI-tells exist at all and why removing them is worth tracking, but it also explains why removing them does not by itself produce the user's voice. The voice-fidelity tasks, judged by humans, remain the thing that matters.

---

## 4. How we evaluate, and why no single number is trusted

The evaluation design follows the same skeptical posture. Jangra et al. (2025), evaluating style-personalized text generation, compares BLEU, ROUGE, sentence and style embeddings, attribution classifiers, and LLM-as-judge, and finds no single metric is sufficient and that ensembles dominate any single judge. The bench is built as an ensemble for exactly this reason: blind human voice-match and voice-fidelity tasks carry most of the weight, with stylometric distance and AI-smell density as cheap automatic pre-screens. Jin et al. (2022), the survey of deep learning for text style transfer, supplies the standard three-axis rubric (style accuracy, content preservation, fluency) that the bench's task split maps onto: voice match and fidelity for style, meaning preservation for content, and human reading for fluency. We keep human raters in the loop on the voice tasks because, without them, the bench is a stylometry exercise that the entanglement results above tell us not to trust on its own.

---

## Citations carried from the internal review

Every citation below appears in the internal literature review this document was distilled from. Titles, authors, and years are reproduced as given there and should be web-verified before external use. Where the internal source listed only a partial author list or an approximate venue, that is preserved here rather than guessed at.

**Stylometry and authorship representation**

1. Stamatatos. A Survey of Modern Authorship Attribution Methods. JASIST, 2009.
2. Koppel, Schler & Argamon. Computational Methods in Authorship Attribution. JASIST, 2009.
3. Abbasi & Chen. Writeprints. ACM TOIS, 2008.
4. Pennebaker et al. LIWC (Linguistic Inquiry and Word Count).
5. Rivera-Soto et al. Learning Universal Authorship Representations (LUAR). EMNLP, 2021.
6. Wegmann, Schraagen & Nguyen. Same Author or Just Same Topic? RepL4NLP at ACL, 2022.
7. Patel et al. StyleDistance. NAACL, 2025.
8. Wang et al. Can Authorship Representation Learning Capture Stylistic Features? TACL, 2023.
9. Stamatatos, Bevendorff et al. PAN 2023 Cross-Discourse Authorship Verification Overview. CLEF / Springer LNCS, 2023.
10. Patel et al. LISA: Learning Interpretable Style Embeddings. Findings of EMNLP, 2023.

**Retrieval-augmented generation and personalization**

11. Salemi et al. LaMP. ACL, 2024.
12. Kumar et al. LongLaMP, 2024.
13. Salemi & Zamani. LaMP-QA. EMNLP, 2025.
14. Salemi & Zamani. RAG vs PEFT for Privacy-Preserving Personalization. ACM TOIS, 2025.
15. Li et al. Teach LLMs to Personalize, 2023.
16. Mysore et al. PEARL. EMNLP Workshop (CustomNLP4U), 2024.
17. Neelakanteswara et al. RAGs to Style. Personalize at ACL, 2024.
18. Sun et al. Persona-DB. COLING, 2025.
19. Nicolicioiu et al. Panza, 2024.
20. Krishna, Wieting & Iyyer. STRAP. EMNLP, 2020.
21. Patel, Andrews & Callison-Burch. STYLL, 2022.
22. Wang et al. Catch Me If You Can? Not Yet. Findings of EMNLP, 2025.

**AI-generated-text detection**

23. Sadasivan et al. Can AI-Generated Text Be Reliably Detected? ICML, 2024.
24. Rivera-Soto et al. Few-Shot Detection of Machine-Generated Text Using Style Representations. ICLR, 2024.

**Evaluation methodology**

25. Jangra et al. Evaluating Style-Personalized Text Generation, 2025.
26. Jin et al. A Survey of Deep Learning for Text Style Transfer. Computational Linguistics (MIT Press), 2022.
