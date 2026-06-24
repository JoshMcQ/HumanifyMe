# Prompt Examples

Worked examples that show, end-to-end, what the prompts are meant to produce. Use these as golden tests in CI.

---

## Example 1, Style analysis (terse, dry voice)

### Input samples (labels in brackets, redacted)

```
[email, professional]
quick heads up, I'm out next week. catch up the 12th if that works.

[email, polite]
thanks for the intro. I'd love to chat. Tuesday 3pm or Thursday morning your way?

[text, casual]
ugh, the build's broken again. on it.

[linkedin, direct]
the best engineers I've hired had no degree, no internship, and a github they'd rather not show me. they shipped. that was the bar.

[email, annoyed]
to be clear: we agreed on Tuesday. I rearranged a flight for this. let's keep it.
```

### Expected output (abbreviated)

```json
{
  "version": 1,
  "generatedAt": "2026-06-03T17:00:00Z",
  "base": {
    "sentenceLength": { "average": "short", "variance": "high" },
    "formality": 2,
    "directness": 5,
    "humor": "dry",
    "profanity": "none",
    "contractions": "always",
    "oxfordComma": false,
    "punctuationHabits": {
      "emDash": "frequent", "semicolon": "rare", "ellipsis": "rare",
      "exclamation": "rare", "parentheses": "rare"
    },
    "capitalization": { "sentenceCase": false, "titleCase": "never", "allLowercase": true },
    "commonPhrases": ["to be clear", "quick heads up", "on it"],
    "wordsToAvoid": ["delighted", "leverage", "utilize", "tapestry", "essentially"],
    "greetings": ["hey", "morning,"],
    "signoffs": ["thanks", ", J"],
    "howTheyAskQuestions": "Short, single-sentence asks. Often offers two specific options instead of an open invitation.",
    "howTheyDisagree": "States the prior agreement, then restates the ask. No hedging.",
    "howTheyApologize": "Brief and matter-of-fact. No multi-sentence preambles.",
    "howTheyGiveInstructions": "Imperatives. Bulleted only when the list has 3+ items.",
    "exemplars": [
      "quick heads up, I'm out next week.",
      "to be clear: we agreed on Tuesday.",
      "they shipped. that was the bar."
    ]
  },
  "contexts": {
    "annoyed": {
      "overrides": { "directness": 5, "formality": 2 },
      "notes": "Leads with 'to be clear:' or 'just so we're aligned, '. Restates the commitment.",
      "exemplars": ["to be clear: we agreed on Tuesday."]
    }
  },
  "metadata": { "sampleCount": 5, "labelCoverage": ["email", "professional", "polite", "text", "casual", "linkedin", "direct", "annoyed"] }
}
```

---

## Example 2, Rewrite (warmer + more_like_me)

### Voice fingerprint

Use the fingerprint from Example 1.

### Directives

`warmer`, `more_like_me`

### Input draft (AI-generated)

```
Hi Sarah,

I hope this message finds you well. I wanted to follow up on our previous conversation regarding the partnership opportunity. I believe there is significant potential for our organizations to collaborate, and I am excited to explore this further.

Would you be available for a call next week to discuss next steps? Please let me know what time works best for your schedule.

Best regards,
Joshua
```

### Expected rewrite

```
hey Sarah,

following up on the partnership chat, I think there's a real fit, and I'd like to keep going.

call next week? Tuesday or Thursday afternoon work for me.

thanks,
, J
```

### Why this is the expected output

- Lowercase greeting, lowercase body, lowercase signoff, matches `allLowercase: true`.
- Two options offered for scheduling, matches `howTheyAskQuestions`.
- Em-dash present, matches `punctuationHabits.emDash: frequent`.
- "hope this message finds you well" cut, flagged in `wordsToAvoid` family.
- `, J` signoff, present in `signoffs`.
- ~50% shorter without losing the ask or names.

---

## Example 3, Rewrite that goes wrong (regression case)

### Bad rewrite (do not ship)

```
Hi Sarah!

I am delighted to follow up on our exciting partnership opportunity. We are thrilled by the potential synergies and would love to leverage our combined strengths.

Could we connect next week to discuss next steps? Looking forward to hearing from you!

Best,
Joshua
```

### Why this is wrong

- "delighted," "thrilled," "leverage," "synergies", all in `wordsToAvoid`.
- Title-case greeting + exclamation, violates `allLowercase` and `exclamation: rare`.
- Sentences are uniform medium length, violates `sentenceLength.variance: high`.
- No em-dash, violates `punctuationHabits.emDash: frequent`.
- "Best, Joshua", not in `signoffs`. The signoff for this user is `thanks` or `, J`.

This is the kind of output the critique prompt would flag with `aiSmells` populated. CI must include a regression test that the rewrite of Example 2's input doesn't drift back toward this register.

---

## Example 4, Rewrite of a LinkedIn post (direct, brief)

### Input draft (AI-generated)

```
In today's competitive talent market, the best engineers stand out by their ability to demonstrate practical experience. Whether through internships, degrees, or open-source contributions, candidates who can showcase tangible results are highly sought after by hiring managers. Are you investing in the right signals?
```

### Expected rewrite (using Example 1 fingerprint, `more_like_me`)

```
the best engineers I've hired had no degree, no internship, and a github they'd rather not show me.

they shipped. that was the bar.
```

Why: matches the LinkedIn exemplar in the fingerprint. Cuts the "today's competitive talent market" opener. Cuts the rhetorical question (this user does not end LinkedIn posts on questions in the samples). Drops length to ~25% of original, but that's acceptable here because no length directive was selected and the fingerprint shows this user writes very short LinkedIn posts. The pipeline should permit this if the `linkedin` context exemplar is similarly short.

---

These four examples are the seed of a much larger test corpus we will grow during M3 alongside the rewrite engine.
