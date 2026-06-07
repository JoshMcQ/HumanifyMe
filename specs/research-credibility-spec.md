# Research & Credibility Spec

## Why this document exists

The "AI humanizer" category is poisoned by grifters: tools that promise to bypass GPTZero, with sketchy testimonials and no engineering substance. For HumanifyMe to be the *legitimate* answer in this category — the tool that the New York Times writes about, that Anthropic researchers cite, that consumer brands trust enough to acquire — we need infrastructure those products do not bother to build. That infrastructure is the research and transparency program described here.

This is a strategic spec. The work it describes is what separates a $5M acquihire from a $500M acquisition or IPO trajectory.

## The four pillars

1. **The HumanifyMe Bench** (separately spec'd in `specs/evals-spec.md`) — a public, reproducible evaluation of voice fidelity. Whoever defines the metric wins the category.
2. **The white paper** — peer-reviewable methodology behind the structured style profile and rewrite pipeline. Arxiv first; submitted to ACL or CHI if a clean fit.
3. **Academic partnerships** — co-authored research with a recognized university lab, ideally in HCI or computational sociolinguistics.
4. **Transparency reports** — quarterly, public, plain-English: what we send to providers, what we don't, redaction stats, bench results.

## Timing (load-bearing)

Order matters more than effort. The wrong order makes us look like a startup pretending to be a research lab.

- **T-0 to T+6 months (MVP through alpha):** Ship product. Get the first 1,000 users. Do not publish a benchmark, do not put out a white paper, do not announce university partnerships. We are not the research lab yet; we are the team building the tool that the research will describe.
- **T+6 to T+9 months:** Quietly recruit the corpus for HMB-v1 (paid writers, consent flow, IRB-style review). Quietly initiate conversations with one or two academic partners.
- **T+9 to T+12 months:** Publish HMB-v1 with HumanifyMe at the top of every category. Publish the white paper as the methodological companion to the bench.
- **T+12 to T+18 months:** University-partnered blind reader study published. First transparency report. Conference talks (Strange Loop / Config / dev-focused first, then ACL/EMNLP/CHI after).
- **T+18 to T+24 months:** Second HMB release with competitor submissions. Press cycle: a Wired or NYT-style piece about why AI tone matters and the HumanifyMe Bench.

Publishing earlier than this is a trap. The research without users is posturing; the users without research is undifferentiated. Both compound when interleaved correctly.

## The white paper

### Working title

"Sample-Derived Voice Fingerprinting for LLM Output: A Structured Approach to Stylistic Personalization"

### Abstract sketch

We introduce a structured approach to LLM rewriting in which a small number of user-authored samples are distilled into a typed `StyleProfile` — a 25+ field fingerprint of sentence-level habits, lexical preferences, and context-specific variants — and used as the system prompt for downstream rewrites. We describe the schema, the prompt methodology, the evaluation framework (the HumanifyMe Bench), and empirical results from N consented writers. The structured profile outperforms freeform "custom instructions" and post-hoc tone presets on voice-fidelity human evaluations by X% while preserving meaning at Y%. We discuss tradeoffs vs. fine-tuning, privacy implications of local-first ingestion, and adversarial considerations.

### Authorship

- Joshua + 1–2 engineers as primary authors.
- A university collaborator (post T+9 months) as co-author if the partnership has produced original work.
- We name HumanifyMe in the affiliation but do not couch the paper as marketing. The substance must stand.

### Venue

- arXiv: cs.CL or cs.HC depending on the eventual angle. Always arxiv first.
- Conference: if the abstract holds up, target ACL (NLP) or CHI (HCI). Workshops at NeurIPS / ICLR are reasonable mid-tier targets.

### What the paper is not

- Not an advertisement. We do not write "HumanifyMe is the best." We write a method paper. The marketing follows.
- Not a benchmark paper. The bench is described in a separate dataset/eval paper if it warrants one.
- Not a privacy white paper. That is its own document (see "Transparency reports" below).

## University partnerships

### Targets

- **CMU HCII** — strong HCI program, history of writing-tool research.
- **Stanford HAI** — well-resourced, broad interest in personalization.
- **University of Washington (UW NLP / DUB)** — strong computational sociolinguistics work.
- **MIT Media Lab** — for the privacy / autonomy framing.
- **CU Boulder** — practical HCI work, less crowded for partnerships.

### What we offer

- A real product with real users (post T+6 months).
- The HumanifyMe Bench infrastructure as a research artifact.
- Funding for student research assistants ($10–30k per project).
- Co-authorship and joint announcements.

### What we ask

- Blind reader studies designed and run by the lab (not us).
- IRB-approved consent and ethics review.
- The right to cite the study in our marketing if methodology is sound.

### Outreach

Joshua sends targeted emails after T+6 months. Each email is ≤ 200 words, names a specific researcher whose recent work overlaps, and offers a 30-minute video call. Cold-emailing 12 labs typically yields 1–2 productive partnerships.

## Transparency reports

### What's in each report

- **Provider list and policies** — current providers we integrate with, their data-use policies as of report date, links to the relevant docs.
- **Redaction stats** — aggregate counts of patterns masked (no content): "X% of drafts triggered at least one redaction; the most common pattern was emails."
- **Audit summary** — total tool calls in the quarter, breakdown by provider.
- **Incidents** — any privacy-relevant incidents, with timeline and resolution.
- **Bench results** — current HMB scores, including our own.
- **Changes** — material privacy or methodology changes since last report.

### Cadence

- Quarterly. Published on humanifyme.com/transparency.
- First report: 90 days after public launch.

### Tone

- Plain English. Numbers up front. No marketing language.
- Confidently boring. The same posture as a reputable security disclosure.

## Open-source commitments

We make trust verifiable by open-sourcing the code paths users have to trust:

- **MIT-licensed:** `src/privacy/` (redactor + patterns + restore), `src/engine/prompts/`, the schema definitions, and the eval harness.
- **Source-available, not OSI-licensed:** the bundled skills, plugin packaging, and any future paid surfaces. Source-available means readable for review, not freely reusable.
- **Closed:** future paid features (managed-key relay, sync, team admin).

Open-sourcing the redactor is what lets a journalist or auditor verify our privacy claim independently. Open-sourcing the eval harness is what makes the bench credible.

## Press strategy

- **Do:** engage tech press (Stratechery, The Information, Platformer, Wired, NYT Tech) when we have a real story: bench launch, paper publication, transparency report, milestone user counts.
- **Do not:** engage "AI detection" press, "GPTZero bypass" coverage, or "best AI humanizer 2026" listicle SEO. We will be on these lists by default — we do not court them.
- **Do not:** issue press releases. Pitch specific reporters with specific stories.

## Conference talks

- T+9 months onward, after the bench is public.
- Developer-first venues to start: Strange Loop, !!Con, JSConf-style. Voice and tone resonates there.
- Academic venues after the paper lands: ACL, EMNLP, CHI.
- Avoid early-stage VC-flavored conferences (Saastr, etc.) until we have revenue to talk about.

## Defensive moves the research enables

- "Sounds-like-me" is now empirically verifiable instead of vibes. A competitor saying "ours is just as good" has to submit to the bench or be ignored.
- An acquirer evaluating us has third-party citations they can verify, not just our marketing.
- Regulatory or marketplace policy disputes are dispatched with data, not assertion.

## Budget (rough, year-1)

- Corpus + writer compensation: $15–25k.
- Prolific raters (quarterly bench): $20–40k.
- University partnership funding: $20–40k.
- Conference travel: $5–10k.
- Legal review of consent forms / DPAs: $5k.

Total year-1 research budget: ~$60–120k. Bookmark this; do not start until we have either revenue or external funding to cover it.

## Order of operations (the load-bearing summary)

1. Ship MVP.
2. Get 1,000 weekly active users.
3. Quietly build the corpus.
4. Publish HMB-v1 + the white paper.
5. Partner with one university and publish their blind study.
6. Publish quarterly transparency reports starting at T+9 months.
7. Conference circuit at T+12 months.
8. Acquisition / Series A discussions become serious at T+18 months on the strength of the above.

Out of order, none of this lands.
