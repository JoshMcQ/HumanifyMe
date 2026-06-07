# HumanifyMe Research Roadmap

This document maps out HumanifyMe's research program for the 24 months following MVP launch. It's the operational sequel to `specs/research-credibility-spec.md` and the publication arm of `research-gaps.md`.

## Operating principles

1. **Order matters more than effort.** The research artifacts (benchmark, white paper, partnerships, transparency reports) compound if published in the right sequence; out-of-order publication makes us look like a startup pretending to be a research lab.
2. **Ship product before research.** The first 1,000 weekly active users come before any benchmark publication. A benchmark without a product behind it reads as posturing.
3. **Evidence-driven.** Every research deliverable cites peer-reviewed work and reports numbers, not vibes.
4. **Open-source the privacy-critical paths.** Trust is verifiable, not asserted. MIT-license the redactor, the evaluator, and the schema definitions.
5. **Engage labs after we have a product to discuss.** Cold-emailing academics with a deck and no shipping system has a near-zero response rate.

---

## Phase A — Months T+0 to T+6 (MVP through Alpha)

**Goal:** Ship the MVP, hit 1,000 weekly active rewrites, instrument data collection for everything that comes later.

### What to publish

Nothing externally. Internal instrumentation only.

### What to instrument

- HumanifyMe Bench harness, internal-only initially (the same code that runs the public bench will run in CI).
- Accept / reject / edit telemetry for every rewrite (metadata only, no content).
- Per-provider success/failure rates.
- Profile generation quality scores (LUAR / Wegmann / StyleDistance cosines plus stylometric distance) per build.

### What to scope quietly

- HumanifyMe Bench corpus recruitment plan (writer list, consent forms, IRB-style review). Not yet executed.
- One academic-partner shortlist (3–5 labs from `citation-map.md`).
- Open-source release plan for the redactor and evaluator.

### Risks to avoid

- **Premature benchmark launch.** Don't publish the bench until we've internally validated that we lead it. Publishing and losing publicly is brand-damaging.
- **Premature academic outreach.** Cold-emails before we ship are noise.
- **AI-detection bypass press.** Refuse interviews framed around AI-detector evasion from day one.

---

## Phase B — Months T+6 to T+12 (Open Beta, internal research running)

**Goal:** Build and quietly run HumanifyMe Bench v1; draft the white paper; initiate one academic partnership.

### What to ship internally

- **HumanifyMe Bench corpus v1.** Target 200 consented writers, ≥30 samples each, ≥3 contexts. Budget $50–100k for compensation + Prolific recruitment + corpus QA. (See `evals-spec.md` for design.)
- **Bench harness publicly readable on GitHub.** Code is open; corpus is not.
- **Internal Bench runs against:** HumanifyMe, prompt-only-baseline, RAG-only baseline, Panza (if reproducible), HyperWrite personas, vanilla ChatGPT custom instructions. Generate the comparison data quietly.

### What to publish externally

Still very little. One thing:

- **Open-source release of the redactor + the bench harness + the schema definitions** as MIT. Announce on humanifyme.com/research. The release is the product story, not the comparison results.

### What to draft internally

- White paper. Working title: *"Sample-Derived Voice Fingerprinting for LLM Output: A Structured Approach to Stylistic Personalization."* Target arxiv submission at T+12, with goal venue ACL 2027 (submission deadline T+15).
- The matched-token-budget ablation experiment (Gap 1). This is publishable as a standalone Findings paper if the white paper is delayed.

### What to start

- One academic partnership outreach. Target one of: Diyi Yang (Stanford SALT), Dan Alistarh (IST Austria), Hamed Zamani (UMass CIIR). Initial ask: a blind reader study designed and run by the lab, $20–30k funded by HumanifyMe.

### Confidence levels

- **Bench corpus recruitment will hit 200 writers by T+12:** Medium-High (this is logistically straightforward at our budget; recruitment timing is the main risk).
- **Internal Bench will show HumanifyMe leading prompt-only baselines:** High (the literature predicts this — RAG + profile beats either alone).
- **Internal Bench will show HumanifyMe leading Panza:** Medium (Panza is a strong baseline; we win on cross-context but may lose on email-specific quality).
- **One academic partnership in flight by T+12:** Medium (depends on response rates; expect to email 8–12 labs to land 1–2).

---

## Phase C — Months T+12 to T+18 (Bench v1 launch, white paper, partnerships)

