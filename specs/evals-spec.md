# Evaluation Spec — the HumanifyMe Bench

## Why this document exists

The "AI humanizer" category is dominated by tools with no measurable claim of fidelity. Their value proposition is vibes ("trick GPTZero"). We win the category by being the one with rigor — a public, reproducible benchmark for voice fidelity that competitors can submit to (and lose at), that journalists can cite, and that we publish quarterly.

The benchmark is a strategic artifact, not just an internal test. Whoever defines how a category is measured tends to win it. Anthropic did this with safety evals. Stripe did it with fraud benchmarks. We do it with voice fidelity.

## The bench, at a glance

- **Name:** the HumanifyMe Bench (informal: HMB). Versioned: HMB-v1.
- **Surface:** an open-source eval harness in this repo at `evals/` plus a public leaderboard at humanifyme.com/bench.
- **What it scores:** any text-rewriter — HumanifyMe, Wordtune, Grammarly's tone shifter, ChatGPT custom instructions, raw prompting, etc. — on its ability to rewrite drafts in a writer's voice.
- **Submission:** anyone can submit a system (we run it via a standardized interface). We publish the score.
- **Cadence:** quarterly leaderboard release with a short writeup.

## Test corpus

The corpus is the foundation. Without a credible corpus, the benchmark is theater.

### Writers

- Target: 40 consented writers covering a deliberate range of voices.
- Diversity targets: at least 30% non-native English; at least 30% non-US; gender balanced; range of formal-to-casual baselines; range of technical-to-non-technical fields.
- Each writer contributes:
  - 50 labeled samples spanning the 9 context labels (≥ 3 per label they regularly use).
  - A ground-truth self-description: "When I write a polite email, I usually …" — 1–2 sentences per category.
  - 10 AI-generated drafts in their domains (we generate using a baseline LLM with a neutral prompt) for the rewrite task.
- Compensation: $250–$500 per writer for ~3 hours of work.

### Provenance and ethics

- Writers sign an explicit data-use agreement: the corpus is used for benchmarking only, redistributed with their consent, and they can withdraw at any time (withdrawal removes them from the next bench release).
- Samples are redacted with the production redactor before any internal use, then a human reviews redaction on every sample.
- The corpus does not include sensitive personal disclosures; we screen at intake.

### Held-out test set

- 20% of each writer's samples are held out from public release. Used to verify that submissions are not overfit to the public portion.
- Only HumanifyMe-the-org runs evals on the held-out set. Submitters never see those samples.

## Tasks

### T1. Voice match (blind human eval, gold standard)

Given a writer's profile, an AI-generated draft, and that system's rewrite, three blind raters pick which of two options "sounds more like this writer." Options: the rewrite vs. the original AI draft. Score: % of comparisons where the rewrite is preferred.

### T2. Voice fidelity (blind human eval)

Three blind raters (different from T1) see the writer's actual samples and the candidate rewrite, and rate "could this have been written by the same person?" on a 1–5 scale. Score: average rating across the test set.

### T3. Meaning preservation (rubric-based human eval)

Raters check whether the rewrite preserves the AI draft's facts, claims, asks, and dates. Score: % of rewrites where every checked dimension is preserved.

### T4. AI-smell reduction (automatic + human spot-check)

We maintain a public list of AI-tell phrases ("delighted to," "tapestry," "in today's fast-paced," parallel triplets, etc.). Automatic score: density of AI-tells in original draft vs. rewrite. Spot-check: a human re-reads 10% of rewrites to confirm the automatic score is meaningful.

### T5. Stylometric distance (cheap proxy)

Standard authorship-attribution features (sentence-length distribution, function-word frequencies, punctuation rates) computed on the writer's held-out samples and on the rewrite. Score: distance from the writer's centroid. Lower is better. Useful as a fast pre-screen; never the final word.

### T6. Cross-context consistency

Given the same writer and 5 drafts in different contexts (email, slack, linkedin, PR description, text), does the rewriter maintain the writer's voice while adapting to context? Two raters score consistency vs. context-appropriateness on a 1–5 scale each.

## Aggregate scoring

The headline HMB score is a weighted combination:

```
HMB = 0.40 * T1 + 0.25 * T2 + 0.15 * T3 + 0.10 * T4 + 0.05 * T5 + 0.05 * T6
```

We publish all sub-scores. The headline aggregate is for press; the sub-scores are for engineering and competitor comparison.

## Submission interface

A submission implements a tiny HTTP server:

```
POST /rewrite
{
  "writer_id": "string",
  "draft": "string",
  "context_label": "email|professional|...",
  "directives": ["more_like_me", ...]
}
=>
{ "rewrite": "string" }
```

The harness runs the test set against the server, collects rewrites, dispatches them to human raters and automatic scorers, and produces a report.

## Human raters

- Recruited through Prolific or a comparable platform.
- Trained on a 10-item calibration set; ratings only count when calibration accuracy > 80%.
- Raters never see which system produced a rewrite.
- We pay above platform median to reduce noise.

## What "winning the benchmark" means for us

- We aim to publish HMB-v1 with HumanifyMe at the top of every category at launch — but with the harness open such that any competitor *can* take the lead. The integrity of the bench depends on us being willing to publish ourselves losing.
- We publish the report quarterly. We publish competitors' scores even if they don't submit (when we can run them through the standard interface against the public portion).

## Failure modes the bench must handle

- **Gaming:** the held-out portion catches overfit submissions. Submitters whose held-out score drops > 15% from public-portion score are flagged.
- **Rater bias:** triple-rated everything; inter-rater agreement reported on every release.
- **Corpus staleness:** refresh writers every two releases; rotate held-out vs. public.
- **Cost:** $5–10k per full run (Prolific raters + LLM calls). Annual budget ~$40k once we are running it quarterly.

## Engineering plan

- `evals/` directory in this repo.
- `evals/harness/` — TS code that runs submissions, dispatches to raters, scores.
- `evals/corpus/` — sample manifests (the public-released portion); raw samples are kept in a private store with a redaction audit.
- `evals/scorers/` — implementations of T4 and T5.
- `evals/report/` — generates the quarterly Markdown + HTML.

## Order of operations

Per `specs/research-credibility-spec.md`, do not publish HMB-v1 before HumanifyMe has at least 1,000 weekly active users. A benchmark without a product behind it reads as posturing and erodes the credibility we are trying to build.

## What is intentionally out of scope

- AI-detection-bypass scoring. We do not measure whether the rewrite fools an AI classifier. That is the wrong thing to be the best at and signals to the wrong audience.
- "Better writing" scoring (clarity, grammar, persuasiveness). The bench is about *voice fidelity*. Other dimensions belong to other tools.
- Auto-rater-only scoring. Every release ships with human ratings on T1 and T2. Without humans, the bench is just a stylometry homework set.
