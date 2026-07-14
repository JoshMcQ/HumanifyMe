# How HumanifyMe measures voice fidelity

This document is for contributors and skeptics. It describes how we decide whether a rewrite actually sounds like the writer it is supposed to sound like, and where each method breaks down. We are not trying to sell you on a number. We are trying to show our work.

The starting position is that no single metric is trustworthy for personalized writing-style evaluation. Style is high dimensional and partly subjective, so any one score can be gamed or can mislead. We run an ensemble instead, report every sub-score, and treat the headline aggregate as a summary, not as truth. This ensemble framing follows the empirical case made by Jangra et al. (arXiv 2508.06374) and the in-practice instantiation in Wang et al., "Catch Me If You Can? Not Yet" (EMNLP 2025 Findings).

The five measurement families below are stylometric distance, model-based distance from style embeddings, casing and register fidelity, AI-smell tells, and blind LLM-judge preference. Each section ends with what it cannot tell you.

## Public blind classification test

The website's "Human or AI?" test uses the five generic drafts and the five Writer A retrieval-on outputs recorded in [`evals/results/ablation-2026-06-24T21-07-04-624Z.md`](../../evals/results/ablation-2026-06-24T21-07-04-624Z.md). Each participant sees exactly one side of each pair and classifies how it reads: like generic AI or like a person. Assignment is randomized to either two or three HumanifyMe outputs per completed five-round test, presentation order is randomized, and source feedback is withheld until all five guesses are complete.

The browser submits only a four-cell confusion matrix: generic AI read as AI or human, and HumanifyMe read as AI or human. It does not submit sample text, sample identifiers, answer order, comments, fingerprints, or account data. Public reporting keeps this metric separate from opt-in rewrite feedback.

This is a product-feedback instrument, not a scientific study. It uses one synthetic lowercase writer, five shared prompts, self-selected website visitors, no rater screening, and no control for repeat participation. Its results can expose obvious regressions and help prioritize better experiments; they cannot establish authorship fidelity, detector evasion, or performance across real writers.

---

## 1. Stylometric distance

**What it measures.** A model-free, cheap, interpretable distance between the writer's profile and the rewrite. We compute four classical features and report all four:

- Burrows' Delta over the 150 most-frequent words.
- A function-word chi-squared distance.
- Character 3-gram Jensen-Shannon divergence.
- MATTR (Moving-Average Type-Token Ratio), a vocabulary richness comparison.

We aggregate these into one normalized distance via z-scoring across the corpus, but the per-feature numbers are the honest unit.

**Why these features.** Decades of authorship work have found function-word distributions and character n-grams to be the strongest cheap signal, and both are content-independent by construction, which is the property you want when you are measuring voice rather than topic. The grounding here is Stamatatos, "Survey of Modern Authorship Attribution Methods" (JASIST 2009); Koppel, Schler and Argamon (JASIST 2009); Burrows (LLC 2002) for Delta; Abbasi and Chen (TOIS 2008); and LIWC (Pennebaker) for the function-word and category-frequency tradition.

**Limits.** This is a proxy, never the final word. Classical stylometry was built for longer documents than a single email or Slack message, so the features get noisy on short text. It can be satisfied by surface mimicry that a human would still find off. It tells you how far apart two distributions are, not whether a reader would believe one person wrote both. Use it as a fast pre-screen, and distrust a good score that no human has confirmed.

---

## 2. Model-based distance from style embeddings

**What it measures.** How close the rewrite sits to the writer's centroid in a learned style-embedding space. We compute cosine similarity against the mean of the writer's held-out samples using more than one embedding and report each separately.

**Why more than one embedding.** Authorship embeddings are strong but they leak topic. A high score can mean "same subject" rather than "same voice." So we pair a strong general authorship embedding with a style-controlled one and watch for divergence. If the general embedding says "close" while the style-controlled embedding says "far," that gap is itself a signal that the apparent match is being driven by content, not voice. The relevant work here is Rivera-Soto et al., LUAR (EMNLP 2021) for the authorship backbone; Wang et al. (TACL 2023) on topic leakage in authorship embeddings; Wegmann et al., "Same Author or Just Same Topic?" (RepL4NLP at ACL 2022) for the conversation-controlled style embedding; and Patel et al., StyleDistance (NAACL 2025) for a content-independent style embedding.

