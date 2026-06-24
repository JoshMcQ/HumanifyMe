# Does HumanifyMe actually work?

This page is for skeptics. It shows the method, the raw numbers from a real run, and exactly where each number comes from so you can check it yourself. Where the data does not support a claim, we say so.

Run date: 2026-06-24. Four writers, five drafts each, retrieval on and off. That is 20 rewrite pairs.

## The method

We test one thing: does retrieving a writer's own past samples make a rewrite sound more like that writer?

The setup:

1. Four writers of distinct register. A is casual and all lowercase. B is formal and sentence case. C is terse and technical, also lowercase. D is warm and enthusiastic, sentence case. They are deliberately spread out so voice differences are measurable.
2. The same generic AI drafts. Every writer gets rewrites of the exact same bland, AI-sounding source drafts. Nothing about a source draft favors one writer.
3. Retrieval ON vs OFF. We run each rewrite twice. ON: the engine retrieves the writer's own past samples and conditions on them. OFF: no retrieval, everything else identical. That is the only variable that changes.
4. Deterministic scoring. Each output is scored on three axes that do not call a model:
   - Stylometric distance: how far the output sits from the writer's real samples in feature space. Lower is closer. See `evals/scorers/stylometry.ts`.
   - Casing fidelity: does the output match the writer's register (0 = all lowercase, 1 = sentence case). See `evals/scorers/casing.ts`.
   - AI-smell: count of generic-AI tells in the output. Lower is better. See `evals/scorers/aiSmell.ts`.
5. A blind LLM judge. A separate judge model is shown the ON output and the OFF output and asked one question: "which sounds more like this person?" We run each pair both ways so position bias cancels out. The judge does not know which output used retrieval.

The script that runs all of this is `evals/harness/runAblation.ts`. The scorers are in `evals/scorers/`. That script makes real Anthropic API calls, so exact numbers move a little between runs.

## What the numbers say

### Rewrites land on the right author

![Nearest-author confusion matrix: 85 percent of rewrites are stylometrically closest to their own writer](figures/register-confusion-matrix.png)

This is the result that matters, and it is not about casing. Take each retrieval-grounded rewrite and ask which of the four writers' real voices it is stylometrically closest to, across word choice, sentence rhythm, punctuation, and function-word habits. A rewrite that caught the voice lands closest to its own writer.

17 of 20 rewrites (85 percent) classify back to the correct author. The three misses: two of writer C's rewrites (terse, lowercase) land closer to writer A (casual, lowercase), and one of writer D's lands on A. A and C share a lowercase casual register, so overlap there is expected rather than surprising. We show the off-diagonal cells, not only the diagonal.

### It also holds register

![Register adaptation: lowercase writers land at 0.00, sentence-case writers at 1.00](figures/register-adaptation.png)

A smaller, fully deterministic check: does a rewrite keep the writer's capitalization habit? The two lowercase writers (A, C) stay at 0.00, the two sentence-case writers (B, D) at 1.00. This is enforced by the verify gate plus the learned register, not by retrieval; on and off both hit the target. Casing is the easiest dimension to see and to verify, which is why it gets a figure, but it is the floor of a voice, not its substance.

### Retrieval pulls the rewrite closer

![Stylometric distance, retrieval ON vs OFF, per writer](figures/stylometric-distance.png)

Lower distance means closer to the real writer. Retrieval helped three of the four writers this run.

| Writer | Distance ON | Distance OFF | Retrieval helps? |
| --- | --- | --- | --- |
| A (casual / lowercase) | 2.35 | 3.38 | yes, clearly |
| B (formal / sentence-case) | 3.22 | 2.32 | no, worse this run |
| C (terse / technical) | 2.92 | 3.09 | yes, small |
| D (warm / enthusiastic) | 2.47 | 2.69 | yes, small |

We report writer B even though retrieval hurt the distance score there this run. The metric is noisy and we are not rounding a loss into a win.

### The LLM judge, and why it is not our headline

![An LLM judge preferred the retrieval-grounded output for all four writers](figures/judge-preference.png)

We also ran a blind LLM judge: a separate model shown the on and off outputs, asked which sounds more like the real person, with slot order alternated to cancel position bias. It preferred the retrieval-grounded output for all four writers this run, and on two earlier runs.

We include this for completeness and we do not lean on it. A model judging another model's output is a weak proxy for human preference: it can carry the same blind spots, and "sounds like a real person" is exactly the call models are least reliable at. The deterministic attribution at the top is the load-bearing evidence. Human evaluation is the honest next step, and it is the one we will trust.

### What we are not claiming

- We are not claiming the LLM judge is proof. It is a weak signal, reported, not relied on.
- We are not claiming retrieval improves casing. The verify gate and learned register do that.
- We are not claiming retrieval lowers stylometric distance for every writer. It did not for writer B this run.
- We are not claiming style-pure retrieval. The MVP keys on a general embedder, which entangles topic with style.

What we are claiming, narrowly: across four registers, retrieval-grounded rewrites are stylometrically attributable to the correct author 85 percent of the time and move closer to the real voice for most writers.

## Privacy: the guarantee is architectural

The privacy assurance is not the recall number below. It is that everything runs on your machine and the privacy-critical code (`src/privacy/`, `src/network/`, `src/engine/verify.ts`) is MIT, so you can read exactly what leaves and confirm it yourself. That is the part worth trusting.

Redaction is a best-effort layer in front of the single network call, not a promise to catch every secret, and the spec says so. On the golden fixture set in `src/privacy/redact.test.ts` it is deterministic and clean: all seven planted secret classes (emails, phones, addresses, cards, API keys, AWS keys, JWTs) masked, 0 false positives across 20 plain paragraphs. Useful, but a floor, not a guarantee.

![Redaction on the test fixtures: all seven secret classes masked, 0 false positives on 20 plain paragraphs](figures/redaction-coverage.png)

## Reproduce it yourself

- Raw data: `evals/results/ablation-data.json`.
- Figures: regenerated by `evals/notebooks/proof.ipynb` from that JSON. Run the notebook and the PNGs in `figures/` rebuild.
- Full run: `evals/harness/runAblation.ts` drives the ablation. It makes real Anthropic calls, so your numbers will land near these but not exactly on them.

Each writer contributes 5 drafts (20 rewrite pairs total). Still a small sample. We are growing the writer set and the per-writer count, and we will update this page when we do.