**Goal:** Publish the bench publicly with HumanifyMe leading every category. Publish the white paper. Launch quarterly transparency reports. First academic-partnered study underway.

### What to publish externally

1. **HumanifyMe Bench v1 public release.** humanifyme.com/bench. Public leaderboard. Corpus structure documented (samples themselves remain private). Harness code on GitHub. Quarterly results pre-committed (T+12, T+15, T+18, T+21, T+24).
2. **White paper on arxiv.** Coordinated with bench launch.
3. **First quarterly transparency report.** humanifyme.com/transparency. Provider list, redaction stats, audit summary, bench results, materially-changed flags.
4. **Open-source release of the eval harness + frozen evaluator weights** for the LUAR / Wegmann / StyleDistance components.

### Press strategy

- **Yes:** Stratechery, Platformer, The Information, Wired, NYT Tech — pitch the bench launch + white paper as a story. Frame: "the first reproducible, blind-evaluated benchmark for personalized AI writing voice."
- **No:** "AI detection," "GPTZero bypass," any list of "best AI humanizers." Decline these pitches actively.

### Academic partnership state

- Run the blind reader study with the partner lab. Target 100+ writer-rater dyads; statistical power for claims at p < 0.01.
- Co-author preregistration on OSF.

### What to scope

- Conference talk submissions: Strange Loop, JSConf, !!Con, Config (developer-facing; T+15). ACL / EMNLP / CHI submission cycles open in this window; aim for T+18 submission.

### Confidence levels

- **Bench launches on schedule:** High.
- **White paper accepted at ACL 2027 or EMNLP 2027:** Medium-High (the methodology is novel, the result is significant; rejection at one venue, accept at the next is the realistic expectation).
- **First academic-partnered study completes by T+18:** Medium (academic timelines are slow; budget for slippage).
- **Press cycle lands one major tech-press story:** Medium (depends on news cycle).

---

## Phase D — Months T+18 to T+24 (Bench v2, conference circuit, second partnership)

**Goal:** Ship Bench v2 with competitor submissions. Publish the partnered study. Begin conference circuit. Initiate second partnership.

### What to publish

1. **HumanifyMe Bench v2 release.** Refresh 50% of the corpus; release a public submission API so any team can submit a rewriter for scoring. We score competitors automatically using their public APIs where possible.
2. **University-partnered blind reader study results.** Co-authored paper, target venue ACL / CHI / TOCHI depending on framing.
3. **Quarterly transparency reports** (T+18, T+21, T+24).
4. **Conference talks delivered:** Strange Loop, JSConf, ACL workshop (PALS), CHI Workshop on AI-mediated Writing.

### What to scope

- Second academic partnership — different lab, different problem. Suggested: a privacy-formalization paper with a security-focused lab (PoPETS or USENIX Security target).
- Active learning paper (Gap 5 — profile staleness study with longitudinal data from the first year of users).

### Acquisition / fundraising lens

- This is the window where serious acquirer conversations become realistic *if* the product side is going well (10k+ active users, paying tier launched, retention strong).
- The research portfolio at this point — a peer-reviewed bench, a published methodology paper, two university partnerships, quarterly transparency reports, MIT-licensed privacy-critical code — is the substantive moat that makes us a brand-acquisition target ($50M+ outcomes), not an acquihire ($1–5M).

### Confidence levels