**Limits.** Every embedding carries the biases of its training data, including topic and demographic biases, and a skeptic is right to ask why you trust the model that produced the score. That objection is exactly why we keep the model-free stylometric distance in Section 1 and human evaluation as the gold standard. Embedding cosine is mid-confidence evidence, not proof.

---

## 3. Casing and register fidelity

**What it measures.** Whether the rewrite preserves the writer's learned capitalization rather than snapping to a house style. Casing is a real fingerprint dimension. Some people write in normal sentence case, some write entirely in lowercase, some use title case in particular contexts. A rewrite that "corrects" an all-lowercase writer into sentence case has failed, even if every other signal looks fine.

**How it is checked.** This is the one register dimension we gate mechanically, because it is the one that is unambiguously checkable. The engine measures the sentence-initial capitalization rate of the rewrite against the writer's learned setting. To avoid false positives, it flags only when a clear majority of sentence starts violate the learned setting and at least two sentence starts offend, so a single proper noun or acronym at the start of a sentence never trips the check. If the gate fires, the engine retries once with targeted feedback before returning the text with a warning.

**Why only casing is gated.** Other parts of register, such as contraction frequency, punctuation habits, and formality, are driven through the rewrite prompt and the style profile rather than enforced by a hard check. The reason is honesty about what is mechanically verifiable: casing has a clean, countable definition, and the others do not. Gating something fuzzy would produce confident-looking failures on judgment calls. This is a design rationale, not a result from the literature.

**Limits.** A casing gate confirms the rewrite did not normalize capitalization. It says nothing about whether the deeper register, the word choices, the rhythm, the level of formality, actually matches the person. It is a guardrail against one specific, common, and visible failure, not a measure of voice.

---

## 4. AI-smell tells

**What it measures.** Whether the rewrite still carries the verbal tics that mark text as machine-generated. We maintain a public list of AI-tell phrases and structures, things like "delighted to," "tapestry," "in today's fast-paced," and parallel triplets, and we measure their density in the original draft versus the rewrite. A human re-reads a sample of rewrites to confirm the automatic density score is tracking something real.

**Why a hand-built list.** The product exists to strip these tells, so we measure them directly rather than inferring them. The list is a stated, inspectable artifact: anyone can read it, argue with it, and propose additions. This is design rationale grounded in the product's own copy rules, not a claim from a paper.

**The detector caveat, stated up front.** We also run rewrites through open-source AI-text detectors and look at the detection probability. We use this in one direction only: did the rewrite reduce detection probability relative to the original AI draft? We never publish the absolute number as a quality claim, and we never market on it. AI-text detection is not a reliable measure of anything we care about. Sadasivan et al., "Can AI-Generated Text be Reliably Detected?" (ICML 2024), is the reason: detectors can be evaded and, more importantly for an honest report, their false-positive rates vary widely by genre, in the range of roughly 0.24% to 22%. A tool that brags about beating a detector is optimizing for the wrong audience and standing on an unstable number.

**Limits.** A tell list is necessarily incomplete and dates quickly as models change their habits. Low tell density does not prove the text sounds like the writer; it only proves it sounds less like a generic model. Detection probability is a sanity floor, not a fidelity metric, and we treat it that way.

---

## 5. Blind LLM-judge preference

**What it measures.** A mid-tier signal: cheaper than human raters, more decomposable than a single distance. An LLM judge compares a candidate rewrite against a reference and reports a preference or a per-aspect score.

**How it is run, with the bias controls that make it usable.** We use aspect-decomposed judging in the style of Salemi, Killingback and Zamani, ExPerT (Findings ACL 2025): the judge extracts atomic content claims and atomic style descriptors from the reference and the candidate, aligns them, scores each aspect, and explains its decision, rather than emitting one opaque rating. On top of that we apply three controls, each of which exists because the raw method is biased:

- Uncertainty filtering. The judge states how certain it is and we count only high-certainty judgments. This follows Dong et al., "Can LLM be a Personalized Judge?" (Findings EMNLP 2024), which reports that retaining only confident judgments raises agreement from roughly 70% to above 80% on the kept samples.
- Position-bias mitigation. LLM judges favor whichever answer appears first, so we randomize order, present each pair in both orderings, and average. See Shi et al., "Judging the Judges" (AACL 2025; arXiv 2406.07791).
- Self-preference control. A judge tends to prefer text from its own model family. If the system that produced the rewrite shares a family with the judge, the result is not trustworthy, so we judge with a different model family.

G-Eval (EMNLP 2023) is the baseline single-call LLM-judge approach we decompose away from.

**Limits.** Even with these controls, an LLM judge is a noisy, biased instrument standing in for a human reader. It can be fluent and wrong. We weight it as a middle-tier signal and never let it be the only verdict on a release.

---

## Why human evaluation stays the gold standard

The automatic metrics above exist to make iteration cheap. They do not replace people. Voice is ultimately a human judgment, so every serious evaluation includes blind human raters answering two questions: in a blind pairwise comparison, which option sounds more like this writer; and, shown the writer's real samples, could the same person have written this candidate.

Two design choices keep the human evaluation honest:

- Rater calibration. Raters pass a calibration set against known-good answers before their ratings count, and we report inter-rater agreement (for example Krippendorff alpha with bootstrap confidence intervals) on every run. Stylistic judgments are noisier than factual ones, so we report the agreement number rather than hide it. The best-practice grounding is van der Lee et al., "Human Evaluation of Automatically Generated Text" (CSL 2020), with the qualitative protocol from GhostWriter (CHI 2024).
- A mismatched-writer control. For each writer-and-draft pair we also generate a rewrite using a different writer's profile, and we confirm that raters prefer the correctly matched rewrite. If a method scores well even when it is aimed at the wrong person, the score is measuring fluency, not fidelity. This control is adapted from Salemi and Zamani, LaMP-QA (EMNLP 2025).

Without human ratings and the mismatched-writer control, the rest of this is a stylometry homework set. We say that plainly.

---

## How the pieces combine

The metrics are combined into a single normalized ensemble score for convenience, and every sub-score is published alongside it. No individual number is treated as the truth, the aggregate least of all. The model-free stylometric distance defends against "your embedding is biased." The embedding distance catches things classical features miss. The casing gate stops one visible, common failure. The tell-density measure tracks the thing the product is built to remove. The LLM judge gives a decomposable middle signal. Human raters, with calibration and a mismatched-writer control, are the only part we are willing to call a gold standard. The AI-detection probability is a one-way sanity check and never a headline.

If you think one of these metrics is wrong, the methods and the tell list are inspectable on purpose. Tell us where it breaks.

---

## Citations

The following are carried through from the internal research notes and the project specs. Each should be web-verifiable.

- Jangra et al., "Evaluating Style-Personalized Text Generation: Challenges and Directions," arXiv 2508.06374.
- Wang et al., "Catch Me If You Can? Not Yet," EMNLP 2025 Findings.
- Stamatatos, "Survey of Modern Authorship Attribution Methods," JASIST 2009.
- Koppel, Schler and Argamon, JASIST 2009.
- Burrows, "Delta," LLC (Literary and Linguistic Computing) 2002.
- Abbasi and Chen, TOIS 2008.
- LIWC (Pennebaker).
- Rivera-Soto et al., LUAR, EMNLP 2021.
- Wang et al., TACL 2023 (topic leakage in authorship embeddings).
- Wegmann et al., "Same Author or Just Same Topic?", RepL4NLP at ACL 2022.
- Patel et al., StyleDistance, NAACL 2025.
- Salemi, Killingback and Zamani, ExPerT, Findings ACL 2025.
- Dong et al., "Can LLM be a Personalized Judge?", Findings EMNLP 2024.
- Shi et al., "Judging the Judges," AACL 2025 (arXiv 2406.07791).
- G-Eval, EMNLP 2023.
- Sadasivan et al., "Can AI-Generated Text be Reliably Detected?", ICML 2024.
- van der Lee et al., "Human Evaluation of Automatically Generated Text," CSL 2020.
- Salemi and Zamani, LaMP-QA, EMNLP 2025.
- GhostWriter, CHI 2024.