- **Bench v2 with competitor submissions:** High infrastructurally; Medium for competitor participation rate (it's voluntary).
- **Partnered study publishes by T+24:** Medium (academic timelines).
- **Acquirer conversations turn substantive by T+24:** depends entirely on product metrics; not a research-program-controllable variable.

---

## Publications targeted, in priority order

| Order | Title (working) | Target venue | Timeline | Probability |
|---|---|---|---|---|
| 1 | Sample-Derived Voice Fingerprinting (white paper) | ACL 2027 Main | T+12 to T+18 | High |
| 2 | Structured profile vs. retrieved exemplars at matched budget (Gap 1) | ACL 2027 Findings | T+12 to T+18 | High |
| 3 | HumanifyMe Bench corpus + harness (resource paper) | LREC 2027 or LREC-COLING | T+15 | High |
| 4 | Negative profile in personalized rewriting (Gap 4) | EMNLP 2027 Findings | T+12 to T+18 | Medium-High |
| 5 | Cross-context voice generalization (Gap 2) | EMNLP 2027 Main | T+18 to T+24 | Medium |
| 6 | LLM prior bleed-through (Gap 3) | ACL 2027 Findings | T+18 to T+24 | Medium |
| 7 | University-partnered blind reader study | CHI 2028 or TOCHI | T+18 to T+24 | Medium |
| 8 | Privacy formalization (Gap 6) | PoPETS 2027 | T+24+ | Medium |
| 9 | Active learning + staleness longitudinal (Gap 5) | PALS 2028 or CHI 2028 | T+24+ | Medium |

We target **3–5 published papers in the first 24 months**. Three high-probability papers + supporting work is a credible research output for a small team.

---

## Conference talks and venues

- **T+12–T+18:** developer-facing — Strange Loop, JSConf, !!Con, Config. Topic: "MCPs that learn how you write."
- **T+15–T+18:** academic workshops — PALS @ ACL/EMNLP, Workshop on AI-Mediated Writing @ CHI.
- **T+18–T+24:** main academic venues — ACL/EMNLP main, CHI, NAACL Industry Track.
- **T+18+:** policy + privacy venues — FAccT, IAPP, Aspen Tech Policy Hub.

We do **not** target VC-flavored conferences (SaaStr, etc.) until we have revenue worth discussing.

---

## Budget summary, year 1 of research program

| Item | Year-1 Budget |
|---|---|
| Bench corpus recruitment + compensation | $50–100k |
| Prolific raters (quarterly) | $20–40k |
| University partnership funding | $20–40k |
| Conference travel + registration | $5–10k |
| Legal review of consent forms / DPAs | $5k |
| Bench infrastructure (hosting + CI) | $5k |
| **Total Year 1 research budget** | **$105–200k** |

Bookmark this; do not start until we have either revenue, raised capital, or an explicit founder commitment to self-funded research.

---

## Key risks to the research program

### R-1. Bench corpus quality is below threshold
**Mitigation:** Over-recruit by 30%; reject samples that fail manual QA; release with smaller-than-planned corpus rather than a low-quality larger one.

### R-2. Academic partnership timelines exceed our planning window
**Mitigation:** Engage two labs in parallel; treat one slipping as expected.

### R-3. A competitor publishes a similar bench first
**Mitigation:** Acknowledge in our launch ("complementary to [theirs]"); differentiate on cross-context corpus design; reach out to collaborate.

### R-4. Anthropic / OpenAI / Google publishes a comparable in-house bench
**Mitigation:** Position as open-source / community-driven counterweight. Frame their bench as their internal product story; ours as the public-good measurement.

### R-5. White paper rejected at first venue
**Mitigation:** Submit to arxiv first; resubmit immediately at next-best venue. ACL → EMNLP → NAACL → Findings is the standard fallback chain.

### R-6. AI-detection-bypass framing dominates press coverage despite our refusal
**Mitigation:** Lead with the bench numbers; refuse the bypass framing in every interview; have prepared FAQ answers. If the framing dominates anyway, double down on research output as the long-term identity rebuild.

### R-7. The bench shows we're losing
**Mitigation:** Don't publish until we're winning. If we never win, that's a product problem, not a research-program problem.

---

## Decision: when do we kill the research program?

- If product metrics (1,000 WAU at T+6, 5,000 at T+12) are not met, **delay** the research program; don't run a research program for a product without users.
- If we kill the product entirely (per `specs/launch-plan.md` kill criteria), kill the research program too.
- If we run the research program but it has zero observable effect on (a) press coverage, (b) brand differentiation, (c) acquirer interest at T+18, reconsider the budget allocation.

---

## What this roadmap is not

- It is not a guarantee that any specific paper gets accepted at any specific venue. Academic review is stochastic.
- It is not a commitment to maintain the bench indefinitely. The annual budget assumes we keep it running; we revisit each year.
- It is not a substitute for product work. Every research deliverable should also be a product feature.

---

## Connections to other documents

- `specs/research-credibility-spec.md` — strategic framing.
- `specs/evals-spec.md` — the bench design that this roadmap operationalizes.
- `research/research-gaps.md` — the publication opportunities ranked.
- `research/architecture-options.md` — the architecture the research program supports.
- `research/evaluation-methods.md` — the methodology underlying the bench.
- `specs/launch-plan.md` — the product launch this roadmap follows.

The research program supports the product, not the other way around. If you have to choose, ship the product.
